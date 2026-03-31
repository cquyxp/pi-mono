#!/usr/bin/env node
/**
 * Test the web tools
 */

import { httpGetTool } from "./index.js";

async function testHttpGet() {
  console.log("Testing HTTP GET tool...");
  console.log();

  // Test with a simple public API
  const result = (await httpGetTool.execute("test-001", {
    url: "https://jsonplaceholder.typicode.com/todos/1",
  })) as any;

  console.log("Result:");
  console.log(JSON.stringify(result, null, 2));
  console.log();

  if (result.success) {
    console.log("✓ HTTP GET works!");
  } else {
    console.log("✗ HTTP GET failed:", result.error);
  }
}

testHttpGet().catch(console.error);
