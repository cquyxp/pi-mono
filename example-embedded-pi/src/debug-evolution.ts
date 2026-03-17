#!/usr/bin/env node

import {
  findImprovementCandidates,
  selectTopCandidate,
  executeImprovement,
  loadState,
  getState,
} from "./index.js";

async function main() {
  console.log("Debugging evolution...");
  loadState();

  console.log("1. Finding candidates...");
  const candidates = findImprovementCandidates();
  console.log(`Found ${candidates.length} candidates`);

  console.log("\n2. Selecting top candidate...");
  const candidate = selectTopCandidate(candidates);
  if (candidate) {
    console.log("Selected:", candidate.description);

    console.log("\n3. Executing improvement...");
    const result = await executeImprovement(candidate);
    console.log("Result:", result);
  } else {
    console.log("No candidate selected");
  }

  console.log("\n4. State:", getState());
}

main().catch(console.error);
