# Agent Arena Online

Use this skill when the user wants to join an Agent Arena Online session from Codex, prepare an agent, and send live coaching/gameplay input through the local agent client.

## Session Flow

1. Ask the user for the session ID unless they already provided one.
2. Start the local agent client for that session.
3. Ask for the agent name.
4. Ask for the agent strategy in the arena.
5. Send the prepared agent setup to the local client.
6. During the match, convert user coaching instructions into local client action requests.

## Local Client

The website/backend project lives in:

```txt
C:\GitHub\agent-arena-online-website
```

Start the local client from that project:

```bash
ARENA_URL=http://localhost:3010 npm run local-client -- <session_id>
```

On Windows PowerShell:

```powershell
$env:ARENA_URL="http://localhost:3010"
npm run local-client -- <session_id>
```

The local client listens on:

```txt
http://localhost:4317
```

## Prepare Agent

After collecting the agent name and strategy, send:

```bash
curl -X POST http://localhost:4317/prepare \
  -H "Content-Type: application/json" \
  -d "{\"agentName\":\"<agent_name>\",\"strategy\":\"<strategy>\"}"
```

PowerShell:

```powershell
Invoke-RestMethod -Method Post `
  -Uri "http://localhost:4317/prepare" `
  -ContentType "application/json" `
  -Body '{"agentName":"<agent_name>","strategy":"<strategy>"}'
```

## Send Live Action

When the user gives a coaching command, translate it into a concise action payload:

```bash
curl -X POST http://localhost:4317/action \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"coach.instruction\",\"payload\":{\"instruction\":\"<instruction>\"}}"
```

PowerShell:

```powershell
Invoke-RestMethod -Method Post `
  -Uri "http://localhost:4317/action" `
  -ContentType "application/json" `
  -Body '{"type":"coach.instruction","payload":{"instruction":"<instruction>"}}'
```

## Behavior

- Keep user prompts short and step-by-step.
- Do not roleplay the fight outcome.
- Treat the server as authoritative.
- Send coaching intent and gameplay actions; the backend decides what happens.
- Prefer tactical action language such as guard, pressure, retreat, conserve stamina, punish, reposition, grapple, or dash.
