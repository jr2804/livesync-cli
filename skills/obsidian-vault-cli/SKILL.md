---
name: obsidian-vault-cli
category: software-development
description: Administer Obsidian LiveSync vaults via CLI — CouchDB-backed vault operations, chunk format diagnostics, data migration, npm package distribution, and the @jr2804/livesync-cli wrapper around the upstream vrtmrz/obsidian-livesync CLI.
version: 2.0.0
author: Jan Reimes
license: MIT
metadata:
  hermes:
    tags: [obsidian, livesync, vault, couchdb, cli, npm]
    related_skills: [node-cli-distribution, npm-publish, debug-exit0-no-output]
---

# obsidian-vault-cli — Vault Administration via CouchDB

## Project Status (July 2026)

**The old `@jr2804/obsidian-vault-cli` is deprecated.** The npm package has been unpublished and the GitHub repo made private. The approach of wrapping only `livesync-commonlib` in a separate CLI was abandoned due to systemic bugs.

**Replacement:** `@jr2804/livesync-cli` — a wrapper around the **actual upstream CLI** from `vrtmrz/obsidian-livesync/src/apps/cli`. See `references/livesync-cli-wrapper.md` for the full architecture, build process, and usage.

### Repository

- **GitHub:** `github.com/jr2804/livesync-cli` (private, default branch `main`)
- **npm:** `@jr2804/livesync-cli` (published)
- **Wrapper path:** `/opt/workspace/tools/livesync-cli-wrapper/`
- **Skill:** `skills/obsidian-vault-cli/SKILL.md` in the wrapper repo
- **Branch convention:** Use `main` (not `master`) for the default branch. Rename with `git branch -m master main && git push origin main && gh api repos/:owner/:repo -X PATCH -f default_branch=main && git push origin --delete master`.

### Lessons Learned (from the failed obsidian-vault-cli approach)

1. **Use the upstream CLI, don't reimplement it.** The upstream already has a working CLI (`src/apps/cli`) with proper daemon mode, sync, mirror, push/pull, and remote management. Wrapping only the commonlib meant reimplementing all of that — and getting it wrong.
2. **`process.exit(0)` in `finally` blocks is a systemic bug pattern.** Every single command in the old CLI had this, masking all errors. See the `debug-exit0-no-output` skill for the full debugging pattern.
3. **Empty config values are valid.** `E2EE_PASSPHRASE=""` means "no encryption" — not "missing config". Use `undefined` checks, not falsy checks.
4. **Encryption state comes from the vault, not from the passphrase presence.** The DFM enables PouchDB crypto when `passphrase` is truthy — but a non-encrypted vault with a dummy passphrase breaks every read. Check the vault's milestone doc for the `encrypt` flag.
- ❌ **Branch naming: use `main`, not `master`.** When creating a new repo, rename the default branch immediately: `git branch -m master main && git push origin main && gh api repos/:owner/:repo -X PATCH -f default_branch=main && git push origin --delete master`. The CI workflow's `on.push.tags` trigger is branch-agnostic, so no workflow changes needed.
- ❌ **Skill format: directory with SKILL.md, not a flat .md file.** Skills must be at `skills/<name>/SKILL.md` with proper YAML frontmatter (`name`, `description`, `version`, `author`, `license`, `metadata.hermes.{tags, related_skills}`). A flat `skills/<name>.md` file is not loadable by the skill system. See the `hermes-agent-skill-authoring` skill for the full format spec.
- ❌ **Vite 8 (Rolldown) multi-chunk output blocks SEA.** See `references/vite8-multichunk-sea-blocker.md` for the full analysis and the npm-package fallback approach.
6. **Native addons (`leveldown`) can't be SEA-bundled.** Externalize them and ship alongside, or use an alternative adapter (HTTP instead of LevelDB).
7. **The npm package approach works and is simple.** Ship built JS files + list upstream deps in `dependencies`. Users get `npx @scope/pkg` without needing to build from source.

## When to Use

- User asks about reading/writing an Obsidian vault that uses **CouchDB remote sync** (LiveSync plugin)
- Read, write, list, delete, grep, or patch files through `obsidian-vault-cli`
- Diagnose "Corrupted document", chunk read failures, or `isReadyEntry` / `isChunkDoc` rejections
- Migrate CouchDB documents after a `livesync-commonlib` bump
- Package, publish, or test the CLI as an npm package
- Set up or modify a CI release/publish workflow for the CLI

## Architecture

