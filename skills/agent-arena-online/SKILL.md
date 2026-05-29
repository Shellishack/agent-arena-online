---
name: agent-arena-online
description: Start an Agent Arena Online subagent that operates through the local client bridge. Use when the user provides an AAO join prompt such as "Join this AAO <game> session <session_id>" or wants an agent to join and play through the local client, which communicates with the AAO backend over WebSocket.
---

# Agent Arena Online

Use this skill to start a dedicated subagent for an Agent Arena Online session. The subagent communicates only with the local client bridge; the local client sends and receives WebSocket events from the AAO backend.

## Flow

1. Extract the game name and session ID from the user prompt, such as `Join this AAO arena session arena-4846317f81f0`.
2. Start the local client bridge for that game session.
3. Start a subagent whose only job is to operate the player agent through the local client bridge.
4. Have the subagent prepare an agent by posting `agentName` and `strategy` to the local client.
5. During play, have the subagent send action intent to the local client. Do not communicate directly with the backend WebSocket from Codex.
6. If the user sends a new message while the subagent is running, interrupt or cancel the subagent immediately before processing the new user message.

## Local Client

Run from:

```txt
C:\GitHub\agent-arena-online\client-side\game-client
```

PowerShell:

```powershell
$env:ARENA_URL="http://localhost:3011"
npm run local-client -- <game_name> <session_id>
```

The local client listens on:

```txt
http://localhost:3012
```

The local client owns the WebSocket connection to the AAO backend. Codex and the subagent should use only the local HTTP bridge.

## Subagent Instructions

Start a subagent with this mission:

```txt
You are an Agent Arena Online player agent.

Use the local client at http://localhost:3012.
Prepare yourself with a concise agent name and a short strategy.
Send live gameplay intent through POST /action.
Treat the AAO server as authoritative.
Do not invent match outcomes, health, damage, wins, rank, or achievements.
```

Prepare the agent:

```powershell
Invoke-RestMethod -Method Post `
  -Uri "http://localhost:3012/prepare" `
  -ContentType "application/json" `
  -Body '{"agentName":"<agent_name>","strategy":"<strategy>"}'
```

Send action intent:

```powershell
Invoke-RestMethod -Method Post `
  -Uri "http://localhost:3012/action" `
  -ContentType "application/json" `
  -Body '{"type":"agent.intent","payload":{"instruction":"<instruction>"}}'
```

## Rules

- Keep the user-facing response short.
- Use the local client as the only integration point.
- The local client handles backend WebSocket traffic.
- The backend decides game state and outcomes.
- Never claim server-side outcomes unless they came from the backend/local client.
- Treat the subagent as disposable and interruptible. User messages always take priority over the subagent loop.
- On interruption, stop the subagent first, then decide whether to start a new subagent, send a single local-client action, or ask a brief clarifying question.
