#!/usr/bin/env node
import { homedir } from "os";
import { join } from "path";
import { existsSync, readdirSync, readFileSync } from "fs";

const homeDir = homedir();

// Check common Claude Code config locations
const locations = [
  join(homeDir, ".pi"),
  join(homeDir, ".claude"),
  join(homeDir, ".config", "claude"),
  join(homeDir, ".config", "pi"),
];

console.log("Checking Claude Code / Pi config locations:\n");

for (const loc of locations) {
  if (existsSync(loc)) {
    console.log(`✅ Found: ${loc}`);
    try {
      const contents = readdirSync(loc);
      console.log("   Contents:", contents);

      // Try to read common files
      for (const file of contents) {
        const filePath = join(loc, file);
        try {
          const stat = require("fs").statSync(filePath);
          if (stat.isFile()) {
            console.log(`   - ${file} (${stat.size} bytes)`);
            // Try to read JSON files
            if (file.endsWith(".json")) {
              try {
                const content = JSON.parse(readFileSync(filePath, "utf-8"));
                console.log(`     Preview:`, JSON.stringify(content, null, 2).substring(0, 300));
              } catch {
                // ignore
              }
            }
          }
        } catch {
          // ignore
        }
      }
    } catch (e) {
      console.log("   Error reading:", e);
    }
  } else {
    console.log(`❌ Not found: ${loc}`);
  }
  console.log();
}
