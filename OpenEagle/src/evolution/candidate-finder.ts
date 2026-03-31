/**
 * Find improvement candidates in the codebase
 */
import { readdirSync, statSync, readFileSync } from "fs";
import { join, extname } from "path";
import type { ImprovementCandidate, ImprovementType } from "./types.js";
import { getConfig, getState } from "./state.js";

const CODE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"];
const DOC_EXTENSIONS = [".md", ".txt"];

export function findImprovementCandidates(): ImprovementCandidate[] {
  const config = getConfig();
  const candidates: ImprovementCandidate[] = [];

  // Check each safe directory
  for (const dir of config.safeDirectories) {
    if (!statSync(dir, { throwIfNoEntry: false })) {
      continue;
    }

    const files = getAllFiles(dir);

    for (const file of files) {
      // Skip protected files
      if (config.protectedFiles.some(p => file.includes(p))) {
        continue;
      }

      const ext = extname(file);

      // Documentation candidates
      if (DOC_EXTENSIONS.includes(ext) && config.enabledImprovementTypes.includes("documentation")) {
        const docCandidates = analyzeDocFile(file);
        candidates.push(...docCandidates);
      }

      // Code candidates
      if (CODE_EXTENSIONS.includes(ext)) {
        if (config.enabledImprovementTypes.includes("tests")) {
          const testCandidates = analyzeTestFile(file);
          candidates.push(...testCandidates);
        }
        if (config.enabledImprovementTypes.includes("refactoring")) {
          const refactorCandidates = analyzeRefactorFile(file);
          candidates.push(...refactorCandidates);
        }
      }
    }
  }

  // Sort by priority
  candidates.sort((a, b) => b.priority - a.priority);

  return candidates;
}

function getAllFiles(dir: string, baseDir = dir): string[] {
  const results: string[] = [];
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      results.push(...getAllFiles(fullPath, baseDir));
    } else {
      results.push(fullPath);
    }
  }

  return results;
}

function analyzeDocFile(file: string): ImprovementCandidate[] {
  const candidates: ImprovementCandidate[] = [];
  const content = readFileSync(file, "utf-8");
  const lines = content.split("\n");

  // Check for TODOs in documentation
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes("TODO") || line.includes("FIXME")) {
      candidates.push({
        type: "documentation",
        target: file,
        description: `Address TODO/FIXME at line ${i + 1}: ${line.trim()}`,
        priority: 5,
        riskLevel: "low",
      });
    }
  }

  // Check for short README
  if (file.endsWith("README.md") && lines.length < 50) {
    candidates.push({
      type: "documentation",
      target: file,
      description: "Expand README with more details",
      priority: 4,
      riskLevel: "low",
    });
  }

  return candidates;
}

function analyzeTestFile(file: string): ImprovementCandidate[] {
  const candidates: ImprovementCandidate[] = [];

  // Check if there's a test file for this source file
  if (!file.includes(".test.") && !file.includes(".spec.")) {
    const testFile1 = file.replace(/\.ts$/, ".test.ts");
    const testFile2 = file.replace(/\.js$/, ".test.js");

    if (!statSync(testFile1, { throwIfNoEntry: false }) && !statSync(testFile2, { throwIfNoEntry: false })) {
      candidates.push({
        type: "tests",
        target: file,
        description: "Create test file",
        priority: 6,
        riskLevel: "low",
      });
    }
  }

  return candidates;
}

function analyzeRefactorFile(file: string): ImprovementCandidate[] {
  const candidates: ImprovementCandidate[] = [];
  const content = readFileSync(file, "utf-8");
  const lines = content.split("\n");

  // Check for long functions
  let functionStart = -1;
  let braceCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.includes("function ") || line.match(/^\s*(const|let|var)\s+\w+\s*=\s*\(/) || line.match(/^\s*\w+\s*\(.*\)\s*{/)) {
      if (functionStart === -1) {
        functionStart = i;
      }
    }

    braceCount += (line.match(/{/g) || []).length;
    braceCount -= (line.match(/}/g) || []).length;

    if (functionStart !== -1 && braceCount === 0) {
      const functionLength = i - functionStart + 1;
      if (functionLength > 50) {
        candidates.push({
          type: "refactoring",
          target: file,
          description: `Split long function at line ${functionStart + 1} (${functionLength} lines)`,
          priority: 4,
          riskLevel: "medium",
        });
      }
      functionStart = -1;
    }
  }

  // Check for TODO/FIXME in code
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes("// TODO") || line.includes("// FIXME")) {
      candidates.push({
        type: "refactoring",
        target: file,
        description: `Address TODO/FIXME at line ${i + 1}`,
        priority: 5,
        riskLevel: "low",
      });
    }
  }

  return candidates;
}

export function selectTopCandidate(candidates: ImprovementCandidate[]): ImprovementCandidate | null {
  const config = getConfig();
  const state = getState();

  const riskOrder = { low: 0, medium: 1, high: 2 };
  const maxRisk = riskOrder[config.maxRiskLevel];

  for (const candidate of candidates) {
    // Skip if risk too high
    if (riskOrder[candidate.riskLevel] > maxRisk) {
      continue;
    }
    // Skip if we've skipped this before
    const candidateKey = `${candidate.type}:${candidate.target}`;
    if (state.skippedCandidates.includes(candidateKey)) {
      continue;
    }
    return candidate;
  }

  return null;
}
