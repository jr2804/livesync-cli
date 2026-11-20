# AGENTS.md — ONBOARDING

Read this when starting a new session. After first read, only revisit when
project structure or tooling changes significantly.

## Project

npm-published packaging wrapper for the
[Self-hosted LiveSync CLI](https://github.com/vrtmrz/obsidian-livesync/tree/main/src/apps/cli)
— it builds upstream's `src/apps/cli` and ships it as `@jr2804/livesync-cli`
(plain `npx`, no Docker). Full docs at `README.md`.

## Quick start

```bash
# Check the submodule pin matches package.json (runs automatically as prebuild)
node scripts/check-upstream.mjs

# Build: upstream install → vite build → dist copy → esbuild SEA bundle → SEA binary
npm install
npm run build

# Smoke test (prints the CLI help)
npm test

# Markdown lint/format
mise run format-md
```

Consumers of the published package need nothing but Node.js ≥ 22.22.

## Entry points (read these first)

| File | Why |
|------|-----|
| `AGENTS.md` | Root rail — rules + `.agents/` index |
| `.agents/POLICIES.md` | Boundaries, priorities, verification |
| `.agents/FILES.md` | Source-of-truth locations |
| `scripts/build.mjs` | The whole build pipeline |
| `scripts/check-upstream.mjs` | Submodule/version guard |
| `.github/workflows/release.yml` | Build + npm publish on tag |

## Where to dig deeper

- `README.md` — command reference and packaging explanation
- `.agents/FILES.md` — what owns which path and config
- `.agents/TOOLS.md` — tools, MCP servers, skills, CLIs in use
- `.agents/HISTORY.md` — past decisions and rationale
- `skills/obsidian-vault-cli/SKILL.md` — the agent-facing CLI guide

## Gotchas

- `upstream/` is a submodule — never edit files in it.
- The upstream tag must match `package.json`; `npm run build` fails otherwise.
- `mirror`, `daemon`, `rebuild`, and `fetch` need a settings file with
  `isConfigured: true`, else the CLI reports "LiveSync is not configured".
- `bin/livesync-cli.js` is generated and CJS, but the package is
  `"type": "module"` — use the tracked `bin/livesync-cli.cjs`.

## Available tools

Development tools, MCP servers, skills, and CLIs are inventoried in the
state file `.agents/TOOLS.md` — read it before assuming a tool, update it
when tooling changes. If tooling grows large, detail moves to
`.agents/tools/<name>.md` (each listed in TOOLS.md).
