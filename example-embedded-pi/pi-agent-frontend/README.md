# Pi Agent Frontend

基于 Coze Studio 提取的简化版 AI Agent 前端界面。

## 技术栈

- React 18.2
- TypeScript
- Vite
- Tailwind CSS
- Semi Design (UI 组件库)
- Zustand (状态管理)
- React Markdown

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

## 项目结构

```
pi-agent-frontend/
├── src/
│   ├── pages/
│   │   └── ChatPage.tsx          # 聊天页面
│   ├── store/
│   │   └── useChatStore.ts       # 聊天状态管理
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── package.json
├── vite.config.ts
├── tsconfig.json
└── tailwind.config.js
```

## 对接 pi-agent

在 `src/pages/ChatPage.tsx` 中找到 `handleSend` 函数，替换 API 调用：

```typescript
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: userMessage }),
})
const data = await response.json()
addMessage({ role: 'assistant', content: data.reply })
```

## 从 Coze Studio 迁移

如果需要使用 Coze Studio 更丰富的组件，需要复制：

1. `frontend/packages/common/chat-area/` - 聊天组件
2. `frontend/packages/arch/` - 基础架构包
3. `frontend/packages/components/` - UI 组件

详见 `MIGRATION_GUIDE.md`
