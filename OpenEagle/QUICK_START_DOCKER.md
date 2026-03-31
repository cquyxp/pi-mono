# Docker 快速启动指南（超简单版）

这份指南专门给初学者，一步步教你用 Docker 运行这个项目。

---

## 前提条件

你需要先安装 Docker：

1. **Windows/Mac**: 下载 [Docker Desktop](https://www.docker.com/get-started)
2. **Linux**: 按你的发行版安装 Docker Engine

安装好后，打开终端（命令行），输入：

```bash
docker --version
docker compose version
```

如果能看到版本号，说明安装成功了！

---

## 第一步：准备配置文件

### 1.1 复制环境变量模板

在项目文件夹里，找到 `.env.example` 文件，复制一份，改名为 `.env`：

```bash
# Windows (在项目文件夹里右键打开终端)
copy .env.example .env

# Mac/Linux
cp .env.example .env
```

### 1.2 填入你的 API Keys

用文本编辑器打开 `.env` 文件，填入你的 API Key：

```env
# 比如你有 Anthropic 的 Key
ANTHROPIC_API_KEY=sk-ant-你的key在这里

# 或者 OpenAI 的
OPENAI_API_KEY=sk-你的key在这里
```

> **注意**：`.env` 文件里的内容是秘密，不要发给别人，也不要上传到 GitHub！

---

## 第二步：启动 Docker

### 2.1 打开终端

在项目文件夹（有 `docker-compose.yml` 的那个文件夹）打开终端。

### 2.2 一键启动

输入：

```bash
docker compose up -d --build
```

然后等待... 第一次需要下载东西，可能要几分钟。

### 2.3 看看是不是启动成功了

输入：

```bash
docker compose logs -f
```

如果看到类似这样的输出，说明成功了：

```
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║   Embedded Pi Web Server                                      ║
║                                                                ║
║   Web UI:      http://localhost:7187                        ║
║   ...
```

按 `Ctrl+C` 退出日志查看。

---

## 第三步：使用

打开浏览器，访问：

**http://localhost:7187**

就可以用了！

---

## 常用命令

| 你想做什么 | 命令 |
|----------|------|
| 启动服务 | `docker compose up -d` |
| 停止服务 | `docker compose down` |
| 查看日志 | `docker compose logs -f` |
| 重启服务 | `docker compose restart` |
| 更新代码后重新构建 | `docker compose up -d --build` |

---

## 数据会丢吗？

不会！数据都存在 Docker 的"卷"里，即使你重启电脑、删除容器，数据都还在。

### 想备份数据？

```bash
# 备份（会在当前目录生成 pi-agent-backup.tar.gz）
docker run --rm -v pi-agent-data:/data -v $(pwd):/backup alpine tar czf /backup/pi-agent-backup.tar.gz /data

# 恢复
docker run --rm -v pi-agent-data:/data -v $(pwd):/backup alpine tar xzf /backup/pi-agent-backup.tar.gz -C /
```

---

## 遇到问题？

### 问题 1：端口被占用

如果 7187 端口被别的程序用了，修改 `docker-compose.yml`：

```yaml
ports:
  - "7188:7187"  # 把左边改成别的端口，比如 7188
```

然后访问 http://localhost:7188

### 问题 2：想看详细日志

```bash
docker compose logs -f --tail=100
```

### 问题 3：完全重置（删除所有数据）

```bash
# 停止并删除容器
docker compose down -v

# 删除数据卷
docker volume rm pi-agent-data
```

---

## 不使用 Docker Compose？

如果你只想用纯 Docker：

```bash
# 1. 构建镜像
docker build -t pi-agent .

# 2. 创建数据卷
docker volume create pi-agent-data

# 3. 运行
docker run -d \
  --name pi-agent \
  -p 7187:7187 \
  -v pi-agent-data:/app/workspace \
  -e ANTHROPIC_API_KEY=你的key \
  --restart unless-stopped \
  pi-agent
```

---

## 总结

就三个步骤：
1. 复制 `.env.example` 为 `.env`，填入 API Key
2. 运行 `docker compose up -d --build`
3. 浏览器打开 http://localhost:7187

搞定！🎉
