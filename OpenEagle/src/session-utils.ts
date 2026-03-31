/**
 * Session management utilities
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from "fs";
import { join, basename, extname } from "path";
import { WORKSPACE_DIR, SESSION_DIR } from "./workspace-config.js";

export interface SessionInfo {
  sessionId: string;
  filePath: string;
  size: number;
  modified: Date;
  lineCount: number;
}

/**
 * List all available sessions
 */
export function listSessions(): SessionInfo[] {
  if (!existsSync(SESSION_DIR)) {
    return [];
  }

  const files = readdirSync(SESSION_DIR)
    .filter(f => f.endsWith(".jsonl"))
    .map(f => join(SESSION_DIR, f));

  return files.map(filePath => {
    const stats = existsSync(filePath) ? require("fs").statSync(filePath) : { size: 0, mtime: new Date() };
    const content = readFileSync(filePath, "utf-8");
    const lineCount = content.split("\n").filter(l => l.trim()).length;

    return {
      sessionId: basename(filePath, extname(filePath)),
      filePath,
      size: stats.size,
      modified: stats.mtime,
      lineCount,
    };
  }).sort((a, b) => b.modified.getTime() - a.modified.getTime());
}

/**
 * Get session file path for a given session ID
 */
export function getSessionFilePath(sessionId: string): string {
  if (!existsSync(SESSION_DIR)) {
    mkdirSync(SESSION_DIR, { recursive: true });
  }
  return join(SESSION_DIR, `${sessionId}.jsonl`);
}

/**
 * Export a session to a JSON file (for backup)
 */
export function exportSession(sessionId: string, outputPath?: string): string {
  const inputPath = getSessionFilePath(sessionId);
  if (!existsSync(inputPath)) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  const content = readFileSync(inputPath, "utf-8");
  const outputFile = outputPath || join(SESSION_DIR, `${sessionId}_export.json`);

  writeFileSync(outputFile, JSON.stringify({
    sessionId,
    exportedAt: new Date().toISOString(),
    sourceFile: inputPath,
    content,
  }, null, 2));

  return outputFile;
}

/**
 * Import a session from an exported JSON file
 */
export function importSession(exportPath: string, newSessionId?: string): string {
  if (!existsSync(exportPath)) {
    throw new Error(`Export file not found: ${exportPath}`);
  }

  const data = JSON.parse(readFileSync(exportPath, "utf-8"));
  const sessionId = newSessionId || data.sessionId;
  const outputPath = getSessionFilePath(sessionId);

  writeFileSync(outputPath, data.content);
  return outputPath;
}

/**
 * Print session info to console
 */
export function printSessionList(): void {
  const sessions = listSessions();

  console.log("=".repeat(80));
  console.log("Session List");
  console.log("=".repeat(80));

  if (sessions.length === 0) {
    console.log("No sessions found.");
    console.log();
    return;
  }

  console.log();
  sessions.forEach((session, index) => {
    console.log(`${index + 1}. ${session.sessionId}`);
    console.log(`   Path: ${session.filePath}`);
    console.log(`   Size: ${(session.size / 1024).toFixed(2)} KB`);
    console.log(`   Lines: ${session.lineCount}`);
    console.log(`   Modified: ${session.modified.toLocaleString()}`);
    console.log();
  });

  console.log(`Total: ${sessions.length} session(s)`);
  console.log();
}

/**
 * Delete a session
 */
export function deleteSession(sessionId: string): boolean {
  const filePath = getSessionFilePath(sessionId);
  if (existsSync(filePath)) {
    require("fs").unlinkSync(filePath);
    return true;
  }
  return false;
}
