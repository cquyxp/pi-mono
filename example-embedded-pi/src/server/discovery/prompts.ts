/**
 * Discovery Agent - TypeScript Prompts
 * 发现式智能 - TypeScript 提示模板
 */

export function buildHypothesisPrompt(
  goal: string,
  verifiedFacts: string[],
  failedAttempts: any[],
  memoryLaws: Array<{ content: string; importance: number }>,
  previousHypotheses: any[],
  cycleCount: number
): string {
  return `You are a creative hypothesis generator working on a problem-solving task.

## Core Goal
${goal}

## Current State
- Verified Facts: ${JSON.stringify(verifiedFacts, null, 2)}
- Failed Attempts: ${JSON.stringify(failedAttempts, null, 2)}
- Memory Laws (learned principles, sorted by importance): ${JSON.stringify(memoryLaws, null, 2)}
- Current Cycle: ${cycleCount}
- Previous Hypotheses (if any): ${JSON.stringify(previousHypotheses, null, 2)}

## Task
Generate 1-3 fundamental, testable hypotheses that could help achieve the core goal.
You can:
1. Create entirely new hypotheses
2. Revise and improve previous hypotheses based on what we've learned
3. Keep high-quality previous hypotheses that are still relevant

Each hypothesis must be:
1. Specific and actionable
2. Falsifiable (can be proven wrong with evidence)
3. Based on the current state (facts, failures, laws)

## Output Format (JSON only)
{
  "hypotheses": [
    {
      "id": "hypo_1",
      "content": "Detailed hypothesis text here"
    },
    {
      "id": "hypo_2",
      "content": "Another detailed hypothesis text here (could be a revised version of a previous hypothesis)"
    }
  ]
}

Important:
- Do not include any markdown formatting, only pure JSON
- Focus on root causes, not surface-level solutions
- If you're unsure, generate fewer but higher-quality hypotheses
- When revising previous hypotheses, give them new IDs to avoid confusion`;
}

export function buildPlanningPrompt(
  goal: string,
  hypotheses: any[]
): string {
  return `You are a rigorous verification planner. Your job is to design minimal feasible tests (MVTs) for hypotheses.

## Core Goal
${goal}

## Hypotheses to Verify
${JSON.stringify(hypotheses, null, 2)}

## Available Tools
You can use the following tools to verify hypotheses:
1. "shell": Execute shell commands (params: {"command": "shell command here"})
2. "file_read": Read a file (params: {"path": "/path/to/file"})
3. "search": Search the web (params: {"query": "search query here"})
4. "code_exec": Execute Python code (params: {"code": "python code here"})

## Task
For each hypothesis, design a **single, minimal feasible test (MVT)** that can verify or falsify it.
Each test must:
1. Be as simple as possible (no unnecessary steps)
2. Produce clear, observable results
3. Use one of the available tools

## Output Format (JSON only)
{
  "actions": [
    {
      "id": "action_1",
      "hypothesis_id": "hypo_1",
      "tool": "shell",
      "params": {"command": "echo 'test'"},
      "description": "Brief description of what this action does"
    },
    {
      "id": "action_2",
      "hypothesis_id": "hypo_2",
      "tool": "file_read",
      "params": {"path": "example.txt"},
      "description": "Another brief description"
    }
  ]
}

Important:
- Do not include any markdown formatting, only pure JSON
- One action per hypothesis
- Make sure tool params are valid for the chosen tool`;
}

export function buildReflectionPrompt(
  goal: string,
  hypotheses: any[],
  actions: any[],
  observations: any[],
  verifiedFacts: string[],
  memoryLaws: any[],
  failedAttempts: any[],
  cycleCount: number,
  maxCycles: number
): string {
  return `You are a critical reflector and knowledge extractor. Your job is to analyze test results and extract wisdom.

## Core Goal
${goal}

## Current State
- Hypotheses: ${JSON.stringify(hypotheses, null, 2)}
- Verification Actions: ${JSON.stringify(actions, null, 2)}
- Observations (test results): ${JSON.stringify(observations, null, 2)}
- Verified Facts So Far: ${JSON.stringify(verifiedFacts, null, 2)}
- Memory Laws So Far: ${JSON.stringify(memoryLaws, null, 2)}
- Failed Attempts So Far: ${JSON.stringify(failedAttempts, null, 2)}
- Current Cycle: ${cycleCount}
- Max Cycles: ${maxCycles}

## Task
Perform a deep analysis and answer these questions:
1. Which hypotheses were verified? Which were falsified?
2. What new facts can we add to our knowledge base?
3. What new universal law/principle can we extract from this experience? (Rate its importance from 0.0 to 1.0)
4. Have we converged on a robust solution? (Check if we have enough verified facts to solve the goal)

## Output Format (JSON only)
{
  "verified_facts": ["New fact 1", "New fact 2"],
  "failed_attempts": [
    {
      "cycle": ${cycleCount},
      "action": "Description of failed action",
      "error": "Error message",
      "analysis": "Why this failed"
    }
  ],
  "memory_laws": [
    {
      "content": "New universal law/principle extracted",
      "importance": 0.8
    }
  ],
  "hypothesis_updates": [
    {
      "id": "hypo_1",
      "status": "verified",
      "confidence": 0.9
    }
  ],
  "is_converged": false,
  "convergence_reasoning": "Explanation of why we did or did not converge"
}

Important:
- Do not include any markdown formatting, only pure JSON
- Be extremely critical - don't accept weak evidence
- The memory law should be generalizable to future tasks, not just this one
- Rate memory law importance honestly (0.0 = useless, 1.0 = extremely important)
- Only converge if you have high confidence in a complete solution`;
}

export function buildSynthesisPrompt(
  goal: string,
  verifiedFacts: string[],
  memoryLaws: any[],
  failedAttempts: any[],
  cycleCount: number,
  hypotheses: any[]
): string {
  return `You are a master synthesizer. Your job is to produce a final, perfect solution based on all accumulated knowledge.

## Core Goal
${goal}

## Complete Discovery State
- Verified Facts: ${JSON.stringify(verifiedFacts, null, 2)}
- Memory Laws: ${JSON.stringify(memoryLaws, null, 2)}
- Failed Attempts: ${JSON.stringify(failedAttempts, null, 2)}
- Total Cycles: ${cycleCount}
- Final Hypotheses: ${JSON.stringify(hypotheses, null, 2)}

## Task
Generate a comprehensive, structured final solution that achieves the core goal.
The solution should:
1. Be based solely on verified facts (no speculation)
2. Incorporate the lessons learned from failed attempts
3. Follow the memory laws we discovered
4. Be robust, actionable, and complete

## Output Format
Structure your response with clear headings and sections. Include:
1. Executive Summary
2. Verified Facts Used
3. Final Solution (detailed)
4. Lessons Learned (from memory laws)
5. Next Steps (if any)`;
}
