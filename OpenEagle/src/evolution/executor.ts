/**
 * Execute improvements safely
 */
import { execSync } from "child_process";
import { writeFileSync, readFileSync, existsSync, renameSync } from "fs";
import { join, dirname } from "path";
import type { ImprovementCandidate, ImprovementResult } from "./types.js";
import { getConfig, getState, recordImprovement } from "./state.js";

let hasGit = false;
try {
  execSync("git --version", { stdio: "ignore" });
  hasGit = true;
} catch {
  hasGit = false;
}

export async function executeImprovement(candidate: ImprovementCandidate): Promise<ImprovementResult> {
  const startTime = Date.now();
  const config = getConfig();

  // Create backup / git commit
  const backupInfo = await createBackup();

  try {
    let changes: string[] = [];

    switch (candidate.type) {
      case "documentation":
        changes = await executeDocumentationImprovement(candidate);
        break;
      case "tests":
        changes = await executeTestImprovement(candidate);
        break;
      case "refactoring":
        changes = await executeRefactoringImprovement(candidate);
        break;
      default:
        throw new Error(`Unknown improvement type: ${candidate.type}`);
    }

    // Verify changes are safe
    verifyChangeSafety(changes);

    const result: ImprovementResult = {
      success: true,
      candidate,
      changes,
      durationMs: Date.now() - startTime,
    };

    recordImprovement(result);
    return result;

  } catch (error) {
    // Rollback on failure
    if (config.autoRollbackOnFailure) {
      await rollback(backupInfo);
    }

    const result: ImprovementResult = {
      success: false,
      candidate,
      changes: [],
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startTime,
    };

    recordImprovement(result);
    return result;
  }
}

async function createBackup(): Promise<{ type: "git" | "file"; commitHash?: string; backups?: Map<string, string> }> {
  if (hasGit && isGitRepo()) {
    try {
      // Check if there are uncommitted changes
      const status = execSync("git status --porcelain", { encoding: "utf-8" });
      if (status.trim()) {
        // There are uncommitted changes, create a backup commit
        execSync("git add -A", { stdio: "ignore" });
        execSync('git commit -m "backup: before evolution"', { stdio: "ignore" });
      }
      const commitHash = execSync("git rev-parse HEAD", { encoding: "utf-8" }).trim();
      return { type: "git", commitHash };
    } catch {
      // Fallback to file backup
    }
  }

  // File-based backup
  const backups = new Map<string, string>();
  return { type: "file", backups };
}

async function rollback(backupInfo: { type: "git" | "file"; commitHash?: string; backups?: Map<string, string> }): Promise<void> {
  if (backupInfo.type === "git" && backupInfo.commitHash) {
    try {
      execSync(`git reset --hard ${backupInfo.commitHash}`, { stdio: "ignore" });
      return;
    } catch {
      // Fall through
    }
  }

  // File-based rollback (if we had individual file backups)
  if (backupInfo.backups) {
    for (const [original, backup] of backupInfo.backups) {
      if (existsSync(backup)) {
        renameSync(backup, original);
      }
    }
  }
}

function isGitRepo(): boolean {
  try {
    execSync("git rev-parse --git-dir", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function verifyChangeSafety(changes: string[]): void {
  const config = getConfig();

  for (const file of changes) {
    // Check if file is in safe directory
    const isSafe = config.safeDirectories.some(dir => {
      const normalizedDir = dir.replace(/^\.\//, "");
      return file.includes(normalizedDir);
    });
    if (!isSafe) {
      throw new Error(`Cannot modify file outside safe directories: ${file}`);
    }

    // Check if file is protected
    const isProtected = config.protectedFiles.some(pattern => {
      const normalizedPattern = pattern.replace(/^\.\//, "");
      return file.includes(normalizedPattern);
    });
    if (isProtected) {
      throw new Error(`Cannot modify protected file: ${file}`);
    }
  }
}

async function executeDocumentationImprovement(candidate: ImprovementCandidate): Promise<string[]> {
  const changes: string[] = [];
  const file = candidate.target;

  if (!existsSync(file)) {
    throw new Error(`File not found: ${file}`);
  }

  // For now, just add a note to the file saying we looked at it
  // In a real implementation, we'd use AI to actually improve it
  const content = readFileSync(file, "utf-8");
  const timestamp = new Date().toISOString();

  if (!content.includes(`<!-- Evolution check:`)) {
    const newContent = content + `\n\n<!-- Evolution check: ${timestamp} - Candidate: ${candidate.description} -->\n`;
    writeFileSync(file, newContent);
    changes.push(file);
  }

  return changes;
}

async function executeTestImprovement(candidate: ImprovementCandidate): Promise<string[]> {
  const changes: string[] = [];
  // Similar pattern - in real implementation, generate tests
  return changes;
}

async function executeRefactoringImprovement(candidate: ImprovementCandidate): Promise<string[]> {
  const changes: string[] = [];
  // Similar pattern - in real implementation, do safe refactoring
  return changes;
}