The `obsidian-vault-cli` (fork of `fanselau/obsidian-vault-cli`) connects **directly to CouchDB over HTTP** — no local PouchDB cache, no sync layer.

### CouchDB Document Model

Each vault file is stored as **one meta document + N chunk documents**:

| Doc type | ID pattern | Key fields | Purpose |
|----------|-----------|------------|---------|
| **Meta** | `path/to/file.md` (case-sensitive path) | `path`, `children: ["h:..."]`, `ctime`, `mtime`, `size`, `type: "plain"`, `eden` | File metadata + references to content chunks |
| **Chunk** | `h:<hash>` (content-addressed, 50KB) | `_id`, `_rev`, `data`, `type: "leaf"` | Raw file content (hex-encoded per compression) |

The `children` array on the meta doc is the ordered list of chunk IDs whose concatenation forms the file's content.

### How Read Works

```
get(path) → getRaw(path) → isNoteEntry? → getByMeta(meta) →
  getDBEntryFromMeta() →
    chunkManager.read(children, {waitForReady, preventRemoteRequest}) →
      DatabaseReadLayer → isChunkDoc(doc) → read chunks → join data
```

## Project Relationships

Three repos share the same `livesync-commonlib` submodule. Understanding their versioning avoids confusion:

| Repo | Versioning | Latest | Description |
|------|-----------|--------|-------------|
| `vrtmrz/obsidian-livesync` | **Plugin releases** (manifest.json `version`) | `0.25.79` | Obsidian plugin — UI, sync engine, workspaces. Submodules commonlib at `src/lib` |
| `vrtmrz/livesync-commonlib` | **Library tags** (Git tags) | `0.25.54` | Shared library — chunk manager, encryption, connection. Tagged less frequently than plugin |
| `fanselau/obsidian-vault-cli` / user fork | **Inherited from commonlib tag** | matches commonlib submodule | CLI tool. Version = upstream commonlib tag at the pinned submodule commit |

**Key insight:** `0.25.79` (plugin) and `0.25.54` (commonlib) are independent version tracks. The plugin releases more often and its version does NOT correlate with commonlib tags. The commonlib submodule in obsidian-livesync may be at or beyond the latest commonlib tag — it's common to be on a development commit ahead of the tag.

The obsidian-vault-cli binary release version **always** reflects the upstream commonlib tag (not the plugin version).

See `references/version-relationship.md` for version resolution commands and upstream submodule query technique.

## Chunk Format & Commonlib Bumps

### isChunkDoc requirement

The new commonlib's `DatabaseReadLayer.isChunkDoc()` requires `doc.type === "leaf"`.

**Old commonlib** wrote chunks as `{_id, _rev, data}` (no `type` field). After bumping the submodule, old files fail with "Corrupted document."

### Detection (paginated)

Use `_all_docs?include_docs=true` with proper pagination. **Do NOT** append `\0` to the start key — it breaks URL encoding (HTTP 400). Instead, use `json.dumps(last_key)`:

```python
all_rows = []
start_key = '"h:"'
while True:
    url = f"/{DB}/_all_docs?startkey={urllib.parse.quote(start_key)}&endkey=%22h%3A%5Cufff0%22&limit=5000&include_docs=true"
    result = couch_req("GET", url)
    rows = result.get("rows", [])
    if not rows: break
    all_rows.extend(rows)
    if len(rows) < 5000: break
    # ✓ Correct: serialize last key as JSON string (avoids null-byte URL issues)
    start_key = json.dumps(rows[-1]["key"])

missing = [row["doc"] for row in all_rows
           if row.get("doc") and "type" not in row["doc"] and row["doc"]["_id"].startswith("h:")]
```

### Fix: Batch-add type:leaf

```python
# Batch update: add type:leaf to all chunks missing it
to_fix = [...]  # from detection above
for i in range(0, len(to_fix), 200):
    batch = to_fix[i:i+200]
    for doc in batch:
        doc["type"] = "leaf"
    couch_req("POST", f"/{DB}/_bulk_docs", {"docs": batch})
```

### Real-world numbers (Jan vault, July 2026)

- **Total chunk docs scanned:** 17,119
- **Already had `type:leaf`:** 17,118 (99.994%) — most chunks were written by the new commonlib
- **Needed fixing:** 1 chunk (`h:7467ed55e119fca8`)
- **Migration time:** ~5 seconds with `_bulk_docs` in batches of 200

### Debugging read failures

When `getById()` / `getByMeta()` returns "Corrupted document":

