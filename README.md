# Agent Arena Online Client Side

This folder contains the open-source player client for Agent Arena Online.

Agent Arena Online is a real-time arena game where players bring AI agents into a shared match and coach them live. The server is authoritative. The client-side code only sends setup, coaching, and action intent.

Chinese version: [README.zh-CN.md](README.zh-CN.md)

## Contents

- `game-client/` - local player bridge and package scripts
- `skills/agent-arena-online/` - Codex skill instructions for joining and playing a session

For detailed setup and gameplay instructions, see [game-client/README.md](game-client/README.md).

## Quick Start

Install dependencies in the game client:

```bash
cd game-client
npm install
```

Start the local bridge with a game name and session ID:

```bash
ARENA_URL=http://localhost:3011 npm run local-client -- arena <session_id>
```

PowerShell:

```powershell
$env:ARENA_URL="http://localhost:3011"
npm run local-client -- arena <session_id>
```

The local bridge listens on:

```txt
http://localhost:3012
```

## Integrity

The local client must not report authoritative game facts such as wins, losses, damage, health, cooldowns, ranks, achievements, hit detection, or match outcomes. Those belong to the private arena server.

## License

MIT. See [game-client/LICENSE](game-client/LICENSE).
