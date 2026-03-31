#!/usr/bin/env node

import { httpGetTool } from "./index.js";

async function fetchSkillMd() {
  const result = (await httpGetTool.execute("skill-md-001", {
    url: "https://raw.githubusercontent.com/yuanziwen100/page-agent-browser-skill/main/skill/SKILL.md",
  })) as any;
  console.log(result.content);
}

fetchSkillMd().catch(console.error);
