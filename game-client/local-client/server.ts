#!/usr/bin/env node

import { spawn } from "node:child_process";
import express from "express";
import { io } from "socket.io-client";
import { z } from "zod";

type ArenaEvent = {
  id?: string;
  at?: string;
  source?: string;
  type: string;
  message?: string;
  payload?: unknown;
};

type AgentRunner = "codex" | "claude" | "manual";

const cliOptions = parseCliOptions(process.argv.slice(2));
const gameName = cliOptions.gameName || process.env.GAME_NAME;
const sessionId = cliOptions.sessionId || process.env.SESSION_ID;
const arenaUrl = process.env.ARENA_URL || "http://localhost:3011";
const port = Number(process.env.LOCAL_CLIENT_PORT || 3012);
const runner = (cliOptions.runner || process.env.AGENT_RUNNER || "manual") as AgentRunner;
const maxEvents = Number(process.env.AGENT_EVENT_HISTORY || 12);
const runnerTimeoutMs = Number(process.env.AGENT_RUNNER_TIMEOUT_MS || 120000);

if (!gameName || !sessionId) {
  console.error(
    "Usage: npx agent-arena-online-client <game_name> <session_id> --runner codex|claude|manual --name <agent_name> --strategy <strategy>",
  );
  process.exit(1);
}

if (!["codex", "claude", "manual"].includes(runner)) {
  console.error(`Invalid runner "${runner}". Use codex, claude, or manual.`);
  process.exit(1);
}

const prepareSchema = z.object({
  agentName: z.string().min(1).max(80),
  strategy: z.string().min(1).max(2000),
});

const agentDecisionSchema = z.object({
  type: z.string().min(1).max(80).default("agent.intent"),
  instruction: z.string().min(1).max(2000),
  rationale: z.string().max(1000).optional(),
  payload: z.record(z.unknown()).optional(),
});

let preparedAgent: z.infer<typeof prepareSchema> | null =
  cliOptions.agentName && cliOptions.strategy
    ? {
        agentName: cliOptions.agentName,
        strategy: cliOptions.strategy,
      }
    : null;
let joined = false;
let thinking = false;
const eventHistory: ArenaEvent[] = [];

const socket = io(arenaUrl, {
  reconnection: true,
});

function parseCliOptions(args: string[]) {
  const positional: string[] = [];
  const options: {
    gameName?: string;
    sessionId?: string;
    runner?: string;
    agentName?: string;
    strategy?: string;
  } = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--runner" || arg === "--agent") {
      options.runner = args[index + 1];
      index += 1;
    } else if (arg === "--name" || arg === "--agent-name") {
      options.agentName = args[index + 1];
      index += 1;
    } else if (arg === "--strategy" || arg === "--strat") {
      options.strategy = args[index + 1];
      index += 1;
    } else if (arg.startsWith("--runner=") || arg.startsWith("--agent=")) {
      options.runner = arg.split("=").slice(1).join("=");
    } else if (arg.startsWith("--name=") || arg.startsWith("--agent-name=")) {
      options.agentName = arg.split("=").slice(1).join("=");
    } else if (arg.startsWith("--strategy=") || arg.startsWith("--strat=")) {
      options.strategy = arg.split("=").slice(1).join("=");
    } else {
      positional.push(arg);
    }
  }

  return {
    ...options,
    gameName: positional[0],
    sessionId: positional[1],
    runner: options.runner || positional[2],
    agentName: options.agentName || positional[3],
    strategy: options.strategy || positional.slice(4).join(" "),
  };
}

function joinArena() {
  if (!preparedAgent || !socket.connected || joined) return;

  socket.emit(
    "arena:join",
    {
      gameName,
      sessionId,
      role: "agent",
      agentName: preparedAgent.agentName,
      strategy: preparedAgent.strategy,
    },
    (response: { ok?: boolean; error?: string } | undefined) => {
      if (!response?.ok) {
        console.error("Failed to join arena:", response?.error || "Unknown error");
        return;
      }

      joined = true;
      console.log(`Agent "${preparedAgent?.agentName}" joined ${gameName}/${sessionId}`);
    },
  );
}

function shouldRespondToEvent(event: ArenaEvent) {
  if (!joined || !preparedAgent || thinking || runner === "manual") return false;
  if (event.type === "agent.disconnected") return false;
  if (event.type.startsWith("agent.") && event.source === "agent") return false;
  if (event.source === preparedAgent.agentName) return false;
  return true;
}

function buildPrompt(event: ArenaEvent) {
  return `You are the local gameplay brain for an Agent Arena Online player agent.

Game: ${gameName}
Session: ${sessionId}
Agent name: ${preparedAgent?.agentName}
Agent behavior strategy: ${preparedAgent?.strategy}

The arena server is authoritative. Do not claim wins, losses, damage, health, ranks, achievements, cooldowns, or hidden state unless present in the event history.

Your job is to decide the next gameplay intent for this agent based on the latest WebSocket event and recent event history. The user's setup strategy is the guiding behavior. If the current event does not require action, still return a short positioning or observation intent.

Return only valid JSON in this shape:
{
  "type": "agent.intent",
  "instruction": "concise tactical instruction to send to the arena",
  "rationale": "brief reason",
  "payload": {
    "intent": "short machine-readable intent",
    "confidence": "low|medium|high"
  }
}

Latest event:
${JSON.stringify(event, null, 2)}

Recent event history:
${JSON.stringify(eventHistory.slice(-maxEvents), null, 2)}
`;
}

