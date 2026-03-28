/**
 * In-memory session store for tracking active sessions
 */
import type { AgentSession } from "@mariozechner/pi-coding-agent";
import type WebSocket from "ws";

export interface ActiveSession {
  session: AgentSession;
  connections: Set<WebSocket>;
  history: Array<{
    role: string;
    content: string;
    timestamp: number;
  }>;
  abortController?: AbortController;
  isRunning: boolean;
  systemPrompt?: string;
}

export class SessionStore {
  private sessions: Map<string, ActiveSession> = new Map();

  get(sessionId: string): ActiveSession | undefined {
    return this.sessions.get(sessionId);
  }

  set(sessionId: string, data: Omit<ActiveSession, "isRunning">): void {
    this.sessions.set(sessionId, { ...data, isRunning: false });
  }

  has(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  addConnection(sessionId: string, ws: WebSocket): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.connections.add(ws);
    }
  }

  removeConnection(sessionId: string, ws: WebSocket): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.connections.delete(ws);
      if (session.connections.size === 0) {
        // Optionally clean up session when no connections left
        // this.sessions.delete(sessionId);
      }
    }
  }

  addToHistory(
    sessionId: string,
    role: string,
    content: string
  ): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.history.push({
        role,
        content,
        timestamp: Date.now(),
      });
    }
  }

  getHistory(sessionId: string): Array<{ role: string; content: string }> {
    const session = this.sessions.get(sessionId);
    if (session) {
      return session.history.map(h => ({ role: h.role, content: h.content }));
    }
    return [];
  }

  broadcast(
    sessionId: string,
    message: string | Buffer | ArrayBuffer | Buffer[]
  ): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      for (const ws of session.connections) {
        if (ws.readyState === 1) {
          // OPEN
          ws.send(message);
        }
      }
    }
  }

  getAllSessions(): Array<{
    sessionId: string;
    connectionCount: number;
    historyLength: number;
  }> {
    return Array.from(this.sessions.entries()).map(([sessionId, data]) => ({
      sessionId,
      connectionCount: data.connections.size,
      historyLength: data.history.length,
    }));
  }
}

export const sessionStore = new SessionStore();