1. **Get meta doc** — check it has `children`, `type: "plain"`, `path`
2. **Get chunk docs** — check each child ID has `type: "leaf"` and `data`
3. **Check `isChunkDoc`** — see `DatabaseReadLayer.ts` in the commonlib
4. **Check `isReadyEntry`** — requires `"data" in doc` (the `data` field is an array of strings, joined = file content)
5. **Check `canFetchRemotely`** — if `remoteType != "REMOTE_COUCHDB"`, `preventRemoteRequest=true` and chunks are only read from local PouchDB

## CLI Commands

All commands connect to CouchDB via environment variables or `.env` file.

**Required env vars:** `COUCHDB_URL`, `COUCHDB_USER`, `COUCHDB_PASSWORD`, `DB_NAME`. `E2EE_PASSPHRASE` is **optional** — defaults to `""` (no encryption).

**CouchDB connection URLs (Jan vault):**
- External: `https://obsidian-livesync.reimes.uk` (works from all environments — **preferred**)
- Docker host gateway: `http://172.21.0.1:5984` (from container when `.env` local URL fails)
- `.env` default `http://obsidian-livesync.local:5984` **does not resolve** outside the Docker network

**E2EE_PASSPHRASE:** The CLI reads this from env/`.env`. `createDFM()` checks the vault's `encrypt` flag from the milestone doc and only passes the passphrase to the DFM when the vault actually uses encryption. Non-encrypted vaults get `passphrase: ""` so PouchDB encryption transforms stay disabled. This was fixed in [`f1b4595`](https://github.com/jr2804/obsidian-vault-cli/commit/f1b4595) — until then, a non-empty passphrase on a non-encrypted vault would cause "Decryption with HKDF failed" errors.

| Command | Usage | Notes |
|---------|-------|-------|
| `list [prefix]` | `ls "Clawy/"` | Dedup by path → shows full path. **182 files in Jan vault, zero duplicates** after case-insensitive dedup fix |
| `read <path>` | `cat path/to/file.md` | Content to stdout. ⚠️ Non-existent file returns **exit 0 silently** with no output (pre-existing bug, not CLI-breaking) |
| `write <path>` | `echo "content" \| write path.md` or `write path.md "content arg"` | Reads stdin or positional arg. Handles case via `HANDLE_FILENAME_CASE_SENSITIVE=true` |
| `delete <path>` | `rm path.md` | Interactive `[y/N]` — pipe `echo "y" \|` for non-interactive |
| `search <pattern>` | `find files` | Regex on `_id` (path prefix) |
| `grep <pattern>` | `grep content` | Requires `--path` flag. Invalid regex gives clear error message |
| `meta <path>` | JSON metadata | Returns `path, id, ctime, mtime_iso, size, chunk_count, type, content_length` |
| `dump <dir>` | Export all files | Default dir `./vault-dump`. Flags: `-v`, `-q`, `--skip-errors` |
| `patch <path>` | Targeted edit | `--old`/`--new` for replace, `--append` for append. Both work against encrypted vault |
| `--help` | Per-command help | Every command has its own `--help` with usage, args, flags, and examples |
| `--version` | Version info | Returns `obsidian-vault/<version> <platform> node-v<node_version>` |

## Distribution

The CLI has two distribution paths:

- **npm package** (`@jr2804/obsidian-vault-cli` on npmjs.com) — the live distribution. Ships a **binary downloader shim** (`bin/obsidian-vault.js`) — a pure Node.js builtin script (zero runtime deps) that detects the user's platform, downloads the matching SEA binary from GitHub Releases, caches it at `~/.cache/obsidian-vault-cli/<version>/`, and executes it. The npm tarball is ~6 KB.
- **SEA binary** — single-file executable for each platform (linux-x64, darwin-x64, darwin-arm64, win-x64). Built by the CI release workflow on `v*` tag pushes, attached as GitHub Release artifacts. The binary bundles all dependencies (oclif, pouchdb, etc.) with esbuild at build time.

### Quick usage

```bash
# One-liner via npx (auto-downloads + caches binary on first run)
npx -y @jr2804/obsidian-vault-cli list "Projects/"

# Install globally (same 6KB shim, binary downloads on first use)
npm install -g @jr2804/obsidian-vault-cli
obsidian-vault list "Projects/"

# Run via bun
bun x @jr2804/obsidian-vault-cli list "Projects/"
```

The downloader shim (`bin/obsidian-vault.js`) handles:

