/**
 * check-upstream.mjs — Verify the upstream submodule is checked out
 * at the expected tag matching our package.json version.
 */
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf-8"));
const expectedTag = pkg.version; // e.g. "0.25.80-cli"

const upstreamDir = path.join(root, "upstream");

// Check the submodule is checked out
let actualTag;
let tags = [];
try {
  tags = execSync("git tag --points-at HEAD", {
    cwd: upstreamDir,
    encoding: "utf-8",
  }).trim().split(/\n/);
} catch { /* ignore */ }
const baseTag = expectedTag.replace(/(-cli)\..*$/, '$1');  // "1.0.0-cli.1" -> "1.0.0-cli"
const expectedPlain = baseTag.replace(/-cli$/, '');        // "1.0.0-cli" -> "1.0.0"
actualTag = tags.find(t => t === expectedTag || t === baseTag || t === expectedPlain || t === expectedPlain + '-cli') || tags[0] || 'no-tag';

if (actualTag !== expectedTag && actualTag !== baseTag && actualTag !== expectedPlain && actualTag !== expectedPlain + '-cli') {
  console.error(
    `ERROR: Upstream submodule is at "${actualTag}" but package.json version is "${expectedTag}".\n` +
    `Run: cd upstream && git fetch --tags && git checkout tags/${expectedTag}`
  );
  process.exit(1);
}

console.log(`✓ Upstream submodule at ${expectedTag}`);
