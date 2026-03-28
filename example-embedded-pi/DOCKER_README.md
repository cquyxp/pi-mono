# 🐳 Docker 化完成！

项目现在已支持 Docker 部署了！以下是我们完成的工作：

---

## 📁 新增/修改的文件

### 配置文件
| 文件 | 说明 |
|-----|------|
| `Dockerfile` | Docker 镜像构建文件（多阶段构建） |
| `docker-compose.yml` | 一键启动配置（推荐使用） |
| `.dockerignore` | Docker 构建忽略文件 |
| `.env.example` | 环境变量模板 |

### 文档
| 文件 | 说明 |
|-----|------|
| `DEPLOYMENT_GUIDE.md` | 完整部署指南（从入门到精通） |
| `QUICK_START_DOCKER.md` | Docker 快速启动（超简单版） |
| `DOCKER_README.md` | 本文件 |

### 脚本
| 文件 | 说明 |
|-----|------|
| `scripts/backup-data.sh` | Linux/Mac 数据备份脚本 |
| `scripts/backup-data.bat` | Windows 数据备份脚本 |

### 代码修改
| 文件 | 修改内容 |
|-----|---------|
| `package.json` | 新增 `dotenv` 依赖 |
| `src/server/index.ts` | 加载 dotenv 配置 |
| `src/server/settings-manager.ts` | 支持环境变量配置目录 |
| `src/server/memory-manager.ts` | 支持环境变量配置目录 |
| `src/server/websocket-handler.ts` | 支持环境变量配置目录 |
| `src/server/session-metadata.ts` | 支持环境变量配置目录 |
| `src/server/intelligent-memory.ts` | 支持环境变量配置目录 |

---

## 🚀 快速开始（3步）

### 1. 配置环境变量
```bash
# 复制模板
cp .env.example .env

# 编辑 .env，填入你的 API Keys
```

### 2. 启动 Docker
```bash
docker compose up -d --build
```

### 3. 访问应用
打开浏览器：**http://localhost:7187**

---

## 📊 可迁移性改进

| 改进项 | 之前 | 现在 |
|-------|------|------|
| 配置管理 | 分散在多处 | 统一用 `.env` 文件 |
| 数据存储 | 分散在 `workspace/` 和用户主目录 | 统一在 `workspace/` |
| 路径硬编码 | 多处使用 `homedir()`、`process.cwd()` | 支持环境变量覆盖 |
| Docker 支持 | ❌ 无 | ✅ 完整支持 |
| 数据持久化 | 需手动备份 | Docker volumes 自动管理 |

---

## 🎯 部署方式对比

| 方式 | 难度 | 推荐度 | 场景 |
|-----|------|-------|------|
| **Docker Compose** | ⭐⭐ | ⭐⭐⭐⭐⭐ | 生产环境、需要迁移 |
| **纯 Docker** | ⭐⭐⭐ | ⭐⭐⭐ | 简单部署 |
| **传统 Node.js** | ⭐ | ⭐⭐ | 开发调试 |

---

## 🔧 常用 Docker 命令

```bash
# 启动
docker compose up -d

# 停止
docker compose down

# 查看日志
docker compose logs -f

# 重启
docker compose restart

# 更新并重新构建
docker compose up -d --build
```

---

## 💾 数据管理

### 备份数据
```bash
# Linux/Mac
./scripts/backup-data.sh

# Windows
scripts\backup-data.bat
```

### 数据位置
- **Docker**: 命名卷 `pi-agent-data`
- **本地**: `./workspace/` 目录

---

## 📚 更多文档

- **初学者** → 看 `QUICK_START_DOCKER.md`
- **想了解全部** → 看 `DEPLOYMENT_GUIDE.md`

---

## ✅ 验证清单

部署前检查：
- [ ] Docker 已安装
- [ ] `.env` 文件已配置 API Keys
- [ ] 7187 端口未被占用

部署后验证：
- [ ] 能访问 http://localhost:7187
- [ ] 健康检查返回 ok: `curl http://localhost:7187/api/health`
- [ ] 数据目录已创建

---

## 🎉 完成！

现在你可以：
1. 在任何机器上用 Docker 一键运行
2. 不用担心环境差异
3. 轻松备份和迁移数据
4. 在团队中共享一致的开发环境

有问题随时查看 `DEPLOYMENT_GUIDE.md`！
