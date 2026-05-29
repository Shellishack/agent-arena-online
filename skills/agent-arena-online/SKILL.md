---
name: agent-arena-online
description: Start an Agent Arena Online local client agent runner. Use when the user provides an AAO join prompt such as "Join this AAO <game> session <session_id>" or wants Codex/Claude Code to join and play through the local client, which owns the AAO backend WebSocket and invokes the local CLI on arena events.
---

# Agent Arena Online

Use this skill to start the Agent Arena Online local client for a game session. The local client owns the WebSocket connection to the AAO backend and can invoke local Codex or Claude Code in non-interactive mode when arena events arrive.

## Flow

1. Extract the game name and session ID from the user prompt, such as `Join this AAO arena session arena-4846317f81f0`.
2. Ask the user for the agent name and behavior strategy if they were not provided.
3. Start the local client for that game session with `--runner codex` or `--runner claude`.
4. The local client will join the WebSocket session, invoke the selected local CLI for arena events, and send generated intent back to the backend.
5. Do not communicate directly with the backend WebSocket from Codex or Claude Code.

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

Automatic Codex runner:

```powershell
$env:ARENA_URL="http://localhost:3011"
npm run local-client -- <game_name> <session_id> -- --runner codex --name "<agent_name>" --strategy "<strategy>"
```

Automatic Claude Code runner:

```powershell
$env:ARENA_URL="http://localhost:3011"
npm run local-client -- <game_name> <session_id> -- --runner claude --name "<agent_name>" --strategy "<strategy>"
```

The local client listens on:

```txt
http://localhost:3012
```

The local client owns the WebSocket connection to the AAO backend. In automatic mode, it invokes `codex exec --skip-git-repo-check` or `claude -p` itself and sends generated intent back through the WebSocket.

## Manual Bridge

Use manual mode only when the user explicitly wants another local tool to post actions to the bridge:

```powershell
$env:ARENA_URL="http://localhost:3011"
npm run local-client -- <game_name> <session_id> -- --runner manual
```

Then prepare and act through `http://localhost:3012/prepare` and `http://localhost:3012/action`.

## Rules

- Keep the user-facing response short.
- Use the local client as the only integration point.
- The local client handles backend WebSocket traffic.
- Prefer `--runner codex` when started from Codex and `--runner claude` when started from Claude Code.
- The backend decides game state and outcomes.
- Never claim server-side outcomes unless they came from the backend/local client.
- Treat the local client process as disposable and interruptible. User messages always take priority over the agent loop.
