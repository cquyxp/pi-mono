# 项目可迁移性与 Docker 部署完整指南

这份指南专为初学者设计，从基础概念开始，一步步教你如何把这个项目迁移到其他机器，或者用 Docker 部署。

---

## 目录

1. [项目现状分析](#一项目现状分析)
2. [可迁移性优化建议](#二可迁移性优化建议)
3. [Docker 化完整教程](#三docker-化完整教程)
4. [常见问题解答](#四常见问题解答)

---

## 一、项目现状分析

### 1.1 这是什么项目？

这是一个 **AI 代理应用**，提供：
- Web 聊天界面（浏览器访问）
- 可以调用多个 AI 模型（Anthropic、OpenAI、火山引擎等）
- 支持会话保存和记忆功能
- 运行在 Node.js 环境中

### 1.2 当前项目结构

```
example-embedded-pi/
├── src/                    # 源代码目录
│   ├── server/            # Web 服务器代码
│   └── ...                # 其他功能模块
├── public/                # 网页界面文件
├── workspace/             # 运行时数据（会话、记忆等）
├── package.json           # 项目依赖配置
└── tsconfig.json          # TypeScript 配置
```

### 1.3 当前依赖的外部资源

项目运行需要：

| 资源类型 | 说明 | 问题 |
|---------|------|------|
| **Node.js** | JavaScript 运行环境 | 需要安装特定版本 |
| **npm 依赖** | 第三方库（express、ws 等） | 需要 `npm install` |
| **API Keys** | AI 服务密钥 | 需要配置环境变量 |
| **工作目录** | `workspace/`、`~/.example-embedded-pi/` | 数据存储位置 |
| **端口** | 7187 | 不能被其他程序占用 |

### 1.4 现在为什么不容易迁移？

1. **硬编码路径**：代码中用了 `process.cwd()`、`homedir()`，换系统可能出问题
2. **配置分散**：API Key 可以存多个地方（环境变量、设置文件）
3. **数据在多处**：会话在 `workspace/`，设置在用户主目录
4. **没有版本锁定**：依赖库版本可能更新导致不兼容

---

## 二、可迁移性优化建议

这部分教你如何修改代码，让项目更容易迁移。

### 2.1 使用环境变量统一配置

创建一个 `.env` 文件来管理所有配置：

```bash
# 复制这个文件为 .env，然后填入你的配置
PORT=7187

# API Keys（填入你的）
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GROQ_API_KEY=...
VOLCENGINE_API_KEY=...

# 数据存储目录
WORKSPACE_DIR=./workspace
SETTINGS_DIR=./workspace/settings
PUBLIC_DIR=./public

# 日志级别
LOG_LEVEL=info
```

### 2.2 使用 dotenv 加载配置

安装 dotenv：

```bash
npm install dotenv
```

然后在 `src/server/index.ts` 开头添加：

```typescript
import dotenv from 'dotenv';
dotenv.config();
```

### 2.3 统一数据存储路径

建议把所有数据都放在 `workspace/` 目录下：

| 数据类型 | 修改前 | 修改后 |
|---------|--------|--------|
| 会话 | `workspace/sessions/` | `workspace/sessions/` |
| 设置 | `~/.example-embedded-pi/` | `workspace/settings/` |
| 记忆 | `~/.example-embedded-pi/` | `workspace/memory/` |

### 2.4 创建 .gitignore

确保不把敏感文件提交到 Git：

```
node_modules/
dist/
.env
*.log
workspace/
.DS_Store
```

### 2.5 锁定依赖版本

在 `package.json` 中使用精确版本号（去掉 `^`）：

```json
{
  "dependencies": {
    "express": "4.18.2",
    "ws": "8.16.0"
  }
}
```

或者使用 `npm lockfile`（`package-lock.json` 已经在使用了）。

---

## 三、Docker 化完整教程

这是最简单的迁移方式！Docker 可以把整个项目打包成一个"盒子"，拿到任何机器上都能直接运行。

### 3.1 Docker 基础概念（小白必读）

| 概念 | 类比 | 说明 |
|-----|------|------|
| **镜像 (Image)** | 安装包 | 包含所有运行需要的东西 |
| **容器 (Container)** | 运行中的程序 | 从镜像启动的实例 |
| **Dockerfile** | 制作说明书 | 告诉 Docker 怎么构建镜像 |
| **docker-compose.yml** | 一键启动脚本 | 管理多个容器的配置 |

### 3.2 步骤 1：创建 Dockerfile

在项目根目录创建 `Dockerfile`：

```dockerfile
# 第一阶段：构建阶段
FROM node:20-slim AS builder

# 设置工作目录
WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 安装依赖
RUN npm install

# 复制源代码
COPY . .

# 第二阶段：运行阶段（更小的镜像）
FROM node:20-slim

# 设置工作目录
WORKDIR /app

# 从 builder 复制 node_modules 和源代码
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./

# 创建数据目录（确保容器内有这个目录）
RUN mkdir -p /app/workspace/sessions
RUN mkdir -p /app/workspace/settings
RUN mkdir -p /app/workspace/memory
RUN mkdir -p /app/workspace/agents

# 环境变量（可以在运行时覆盖）
ENV PORT=7187
ENV NODE_ENV=production

# 暴露端口
EXPOSE 7187

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:7187/api/health || exit 1

# 启动命令
CMD ["npm", "start"]
```

### 3.3 步骤 2：创建 .dockerignore

创建 `.dockerignore` 文件，避免把不需要的文件复制进镜像：

```
node_modules
npm-debug.log
dist
.git
.gitignore
.env
*.md
!README.md
workspace
.DS_Store
*.tmp
```

### 3.4 步骤 3：创建 docker-compose.yml（推荐）

这是最方便的方式，一键启动：

```yaml
version: '3.8'

services:
  pi-agent:
    # 从当前目录构建镜像
    build: .

    # 或者用已经构建好的镜像
    # image: your-name/pi-agent:latest

    container_name: pi-agent
    restart: unless-stopped

    ports:
      - "7187:7187"

    # 环境变量（可以在这里填入，或者用 .env 文件）
    environment:
      - PORT=7187
      - NODE_ENV=production
      # API Keys（建议从 .env 文件读取，不要直接写在这里）
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-}
      - OPENAI_API_KEY=${OPENAI_API_KEY:-}
      - GROQ_API_KEY=${GROQ_API_KEY:-}
      - VOLCENGINE_API_KEY=${VOLCENGINE_API_KEY:-}

    # 数据卷挂载：把容器内的数据保存到宿主机
    volumes:
      # 会话、设置等数据
      - pi-agent-data:/app/workspace
      # 如果想映射到宿主机的特定目录，用这个：
      # - ./workspace:/app/workspace

    # 资源限制
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M

# 命名卷：数据会持久化保存
volumes:
  pi-agent-data:
    name: pi-agent-data
```

### 3.5 步骤 4：修改代码支持 Docker

需要修改几处代码，让它在 Docker 中也能正常工作。

#### 修改 1：`src/server/settings-manager.ts`

让设置目录可以通过环境变量配置：

```typescript
import path from "path";

// 使用环境变量，默认为用户主目录
const baseDir = process.env.SETTINGS_DIR || path.join(homedir(), ".example-embedded-pi");
const SETTINGS_DIR = path.isAbsolute(baseDir) ? baseDir : path.join(process.cwd(), baseDir);
const SETTINGS_FILE = path.join(SETTINGS_DIR, "settings.json");
```

#### 修改 2：`src/server/memory-manager.ts`

同样修改记忆目录：

```typescript
import path from "path";

const baseDir = process.env.SETTINGS_DIR || path.join(homedir(), ".example-embedded-pi");
const MEMORY_DIR = path.isAbsolute(baseDir) ? baseDir : path.join(process.cwd(), baseDir);
const MEMORY_FILE = path.join(MEMORY_DIR, "MEMORY.md");
```

#### 修改 3：`src/server/websocket-handler.ts`

让工作目录可配置：

```typescript
const baseWorkspace = process.env.WORKSPACE_DIR || "workspace";
const WORKSPACE_BASE = path.isAbsolute(baseWorkspace)
  ? baseWorkspace
  : path.join(process.cwd(), baseWorkspace);

export const SESSION_DIR = path.join(WORKSPACE_BASE, "sessions");
const AGENT_DIR = path.join(WORKSPACE_BASE, "agents");
export const WORKSPACE_DIR = WORKSPACE_BASE;
```

#### 修改 4：`src/server/session-metadata.ts`

```typescript
const baseDir = process.env.WORKSPACE_DIR || path.join(process.cwd(), "workspace");
const WORKSPACE_BASE = path.isAbsolute(baseDir) ? baseDir : path.join(process.cwd(), baseDir);
export const SESSION_DIR = path.join(WORKSPACE_BASE, "sessions");
const METADATA_FILE = path.join(SESSION_DIR, "metadata.json");
```

#### 修改 5：`src/server/intelligent-memory.ts`

```typescript
const baseDir = process.env.WORKSPACE_DIR || path.join(process.cwd(), "workspace");
const WORKSPACE_BASE = path.isAbsolute(baseDir) ? baseDir : path.join(process.cwd(), baseDir);
export const MEMORY_DIR = path.join(WORKSPACE_BASE, "memory");
export const MEMORY_FILE = path.join(MEMORY_DIR, "MEMORY.md");
export const MEMORY_INDEX_FILE = path.join(MEMORY_DIR, "memory-index.json");
```

### 3.6 步骤 5：实际运行 Docker

#### 前置准备：安装 Docker

1. **Windows/Mac**: 下载 [Docker Desktop](https://www.docker.com/get-started)
2. **Linux**: 按发行版安装 Docker Engine

验证安装：

```bash
docker --version
docker compose version
```

#### 方式 A：使用 docker-compose（推荐）

1. 创建 `.env` 文件：

```bash
# 复制示例
cp .env.example .env

# 编辑 .env，填入你的 API Keys
```

2. 构建并启动：

```bash
# 在项目根目录执行
docker compose up -d --build
```

3. 查看日志：

```bash
docker compose logs -f
```

4. 访问应用：

打开浏览器访问 http://localhost:7187

5. 停止服务：

```bash
docker compose down
```

#### 方式 B：只用 Docker（不使用 compose）

1. 构建镜像：

```bash
docker build -t pi-agent .
```

2. 创建数据卷：

```bash
docker volume create pi-agent-data
```

3. 运行容器：

```bash
docker run -d \
  --name pi-agent \
  -p 7187:7187 \
  -v pi-agent-data:/app/workspace \
  -e ANTHROPIC_API_KEY=你的key \
  -e OPENAI_API_KEY=你的key \
  --restart unless-stopped \
  pi-agent
```

4. 查看日志：

```bash
docker logs -f pi-agent
```

### 3.7 镜像管理

#### 导出镜像（可以拷贝到其他机器）

```bash
# 导出为 tar 文件
docker save pi-agent -o pi-agent-image.tar

# 压缩后更小
gzip pi-agent-image.tar
```

#### 导入镜像

```bash
# 解压（如果压缩了）
gunzip pi-agent-image.tar.gz

# 导入
docker load -i pi-agent-image.tar
```

#### 推送到 Docker Hub（可选）

```bash
# 登录
docker login

# 打标签
docker tag pi-agent your-username/pi-agent:v1.0

# 推送
docker push your-username/pi-agent:v1.0
```

---

## 四、常见问题解答

### Q1: Docker 镜像太大怎么办？

**A**: 有几种优化方法：

1. **使用多阶段构建**（我们的 Dockerfile 已经用了）
2. **使用 alpine 镜像**（更小，但可能缺少一些库）
3. **清理 npm 缓存**：

```dockerfile
RUN npm install && npm cache clean --force
```

### Q2: 数据会丢失吗？

**A**: 只要你配置了 `volumes`，数据就不会丢失。即使删除容器，数据卷里的内容还在。

### Q3: 如何备份数据？

**A**: 备份数据卷：

```bash
# 备份
docker run --rm -v pi-agent-data:/data -v $(pwd):/backup alpine tar czf /backup/pi-agent-backup.tar.gz /data

# 恢复
docker run --rm -v pi-agent-data:/data -v $(pwd):/backup alpine tar xzf /backup/pi-agent-backup.tar.gz -C /
```

### Q4: 如何更新到新版本？

**A**: 使用 docker-compose：

```bash
# 1. 拉取最新代码
git pull

# 2. 重新构建并启动
docker compose up -d --build
```

### Q5: Windows 上可以运行吗？

**A**: 完全可以！Docker Desktop for Windows 可以运行 Linux 容器。

### Q6: 没有 Docker 怎么迁移？

**A**: 可以用传统方式迁移：

1. **打包项目**：

```bash
# 排除 node_modules 和 workspace
tar czf pi-agent.tar.gz --exclude=node_modules --exclude=workspace example-embedded-pi/
```

2. **在新机器上**：

```bash
# 解压
tar xzf pi-agent.tar.gz

# 安装依赖
cd example-embedded-pi
npm install

# 配置 API Keys
export ANTHROPIC_API_KEY=...

# 启动
npm start
```

---

## 总结

| 方式 | 难度 | 推荐度 | 说明 |
|-----|------|-------|------|
| **Docker + Compose** | ⭐⭐ | ⭐⭐⭐⭐⭐ | 最推荐，一次配置处处运行 |
| **纯 Docker** | ⭐⭐⭐ | ⭐⭐⭐ | 适合简单部署 |
| **传统打包** | ⭐ | ⭐⭐ | 需要目标机器有 Node.js |

建议从 **Docker + Compose** 开始，这是最现代、最省心的方式！

有问题随时问我~ 🐳
