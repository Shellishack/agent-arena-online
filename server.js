import express from "express";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import { z } from "zod";

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT || 3010);
const app = next({ dev });
const handle = app.getRequestHandler();

const sessions = new Map();

const joinSchema = z.object({
  sessionId: z.string().min(1).max(64),
  role: z.enum(["monitor", "agent"]),
  agentName: z.string().min(1).max(80).optional(),
  strategy: z.string().min(1).max(2000).optional()
});

const actionSchema = z.object({
  sessionId: z.string().min(1).max(64),
  type: z.string().min(1).max(80),
  payload: z.unknown().optional()
});

function getSession(sessionId) {
  const existing = sessions.get(sessionId);
  if (existing) return existing;

  const session = {
    id: sessionId,
    status: "waiting",
    agents: new Map(),
    events: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  sessions.set(sessionId, session);
  return session;
}

function publicSession(session) {
  return {
    id: session.id,
    status: session.status,
    agents: Array.from(session.agents.values()),
    events: session.events.slice(-100),
    createdAt: session.createdAt,
    updatedAt: session.updatedAt
  };
}

function addEvent(io, session, event) {
  const fullEvent = {
    id: randomUUID(),
    at: new Date().toISOString(),
    ...event
  };

  session.events.push(fullEvent);
  session.updatedAt = fullEvent.at;

  io.to(session.id).emit("arena:event", fullEvent);
  io.to(session.id).emit("arena:session", publicSession(session));
}

await app.prepare();

const expressApp = express();
expressApp.use(express.json());

const httpServer = createServer(expressApp);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || "*"
  }
});

expressApp.get("/api/sessions/:sessionId", (req, res) => {
  const session = getSession(req.params.sessionId);
  res.json(publicSession(session));
});

io.on("connection", (socket) => {
  socket.on("arena:join", (input, callback = () => {}) => {
    const parsed = joinSchema.safeParse(input);
    if (!parsed.success) {
      callback({ ok: false, error: "Invalid join payload" });
      return;
    }

    const { sessionId, role, agentName, strategy } = parsed.data;
    const session = getSession(sessionId);

    socket.join(sessionId);
    socket.data.sessionId = sessionId;
    socket.data.role = role;

    if (role === "agent") {
      const agent = {
        socketId: socket.id,
        name: agentName,
        strategy,
        connected: true,
        ready: Boolean(agentName && strategy),
        joinedAt: new Date().toISOString()
      };

      session.agents.set(socket.id, agent);
      if (agent.ready) session.status = "playing";
      addEvent(io, session, {
        source: "server",
        type: "agent.joined",
        message: `${agentName} joined the arena`,
        payload: { agentName, ready: agent.ready }
      });
    }

    callback({ ok: true, session: publicSession(session) });
    socket.emit("arena:session", publicSession(session));
  });

  socket.on("arena:action", (input, callback = () => {}) => {
    const parsed = actionSchema.safeParse(input);
    if (!parsed.success) {
      callback({ ok: false, error: "Invalid action payload" });
      return;
    }

    const session = getSession(parsed.data.sessionId);
    addEvent(io, session, {
      source: socket.data.role || "client",
      type: parsed.data.type,
      payload: parsed.data.payload
    });
    callback({ ok: true });
  });

  socket.on("disconnect", () => {
    const { sessionId } = socket.data;
    if (!sessionId) return;

    const session = sessions.get(sessionId);
    if (!session) return;

    const agent = session.agents.get(socket.id);
    if (agent) {
      agent.connected = false;
      addEvent(io, session, {
        source: "server",
        type: "agent.disconnected",
        message: `${agent.name || "Agent"} disconnected`,
        payload: { agentName: agent.name }
      });
    }
  });
});

expressApp.all("*", (req, res) => handle(req, res));

httpServer.listen(port, () => {
  console.log(`Agent Arena Online listening on http://localhost:${port}`);
});
