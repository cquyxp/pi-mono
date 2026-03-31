/**
 * MEMORY.md 长期记忆管理
 */
import fs from "fs";
import path from "path";
import { homedir } from "os";

// 优先使用环境变量，否则使用用户主目录
const baseDir = process.env.SETTINGS_DIR || path.join(homedir(), ".example-embedded-pi");
export const MEMORY_DIR = path.isAbsolute(baseDir) ? baseDir : path.join(process.cwd(), baseDir);
export const MEMORY_FILE = path.join(MEMORY_DIR, "MEMORY.md");

// 确保目录存在
function ensureDir() {
  if (!fs.existsSync(MEMORY_DIR)) {
    fs.mkdirSync(MEMORY_DIR, { recursive: true });
  }
}

// 读取 MEMORY.md
export function readMemory(): string {
  ensureDir();

  if (fs.existsSync(MEMORY_FILE)) {
    try {
      return fs.readFileSync(MEMORY_FILE, "utf-8");
    } catch {
      return "";
    }
  }
  return "";
}

// 写入 MEMORY.md
export function writeMemory(content: string) {
  ensureDir();
  fs.writeFileSync(MEMORY_FILE, content, "utf-8");
}

// 追加记忆条目
export function appendMemory(entry: string) {
  const existing = readMemory();
  const timestamp = new Date().toISOString().replace("T", " ").substring(0, 19);
  const newEntry = `\n## [${timestamp}]\n\n${entry}\n`;

  if (existing) {
    writeMemory(existing + newEntry);
  } else {
    writeMemory(`# Pi Agent 长期记忆\n\n${newEntry}`);
  }
}

// 解析记忆，返回最近的几条
export function getRecentMemory(limit: number = 10): Array<{ timestamp: string; content: string }> {
  const content = readMemory();
  if (!content) return [];

  const entries: Array<{ timestamp: string; content: string }> = [];
  const regex = /## \[([^\]]+)\]\n\n([\s\S]*?)(?=\n## \[|$)/g;

  let match;
  while ((match = regex.exec(content)) !== null) {
    entries.push({
      timestamp: match[1],
      content: match[2].trim(),
    });
  }

  return entries.reverse().slice(0, limit);
}
