"use client";

import { useEffect, useMemo, useState } from "react";
import { io, type Socket } from "socket.io-client";

type ArenaEvent = {
  id: string;
  at: string;
  source: string;
  type: string;
  message?: string;
  payload?: unknown;
};

type Agent = {
  socketId: string;
  name?: string;
  strategy?: string;
  connected: boolean;
  ready: boolean;
  joinedAt: string;
};

type ArenaSession = {
  id: string;
  status: string;
  agents: Agent[];
  events: ArenaEvent[];
};

export function Monitor({ sessionId }: { sessionId: string }) {
  const [connected, setConnected] = useState(false);
  const [session, setSession] = useState<ArenaSession | null>(null);
  const [events, setEvents] = useState<ArenaEvent[]>([]);

  const displaySessionId = useMemo(() => sessionId.trim(), [sessionId]);

  useEffect(() => {
    if (!displaySessionId) return;

    const socket: Socket = io();

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("arena:join", {
        sessionId: displaySessionId,
        role: "monitor"
      });
    });

    socket.on("disconnect", () => setConnected(false));

    socket.on("arena:session", (nextSession: ArenaSession) => {
      setSession(nextSession);
      setEvents(nextSession.events || []);
    });

    socket.on("arena:event", (event: ArenaEvent) => {
      setEvents((current) => [...current.slice(-99), event]);
    });

    return () => {
      socket.disconnect();
    };
  }, [displaySessionId]);

  if (!displaySessionId) {
    return (
      <main className="monitorShell">
        <section className="emptyState">
          <h1>Missing session</h1>
          <p>Open this page with a session query, for example /play?session=demo.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="monitorShell">
      <header className="monitorHeader">
        <div>
          <p className="eyebrow">Session</p>
          <h1>{displaySessionId}</h1>
        </div>
        <div className={connected ? "status online" : "status"}>{connected ? "Live" : "Offline"}</div>
      </header>

      <section className="arenaGrid">
        <section className="panel">
          <div className="panelHeader">
            <h2>Agents</h2>
            <span>{session?.status || "waiting"}</span>
          </div>
          <div className="agentList">
            {(session?.agents || []).map((agent) => (
              <article className="agentCard" key={agent.socketId}>
                <div>
                  <h3>{agent.name || "Unnamed Agent"}</h3>
                  <p>{agent.ready ? "Ready" : "Preparing"}</p>
                </div>
                <span className={agent.connected ? "dot connected" : "dot"} />
              </article>
            ))}
            {!session?.agents?.length && <p className="muted">No agents have joined yet.</p>}
          </div>
        </section>

        <section className="panel eventPanel">
          <div className="panelHeader">
            <h2>Realtime Feed</h2>
            <span>{events.length}</span>
          </div>
          <ol className="eventList">
            {events.map((event) => (
              <li key={event.id}>
                <time>{new Date(event.at).toLocaleTimeString()}</time>
                <strong>{event.type}</strong>
                <p>{event.message || JSON.stringify(event.payload ?? {})}</p>
              </li>
            ))}
            {!events.length && <p className="muted">Waiting for session activity.</p>}
          </ol>
        </section>
      </section>
    </main>
  );
}
