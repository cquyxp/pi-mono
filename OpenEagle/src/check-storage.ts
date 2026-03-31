#!/usr/bin/env node
import { homedir } from "os";
import { join } from "path";
import { existsSync, readdirSync } from "fs";

const homeDir = homedir();
const exampleDir = join(homeDir, ".example-embedded-pi");
const piDir = join(homeDir, ".pi");

console.log("Storage locations:");
console.log("- Home directory:", homeDir);
console.log("- Example embedded pi dir:", exampleDir);
console.log("- Pi agent dir:", piDir);
console.log();

if (existsSync(exampleDir)) {
  console.log("Contents of .example-embedded-pi:");
  console.log(readdirSync(exampleDir));
} else {
  console.log(".example-embedded-pi does not exist yet");
}

console.log();

if (existsSync(piDir)) {
  console.log("Contents of .pi:");
  console.log(readdirSync(piDir));
} else {
  console.log(".pi does not exist yet");
}