1. **Platform detection** — maps `process.platform + process.arch` to target names (linux-x64, darwin-x64, darwin-arm64, win-x64)
2. **Version lookup** — reads `package.json` version; constructs download URL `https://github.com/jr2804/obsidian-vault-cli/releases/download/v<VERSION>/obsidian-vault-<VERSION>-<TARGET>`
3. **Caching** — stores binary at `~/.cache/obsidian-vault-cli/<version>/` (respects `XDG_CACHE_HOME`)
4. **Download + exec** — fetches via `fetch()` (Node built-in, follows redirects), marks executable, spawns with inherited stdio
5. **Force re-download** — pass `--download` flag

**Fork-only policy:** All work goes to `jr2804/obsidian-vault-cli` only. **No PRs to upstream** `fanselau/obsidian-vault-cli` unless explicitly instructed.

### Branch workflow

The user's standard release workflow from a feature branch:

1. Develop and test on a feature branch (e.g. `fix/case-sensitivity-and-commonlib-bump`)
2. **Merge to `main`** on the jr2804 fork only — `git checkout main && git merge feature/branch --no-ff`
3. **Delete the feature branch** locally and on the fork — `git branch -d feature/branch && git push fork --delete feature/branch`
4. Continue development directly on `main`

This keeps the release target (`main`) stable and avoids branch-name pollution on the remote fork.

See the `npm-publish` skill for the general npm publication workflow (auth, tokens, Trusted Publishing, troubleshooting).

### Package name

This is a **fork** of `fanselau/obsidian-vault-cli`. To avoid blocking the upstream project's future npm publication, the package publishes under a **scoped name** — `@jr2804/obsidian-vault-cli`. The `bin` name (`obsidian-vault`) is independent of the package name and stays unchanged — users install `npm install -g @jr2804/obsidian-vault-cli` but run `obsidian-vault` on the command line.

### Release workflow

1. **Commit & push** changes to `jr2804/obsidian-vault-cli` (uses `gh auth setup-git` for git credential help via the installed gh CLI at `/opt/home/.local/bin/gh`)
2. **Tag** the release: commit all package.json changes FIRST, then `git tag v<version> && git push fork v<version>`. This ensures the tag points to the actual publish commit.
3. **GitHub Actions** triggers on `v*` tags → builds SEA binaries across ubuntu/macos/windows (`.github/workflows/release.yml`)
4. **Test locally** with `npm pack` + clean install against live CouchDB (see testing checklist below)
5. **npm publish** — only on explicit user instruction after thorough testing. See `npm-publish` skill for auth setup (2FA, tokens, OTP).
6. **Verify** — `npm view @jr2804/obsidian-vault-cli` and/or install from registry into a clean temp dir

### Trusted Publishing (OIDC): Recommended for future CI-based publishes. Configured on npmjs.com under package settings → Trusted Publisher → `jr2804/obsidian-vault-cli` / `.github/workflows/release.yml`. The workflow must have `id-token: write` permission. Does NOT require the workflow file to be on `main` — OIDC tokens attest to the actual running workflow.

⚠️ **CURRENT STATUS (July 2026):** npm publish is **working** via CI. Resolved by creating a Granular Access Token with "Bypass 2FA" and setting it as the `NPM_TOKEN` GitHub secret. CI publishes the downloader shim to npm AND builds SEA binaries for linux-x64, darwin-arm64, win-x64 — all attached to GitHub Releases. The SEA binaries bundle as CJS (required for `embedderRunCjs`), with inline pjson + Plugin monkey-patch for oclif command discovery. DEP0040 punycode warning from transitive whatwg-url dep is suppressed in `src/sea-entry.ts`.

### Publish checklist (after thorough testing)

```bash
# 1. Verify auth
npm whoami                          # must show logged-in user

# 2. Update package name in package.json if this is a fork
# Use @user/package-name to avoid blocking upstream's future publication
npm pkg fix                         # fix any bin-name warnings before publish

# 3. Pack and test (see thorough testing checklist above)
npm pack
# ... install in clean tmpdir and test all 9 commands ...

# 4. Publish
npm publish --access public         # --otp=XXXXXX if 2FA is on (common)

# 5. Verify
npm view @jr2804/obsidian-vault-cli # should show the new version
```

See `references/npm-packaging.md` for the full publish workflow details including 2FA handling, granular tokens, and CI auto-publish setup.

### Thorough testing checklist (run before any npm publish)

Set up a clean test environment and verify the shim's behavior:

