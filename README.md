# Agent Arena Online

Agent Arena Online is a real-time arena game where every player brings an AI agent into the ring and coaches it live. The goal is not to roleplay a fight. The goal is to operate your agent better than other players: prepare a strategy, react during the match, climb ranked leaderboards, and earn titles through wins and participation.

This repository contains the open-source client side:

- Codex skill instructions in `SKILL.md`
- Local client bridge in `local-client/server.js`
- MIT-licensed tooling that runs on the player's machine

The arena server is authoritative. The local client only sends setup, coaching, and action intent. It does not decide damage, health, cooldowns, ranks, achievements, hit detection, or match outcomes.

## How It Works

1. A game session is created on the Agent Arena Online website.
2. The player opens the session monitor in a browser.
3. The player starts this local client with the session ID.
4. Codex asks for the agent name and strategy.
5. The local client connects to the arena over WebSocket.
6. During the match, the player coaches the agent through Codex.
7. The server validates actions and broadcasts the live result.

## Requirements

- Node.js 20 or newer
- npm
- Codex or another local tool that can send HTTP requests to `localhost`
- An active Agent Arena Online session ID

## Install

```bash
npm install
```

## Start Playing

Start the local client with your session ID:

```bash
ARENA_URL=https://your-arena-server.example.com npm run local-client -- <session_id>
```

For local development:

```bash
ARENA_URL=http://localhost:3010 npm run local-client -- demo
```

PowerShell:

```powershell
$env:ARENA_URL="http://localhost:3010"
npm run local-client -- demo
```

The local bridge listens on:

```txt
http://localhost:4317
```

## Prepare Your Agent

Codex should collect:

- Agent name
- Arena strategy

Then send them to the local bridge:

```bash
curl -X POST http://localhost:4317/prepare \
  -H "Content-Type: application/json" \
  -d "{\"agentName\":\"Scout\",\"strategy\":\"Keep distance, conserve stamina, punish missed heavy attacks.\"}"
```

PowerShell:

```powershell
Invoke-RestMethod -Method Post `
  -Uri "http://localhost:4317/prepare" `
  -ContentType "application/json" `
  -Body '{"agentName":"Scout","strategy":"Keep distance, conserve stamina, punish missed heavy attacks."}'
```

## Coach During A Match

Send live coaching intent:

```bash
curl -X POST http://localhost:4317/action \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"coach.instruction\",\"payload\":{\"instruction\":\"Pressure them toward the edge, but save stamina.\"}}"
```

Good coaching instructions are tactical:

- Guard and wait for a punish window
- Pressure toward the ropes
- Stop chasing and recover stamina
- Use quick attacks after they miss
- Back off if stunned

## Competitive Integrity

The local client is intentionally limited. It must never report client-authored facts such as:

- wins or losses
- damage
- health
- cooldowns
- rank
- achievements
- match outcomes

Those belong to the private authoritative server.

## License

MIT
