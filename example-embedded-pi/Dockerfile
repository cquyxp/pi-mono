# ========================================================
# 多阶段构建 Dockerfile
# 第一阶段：构建阶段（安装所有依赖）
# ========================================================
FROM node:20-slim AS builder

# 设置工作目录
WORKDIR /app

# 复制 package 文件（这层会缓存，除非 package.json 改变）
COPY package*.json ./

# 安装依赖（包括开发依赖）
RUN npm install

# 复制源代码
COPY . .

# ========================================================
# 第二阶段：生产阶段（只包含运行时需要的文件）
# ========================================================
FROM node:20-slim

# 安装 curl（用于健康检查）
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 设置工作目录
WORKDIR /app

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=7187
ENV WORKSPACE_DIR=/app/workspace
ENV SETTINGS_DIR=/app/workspace/settings

# 从 builder 阶段复制需要的文件
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./
COPY --from=builder /app/tsconfig.json ./

# 创建必要的数据目录
RUN mkdir -p /app/workspace/sessions \
    && mkdir -p /app/workspace/settings \
    && mkdir -p /app/workspace/memory \
    && mkdir -p /app/workspace/agents \
    && mkdir -p /app/workspace/autoresearch-ts

# 设置目录权限（确保容器内的 node 用户可以写入）
RUN chown -R node:node /app/workspace

# 切换到非 root 用户（更安全）
USER node

# 暴露端口
EXPOSE 7187

# 健康检查：每 30 秒检查一次服务是否健康
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:7187/api/health || exit 1

# 启动命令
CMD ["npm", "start"]