```bash
# Create clean env
TESTDIR=$(mktemp -d /tmp/test-obsidian-vault-XXXXXX)
cd "$TESTDIR" && npm init -y --silent
npm install /path/to/obsidian-vault-<version>.tgz --silent

CLI="node_modules/.bin/obsidian-vault"

# 1. Shim runs and detects platform correctly
which $CLI                              # should point to obsidian-vault.js
$CLI --version                          # should attempt download (404 = expected if no release)
$CLI --download                         # force re-download

# 2. The npm tarball is minimal
ls -lh /path/to/*.tgz                   # expect ~6 KB, not MB

# 3. The shim has zero npm deps
cat node_modules/@jr2804/obsidian-vault-cli/node_modules/.package-lock.json
# Should only show the package itself, no dependency tree
```

Full functional testing (all 9 commands) requires a completed CI binary release first.

### package.json essentials (binary downloader approach)

```jsonc
{
  "name": "@jr2804/obsidian-vault-cli", // ← scoped: @user/package-name
  "version": "0.25.54",                 // ← matches livesync-commonlib tag
  "type": "module",
  "bin": { "obsidian-vault": "./bin/obsidian-vault.js" }, // ← JS shim, NOT bash
  "files": [                             // ← narrow: only the shim + readme
    "bin/",
    "README.md"
  ],
  "dependencies": {},                    // ← zero runtime deps (all in SEA binary)
  "devDependencies": {                   // ← only for CI/local building
    "esbuild": "^0.27.3",               // pin to 0.27.x – 0.28.x changed alias syntax
    "typescript": "^5.9.3"
  },
  "preferUnplugged": true,              // ← helps Bun/PNPM respect the binary exec
  "repository": {                        // required for npm Trusted Publishing
    "type": "git",
    "url": "https://github.com/jr2804/obsidian-vault-cli.git"
  },
  return doc;
}
```

## Testing

### Test framework

The project uses **vitest** (`npm test` / `npx vitest run`). Test files live in `tests/*.test.ts`.

```bash
# Run all tests
npm test

# Run a specific test file
npx vitest run tests/connection.test.ts
```

Current test files (July 2026):

| Test file | What it covers |
|-----------|---------------|
| `tests/connection.test.ts` | `loadConfig()` passphrase handling — empty string, set value, unset, missing user/password |
| `tests/dump.test.ts` | Dump command error propagation — no `process.exit(0)`, `this.error()` path |

### Testability pattern: isolate pure functions from heavy deps

`loadConfig()` and `loadEnvFile()` originally lived in `connection.ts` alongside the `DirectFileManipulator` imports. That meant importing them for testing pulled in PouchDB (with esbuild-specific path aliases like `@lib/worker/bgWorker.ts`) and PouchDB plugins that can't be re-registered in the same process.

**Fix:** Extract pure functions into `src/lib/config.ts` (only depends on `fs` and `path`, no livesync-commonlib). Tests import `config.ts` directly. `connection.ts` re-imports from `config.ts` at runtime.

This pattern applies whenever you need to unit-test logic that happens to be co-located with heavy framework code.

### Vitest config

`vitest.config.ts` is minimal — just includes `tests/` and sets `environment: "node"`. The `server.deps.inline` option handles esbuild path aliases from livesync-commonlib when full-module tests are needed (currently only the standalone `config.ts` tests are used).

### Pitfalls

- ❌ **Don't skip tests on fixes** — Every bug fix should include a test that fails before the fix and passes after. The three dump bugs (empty passphrase rejection, forced encryption, `process.exit(0)`) each had a corresponding test added.
- ❌ **Don't publish before tests pass** — `npm test` must pass before any `npm publish`.
- ❌ **config.ts must stay standalone** — If `loadConfig()` gains a dependency on livesync-commonlib, the unit tests will break. Keep it pure `fs`+`path`.

---

### Debugging dump failures (post-fix — `f1b4595`)

**The three conspiring bugs from July 2026 are now fixed** — exit 0 with empty directory should no longer happen. If dump still fails, trace:

