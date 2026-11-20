# AGENTS.md — FILES

Single source of truth for paths, config keys, and naming conventions.
Kept compact — agents hallucinate less when they know where definitions live.

## Pattern

- One file owns each class of definition (paths, config defaults, enums).
- Import from that file. Never hard-code values in other modules.
- Variables that address files get `_file` suffix; directories get `_dir`.

## Project-specific sources of truth

| What | Where | Key names |
|------|-------|-----------|
| Package version + runtime deps | `package.json` | `version`, `dependencies`, `bin`, `files` |
| Build pipeline | `scripts/build.mjs` | `DIST_DIR`, `BIN_DIR`, `CLI_DIR`, `UPSTREM_DIR` |
| Submodule/version guard | `scripts/check-upstream.mjs` | `expectedTag`, `baseTag`, `expectedPlain` |
| Published npm entry point | `bin/livesync-cli.cjs` | — |
| Generated CJS launcher | `bin/livesync-cli.js` | — (build output, gitignored) |
| Release pipeline | `.github/workflows/release.yml` | tag trigger `v*-cli`, secret `NPM_TOKEN` |
| Upstream CLI source | `upstream/src/apps/cli/` | `entrypoint.ts`, `vite.config.ts` |
| Upstream CLI commands | `upstream/src/apps/cli/commands/` | `runCommand.ts`, `types.ts` |
| Upstream CLI docs | `upstream/src/apps/cli/README.md` | — |
| Agent-facing CLI guide | `skills/obsidian-vault-cli/SKILL.md` | frontmatter `name`, `version` |
| Markdown lint config | `.config/rumdl.toml` | `line-length = 160`, `flavor = "gfm"` |

## Naming conventions

- npm package version: `<upstream-tag>.N` — e.g. upstream `1.0.51-cli` →
  `1.0.51-cli.1`. `N` counts wrapper-only releases.
- Git release tag: `v<upstream-tag>` — e.g. `v1.0.51-cli`.
- SEA binary: `dist/livesync-cli-<version>-<platform>[-.exe]`.
- Upstream tags that matter are `*-cli`; plain tags are the Obsidian plugin
  releases and point at the same commit as their `-cli` counterpart.

## Subdirectory

If this file grows past its size budget, split detail into
`.agents/files/<name>.md` — every file there MUST be listed above.
