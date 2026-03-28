# Coze Studio 前端迁移指南

## 📋 迁移文件清单

### 第一阶段：核心配置文件（必需）

```
pi-agent-frontend/
├── package.json              # 依赖配置
├── tsconfig.json             # TypeScript 配置
├── tailwind.config.ts        # Tailwind 配置
├── rsbuild.config.ts         # 构建配置
├── .gitignore
└── index.html
```

### 第二阶段：核心聊天组件（最重要）

从以下位置复制：

```
frontend/packages/common/chat-area/
├── chat-area/                # 主聊天界面
├── chat-core/                # 核心逻辑
├── chat-uikit/               # UI 组件
├── chat-uikit-shared/        # 共享组件
└── hooks/                    # React Hooks
```

### 第三阶段：UI 基础库

```
frontend/packages/arch/
├── bot-semi/                 # Semi Design 封装
├── bot-icons/                # 图标库
├── coze-design/              # Coze 设计系统
├── i18n/                     # 国际化
├── bot-utils/                # 工具函数
├── utils/                    # 更多工具
└── bot-md-box-adapter/       # Markdown 渲染
```

### 第四阶段：样式文件

```
frontend/apps/coze-studio/src/
├── global.less
└── index.less
```

---

## 🎯 推荐方案：从零开始（更简单）

由于依赖关系太复杂，建议：

1. **创建新的 Vite + React + TypeScript 项目**
2. **复制样式系统**（Tailwind 配置 + 全局样式）
3. **使用现成的聊天组件库** + Coze 的样式
4. **直接对接 pi-agent API**

### 快速开始命令：

```bash
npm create vite@latest pi-agent-frontend -- --template react-ts
cd pi-agent-frontend
npm install
npm install tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

---

## 📦 核心依赖提取

```json
{
  "dependencies": {
    "react": "~18.2.0",
    "react-dom": "~18.2.0",
    "zustand": "^4.4.7",
    "@douyinfe/semi-ui": "^2.47.0",
    "@douyinfe/semi-icons": "^2.47.0",
    "classnames": "^2.3.2",
    "lodash-es": "^4.17.21",
    "ahooks": "^3.7.8",
    "nanoid": "^4.0.2",
    "mitt": "^3.0.1",
    "eventemitter3": "^5.0.1",
    "immer": "^10.0.3"
  },
  "devDependencies": {
    "tailwindcss": "~3.3.3",
    "typescript": "~5.8.2"
  }
}
```
