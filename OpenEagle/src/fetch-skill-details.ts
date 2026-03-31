#!/usr/bin/env node

import { httpGetTool } from "./index.js";

async function fetchDetails() {
  // Get README
  console.log("Fetching README...");
  const readmeResult = (await httpGetTool.execute("readme-001", {
    url: "https://raw.githubusercontent.com/yuanziwen100/page-agent-browser-skill/main/README.md",
  })) as any;
  console.log("README:\n", readmeResult.content);
  console.log("\n" + "=".repeat(80) + "\n");

  // Get skill directory contents
  console.log("Fetching skill directory...");
  const skillDirResult = (await httpGetTool.execute("skill-dir-001", {
    url: "https://api.github.com/repos/yuanziwen100/page-agent-browser-skill/contents/skill",
  })) as any;
  console.log("Skill directory:", JSON.stringify(skillDirResult, null, 2));
}

fetchDetails().catch(console.error);
