# 项目打包完整指南

根据你的需求，有多种打包方式可以选择。

---

## 目录

1. [方式一：Docker 镜像打包（推荐）](#方式一docker-镜像打包推荐)
2. [方式二：源代码打包（轻量）](#方式二源代码打包轻量)
3. [方式三：完整打包（含依赖）](#方式三完整打包含依赖)
4. [方式四：生产环境构建打包](#方式四生产环境构建打包)

---

## 方式一：Docker 镜像打包（推荐）

这是最推荐的方式，打包后拿到任何机器都能直接运行。

### 步骤 1：构建 Docker 镜像

```bash
# 在项目根目录执行
docker build -t pi-agent:v1.0 .
```

参数说明：
- `-t pi-agent:v1.0` - 给镜像起名字和标签（版本号）
- `.` - 使用当前目录的 Dockerfile

### 步骤 2：导出镜像为文件

```bash
# 导出为 tar 文件
docker save pi-agent:v1.0 -o pi-agent-v1.0.tar

# 压缩一下（推荐，文件更小）
gzip pi-agent-v1.0.tar
# 得到 pi-agent-v1.0.tar.gz
```

### 步骤 3：在另一台机器上导入并运行

```bash
# 1. 解压（如果压缩了）
gunzip pi-agent-v1.0.tar.gz

# 2. 导入镜像
docker load -i pi-agent-v1.0.tar

# 3. 创建数据卷
docker volume create pi-agent-data

# 4. 运行容器
docker run -d \
  --name pi-agent \
  -p 7187:7187 \
  -v pi-agent-data:/app/workspace \
  -e ANTHROPIC_API_KEY=你的key \
  --restart unless-stopped \
  pi-agent:v1.0
```

### （可选）推送到 Docker Hub

如果你想在线分享镜像：

```bash
# 1. 登录 Docker Hub
docker login

# 2. 打标签（你的用户名/镜像名:版本）
docker tag pi-agent:v1.0 your-username/pi-agent:v1.0

# 3. 推送
docker push your-username/pi-agent:v1.0

# 其他人就可以直接拉取了
docker pull your-username/pi-agent:v1.0
```

---

## 方式二：源代码打包（轻量）

适合给有 Node.js 环境的开发者。

### 创建打包脚本

在项目根目录创建 `scripts/package-source.sh`：

```bash
#!/bin/bash
# 源代码打包脚本（不含 node_modules）

VERSION=${1:-v1.0}
NAME="example-embedded-pi-source-${VERSION}"

# 临时目录
TMP_DIR=$(mktemp -d)

echo "正在打包源代码到 ${NAME}.tar.gz..."

# 复制需要的文件
cp -r . "$TMP_DIR/$NAME/"

# 删除不需要的文件
rm -rf "$TMP_DIR/$NAME/node_modules"
rm -rf "$TMP_DIR/$NAME/workspace"
rm -rf "$TMP_DIR/$NAME/.git"
rm -f "$TMP_DIR/$NAME/.env"
rm -f "$TMP_DIR/$NAME/*.log"

# 创建压缩包
cd "$TMP_DIR"
tar czf "$OLDPWD/${NAME}.tar.gz" "$NAME/"

# 清理
cd "$OLDPWD"
rm -rf "$TMP_DIR"

echo "✅ 打包完成: ${NAME}.tar.gz"
echo "   大小: $(du -h "${NAME}.tar.gz" | cut -f1)"
```

### Windows 版本 `scripts/package-source.bat`：

```batch
@echo off
REM 源代码打包脚本（Windows）

set VERSION=%1
if "%VERSION%"=="" set VERSION=v1.0
set NAME=example-embedded-pi-source-%VERSION%

echo 正在打包源代码...

REM 使用 PowerShell 创建压缩包
powershell -Command "Compress-Archive -Path @('src', 'public', 'package.json', 'package-lock.json', 'tsconfig.json', 'README.md', 'Dockerfile', 'docker-compose.yml', '.env.example', '.dockerignore', '.gitignore') -DestinationPath '%NAME%.zip' -Force"

echo 打包完成: %NAME%.zip
```

### 使用方法

```bash
# Linux/Mac
chmod +x scripts/package-source.sh
scripts/package-source.sh v1.0

# Windows
scripts\package-source.bat v1.0
```

### 接收方如何使用

```bash
# 1. 解压
tar xzf example-embedded-pi-source-v1.0.tar.gz
# 或 Windows 上用解压软件打开 .zip

# 2. 进入目录
cd example-embedded-pi-source-v1.0

# 3. 安装依赖
npm install

# 4. 配置环境变量
cp .env.example .env
# 编辑 .env 填入 API Keys

# 5. 运行
npm start
```

---

## 方式三：完整打包（含依赖）

适合目标机器没有网络的情况。

### 创建完整打包脚本

`scripts/package-full.sh`：

```bash
#!/bin/bash
# 完整打包脚本（含 node_modules）

VERSION=${1:-v1.0}
NAME="example-embedded-pi-full-${VERSION}"

echo "正在完整打包..."

# 1. 确保依赖是最新的
echo "安装依赖..."
npm ci

# 2. 临时目录
TMP_DIR=$(mktemp -d)

# 3. 复制文件
cp -r . "$TMP_DIR/$NAME/"

# 4. 删除不需要的
rm -rf "$TMP_DIR/$NAME/workspace"
rm -rf "$TMP_DIR/$NAME/.git"
rm -f "$TMP_DIR/$NAME/.env"
rm -f "$TMP_DIR/$NAME/*.log"

# 5. 打包
cd "$TMP_DIR"
tar czf "$OLDPWD/${NAME}.tar.gz" "$NAME/"

# 清理
cd "$OLDPWD"
rm -rf "$TMP_DIR"

echo "✅ 完整打包完成: ${NAME}.tar.gz"
echo "   大小: $(du -h "${NAME}.tar.gz" | cut -f1)"
```

### Windows 版本 `scripts/package-full.bat`：

```batch
@echo off
REM 完整打包脚本（Windows）

set VERSION=%1
if "%VERSION%"=="" set VERSION=v1.0
set NAME=example-embedded-pi-full-%VERSION%

echo 正在完整打包...

REM 确保依赖存在
if not exist "node_modules" (
    echo 安装依赖中...
    npm ci
)

REM 使用 PowerShell
powershell -Command "$exclude = @('workspace', '.git', '.env', '*.log'); $files = Get-ChildItem -Exclude $exclude; Compress-Archive -Path $files -DestinationPath '%NAME%.zip' -Force"

echo 完整打包完成: %NAME%.zip
```

### 使用方法

```bash
# 打包
scripts/package-full.sh v1.0

# 接收方解压后直接运行（不需要 npm install）
tar xzf example-embedded-pi-full-v1.0.tar.gz
cd example-embedded-pi-full-v1.0
npm start
```

---

## 方式四：生产环境构建打包

如果项目需要编译 TypeScript，用这种方式。

### 步骤 1：修改 tsconfig.json

确保有编译配置：

```json
{
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  }
}
```

### 步骤 2：添加构建脚本到 package.json

```json
{
  "scripts": {
    "build": "tsc",
    "start:prod": "node dist/server/index.js"
  }
}
```

### 步骤 3：构建并打包

创建 `scripts/package-prod.sh`：

```bash
#!/bin/bash
# 生产环境打包脚本

VERSION=${1:-v1.0}
NAME="example-embedded-pi-prod-${VERSION}"

echo "正在构建生产版本..."

# 1. 编译 TypeScript
npm run build

# 2. 临时目录
TMP_DIR=$(mktemp -d)
mkdir -p "$TMP_DIR/$NAME/"

# 3. 复制编译后的文件和必要资源
cp -r dist "$TMP_DIR/$NAME/"
cp -r public "$TMP_DIR/$NAME/"
cp package.json "$TMP_DIR/$NAME/"
cp package-lock.json "$TMP_DIR/$NAME/"

# 4. 在打包目录安装生产依赖
cd "$TMP_DIR/$NAME/"
npm ci --omit=dev

# 5. 打包
cd "$TMP_DIR"
tar czf "$OLDPWD/${NAME}.tar.gz" "$NAME/"

# 清理
cd "$OLDPWD"
rm -rf "$TMP_DIR"

echo "✅ 生产环境打包完成: ${NAME}.tar.gz"
```

---

## 📊 打包方式对比

| 方式 | 文件大小 | 目标机器要求 | 推荐度 | 适用场景 |
|-----|---------|------------|-------|---------|
| **Docker 镜像** | ~500MB-1GB | 只需 Docker | ⭐⭐⭐⭐⭐ | 生产环境、快速部署 |
| **源代码打包** | ~1-5MB | 需 Node.js + 网络 | ⭐⭐⭐ | 给开发者 |
| **完整打包** | ~100-300MB | 只需 Node.js | ⭐⭐⭐ | 无网络环境 |
| **生产构建** | ~50-100MB | 只需 Node.js | ⭐⭐⭐⭐ | 生产部署（无 Docker） |

---

## 🎯 推荐方案

### 场景 1：给客户/用户部署
→ **用 Docker 镜像**
```bash
docker build -t pi-agent:v1.0 .
docker save pi-agent:v1.0 | gzip > pi-agent-v1.0.tar.gz
```

### 场景 2：给其他开发者
→ **用源代码打包**
```bash
scripts/package-source.sh v1.0
```

### 场景 3：内网/无网络环境
→ **用完整打包**
```bash
scripts/package-full.sh v1.0
```

---

## 📝 打包清单

打包前检查：
- [ ] 代码已提交/备份
- [ ] 敏感信息已移除（`.env`、API keys）
- [ ] `node_modules` 是最新的（如果做完整打包）
- [ ] 测试过能正常运行
- [ ] 版本号已更新

打包后验证：
- [ ] 解压测试
- [ ] 检查文件完整性
- [ ] 在另一台机器测试运行
