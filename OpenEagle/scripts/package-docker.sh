#!/bin/bash
# ========================================================
# Docker 镜像打包脚本
# 使用方法: ./scripts/package-docker.sh [版本号]
# ========================================================

VERSION=${1:-v1.0}
IMAGE_NAME="pi-agent"
IMAGE_TAG="${IMAGE_NAME}:${VERSION}"
TAR_FILE="${IMAGE_NAME}-${VERSION}.tar.gz"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}  Docker 镜像打包${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""
echo "版本: ${VERSION}"
echo "镜像: ${IMAGE_TAG}"
echo "输出: ${TAR_FILE}"
echo ""

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ 错误: Docker 未安装${NC}"
    exit 1
fi

# 检查是否在项目根目录
if [ ! -f "Dockerfile" ]; then
    echo -e "${RED}❌ 错误: 请在项目根目录运行此脚本${NC}"
    exit 1
fi

# 步骤 1: 构建镜像
echo -e "${GREEN}[1/3] 构建 Docker 镜像...${NC}"
if ! docker build -t "${IMAGE_TAG}" .; then
    echo -e "${RED}❌ 镜像构建失败${NC}"
    exit 1
fi

# 步骤 2: 导出镜像
echo ""
echo -e "${GREEN}[2/3] 导出镜像...${NC}"
echo "这可能需要几分钟，请稍候..."

if ! docker save "${IMAGE_TAG}" | gzip > "${TAR_FILE}"; then
    echo -e "${RED}❌ 镜像导出失败${NC}"
    exit 1
fi

# 步骤 3: 显示结果
echo ""
echo -e "${GREEN}[3/3] 完成！${NC}"

# 计算大小
SIZE=$(du -h "${TAR_FILE}" | cut -f1)
IMAGE_SIZE=$(docker images "${IMAGE_TAG}" --format "{{.Size}}")

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Docker 镜像打包完成${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "镜像信息:"
echo "  名称: ${IMAGE_TAG}"
echo "  大小: ${IMAGE_SIZE}"
echo ""
echo "打包文件:"
echo "  文件: ${TAR_FILE}"
echo "  大小: ${SIZE}"
echo ""
echo "在另一台机器上使用:"
echo "  1. 解压: gunzip ${TAR_FILE}"
echo "  2. 导入: docker load -i ${IMAGE_NAME}-${VERSION}.tar"
echo "  3. 创建数据卷: docker volume create pi-agent-data"
echo "  4. 运行容器:"
echo "     docker run -d \\"
echo "       --name pi-agent \\"
echo "       -p 7187:7187 \\"
echo "       -v pi-agent-data:/app/workspace \\"
echo "       -e ANTHROPIC_API_KEY=你的key \\"
echo "       --restart unless-stopped \\"
echo "       ${IMAGE_TAG}"
echo ""
echo "或使用 docker-compose:"
echo "  1. 复制 docker-compose.yml"
echo "  2. 修改 image 为 ${IMAGE_TAG}"
echo "  3. 运行: docker compose up -d"
echo ""
