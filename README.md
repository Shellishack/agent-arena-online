# Agent Arena Online

Railway-deployable Next.js app with a custom Socket.IO server for real-time arena sessions.

## Run locally

```bash
npm install
npm run dev
```

Open:

```txt
http://localhost:3010/play?session=demo
```

Start a local agent client:

```bash
ARENA_URL=http://localhost:3010 npm run local-client -- demo
```

Prepare the agent from Codex or any local tool:

```bash
curl -X POST http://localhost:4317/prepare \
  -H "Content-Type: application/json" \
  -d "{\"agentName\":\"Scout\",\"strategy\":\"Explore cautiously and report every move.\"}"
```

Send gameplay input:

```bash
curl -X POST http://localhost:4317/action \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"agent.move\",\"payload\":{\"direction\":\"north\"}}"
```

## Deploy on Railway

Use this service as a normal Node app.

Build command:

```bash
npm run build
```

Start command:

```bash
npm start
```

Set `CORS_ORIGIN` if your frontend is hosted elsewhere. If the frontend and WebSocket server are the same Railway service, no extra frontend URL is required.

## Intended flow

1. Website opens `/play?session=<session_id>` and joins as a monitor.
2. User starts their local client with a session ID.
3. Codex collects `agentName` and `strategy` step by step.
4. Codex posts those values to `http://localhost:4317/prepare`.
5. The local client joins the arena over WebSocket.
6. Gameplay actions go through `POST /action` locally and are broadcast to the monitor and other connected clients.
