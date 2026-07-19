/**
 * build.mjs -- Build the CLI and prepare npm package
 *
 * 1. Build upstream CLI with Vite
 * 2. Copy dist files to our package
 * 3. Create bin/livesync-cli.js entry point
 */
import { execSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf-8"));
const VERSION = pkg.version;

const UPSTREM_DIR = path.join(root, "upstream");
const CLI_DIR = path.join(UPSTREM_DIR, "src", "apps", "cli");
const DIST_DIR = path.join(root, "dist");
const BIN_DIR = path.join(root, "bin");

console.log("Installing upstream dependencies...");
execSync("npm install", { cwd: UPSTREM_DIR, stdio: "inherit" });

console.log("Building with Vite...");
mkdirSync(DIST_DIR, { recursive: true });

execSync("npm run build", { cwd: CLI_DIR, stdio: "inherit" });

const bundlePath = path.join(CLI_DIR, "dist", "index.cjs");
if (!existsSync(bundlePath)) { console.error("ERROR: Bundle not found"); process.exit(1); }

// Copy ALL dist files to our dist dir
const cliDist = path.join(CLI_DIR, "dist");
for (const f of readdirSync(cliDist)) {
  if (f.endsWith(".cjs")) {
    copyFileSync(path.join(cliDist, f), path.join(DIST_DIR, f));
  }
}

console.log("OK Bundle: " + (readFileSync(bundlePath).length / 1024).toFixed(0) + " KB");

// Create bin/livesync-cli.js - a thin wrapper that runs the bundle
mkdirSync(BIN_DIR, { recursive: true });
const binContent = `#!/usr/bin/env node
// @ir2804/livesync-cli wrapper
const path = require("path");
const distDir = path.join(__dirname, "..", "dist");
process.chdir(distDir);
require(path.join(distDir, "index.cjs"));
`;
writeFileSync(path.join(BIN_DIR, "livesync-cli.js"), binContent);
execSync("chmod +x " + path.join(BIN_DIR, "livesync-cli.js"));

console.log("OK bin/livesync-cli.js ready");
console.log("ALL DONE");
