/**
 * 会话元数据管理
 * 保存会话名称、创建时间等信息
 */
import fs from "fs";
import path from "path";

// 优先使用环境变量，否则使用默认路径
const baseDir = process.env.WORKSPACE_DIR || path.join(process.cwd(), "workspace");
const WORKSPACE_BASE = path.isAbsolute(baseDir) ? baseDir : path.join(process.cwd(), baseDir);
export const SESSION_DIR = path.join(WORKSPACE_BASE, "sessions");
const METADATA_FILE = path.join(SESSION_DIR, "metadata.json");

export interface SessionMetadata {
  [sessionId: string]: {
    name?: string;
    createdAt: number;
    modifiedAt: number;
  };
}

let metadataCache: SessionMetadata | null = null;

// 确保会话目录存在
function ensureDir() {
  if (!fs.existsSync(SESSION_DIR)) {
    fs.mkdirSync(SESSION_DIR, { recursive: true });
  }
}

// 加载元数据
export function loadMetadata(): SessionMetadata {
  if (metadataCache) {
    return metadataCache;
  }

  ensureDir();

  if (fs.existsSync(METADATA_FILE)) {
    try {
      const content = fs.readFileSync(METADATA_FILE, "utf-8");
      const parsed = JSON.parse(content);
      metadataCache = (parsed || {}) as SessionMetadata;
      return metadataCache;
    } catch {
      // 如果解析失败，返回空对象
    }
  }

  metadataCache = {};
  return metadataCache;
}

// 保存元数据
export function saveMetadata(metadata: SessionMetadata) {
  ensureDir();
  metadataCache = metadata;
  fs.writeFileSync(METADATA_FILE, JSON.stringify(metadata, null, 2));
}

// 获取单个会话的元数据
export function getSessionMetadata(sessionId: string) {
  const metadata = loadMetadata();
  return metadata[sessionId];
}

// 设置会话名称
export function setSessionName(sessionId: string, name: string) {
  const metadata = loadMetadata();
  const now = Date.now();

  if (!metadata[sessionId]) {
    metadata[sessionId] = {
      createdAt: now,
      modifiedAt: now,
    };
  }

  metadata[sessionId].name = name;
  metadata[sessionId].modifiedAt = now;
  saveMetadata(metadata);
}

// 更新会话修改时间
export function updateSessionModified(sessionId: string) {
  const metadata = loadMetadata();
  const now = Date.now();

  if (!metadata[sessionId]) {
    metadata[sessionId] = {
      createdAt: now,
      modifiedAt: now,
    };
  } else {
    metadata[sessionId].modifiedAt = now;
  }

  saveMetadata(metadata);
}

// 删除会话元数据
export function deleteSessionMetadata(sessionId: string) {
  const metadata = loadMetadata();
  delete metadata[sessionId];
  saveMetadata(metadata);
}
