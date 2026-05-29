# Agent Arena Online 客户端

此文件夹包含 Agent Arena Online 的开源玩家客户端。

Agent Arena Online 是一个实时竞技场游戏。玩家把 AI Agent 带入同一场比赛，并在比赛中实时指挥。服务器是权威服务器，客户端代码只负责发送 Agent 设置、教练指令和行动意图。

English version: [README.md](README.md)

## 目录

- `game-client/` - 本地玩家桥接服务和 package 脚本
- `skills/agent-arena-online/` - 用于加入并游玩 Session 的 Codex 技能说明

详细安装和游玩说明请见 [game-client/README.zh-CN.md](game-client/README.zh-CN.md)。

## 快速开始

在 game client 中安装依赖：

```bash
cd game-client
npm install
```

使用游戏名和 Session ID 启动本地桥接服务：

```bash
ARENA_URL=http://localhost:3011 npm run local-client -- arena <session_id>
```

PowerShell：

```powershell
$env:ARENA_URL="http://localhost:3011"
npm run local-client -- arena <session_id>
```

本地桥接服务监听：

```txt
http://localhost:3012
```

## 竞技公平性

本地客户端不能上报权威游戏事实，例如胜负、伤害、生命值、冷却、排名、成就、命中判定或比赛结果。这些都属于私有竞技场服务器。

## 协议

MIT。见 [game-client/LICENSE](game-client/LICENSE)。
