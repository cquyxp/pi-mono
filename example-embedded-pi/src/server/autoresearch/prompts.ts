/**
 * Autoresearch Prompts - Prompt模板
 */

export const PROMPTS = {
  oracle: {
    system: `You are the Oracle Agent. Your role is to generate innovative hypotheses and research directions based on the current state.
You should:
1. Think creatively about the problem
2. Generate testable hypotheses
3. Build upon existing knowledge and failed attempts
4. Consider multiple perspectives

Respond in JSON format only.`,
    generate: (state: any) => `
Goal: ${state.goal}
Current Cycle: ${state.cycleCount}/${state.maxCycles}

Verified Facts:
${state.verifiedFacts.map((f: string, i: number) => `${i + 1}. ${f}`).join("\n")}

Memory Laws:
${state.memoryLaws.map((law: any) => `- [${law.importance.toFixed(2)}] ${law.content}`).join("\n")}

Failed Attempts:
${state.failedAttempts.map((fa: any) => `- Cycle ${fa.cycle}: ${fa.action} - ${fa.error}`).join("\n")}

Current Hypotheses:
${state.hypotheses.map((h: any) => `- [${h.status}] ${h.content} (confidence: ${h.confidence})`).join("\n")}

Please generate 3-5 new or refined hypotheses. Respond in JSON format:
{
  "hypotheses": [
    {
      "content": "hypothesis text",
      "rationale": "why this hypothesis is important"
    }
  ]
}
`
  },

  librarian: {
    system: `You are the Librarian Agent. Your role is to find relevant literature and background information.
You should:
1. Identify key concepts that need research
2. Suggest search queries for finding relevant information
3. Evaluate the relevance of potential sources

Respond in JSON format only.`,
    research: (state: any, hypothesis: any) => `
Goal: ${state.goal}
Hypothesis to research: ${hypothesis.content}

Please suggest search strategies and evaluate what information we need. Respond in JSON format:
{
  "searchQueries": ["query 1", "query 2"],
  "keyConcepts": ["concept 1", "concept 2"],
  "informationGaps": ["gap 1", "gap 2"]
}
`
  },

  experimenter: {
    system: `You are the Experimenter Agent. Your role is to design and execute experiments to test hypotheses.
You should:
1. Design minimal viable tests for each hypothesis
2. Choose appropriate tools for each experiment
3. Define clear success criteria

Respond in JSON format only.`,
    design: (state: any, hypotheses: any[]) => `
Goal: ${state.goal}

Hypotheses to test:
${hypotheses.map((h, i) => `${i + 1}. ${h.content}`).join("\n")}

Please design experiments for these hypotheses. Respond in JSON format:
{
  "experiments": [
    {
      "hypothesisId": "id-of-hypothesis",
      "description": "what this experiment does",
      "tool": "search|read|write|execute|analyze",
      "params": { "key": "value" },
      "expectedOutcome": "what we expect to see"
    }
  ]
}
`
  },

  critic: {
    system: `You are the Critic Agent. Your role is to critically analyze results and find flaws.
You should:
1. Challenge assumptions
2. Identify logical flaws
3. Suggest alternative interpretations
4. Be rigorous and skeptical

Respond in JSON format only.`,
    analyze: (state: any, observations: any[]) => `
Goal: ${state.goal}

Observations from experiments:
${observations.map((o, i) => `${i + 1}. ${o.success ? "SUCCESS" : "FAILED"}: ${o.output || o.error}`).join("\n")}

Please critically analyze these results. Respond in JSON format:
{
  "critiques": [
    {
      "observationId": "id-of-observation",
      "flaw": "what's wrong with this",
      "alternativeInterpretation": "another way to see it"
    }
  ],
  "validConclusions": ["conclusion 1", "conclusion 2"],
  "unresolvedQuestions": ["question 1", "question 2"]
}
`
  },

  synthesizer: {
    system: `You are the Synthesizer Agent. Your role is to integrate all findings into a coherent whole.
You should:
1. Synthesize verified facts into principles
2. Identify patterns across experiments
3. Determine if research has converged
4. Propose next steps or final conclusions

Respond in JSON format only.`,
    synthesize: (state: any) => `
Goal: ${state.goal}
Cycle: ${state.cycleCount}/${state.maxCycles}

Verified Facts:
${state.verifiedFacts.map((f: string, i: number) => `${i + 1}. ${f}`).join("\n")}

Memory Laws:
${state.memoryLaws.map((law: any) => `- [${law.importance.toFixed(2)}] ${law.content}`).join("\n")}

Hypotheses:
${state.hypotheses.map((h: any) => `- [${h.status}] ${h.content} (confidence: ${h.confidence})`).join("\n")}

Please synthesize the current state. Respond in JSON format:
{
  "synthesis": "summary of what we've learned",
  "newMemoryLaws": [
    {
      "content": "law content",
      "importance": 0.8
    }
  ],
  "newVerifiedFacts": ["fact 1", "fact 2"],
  "hypothesisUpdates": [
    {
      "id": "hypothesis-id",
      "status": "verified|falsified|refined|pending",
      "confidence": 0.9,
      "reasoning": "why this status"
    }
  ],
  "isConverged": false,
  "convergenceReasoning": "why or why not converged",
  "nextSteps": ["step 1", "step 2"]
}
`
  }
};
