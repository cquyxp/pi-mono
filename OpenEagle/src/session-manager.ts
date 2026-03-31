import { SessionManager } from "@mariozechner/pi-coding-agent";
import fs from "fs";
import path from "path";
import type { SessionManagerCache } from "./types.js";

// Cache SessionManager instances to avoid reopening the same file
const sessionCache: SessionManagerCache = {};
const SESSION_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Ensure the session file directory exists
 */
export function ensureSessionDir(sessionFile: string): void {
  const dir = path.dirname(sessionFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Prewarm a session file - ensures it exists and is ready to use
 */
export function prewarmSessionFile(sessionFile: string): void {
  ensureSessionDir(sessionFile);

  if (!fs.existsSync(sessionFile)) {
    // Create an empty session file by opening it
    SessionManager.open(sessionFile);
    // Don't call close() - SessionManager may not have this method
  }
}

/**
 * Get or create a cached SessionManager
 */
export function getCachedSessionManager(sessionFile: string): SessionManager {
  const now = Date.now();

  // Clean up expired entries
  for (const [file, cache] of Object.entries(sessionCache)) {
    if (now - cache.lastAccess > SESSION_CACHE_TTL) {
      // Don't call close() - just remove from cache
      delete sessionCache[file];
    }
  }

  // Get or create
  if (!sessionCache[sessionFile]) {
    ensureSessionDir(sessionFile);
    sessionCache[sessionFile] = {
      manager: SessionManager.open(sessionFile),
      lastAccess: now,
    };
  } else {
    sessionCache[sessionFile].lastAccess = now;
  }

  return sessionCache[sessionFile].manager as SessionManager;
}

/**
 * Track access to a session manager (updates cache TTL)
 */
export function trackSessionManagerAccess(sessionFile: string): void {
  if (sessionCache[sessionFile]) {
    sessionCache[sessionFile].lastAccess = Date.now();
  }
}

/**
 * Close all cached session managers
 */
export function closeAllSessionManagers(): void {
  // Just clear the cache - don't call close()
  Object.keys(sessionCache).forEach((key) => delete sessionCache[key]);
}
