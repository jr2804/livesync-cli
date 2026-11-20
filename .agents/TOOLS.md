# AGENTS.md — TOOLS

State file: inventory of tools used in development — CLIs, MCP servers,
skills, runtimes, and project scripts. Demand-loaded like all state files;
keep it current (see `.agents/MAINTENANCE.md`).

## Rules

- Use an existing tool before adding a new one. No new tools, MCP servers,
  skills, or dependencies without explicit instruction (`.agents/POLICIES.md`).
- Each tool appears exactly once, in its primary table.
- Tables describe current usage — delete rows when tools leave; this is not a
  historical log.

## Subdirectory

If this file grows past its size budget, split detail into
`.agents/tools/<name>.md` — every file there MUST be listed above.

## CLI tools & runtimes

| Tool | When | Purpose |
| ---- | ---- | ------- |
| node ≥ 22.22 | Always | Runtime for the build and the published CLI |
| npm | Always | Install, build, pack, publish |
| git | Always | Submodule pin, tags, release flow |
| gh | Release work | CI runs, releases, repo secrets |
| mise | Markdown work | Tool pinning + task runner (`.config/mise/`) |
| rumdl | Markdown work | Markdown linter/formatter, run via `mise run format-md` |
| esbuild | Build | Bundles the Vite output into one SEA-compatible file |
| postject | Build | Injects the SEA blob into the Node binary (`npx postject`) |

## MCP servers

| Server | When | Purpose |
| ------ | ---- | ------- |
| t3-code | Session orchestration | Threads, previews, PR links, secret requests |

## Skills

| Skill | When | Purpose |
| ----- | ---- | ------- |
| `skills/obsidian-vault-cli/` | Driving a vault from an agent | CLI usage guide for `@jr2804/livesync-cli` |

## Project scripts & tasks

| Command | Purpose |
| ------- | ------- |
| `npm run build` | Full build: upstream install → Vite → SEA bundle → SEA binary |
| `npm run prebuild` | Guards that the submodule matches `package.json` |
| `npm test` | CLI smoke test (`--help`) |
| `mise run format-md` | Lint and format Markdown across `.agents/` and the repo root |
