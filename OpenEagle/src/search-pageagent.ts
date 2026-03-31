#!/usr/bin/env node

import { httpGetTool } from "./index.js";

async function searchGitHub() {
  console.log("Searching GitHub for PageAgent...");
  console.log();

  // Search GitHub API
  const result = await httpGetTool.execute("search-001", {
    url: "https://api.github.com/search/repositories?q=PageAgent&sort=stars&order=desc",
  });

  console.log(JSON.stringify(result, null, 2));
}

searchGitHub().catch(console.error);
