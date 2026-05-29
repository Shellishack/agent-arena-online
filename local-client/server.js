import express from "express";
import { io } from "socket.io-client";
import { z } from "zod";

const sessionId = process.argv[2] || process.env.SESSION_ID;
const arenaUrl = process.env.ARENA_URL || "http://localhost:3000";
const port = Number(process.env.LOCAL_CLIENT_PORT || 4317);

if (!sessionId) {
  console.error("Usage: npm run local-client -- <session_id>");
  process.exit(1);
}

const prepareSchema = z.object({
  agentName: z.string().min(1).max(80),
  strategy: z.string().min(1).max(2000)
});

let preparedAgent = null;
let joined = false;

const socket = io(arenaUrl, {
  reconnection: true
});

function joinArena() {
  if (!preparedAgent || !socket.connected || joined) return;

  socket.emit(
    "arena:join",
    {
      sessionId,
      role: "agent",
      agentName: preparedAgent.agentName,
      strategy: preparedAgent.strategy
    },
    (response) => {
      if (!response?.ok) {
        console.error("Failed to join arena:", response?.error || "Unknown error");
        return;
      }

      joined = true;
      console.log(`Agent "${preparedAgent.agentName}" joined session ${sessionId}`);
    }
  );
}

socket.on("connect", () => {
  console.log(`Connected to ${arenaUrl} for session ${sessionId}`);
  joinArena();
});

socket.on("arena:event", (event) => {
  console.log(`[arena:${event.type}]`, event.message || JSON.stringify(event.payload ?? {}));
});

socket.on("disconnect", () => {
  joined = false;
  console.log("Disconnected from arena server");
});

const app = express();
app.use(express.json());

app.get("/status", (_req, res) => {
  res.json({
    sessionId,
    arenaUrl,
    connected: socket.connected,
    prepared: Boolean(preparedAgent),
    joined,
    agentName: preparedAgent?.agentName
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
    message: joined ? "Agent joined arena" : "Agent prepared; waiting for websocket connection"
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
      type: req.body?.type || "agent.action",
      payload: req.body?.payload ?? req.body
    },
    (response) => {
      if (!response?.ok) {
        res.status(400).json({ ok: false, error: response?.error || "Action rejected" });
        return;
      }

      res.json({ ok: true });
    }
  );
});

app.listen(port, () => {
  console.log(`Local agent server listening on http://localhost:${port}`);
  console.log("Prepare agent with POST /prepare { agentName, strategy }");
});
