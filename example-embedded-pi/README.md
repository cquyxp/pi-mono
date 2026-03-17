# Example Embedded Pi Integration

这是一个类似 OpenClaw 架构的嵌入式 pi-coding-agent 集成示例，**包含完整的 Web 界面**。

## 架构概述

与 OpenClaw 类似，本示例展示了如何：

- **直接嵌入** - 不使用子进程或 RPC，而是直接导入 `createAgentSession()`
- **自定义工具** - 注入你自己的工具（消息、渠道特定操作等）
- **会话持久化** - 支持分支/压缩的会话管理
- **事件处理** - 完整控制会话生命周期和事件
- **系统提示自定义** - 每个渠道/上下文的系统提示自定义
- **Web UI** - 实时聊天界面，支持 WebSocket 流式传输

## 文件结构

```
example-embedded-pi/
├── package.json
├── tsconfig.json
├── README.md
├── public/
│   └── index.html      # Web UI 界面
└── src/
    ├── index.ts          # 主入口，重新导出所有内容
    ├── types.ts          # 类型定义
    ├── run.ts            # 主运行函数: runEmbeddedPiAgent()
    ├── subscribe.ts      # 事件订阅系统
    ├── tool-adapter.ts   # 工具定义适配器
    ├── session-manager.ts # 会话管理器缓存
    ├── example-tools.ts  # 示例自定义工具
    ├── demo.ts           # 使用演示
    ├── advanced/         # 高级功能扩展
    │   ├── index.ts
    │   ├── compaction-safeguard.ts
    │   └── context-pruning.ts
    └── server/           # Web 服务器
        ├── index.ts      # Express + WebSocket 服务器
        ├── types.ts      # WebSocket 消息类型
        ├── session-store.ts # 会话存储
        └── websocket-handler.ts # WebSocket 处理
```

## 快速开始

### 1. 安装依赖

```bash
cd example-embedded-pi
npm install
```

### 2. 设置 API Key

```bash
export ANTHROPIC_API_KEY=sk-ant-...
# 或者
export OPENAI_API_KEY=sk-...
```

### 3. 启动 Web 服务器（推荐）

```bash
npm start
```

然后在浏览器中打开: http://localhost:7187

### 4. 或运行命令行演示

```bash
npx tsx src/demo.ts
```

## 使用示例

### 基本用法

```typescript
import { runEmbeddedPiAgent } from "./src/index.js";

const result = await runEmbeddedPiAgent({
  sessionId: "user-123",
  sessionKey: "user:123:channel:discord",
  sessionFile: "/path/to/session.jsonl",
  workspaceDir: "/path/to/workspace",
  prompt: "Hello, how are you?",
  provider: "anthropic",
  model: "claude-sonnet-4-20250514",
  timeoutMs: 120_000,
  onBlockReply: async (payload) => {
    await sendToChannel(payload.text);
  },
});
```

### 使用自定义工具

```typescript
import { runEmbeddedPiAgent, createToolSchema } from "./src/index.js";

// 创建自定义工具
const myTool = createToolSchema({
  name: "my_tool",
  description: "My custom tool",
  properties: {
    param: { type: "string", description: "A parameter" },
  },
  required: ["param"],
});

myTool.execute = async (toolCallId, params) => {
  // 实现你的工具逻辑
  return { result: "success" };
};

// 运行时传入工具
const result = await runEmbeddedPiAgent({
  // ... 其他参数
  tools: [myTool],
});
```

### 事件处理

```typescript
const result = await runEmbeddedPiAgent({
  // ... 其他参数

  // 部分回复（流式）
  onPartialReply: (text) => {
    process.stdout.write(text);
  },

  // 推理内容
  onReasoningStream: (text) => {
    console.log(`[Thinking] ${text}`);
  },

  // 工具执行结果
  onToolResult: (result) => {
    console.log(`Tool ${result.name} called`);
  },

  // 完整块回复
  onBlockReply: (payload) => {
    console.log("Final:", payload.text);
  },
});
```

## Web UI 功能

启动服务器后访问 http://localhost:7187，你将获得：

- **实时聊天界面** - 类似 OpenClaw 的聊天体验
- **WebSocket 流式传输** - 实时显示回复和推理内容
- **会话管理** - 支持多个会话，可切换和清空
- **提供商选择** - 切换 Anthropic/OpenAI/Groq 等
- **模型选择** - 选择不同的模型
- **思考级别** - 调整推理深度 (off/low/medium/high)
- **工具结果显示** - 查看工具调用和执行结果
- **推理流显示** - 实时显示模型思考过程

### WebSocket API

连接到 `ws://localhost:7187/ws` 发送 JSON 消息：

```javascript
// 订阅会话
{
  "type": "subscribe",
  "data": { "sessionId": "my-session" }
}

// 发送提示
{
  "type": "prompt",
  "data": {
    "sessionId": "my-session",
    "prompt": "Hello!",
    "provider": "anthropic",
    "model": "claude-sonnet-4-20250514",
    "thinkingLevel": "medium"
  },
  "id": "1"
}
```

### REST API

- `GET /api/health` - 健康检查
- `GET /api/sessions` - 列出活动会话
- `POST /api/sessions/:sessionId/clear` - 清空会话历史

## 核心 API

### `runEmbeddedPiAgent(params)`

主要的运行函数，管理完整的会话生命周期。

**参数:**
- `sessionId` - 唯一会话标识符
- `sessionKey` - 用于持久化的会话键
- `sessionFile` - 会话 JSONL 文件路径
- `workspaceDir` - 代理工作目录
- `prompt` - 要发送的提示
- `provider` - 提供商 ID
- `model` - 模型 ID
- `tools` - 自定义工具数组
- `systemPrompt` - 系统提示覆盖
- `onBlockReply`, `onPartialReply`, 等 - 事件处理器

### `subscribeEmbeddedPiSession(params)`

订阅会话事件的底层函数。

### `toToolDefinitions(tools)`

将你的工具格式转换为 pi 的 `ToolDefinition` 格式。

### `getCachedSessionManager(sessionFile)`

获取或创建缓存的 `SessionManager` 实例。

## 架构要点

### 与 OpenClaw 类似的设计模式

1. **嵌入式，非 RPC** - 直接使用 `createAgentSession()`，完整控制
2. **工具适配器** - `toToolDefinitions()` 桥接工具签名差异
3. **会话缓存** - 避免重复打开相同的会话文件
4. **事件桥接** - 将 pi 的事件系统连接到你的回调
5. **系统提示自定义** - 完全控制系统提示内容

### 工具拆分策略

```typescript
// 我们将所有工具作为自定义工具传入，以便完全控制
const { builtInTools, customTools } = splitTools({ tools: myTools });
// builtInTools = [] (空)
// customTools = 转换后的我们的工具
```

### 会话文件格式

pi 使用 JSONL 格式存储会话：
- 每行是一个 JSON 条目
- 支持分支和压缩
- 可以缓存 `SessionManager` 实例

## 扩展

要添加类似 OpenClaw 的高级功能：

1. **认证配置文件轮换** - 管理多个 API 密钥并在失败时轮换
2. **压缩安全护栏** - 防止意外压缩
3. **上下文裁剪** - 基于 TTL 的消息裁剪
4. **块分块** - 将长回复分成块
5. **思考/最终标签剥离** - 解析 `<think>` 和 `<final>` 标签

## License

MIT