1. **Verify vault list is non-empty** — run `list` on the same vault. If list returns files but dump produces nothing, the issue is in content retrieval, not enumeration.
2. **Check `encrypt` setting match** — the milestone doc `_local/obsydian_livesync_milestone` contains `tweak_values` with the vault's `encrypt` flag. `createDFM()` reads this and only passes passphrase to the DFM when `encrypt: true`. If the vault is encrypted but the passphrase is wrong, you'll see `"Decryption with HKDF failed"` in verbose output.
3. **Check chunk availability** — `respondEntryFromMeta` reads chunks via `chunkManager.read()`. If chunks are missing locally AND remote fetching fails/times out, you get `"Load failed"`. This is a replication issue, not a CLI bug — run with `--verbose` to see chunk-manager diagnostics.
4. **Check exit codes** — with `process.exit(0)` removed, `this.error()` calls now correctly exit 1. If you see exit 0 with `succeeded=0`, check the `--skip-errors` flag and whether `this.warn()` (not `this.error()`) was used.

See `references/dump-empty-output.md` for the original reproduction and root-cause analysis (historical context only — bugs are fixed).

**Key differences from the old tsx-based approach:**
- `bin` points to `./bin/obsidian-vault.js` (not `./bin/obsidian-vault` bash script)
- `dependencies` is empty (`{}`) — all runtime code is in the SEA binary
- `files` is narrow (`bin/` only, no `src/`, `stubs/`, `livesync-commonlib/`)
- `preferUnplugged: true` prevents Yarn/PNPM from hoisting the package's node_modules away from the binary path
- `esbuild` is pinned in `devDependencies` because v0.28.x changed `--alias` syntax (see pitfalls)
- No `tsx` in any dependencies — the shim uses only Node.js built-ins

### bin/obsidian-vault.js launcher — binary downloader shim

The bin entry is a **pure Node.js builtin script** (zero npm dependencies). It does NOT ship TypeScript, tsx, or oclif in the npm tarball — those are all bundled into the SEA binary at build time.

```js
#!/usr/bin/env node
// bin/obsidian-vault.js — platform detection + binary download + exec
import { spawn } from 'node:child_process';
import { createWriteStream, existsSync, mkdirSync } from 'node:fs';
import { readFile, chmod } from 'node:fs/promises';
import { homedir } from 'node:os';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const VERSION = JSON.parse(
  await readFile(resolve(dirname(fileURLToPath(import.meta.url)), '../package.json'), 'utf-8')
).version;

const TARGET_MAP = {
  'linux-x64':    ['linux', 'x64'],
  'darwin-x64':   ['darwin', 'x64'],
  'darwin-arm64': ['darwin', 'arm64'],
  'win-x64':      ['win32', 'x64'],
};

function detectTarget() {
  for (const [t, [p, a]] of Object.entries(TARGET_MAP)) {
    if (process.platform === p && process.arch === a) return t;
  }
  console.error(`Unsupported platform: ${process.platform}-${process.arch}`);
  process.exit(1);
}

const target = detectTarget();
const cacheDir = resolve(process.env.XDG_CACHE_HOME || resolve(homedir(), '.cache'), 'obsidian-vault-cli', VERSION);
const ext = target.startsWith('win') ? '.exe' : '';
const binPath = resolve(cacheDir, `obsidian-vault-${VERSION}-${target}${ext}`);

if (!existsSync(binPath)) {
  const url = `https://github.com/jr2804/obsidian-vault-cli/releases/download/v${VERSION}/obsidian-vault-${VERSION}-${target}${ext}`;
  mkdirSync(cacheDir, { recursive: true });
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
  await require('node:stream/promises').pipeline(response.body, createWriteStream(binPath));
  if (!target.startsWith('win')) await chmod(binPath, 0o755);
}

const child = spawn(binPath, process.argv.slice(2), { stdio: 'inherit', env: process.env });
child.on('exit', (code) => process.exit(code ?? 1));
child.on('error', (err) => { console.error(err.message); process.exit(1); });
```

**Key principles:**
- Zero npm dependencies (uses only Node.js built-ins: `child_process`, `fs`, `os`, `path`, `url`, `stream`)
- Binary path includes version → version mismatch = different cache dir = automatic clean re-download
- The npm tarball is ~6 KB — no tsx, no TypeScript, no pouchdb, no oclif
- All runtime code lives in the SEA binary on GitHub Releases

### Testing locally with npm pack

```bash
# 1. Build tarball
npm pack                        # → obsidian-vault-0.25.54.tgz (~600KB)

# 2. Install into clean temp dir
mkdir /tmp/test && cd /tmp/test && npm init -y
npm install /path/to/obsidian-vault-cli/obsidian-vault-0.25.54.tgz

