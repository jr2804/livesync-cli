/**
 * build-sea.mjs -- Build SEA binaries using Vite build + chunk bundling
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
const RIN_DIR = path.join(root, "bin");

console.log("Installing upstream dependencies...");
execSync("npm install", { cwd: UPSTREM_DIR, stdio: "inherit" });

console.log("Building with Vite...");
mkdirSync(DIST_DIR, { recursive: true });

// Patch vite.config.ts for single-file output
const viteConfigPath = path.join(CLI_DIR, "vite.config.ts");
let viteConfig = readFileSync(viteConfigPath, "utf-8");
if (!viteConfig.includes("inlineDynamicImports")) {
  viteConfig = viteConfig.replace("minify: false,", "minify: false,\n            inlineDynamicImports: true,");
  writeFileSync(viteConfigPath, viteConfig);
}

execSync("npm run build", { cwd: CLI_DIR, stdio: "inherit" });
execSync("git checkout -- vite.config.ts", { cwd: CLI_DIR, stdio: "inherit" });

const bundlePath = path.join(CLI_DIR, "dist", "index.cjs");
if (!existsSync(bundlePath)) { console.error("ERROR: Bundle not found"); process.exit(1); }

// Copy ALL dist files to our dist dir (bundle + browser chunks)
const cliDist = path.join(CLI_DIR, "dist");
for (const f of readdirSync(cliDist)) {
  if (f.endsWith(".cjs")) {
    copyFileSync(path.join(cliDist, f), path.join(DIST_DIR, f));
  }
}

const bundleCopy = path.join(DIST_DIR, "index.cjs");
console.log("OK Bundle: " + (readFileSync(bundleCopy).length / 1024).toFixed(0) + " KB");

// Create SEA blob
const seaConfig = { main: bundleCopy, output: path.join(DIST_DIR, "sea-prep.blob"), disableExperimentalSEAWarning: true };
writeFileSync(path.join(DIST_DIR, "sea-config.json"), JSON.stringify(seaConfig, null, 2));
console.log("Creating SEA blob...");
execSync("node --experimental-sea-config " + path.join(DIST_DIR, "sea-config.json"), { stdio: "inherit" });

// Inject into Node binaries
const TARGETS = { "linux-x64": { os: "linux", arch: "x64", ext: "" }, "darwin-arm64": { os: "darwin", arch: "arm64", ext: "" }, "win-x64": { os: "win32", arch: "x64", ext: ".exe" } };
const targetFlag = process.argv.find(a => a.startsWith("--target="))?.split("=")[1] || "all";
const targetsToBuild = targetFlag === "all" ? Object.entries(TARGETS) : [[targetFlag, TARGETS[targetFlag]]].filter(([k]) => k);

for (const [name, cfg] of targetsToBuild) {
  const binaryName = "livesync-cli-" + VERSION + "-" + name + cfg.ext;
  const binaryPath = path.join(DIST_DIR, binaryName);
  console.log("Building " + binaryName + "...");
  const nodeBin = execSync("node -p process.execPath", { encoding: "utf-8" }).trim();
  copyFileSync(nodeBin, binaryPath);
  const sentinelFuse = "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2";
  const machoSegment = " --macho-segment-name NODE_SEA";
  try { execSync("npx postject " + binaryPath + " NODE_SEA_BLOB " + seaConfig.output + " --sentinel-fuse " + sentinelFuse + machoSegment, { stdio: "inherit" }); }
  catch (err) { console.error("  postject failed: " + err.message); process.exit(1); }
  if (cfg.os !== "win32") execSync("chmod +x " + binaryPath);
  console.log("  OK " + binaryName + " (" + (readFileSync(binaryPath).length / 1024 / 1024).toFixed(1) + " MB)");
}

// Create bin/livesync-cli
const hostPlatform = process.platform + "-" + process.arch;
const hostTarget = { "linux-x64": "linux-x64", "darwin-arm64": "darwin-arm64", "win32-x64": "win-x64" }[hostPlatform];
if (hostTarget) {
  mkdirSync(BIN_DIR, { recursive: true });
  const hostBinary = "livesync-cli-" + VERSION + "-" + hostTarget + (hostTarget === "win-x64" ? ".exe" : "");
  const hostBinaryPath = path.join(DIST_DIR, hostBinary);
  if (existsSync(hostBinaryPath)) {
    copyFileSync(hostBinaryPath, path.join(BIN_DIR, "livesync-cli" + (hostTarget === "win-x64" ? ".exe" : "")));
    execSync("chmod +x " + path.join(BIN_DIR, "livesync-cli"));
    console.log("OK bin/livesync-cli ready");
  }
}

console.log("ALL DONE");
