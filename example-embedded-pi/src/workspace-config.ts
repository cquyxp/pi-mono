/**
 * Workspace configuration loader
 * Loads system prompt from workspace/AGENTS.md
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";

export const WORKSPACE_DIR = join(process.cwd(), "workspace");
export const SESSION_DIR = join(WORKSPACE_DIR, "sessions");
export const AGENTS_DIR = join(WORKSPACE_DIR, "agents");
const AGENTS_MD_PATH = join(WORKSPACE_DIR, "AGENTS.md");

/**
 * Get the system prompt from workspace/AGENTS.md
 * Returns undefined if the file doesn't exist
 */
export function getWorkspaceSystemPrompt(): string | undefined {
  if (!existsSync(AGENTS_MD_PATH)) {
    return undefined;
  }

  try {
    const content = readFileSync(AGENTS_MD_PATH, "utf-8");
    // Strip frontmatter if present
    const stripped = stripFrontmatter(content);
    return stripped.trim() || undefined;
  } catch (error) {
    console.warn("Failed to read AGENTS.md:", error);
    return undefined;
  }
}

/**
 * Strip YAML frontmatter from markdown content
 */
function stripFrontmatter(content: string): string {
  const frontmatterRegex = /^---\n[\s\S]*?\n---\n?/;
  return content.replace(frontmatterRegex, "");
}

/**
 * Get the workspace directory path
 */
export function getWorkspaceDir(): string {
  return WORKSPACE_DIR;
}

/**
 * Get the AGENTS.md path
 */
export function getAgentsMdPath(): string {
  return AGENTS_MD_PATH;
}
