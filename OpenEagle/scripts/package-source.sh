#!/bin/bash
# ========================================================
# 源代码打包脚本（不含 node_modules）
# 使用方法: ./scripts/package-source.sh [版本号]
# ========================================================

VERSION=${1:-v1.0}
NAME="example-embedded-pi-source-${VERSION}"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}  源代码打包${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""
echo "版本: ${VERSION}"
echo "包名: ${NAME}.tar.gz"
echo ""

# 检查是否在项目根目录
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ 错误: 请在项目根目录运行此脚本${NC}"
    exit 1
fi

# 创建临时目录
echo "创建临时目录..."
TMP_DIR=$(mktemp -d)
mkdir -p "$TMP_DIR/$NAME/"

# 复制需要的文件
echo "复制项目文件..."

# 主要目录和文件
cp -r src "$TMP_DIR/$NAME/" 2>/dev/null || echo "  ⚠️  跳过 src/"
cp -r public "$TMP_DIR/$NAME/" 2>/dev/null || echo "  ⚠️  跳过 public/"
cp -r scripts "$TMP_DIR/$NAME/" 2>/dev/null || echo "  ⚠️  跳过 scripts/"

# 配置文件
cp package.json "$TMP_DIR/$NAME/"
cp package-lock.json "$TMP_DIR/$NAME/" 2>/dev/null
cp tsconfig.json "$TMP_DIR/$NAME/" 2>/dev/null

# 文档
cp README.md "$TMP_DIR/$NAME/" 2>/dev/null
cp DEPLOYMENT_GUIDE.md "$TMP_DIR/$NAME/" 2>/dev/null
cp QUICK_START_DOCKER.md "$TMP_DIR/$NAME/" 2>/dev/null
cp DOCKER_README.md "$TMP_DIR/$NAME/" 2>/dev/null
cp PACKAGING_GUIDE.md "$TMP_DIR/$NAME/" 2>/dev/null

# Docker 相关
cp Dockerfile "$TMP_DIR/$NAME/" 2>/dev/null
cp docker-compose.yml "$TMP_DIR/$NAME/" 2>/dev/null
cp .dockerignore "$TMP_DIR/$NAME/" 2>/dev/null
cp .env.example "$TMP_DIR/$NAME/" 2>/dev/null

# Git 相关
cp .gitignore "$TMP_DIR/$NAME/" 2>/dev/null

# 清理不需要的文件
echo "清理敏感和临时文件..."
rm -rf "$TMP_DIR/$NAME/workspace"
rm -rf "$TMP_DIR/$NAME/node_modules"
rm -rf "$TMP_DIR/$NAME/.git"
rm -rf "$TMP_DIR/$NAME/dist"
rm -f "$TMP_DIR/$NAME/.env"
rm -f "$TMP_DIR/$NAME/"*.log
rm -f "$TMP_DIR/$NAME/"*.tmp
rm -f "$TMP_DIR/$NAME/"*.swp

# 创建压缩包
echo "创建压缩包..."
cd "$TMP_DIR"
tar czf "$OLDPWD/${NAME}.tar.gz" "$NAME/"

# 清理临时目录
cd "$OLDPWD"
rm -rf "$TMP_DIR"

# 计算大小
SIZE=$(du -h "${NAME}.tar.gz" | cut -f1)
FILE_COUNT=$(tar -tzf "${NAME}.tar.gz" | wc -l)

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ 打包完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "文件: ${NAME}.tar.gz"
echo "大小: ${SIZE}"
echo "文件数: ${FILE_COUNT}"
echo ""
echo "使用方法:"
echo "  1. 解压: tar xzf ${NAME}.tar.gz"
echo "  2. 进入: cd ${NAME}"
echo "  3. 安装: npm install"
echo "  4. 配置: cp .env.example .env 并编辑"
echo "  5. 运行: npm start"
echo ""
