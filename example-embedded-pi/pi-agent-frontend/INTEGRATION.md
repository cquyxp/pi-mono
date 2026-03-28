# Pi Agent Frontend 整合指南

## 概述

新的 `pi-agent-frontend` 已经成功整合到现有系统中！这是一个基于 React + TypeScript + Vite 的现代化前端，完全替代了原有的简单 HTML 前端。

## 技术栈

- **React 18.2** - UI 框架
- **TypeScript** - 类型安全
- **Vite** - 构建工具
- **Semi Design** - UI 组件库
- **Zustand** - 状态管理
- **Tailwind CSS** - 样式框架
- **React Markdown** - Markdown 渲染

## 已完成的修改

### 1. Vite 配置 (`vite.config.ts`)
- 构建输出目录设置为 `../public`（替换原有前端）
- 开发服务器代理配置到后端端口 7187
- WebSocket 代理配置

### 2. 状态管理 (`src/store/useChatStore.ts`)
- 添加 WebSocket 连接状态管理
- 支持流式消息更新
- 会话管理

### 3. 聊天页面 (`src/pages/ChatPage.tsx`)
- 完全重写，对接真实 WebSocket API
- 支持流式响应显示
- 连接状态指示器
- 历史消息加载
- 自动重连机制

### 4. 样式优化
- 添加连接状态指示灯
- 优化响应式布局

### 5. 根目录 `package.json`
- 添加前端相关脚本

## 使用方法

### 1. 安装前端依赖

```bash
# 从项目根目录
npm run frontend:install

# 或者直接进入前端目录
cd pi-agent-frontend
npm install
```

### 2. 开发模式（前端热重载）

```bash
# 终端 1: 启动后端服务器
npm start

# 终端 2: 启动前端开发服务器（端口 3000）
npm run frontend:dev
```

然后访问 http://localhost:3000

### 3. 生产构建

```bash
# 构建前端到 public 目录
npm run frontend:build

# 然后直接启动后端服务器即可
npm start
```

访问 http://localhost:7187 即可使用新前端。

## WebSocket API 说明

前端连接到后端的 `/ws` 端点，使用以下消息类型：

### 客户端 → 服务器
- `subscribe` - 订阅会话
- `prompt` - 发送提示词
- `get_history` - 获取历史消息
- `stop` - 停止生成

### 服务器 → 客户端
- `connected` - 连接成功
- `history` - 历史消息
- `partial_reply` - 部分回复（流式）
- `block_reply` - 完整回复
- `reasoning_stream` - 思考过程
- `tool_result` - 工具调用结果
- `success` / `error` - 操作结果

## 优势对比

| 特性 | 原有前端 | 新前端 |
|------|---------|--------|
| 技术栈 | 原生 HTML/JS | React + TypeScript |
| 组件化 | ❌ | ✅ |
| 类型安全 | ❌ | ✅ |
| 热重载 | ❌ | ✅ |
| Markdown 支持 | 基础 | 完整（GFM） |
| UI 组件库 | 自定义 | Semi Design |
| 状态管理 | 简单变量 | Zustand |
| 流式显示 | ✅ | ✅（更流畅） |

## 注意事项

1. **首次使用**需要运行 `npm run frontend:install` 安装前端依赖
2. **开发时**建议使用两个终端分别运行后端和前端
3. **部署时**先运行 `npm run frontend:build` 构建，再启动后端
4. 新前端会完全替换 `public` 目录下的原有文件
