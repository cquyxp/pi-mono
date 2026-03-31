/**
 * 智能记忆系统
 * - 自动从会话中提取要点到长期记忆
 * - 语义检索相关记忆
 */
import fs from "fs";
import path from "path";
import { homedir } from "os";

// 记忆存储位置 - 支持环境变量配置
const baseDir = process.env.WORKSPACE_DIR || path.join(process.cwd(), "workspace");
const WORKSPACE_BASE = path.isAbsolute(baseDir) ? baseDir : path.join(process.cwd(), baseDir);
export const MEMORY_DIR = path.join(WORKSPACE_BASE, "memory");
export const MEMORY_FILE = path.join(MEMORY_DIR, "MEMORY.md");
export const MEMORY_INDEX_FILE = path.join(MEMORY_DIR, "memory-index.json");

export interface MemoryEntry {
  id: string;
  timestamp: string;
  content: string;
  sourceSessionId?: string;
  sourceSessionName?: string;
  embedding?: number[];
}

export interface MemoryIndex {
  version: string;
  entries: MemoryEntry[];
}

// 确保目录存在
function ensureDir() {
  if (!fs.existsSync(MEMORY_DIR)) {
    fs.mkdirSync(MEMORY_DIR, { recursive: true });
  }
}

// 读取记忆索引
export function readMemoryIndex(): MemoryIndex {
  ensureDir();
  if (fs.existsSync(MEMORY_INDEX_FILE)) {
    try {
      const content = fs.readFileSync(MEMORY_INDEX_FILE, "utf-8");
      return JSON.parse(content) as MemoryIndex;
    } catch {
      // 读取失败时返回空索引
    }
  }
  return { version: "1.0", entries: [] };
}

// 保存记忆索引
export function saveMemoryIndex(index: MemoryIndex) {
  ensureDir();
  fs.writeFileSync(MEMORY_INDEX_FILE, JSON.stringify(index, null, 2), "utf-8");
}

// 读取 MEMORY.md
export function readMemoryMarkdown(): string {
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
export function writeMemoryMarkdown(content: string) {
  ensureDir();
  fs.writeFileSync(MEMORY_FILE, content, "utf-8");
}

// 追加记忆到 MEMORY.md 和索引
export function appendMemoryEntry(entry: Omit<MemoryEntry, "id" | "timestamp">) {
  const timestamp = new Date().toISOString().replace("T", " ").substring(0, 19);
  const id = `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const fullEntry: MemoryEntry = {
    id,
    timestamp,
    ...entry,
  };

  // 更新索引
  const index = readMemoryIndex();
  index.entries.unshift(fullEntry);
  // 保留最近 1000 条记忆
  if (index.entries.length > 1000) {
    index.entries = index.entries.slice(0, 1000);
  }
  saveMemoryIndex(index);

  // 更新 MEMORY.md
  const mdEntry = `\n## [${timestamp}]\n\n${entry.content}\n`;
  const existing = readMemoryMarkdown();
  if (existing) {
    writeMemoryMarkdown(existing + mdEntry);
  } else {
    writeMemoryMarkdown(`# Pi Agent 长期记忆\n\n${mdEntry}`);
  }

  return fullEntry;
}

// 简单的余弦相似度计算（用于当没有向量模型时的关键词匹配）
export function simpleKeywordScore(query: string, text: string): number {
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 1);
  const textLower = text.toLowerCase();
  let score = 0;
  for (const word of queryWords) {
    if (textLower.includes(word)) {
      score += 1;
    }
  }
  return score;
}

// 搜索相关记忆（简单关键词版本，后续可升级为向量检索）
export function searchRelevantMemories(query: string, limit: number = 5): MemoryEntry[] {
  const index = readMemoryIndex();
  if (index.entries.length === 0) return [];

  // 计算每个记忆的相关性分数
  const scored = index.entries.map((entry) => ({
    entry,
    score: simpleKeywordScore(query, entry.content),
  }));

  // 按分数排序，分数相同则按时间排序
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return new Date(b.entry.timestamp).getTime() - new Date(a.entry.timestamp).getTime();
  });

  // 返回前 limit 个且分数 > 0 的结果
  return scored.filter(s => s.score > 0).slice(0, limit).map(s => s.entry);
}

// 获取最近的记忆
export function getRecentMemories(limit: number = 10): MemoryEntry[] {
  const index = readMemoryIndex();
  return index.entries.slice(0, limit);
}

// 判断对话是否值得保存记忆（ heuristic 规则）
export function shouldExtractMemory(messages: Array<{ role: string; content: string }>): boolean {
  if (messages.length < 2) return false;

  const totalContent = messages.map(m => m.content).join("\n");
  const totalLength = totalContent.length;

  // 内容太短不值得保存
  if (totalLength < 100) return false;

  // 检查是否包含值得记忆的关键词
  const memoryKeywords = [
    "我喜欢", "我需要", "我偏好", "记住", "不要忘记",
    "我的名字", "我是", "我的项目", "我的工作",
    "重要", "关键", "决定", "结论", "总结",
    "学会了", "发现了", "解决了", "错误", "bug",
    "配置", "设置", "API", "密钥", "密码",
  ];

  const lowerContent = totalContent.toLowerCase();
  for (const keyword of memoryKeywords) {
    if (lowerContent.includes(keyword.toLowerCase())) {
      return true;
    }
  }

  // 内容足够长也值得保存
  if (totalLength > 500) return true;

  return false;
}

// 生成会话摘要的提示词（更完善的版本）
export function buildSessionSummaryPrompt(messages: Array<{ role: string; content: string }>): string {
  const conversationText = messages
    .map((m) => `${m.role === "user" ? "用户" : "AI"}: ${m.content}`)
    .join("\n\n");

  return `你是一个专业的记忆提取助手。请从以下对话中提取关键要点，作为长期记忆保存。

## 提取要求：
1. 提取 2-8 个关键要点（根据对话内容多少调整）
2. 每个要点用简洁的语言描述（1-3句话）
3. 重点提取：
   - 用户的偏好、习惯、需求
   - 重要的决定、结论、解决方案
   - 学到的知识、发现的问题
   - 项目相关的重要信息
   - 配置、设置、API 密钥等（如果有）
4. 不要提取琐碎的日常对话
5. 每个要点要独立、完整

对话内容：
${conversationText}

请仅输出要点，每行一个要点，不要其他解释。`;
}
