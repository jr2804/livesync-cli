# AGENTS.md — HISTORY

State file. The one file that may reference the past — sparingly. Read when
relevant to the current task; long-term memory for decisions, not a log.
Routine history lives in git; only record what is costly to rediscover.

## Format

| Date | Decision | Rationale | Git ref |
| ---- | -------- | --------- | ------- |
| YYYY-MM-DD | [description] | [why] | [commit hash/tag] |

## Record

- High-level architectural decisions and breaking changes.
- Dependency, tooling, and platform choices — including the alternative that lost.
- False turns and rejected approaches, with the reason.
- Completion of an implementation plan (link to its archive below).

| Date | Decision | Rationale | Git ref |
| ---- | -------- | --------- | ------- |
| 2026-11-20 | Upstream bumped to `1.0.51-cli`; wrapper version `1.0.51-cli.1` | 19 upstream CLI versions behind; new commands `journal-skip`, `rebuild`, `fetch` | 96060c1, tag `v1.0.51-cli` |
| 2026-11-20 | Runtime deps pinned to upstream 1.0.51 (`chokidar` 6, `minimatch` 11, `octagonal-wheels` 0.1.56, `werift` 0.24.4) | `chokidar` and `werift` resolve at runtime, `minimatch` and `octagonal-wheels` are bundled — a stale pin silently ships older code | 96060c1 |
| 2026-11-20 | `npm test` repointed from `bin/livesync-cli.js` to `bin/livesync-cli.cjs` | The generated launcher is CJS but the package is `"type": "module"`, so the test script always crashed | 96060c1 |
| 2026-11-20 | npm publish of `1.0.51-cli.1` blocked — `NPM_TOKEN` revoked/expired | The tag was pushed and the GitHub Release created, but the registry rejects the token (HTTP 404 on the package `PUT`, 401 on `GET /-/whoami`). Publishing needs a fresh npm token | tag `v1.0.51-cli` |

## Do not record

- Routine commits, refactor logs, session activity, release notes.
- Anything obvious from git, the code, or current AGENTS.md/state files.

## Guidance

- Keep entries brief — enough to reconstruct the reasoning.
- Link to the relevant commits or tags.
- If this file grows large, move older entries to `.agents/history/` and keep
  a pointer here.
- Completed implementation plans are archived as single files at
  `.agents/history/<YYYY-MM-DD-plan-name>.md` and linked from the decision
  entry they belong to. The trigger to archive is **plan completion**, not
  file growth — see **Archive a plan** below.

## Archive a plan

When a plan's work is complete — the point to do this is when the
implementation lands, not at the planning stage:

1. Consolidate `.agents/plans/<YYYY-MM-DD>-<feature-name>/` into a single
   file `.agents/history/<YYYY-MM-DD-plan-name>.md` (use the plan directory's
   date prefix, e.g. `2026-07-14-api-migration.md`).
2. Delete the plan directory.
3. Add an entry to `.agents/HISTORY.md` referencing the archive and its
   commit.

If the date prefix on the plan directory is missing or wrong, use the date
work started — record it in the archive filename exactly as-is.