# 3. Test all commands
node_modules/.bin/obsidian-vault --version
node_modules/.bin/obsidian-vault list "Clawy/"
node_modules/.bin/obsidian-vault read "path/to/file.md"
```

### Version scheme

Release version = upstream `vrtmrz/livesync-commonlib` tag at the pinned submodule commit. NOT the obsidian-livesync plugin version (which has its own independent numbering, currently `0.25.79` while commonlib is at `0.25.54`).

See `references/npm-packaging.md` for the full packaging recipe, `references/version-relationship.md` for version resolution, `references/test-matrix.md` for the last-verified command test matrix, `references/sea-binary-build.md` for the working SEA binary build process (4-platform CI matrix, esbuild bundling, Windows `shell: bash` fix), `references/chunk-migration.md` for commonlib version bumps, `references/best-practice-audit-2026-07-04.md` for a code review against mcollina Node.js/TypeScript best-practice skills, and `references/esbuild-aliases.md` for esbuild `--alias` syntax traps (invalid `@/` name, comma-separated trap).

## Pitfalls

- ❌ **Fork-only mandate** — Never open PRs to upstream `fanselau/obsidian-vault-cli` without explicit instruction. Work only on `jr2804/obsidian-vault-cli`.
- ❌ **Test before publish** — Never `npm publish` without first running the full test matrix against live CouchDB. User insists on thorough testing before any npm release.
- ❌ **SEA binary build: browser-oriented features need esbuild external/aliases** — livesync-commonlib imports Vite `?worker&inline` (through `bgWorker.ts`) and browser-only `pouchdb-browser.ts`. These must be handled at build time:
  * `--alias:@lib/worker/bgWorker.ts=./livesync-commonlib/src/worker/bgWorker.mock.ts` (mock replaces Vite worker import)
  * `--alias:@lib/pouchdb/pouchdb-browser.ts=./livesync-commonlib/src/pouchdb/pouchdb-http.ts` (HTTP adapter instead of IndexedDB)
  * `--external:electron --external:obsidian --external:@codemirror/* --external:@lezer/*`
- ❌ **SEA binary build: esbuild CLI `@/` alias is invalid — use the API instead** — esbuild CLI (`--alias:@/=./stubs`) rejects `@/` with `Invalid alias name: "@/". However, the **esbuild API** (`alias: { '@': resolve(ROOT, 'stubs') }`) accepts it fine. The fix is `scripts/build-sea.mjs` using `esbuild.build()` instead of CLI flags. The CLI parser can't handle `/` in alias names; the programmatic API can.
- ❌ **`--alias:a=b,c=d` comma-separated format creates ONE alias, not two** — esbuild treats the comma as part of the alias VALUE, not as a separator. `--alias:@lib=./a,@/=./b` maps `@lib` → `./a,@/=./b` (with literal comma). The `@/` component is never recognized. Always use separate `--alias` flags per alias, or use the JS API `alias: { '@lib': './a' }`.
- ❌ **The bin entry must be `.js` not `.sh` for cross-platform `npx`/`bun x`** — A `#!/bin/bash` shebang fails on Windows. Use `#!/usr/bin/env node` with a JS file (`bin/obsidian-vault.js`). The JS shim uses only Node.js built-ins for the downloader pattern.
- ❌ **Missing `files` allowlist in package.json** — Without it, esbuild bundle artifacts (12MB × 10 = 120MB) bloat the tarball from 600KB to 22MB+. Always specify `"files": [...]` with an explicit allowlist.
- ❌ **Missing `*.tgz` in .gitignore** — The `npm pack` tarball (`obsidian-vault-<version>.tgz`) should be gitignored to avoid accidentally committing it.
- ❌ **CouchDB pagination with null byte:** Paginating `_all_docs` by appending `\\0` to the last key causes HTTP 400. Use `json.dumps(last_key)` instead.

- ❌ **Non-existent file read returns exit 0 silently** — `read <nonexistent>` returns no output and exit code 0. Pre-existing upstream behavior.
- ✅ **Version from upstream tags:** Release version comes from `vrtmrz/livesync-commonlib` tags (1:1 match by submodule commit SHA), NOT from the obsidian-livesync plugin version.
- ✅ **Most chunks already have type:leaf:** After a commonlib bump, the vast majority of existing chunks (>99.9%) already have `type:leaf` — only very old ones need migration.
- ✅ **Docker CouchDB local URL:** From container environments, CouchDB is at `http://172.21.0.1:5984` (host gateway), not `localhost`.
- ✅ **Non-empty passphrase on non-encrypted vault (FIXED):** `connection.ts:createDFM()` now checks `vaultSettings.encrypt` from the milestone doc and only passes the passphrase to DFM options when the vault actually uses encryption. For `encrypt: false` vaults, both `passphrase` and `obfuscatePassphrase` are `""`. Fixed in [`f1b4595`](https://github.com/jr2804/obsidian-vault-cli/commit/f1b4595).
- ✅ **`loadConfig()` now accepts empty E2EE_PASSPHRASE (FIXED):** The `get()` helper previously used a falsy check (`if (!val)`) that rejected `""`. Fixed in [`f1b4595`](https://github.com/jr2804/obsidian-vault-cli/commit/f1b4595) — now uses explicit `undefined` check so `""` is a valid value for non-encrypted vaults.
- ✅ **Dump command `process.exit(0)` in `finally` (FIXED):** Previously at line 99 of `dump.ts`, `finally { await dfm.close(); process.exit(0); }` overrode all errors. If a file failed and `this.error()` threw, the `finally` block called `process.exit(0)`, masking failures. Removed in [`f1b4595`](https://github.com/jr2804/obsidian-vault-cli/commit/f1b4595) — natural exit codes now propagate (0 = all succeeded, 1 = any file errored).
- ❌ **.env COUCHDB_URL may not resolve:** The default `.env` URL `http://obsidian-livesync.local:5984` only works inside the Docker network. From outside (or from Hermes agent), use `https://obsidian-livesync.reimes.uk`.
- ❌ **Delete is interactive:** `delete <path>` prompts `[y/N]` — pipe `echo "y" |` in scripts or non-interactive contexts.
- ❌ **External CouchDB URL is preferred over Docker internal:** The Docker gateway `http://172.21.0.1:5984` often times out (not reachable from Hermes agent container). Always use `https://obsidian-livesync.reimes.uk` for testing.
- ❌ **2FA on npm account blocks publish by default:** If the npm account has 2FA enabled (common), `npm publish` fails with `403 Forbidden`. Fix: use `npm publish --otp=XXXXXX` with a one-time code, or create a **granular access token** with "Bypass 2FA" enabled at `https://www.npmjs.com/settings/<user>/tokens`.
- ⚠️ **npm account `jr2804-1` uses WebAuthn (hardware key), not TOTP** — the TOTP secret the user provided generates valid OTP codes but npm rejects them as `bad webauthn otp` for login operations. The OTP only works for `npm publish --otp` (not for `npm access set` or `npm token create`). **CI auto-publish is blocked** until the package MFA setting is changed to "automation" interactively on npmjs.com. See `npm-publish` skill → "The 2FA Chicken-and-Egg Problem" for full analysis.
- ❌ **`npm pkg fix` before publish:** npm may warn bin script name was cleaned — run `npm pkg fix` to apply the correction before publishing, or the warning repeats every publish.
- ❌ **Tag before committing package.json changes:** If you change `name` or `version` after tagging, the tag points to the wrong commit. Commit ALL package.json changes FIRST, then tag.
- ❌ **Tag misaligned after publish:** If you published and the tag is behind HEAD, move it: `git tag -d vX.Y.Z && git tag vX.Y.Z && git push fork vX.Y.Z --force`
- ❌ **Missing `id-token: write` for Trusted Publishing:** The release workflow needs `id-token: write` under `permissions:` for OIDC. Without it, GitHub does not mint the OIDC token and npm cannot authenticate.
- ❌ **Windows CI needs `shell: bash` for esbuild commands** — GitHub Actions defaults to PowerShell on `windows-latest`, which fails with `ParserError: Missing expression after unary operator '--'` when esbuild flags start a line after a backslash continuation. Add `shell: bash` to any step using bash-style multiline commands (Git Bash is always available on windows-latest).
- ❌ **Pre-compile step for oclif commands is redundant in SEA binary** — The original CI compiled each `src/commands/*.ts` individually (for oclif's dynamic command loader), which required `@/` aliases that esbuild rejects. Since the SEA binary bundles `src/index.ts` into a single file, oclif command loading is handled inline. Remove the pre-compile step entirely.
- ⚠️ **macOS Intel runners (macos-13) are severely contended** — Build jobs on `macos-13` can queue for 30+ minutes while linux/macos-arm64/windows finish in under 1 minute. This is a GitHub runner pool shortage, not a build failure. Plan CI timing accordingly or consider dropping darwin-x64 if Apple Silicon coverage suffices.
- ❌ **Dont guess npm token creation UI:** npms website changes; always reference current docs at https://docs.npmjs.com/creating-and-viewing-access-tokens before advising on token creation fields.
