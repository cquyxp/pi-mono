#!/usr/bin/env node
/**
 * Session management CLI tool
 */

import {
  listSessions,
  printSessionList,
  exportSession,
  importSession,
  deleteSession,
  getSessionFilePath,
} from "./index.js";

const args = process.argv.slice(2);
const command = args[0];

async function main() {
  switch (command) {
    case "list":
    case "ls":
      printSessionList();
      break;

    case "export":
      if (args.length < 2) {
        console.error("Usage: manage-sessions export <sessionId> [outputPath]");
        process.exit(1);
      }
      const exportPath = exportSession(args[1], args[2]);
      console.log(`Exported session to: ${exportPath}`);
      break;

    case "import":
      if (args.length < 2) {
        console.error("Usage: manage-sessions import <exportPath> [newSessionId]");
        process.exit(1);
      }
      const importPath = importSession(args[1], args[2]);
      console.log(`Imported session to: ${importPath}`);
      break;

    case "delete":
    case "rm":
      if (args.length < 2) {
        console.error("Usage: manage-sessions delete <sessionId>");
        process.exit(1);
      }
      const deleted = deleteSession(args[1]);
      if (deleted) {
        console.log(`Deleted session: ${args[1]}`);
      } else {
        console.log(`Session not found: ${args[1]}`);
      }
      break;

    case "path":
      if (args.length < 2) {
        console.error("Usage: manage-sessions path <sessionId>");
        process.exit(1);
      }
      console.log(getSessionFilePath(args[1]));
      break;

    default:
      console.log("Session Management Tool");
      console.log("=".repeat(40));
      console.log();
      console.log("Commands:");
      console.log("  list, ls          List all sessions");
      console.log("  export <id> [out] Export session to JSON");
      console.log("  import <path> [id] Import session from JSON");
      console.log("  delete, rm <id>   Delete a session");
      console.log("  path <id>         Show session file path");
      console.log();
      console.log("Example:");
      console.log("  npx tsx src/manage-sessions.ts list");
      console.log("  npx tsx src/manage-sessions.ts export my-session");
      console.log();
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
