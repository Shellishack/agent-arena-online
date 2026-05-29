# Agent Arena Online

![Agent Token meme](assets/agent-token-meme.png)

Agent Arena Online 是一个实时竞技场游戏。每个玩家都带着自己的 AI Agent 进入擂台，并在比赛中实时指挥它。这个项目不是角色扮演战斗，而是比拼谁更会操作 Agent：准备策略、临场指挥、打排位、上分，并通过胜场和参赛次数解锁称号。

English: [README.md](README.md)

本仓库是开源客户端部分：

- `../skills/agent-arena-online/SKILL.md`：给 Codex 使用的技能说明
- `local-client/server.ts`：运行在玩家电脑上的本地客户端桥接服务
- MIT 协议开源的本地工具

竞技场服务器是权威服务器。本地客户端只负责发送 Agent 设置、教练指令和行动意图。它不会决定伤害、生命值、冷却、排名、成就、命中判定或比赛结果。

## 工作方式

1. 在 Agent Arena Online 网站上创建或进入一个游戏 Session。
2. 玩家在浏览器中打开 Session 监控页面。
3. 玩家用 Session ID 启动本地客户端。
4. Codex 询问 Agent 名字和竞技场策略。
5. 本地客户端通过 WebSocket 连接到竞技场。
6. 比赛中，玩家通过 Codex 实时指挥 Agent。
7. 服务器验证行动，并广播实时比赛结果。

## 环境要求

- Node.js 20 或更新版本
- npm
- Codex，或其他可以向 `localhost` 发送 HTTP 请求的本地工具
- 一个有效的 Agent Arena Online Session ID

## 安装

```bash
npm install
```

## 开始游玩

使用你的 Session ID 启动本地客户端：

```bash
ARENA_URL=https://your-arena-server.example.com npm run local-client -- <game_name> <session_id>
```

内置游戏名为 `arena`、`gauntlet` 和 `relic`。

本地开发：

```bash
ARENA_URL=http://localhost:3011 npm run local-client -- arena demo
```

PowerShell：

```powershell
$env:ARENA_URL="http://localhost:3011"
npm run local-client -- arena demo
```

本地桥接服务监听：

```txt
http://localhost:3012
```

## 准备你的 Agent

Codex 应该依次收集：

- Agent 名字
- 竞技场策略

然后发送到本地桥接服务：

```bash
curl -X POST http://localhost:3012/prepare \
  -H "Content-Type: application/json" \
  -d "{\"agentName\":\"Scout\",\"strategy\":\"保持距离，节省体力，惩罚对手的重攻击失误。\"}"
```

PowerShell：

```powershell
Invoke-RestMethod -Method Post `
  -Uri "http://localhost:3012/prepare" `
  -ContentType "application/json" `
  -Body '{"agentName":"Scout","strategy":"保持距离，节省体力，惩罚对手的重攻击失误。"}'
```

## 比赛中实时指挥

发送实时教练指令：

```bash
curl -X POST http://localhost:3012/action \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"coach.instruction\",\"payload\":{\"instruction\":\"把对手压到边缘，但注意保留体力。\"}}"
```

好的指令应该是战术性的：

- 防守并等待反击机会
- 把对手压向边缘
- 停止追击，恢复体力
- 对手打空后用快速攻击惩罚
- 被击晕后先后撤

## 社区

- 社交链接：TODO
- 微信：TODO

项目正式公开前，请将这些占位符替换成官方链接或二维码说明。

## 竞技公平性

本地客户端刻意保持简单。它绝不能上报由客户端决定的事实，例如：

- 胜负
- 伤害
- 生命值
- 冷却
- 排名
- 成就
- 比赛结果

这些都由私有的权威服务器决定。

## 协议

MIT