function runnerCommand(prompt: string) {
  if (runner === "codex") {
    return {
      command: "codex",
      args: ["exec", "--skip-git-repo-check", prompt],
    };
  }

  if (runner === "claude") {
    return {
      command: "claude",
      args: ["-p", prompt],
    };
  }

  return null;
}

async function invokeRunner(prompt: string) {
  const command = runnerCommand(prompt);
  if (!command) throw new Error("No automatic runner configured");

  return new Promise<string>((resolve, reject) => {
    const child = spawn(command.command, command.args, {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";

    const timer = windowlessTimeout(() => {
      child.kill();
      reject(new Error(`${runner} timed out after ${runnerTimeoutMs}ms`));
    }, runnerTimeoutMs);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(`${runner} exited with ${code}: ${stderr.trim()}`));
        return;
      }

      resolve(stdout.trim());
    });
  });
}

function windowlessTimeout(callback: () => void, ms: number) {
  return setTimeout(callback, ms);
}

function parseRunnerDecision(output: string) {
  const jsonMatch = output.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return {
      type: "agent.intent",
      payload: {
        instruction: output.slice(0, 2000),
        raw: output,
      },
    };
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(jsonMatch[0]);
  } catch {
    return {
      type: "agent.intent",
      payload: {
        instruction: output.slice(0, 2000),
        raw: output,
      },
    };
  }

  const parsed = agentDecisionSchema.safeParse(parsedJson);
  if (!parsed.success) {
    return {
      type: "agent.intent",
      payload: {
        instruction: output.slice(0, 2000),
        raw: output,
      },
    };
  }

  return {
    type: parsed.data.type,
    payload: {
      instruction: parsed.data.instruction,
      rationale: parsed.data.rationale,
      ...(parsed.data.payload || {}),
    },
  };
}

function emitAgentAction(action: { type: string; payload: unknown }) {
  socket.emit(
    "arena:action",
    {
      sessionId,
      gameName,
      type: action.type,
      payload: action.payload,
    },
    (response: { ok?: boolean; error?: string } | undefined) => {
      if (!response?.ok) {
        console.error("Agent action rejected:", response?.error || "Unknown error");
        return;
      }

      console.log(`[agent:${action.type}]`, JSON.stringify(action.payload));
    },
  );
}

async function handleArenaEvent(event: ArenaEvent) {
  eventHistory.push(event);
  eventHistory.splice(0, Math.max(0, eventHistory.length - maxEvents));
  console.log(`[arena:${event.type}]`, event.message || JSON.stringify(event.payload ?? {}));

  if (!shouldRespondToEvent(event)) return;

  thinking = true;
  try {
    const output = await invokeRunner(buildPrompt(event));
    emitAgentAction(parseRunnerDecision(output));
  } catch (error) {
    console.error(`${runner} failed:`, error instanceof Error ? error.message : error);
  } finally {
    thinking = false;
  }
}

socket.on("connect", () => {
  console.log(`Connected to ${arenaUrl} for ${gameName}/${sessionId}`);
  joinArena();
});

socket.on("arena:event", (event: ArenaEvent) => {
  handleArenaEvent(event).catch((error: unknown) => {
    console.error("Failed to handle arena event:", error);
  });
});

socket.on("disconnect", () => {
  joined = false;
  console.log("Disconnected from arena server");
});

if (preparedAgent) {
  console.log(`Prepared ${preparedAgent.agentName} with ${runner} runner`);
} else {
  console.log("No agent prepared yet. Use POST /prepare or restart with --name and --strategy.");
}

const app = express();
app.use(express.json());

app.get("/status", (_req, res) => {
  res.json({
    sessionId,
    gameName,
    arenaUrl,
    runner,
    connected: socket.connected,
    prepared: Boolean(preparedAgent),
    joined,
    thinking,
    agentName: preparedAgent?.agentName,
  });
});

app.post("/prepare", (req, res) => {
  const parsed = prepareSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ ok: false, error: "agentName and strategy are required" });
    return;
  }

  preparedAgent = parsed.data;
  joinArena();

  res.json({
    ok: true,
    joined,
    runner,
    message: joined ? "Agent joined arena" : "Agent prepared; waiting for websocket connection",
  });
});

app.post("/action", (req, res) => {
  if (!joined) {
    res.status(409).json({ ok: false, error: "Agent has not joined the arena yet" });
    return;
  }

  socket.emit(
    "arena:action",
    {
      sessionId,
      gameName,
      type: req.body?.type || "agent.action",
      payload: req.body?.payload ?? req.body,
    },
    (response: { ok?: boolean; error?: string } | undefined) => {
      if (!response?.ok) {
        res.status(400).json({ ok: false, error: response?.error || "Action rejected" });
        return;
      }

      res.json({ ok: true });
    },
  );
});

app.listen(port, () => {
  console.log(`Local agent server listening on http://localhost:${port}`);
  console.log("Prepare agent with POST /prepare { agentName, strategy }");
});
