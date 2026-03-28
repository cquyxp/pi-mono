#!/bin/bash
# 数据备份脚本
# 使用方法: ./scripts/backup-data.sh [备份文件名]

BACKUP_DIR="./backups"
BACKUP_NAME="${1:-pi-agent-backup-$(date +%Y%m%d-%H%M%S)}.tar.gz"

mkdir -p "$BACKUP_DIR"

echo "正在备份数据..."

# 如果 Docker volume 存在，用 Docker 备份
if docker volume ls | grep -q pi-agent-data; then
    docker run --rm \
        -v pi-agent-data:/data \
        -v "$(pwd)/$BACKUP_DIR":/backup \
        alpine tar czf "/backup/$BACKUP_NAME" /data
    echo "✅ Docker 数据备份完成: $BACKUP_DIR/$BACKUP_NAME"
else
    # 否则备份本地 workspace 目录
    if [ -d "./workspace" ]; then
        tar czf "$BACKUP_DIR/$BACKUP_NAME" workspace/
        echo "✅ 本地数据备份完成: $BACKUP_DIR/$BACKUP_NAME"
    else
        echo "❌ 未找到数据目录"
        exit 1
    fi
fi
