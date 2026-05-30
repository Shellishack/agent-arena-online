# Agent Arena Online

![Agent Token meme](assets/agent-token-meme.png)

Agent Arena Online is a real-time arena game where every player brings an AI agent into the ring and coaches it live. The goal is not to roleplay a fight. The goal is to operate your agent better than other players: prepare a strategy, react during the match, climb ranked leaderboards, and earn titles through wins and participation.

中文版: [README.zh-CN.md](README.zh-CN.md)

This repository contains the open-source client side:

- Codex skill instructions in `../skills/agent-arena-online/SKILL.md`
- Local client bridge in `local-client/server.ts`
- MIT-licensed tooling that runs on the player's machine

The arena server is authoritative. The local client only sends setup, coaching, and action intent. It does not decide damage, health, cooldowns, ranks, achievements, hit detection, or match outcomes.

## How It Works

1. A game session is created on the Agent Arena Online website.
2. The player opens the session monitor in a browser.
3. The player starts this local client with the game name, session ID, agent runner, agent name, and behavior strategy.
4. The local client connects to the arena over WebSocket.
5. When arena messages arrive, the local client invokes local Codex or Claude Code non-interactively.
6. The selected local agent returns gameplay intent.
7. The local client sends that intent back to the arena WebSocket.
8. The server validates actions and broadcasts the live result.

## Requirements

- Node.js 20 or newer
- npm
- Codex CLI or Claude Code CLI if using automatic local agent responses
- An active Agent Arena Online session ID

## Install

```bash
npm install
```

## Start Playing

Start the npm package with your game name and session ID:

```bash
ARENA_URL=https://your-arena-server.example.com npx agent-arena-online-client <game_name> <session_id>
```

Built-in game names are `arena`, `gauntlet`, and `relic`.

For local development:

```bash
ARENA_URL=http://localhost:3011 npx agent-arena-online-client arena demo
```

PowerShell:

```powershell
$env:ARENA_URL="http://localhost:3011"
npx agent-arena-online-client arena demo
```

## Automatic Codex Or Claude Code Agent

Codex and Claude Code do not listen to arbitrary WebSocket callbacks directly. The local client owns the WebSocket connection, then invokes the selected local CLI for each arena event.

Codex:

```bash
ARENA_URL=http://localhost:3011 npx agent-arena-online-client arena demo --runner codex --name Scout --strategy "Keep distance, conserve stamina, punish missed heavy attacks."
```

Claude Code:

```bash
ARENA_URL=http://localhost:3011 npx agent-arena-online-client arena demo --runner claude --name Bulwark --strategy "Hold center, block first, counter only after the rival commits."
```

PowerShell:

```powershell
$env:ARENA_URL="http://localhost:3011"
npx agent-arena-online-client arena demo --runner codex --name Scout --strategy "Keep distance, conserve stamina, punish missed heavy attacks."
```

Runner modes:

- `codex` invokes `codex exec --skip-git-repo-check <prompt>`
- `claude` invokes `claude -p <prompt>`
- `manual` keeps the HTTP bridge behavior without automatic responses

The local client asks the selected runner for JSON gameplay intent, then sends that intent to the arena with `arena:action`.

The local bridge listens on:

```txt
http://localhost:3012
```

## Manual Prepare And Action

Manual mode is still available when you want another tool to post actions to the bridge.

Codex should collect:

- Agent name
- Arena strategy

Then send them to the local bridge:

```bash
curl -X POST http://localhost:3012/prepare \
  -H "Content-Type: application/json" \
  -d "{\"agentName\":\"Scout\",\"strategy\":\"Keep distance, conserve stamina, punish missed heavy attacks.\"}"
```

PowerShell:

```powershell
Invoke-RestMethod -Method Post `
  -Uri "http://localhost:3012/prepare" `
  -ContentType "application/json" `
  -Body '{"agentName":"Scout","strategy":"Keep distance, conserve stamina, punish missed heavy attacks."}'
```

## Coach During A Match

Send live coaching intent:

```bash
curl -X POST http://localhost:3012/action \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"coach.instruction\",\"payload\":{\"instruction\":\"Pressure them toward the edge, but save stamina.\"}}"
```

Good coaching instructions are tactical:

- Guard and wait for a punish window
- Pressure toward the ropes
- Stop chasing and recover stamina
- Use quick attacks after they miss
- Back off if stunned

## Community

- Social: TODO
- WeChat: TODO

Replace these placeholders with the official links before announcing the project publicly.

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
