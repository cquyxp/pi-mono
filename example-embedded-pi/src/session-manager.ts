import { SessionManager } from "@mariozechner/pi-coding-agent";
import { existsSync, mkdirSync } from "fs";
import { dirname } from "path";
import type { SessionManagerCache } from "./types.js";

// Cache SessionManager instances to avoid reopening the same file
const sessionCache: SessionManagerCache = {};
const SESSION_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Ensure the session file directory exists
 */
export function ensureSessionDir(sessionFile: string): void {
  const dir = dirname(sessionFile);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/**
 * Prewarm a session file - ensures it exists and is ready to use
 */
export function prewarmSessionFile(sessionFile: string): void {
  ensureSessionDir(sessionFile);

  if (!existsSync(sessionFile)) {
    // Create an empty session file
    const manager = SessionManager.open(sessionFile);
    manager.close();
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
      try {
        cache.manager?.close?.();
      } catch {
        // Ignore close errors
      }
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
  for (const cache of Object.values(sessionCache)) {
    try {
      cache.manager?.close?.();
    } catch {
      // Ignore close errors
    }
  }
  Object.keys(sessionCache).forEach((key) => delete sessionCache[key]);
}
