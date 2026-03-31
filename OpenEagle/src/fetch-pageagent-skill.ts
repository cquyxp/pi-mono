#!/usr/bin/env node

import { httpGetTool } from "./index.js";

async function fetchRepo() {
  console.log("Fetching page-agent-browser-skill repo info...");
  console.log();

  // Get repo info
  const repoResult = await httpGetTool.execute("repo-001", {
    url: "https://api.github.com/repos/yuanziwen100/page-agent-browser-skill",
  });

  console.log("Repo Info:");
  console.log(JSON.stringify(repoResult, null, 2));
  console.log();

  // Get contents
  console.log("Fetching repo contents...");
  const contentsResult = await httpGetTool.execute("contents-001", {
    url: "https://api.github.com/repos/yuanziwen100/page-agent-browser-skill/contents/",
  });

  console.log("Contents:");
  console.log(JSON.stringify(contentsResult, null, 2));
}

fetchRepo().catch(console.error);
