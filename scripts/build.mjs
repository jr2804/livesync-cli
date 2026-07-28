/**
 * build.mjs -- Build the CLI, prepare npm package, and create SEA binary
 *
 * 1. Build upstream CLI with Vite
 * 2. Copy dist files to our package
 * 3. Create bin/livesync-cli.js entry point
 * 4. Bundle everything into a single SEA-suitable CJS (stub out native-only deps)
 * 5. Generate SEA blob + inject into Node binary for current platform
 */
import { execSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, unlinkSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf-8"));
const VERSION = pkg.version;

const UPSTREM_DIR = path.join(root, "upstream");
const CLI_DIR = path.join(UPSTREM_DIR, "src", "apps", "cli");
const DIST_DIR = path.join(root, "dist");
const BIN_DIR = path.join(root, "bin");

// ---- Step 1: Build upstream ----
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

// ---- Step 2: Create bin/livesync-cli.js ----
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

// ---- Step 3 onward requires async (esbuild API) ----
(async () => {

// ---- Step 3: Bundle all chunks into a single SEA bundle ----
// Vite output is code-split CJS.  Inside an SEA blob dynamic require() calls
// like require('./stream-collector-*.cjs') cannot resolve filesystem paths, so
// we re-bundle everything into a single file with esbuild.
//
// The Vite output is code-split CJS, which won't resolve from within an SEA
// blob.  Re-bundle into a single file with esbuild, swapping the native
// leveldown add-on for the pure-JS memdown (which implements the same
// abstract-leveldown interface).
console.log("Creating single-file SEA bundle with esbuild...");

await esbuild.build({
  entryPoints: [path.join(DIST_DIR, "index.cjs")],
  bundle: true,
  platform: "node",
  target: "node22",
  outfile: path.join(DIST_DIR, "sea-bundle.cjs"),
  allowOverwrite: true,
  external: ["obsidian", "electron"],
  // Alias the native leveldown to pure-JS memdown.
  alias: {
    leveldown: path.join(root, "node_modules", "memdown", "memdown.js"),
  },
  logLevel: "warning",
});

const seaBundlePath = path.join(DIST_DIR, "sea-bundle.cjs");
const seaBundleSize = (readFileSync(seaBundlePath).length / 1024 / 1024).toFixed(0);
console.log(`OK sea-bundle.cjs (${seaBundleSize} MB)`);

// ---- Step 4: Generate SEA binary ----
const seaConfig = {
  main: seaBundlePath,
  output: path.join(DIST_DIR, "sea-prep.blob"),
  disableExperimentalSEAWarning: true,
};
writeFileSync(path.join(DIST_DIR, "sea-config.json"), JSON.stringify(seaConfig, null, 2));
console.log("OK sea-config.json written");

console.log("Generating SEA blob...");
execSync(`node --experimental-sea-config "${path.join(DIST_DIR, "sea-config.json")}"`, {
  cwd: root,
  stdio: "inherit",
});

// Determine platform-specific binary name
const platformMap = {
  "linux-x64":   `livesync-cli-${VERSION}-linux-x64`,
  "linux-arm64": `livesync-cli-${VERSION}-linux-arm64`,
  "darwin-arm64": `livesync-cli-${VERSION}-darwin-arm64`,
  "darwin-x64":  `livesync-cli-${VERSION}-darwin-x64`,
  "win32-x64":   `livesync-cli-${VERSION}-win-x64.exe`,
};
const hostKey = `${process.platform}-${process.arch}`;
const binaryName = platformMap[hostKey];
if (!binaryName) {
  console.warn(`Warning: no known SEA binary name for platform ${hostKey}, skipping binary injection`);
} else {
  const binaryPath = path.join(DIST_DIR, binaryName);
  console.log(`Creating SEA binary for ${hostKey} -> ${binaryName}...`);

  const nodeBin = process.execPath;
  copyFileSync(nodeBin, binaryPath);

  const blobPath = path.join(DIST_DIR, "sea-prep.blob");
  execSync(
    `npx --yes postject "${binaryPath}" NODE_SEA_BLOB "${blobPath}" ` +
    `--sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2`,
    { cwd: root, stdio: "inherit" },
  );

  const size = (readFileSync(binaryPath).length / 1024 / 1024).toFixed(0);
  console.log(`OK ${binaryName} (${size} MB)`);

  // Clean up the intermediate sea bundle (keep the npm package lean)
  unlinkSync(seaBundlePath);
  unlinkSync(path.join(DIST_DIR, "sea-config.json"));
  unlinkSync(blobPath);
  console.log("OK cleaned up intermediate SEA artifacts");
}
console.log("ALL DONE");
})();