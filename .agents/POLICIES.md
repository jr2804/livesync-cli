# AGENTS.md — POLICIES

Always applicable. Boundaries, priorities, verification, checklist.

## Priorities

1. Correctness
2. Evidence
3. Safety
4. Minimal changes
5. Consistency
6. Performance

## Boundaries

- NEVER fabricate paths, commits, APIs, config keys, env vars, test results,
  or benchmark numbers. If you don't know, say so.
- NEVER guess at command names, flags, or paths. Read source or run `--help`.
- NEVER add secrets, API keys, or tokens to files. Use env vars.
- NEVER run destructive commands (`rm -rf`, `git reset --hard`,
  `git push --force`) without explicit confirmation.
- NEVER delete or move files without explicit instruction.
- NEVER create temp files in project root. Use dedicated temp dir.
- NEVER edit files under `upstream/` — it is a pinned submodule.
- NEVER publish to npm without explicit instruction; published versions are
  immutable.

## Change constraints

- Minimal, surgical edits. Preserve existing style.
- No new dependencies without explicit instruction.
- No unrelated refactoring while fixing a bug.

## Code quality

Universal defaults. Project-specific standards live in child AGENTS.md.

- **SRP** — one reason to change per module/function.
- **DRY** — check before adding. Extract on third occurrence (Rule of Three).
- **Redundant code** — remove dead branches, unreachable conditions, unused
  params/imports before finishing.
- **Duplication vs. abstraction** — prefer duplication over wrong premature
  abstraction.
- No new code-quality tooling by default — opt in per project.

## Completion checklist

- Change solves the stated problem
- Relevant validation ran (or gaps stated)
- No unintended side effects or secrets exposed

## DOX authoring (keep AGENTS.md lean)

AGENTS.md and `.agents/` files share limited context. Bloat and duplication
are the failure mode.

### Where a rule lives

A rule goes in the **highest (most general) tier that fully applies**:

- Applies to **all code in the project** → `.agents/POLICIES.md` (default).
- Meaningful **only inside one subtree** → that subtree's `AGENTS.md`.
- Just helps navigation → the parent's Child DOX Index, nothing else.

### Reference, don't restate

A rule appears in **exactly one file**. Other files use a **pointer line**:
`<topic> — see <file>`. Never copy the rule, rationale, or example.

### Rule first, rationale second, never third

A DOX line is the rule. If a rationale is costly to rediscover, add one
short clause. No multi-paragraph explanations or code pairs — those belong
in a skill or `docs/`, linked once.

### Content rules

- **No tree views.** Generate on demand with `rg --files | tree-cli --fromfile`.
- **No history in AGENTS.md files.** Git log has routine history. Record only
  decisions costly to rediscover — in `.agents/HISTORY.md` (or
  `.agents/history/` for overflow archives). See **Implementation Plans**
  below for archiving completed plans.
- **Lean state files, optional subdirectories.** State files stay brief entry
  points (index-style, not sprawling documents). A state file that grows past
  its size budget (≤ **120 lines**) must be split into
  `.agents/<topic>/<name>.md` subdirectories — not stuffed longer. Every file
  in an optional subdirectory **MUST** be mentioned in the state file that
  owns it. See **State file subdirectories** for the naming map.
- **No TODO lists.** Use issue trackers or beads.
- Prefer direct bullets with explicit names.
- Trim obvious statements, repeated rules, and detail that no longer applies.

## Implementation Plans

- Plans, refactoring plans, and design docs go in
  `.agents/plans/<YYYY-MM-DD>-<feature-name>/` — NOT under version control
  (gitignored).
- Name descriptively with phase-number prefixes so file order matches
  implementation order, e.g. `01-sub-feature.md`, `02-next-sub-feature.md`.
- NEVER commit plans to git. They are mutable working artifacts.
- The archive trigger is **plan completion**: archive the moment the work
  lands — don't wait for the next maintenance pass. Archive naming and
  procedure: see **Documentation → Archive a plan**.
- Shipped docs (user-facing guides, API references) go in `docs/` and
  ARE committed.

## State file subdirectories

Each state file has a matching optional subdirectory for growth — the file
stays a lean index and the subdirectory carries the detail:

| State file | Optional subdirectory |
| ---------- | -------------------- |
| `FILES.md` | `.agents/files/` |
| `POLICIES.md` | `.agents/policies/` |
| `TOOLS.md` | `.agents/tools/` |
| `MAINTENANCE.md` | `.agents/maintenance/` |

- Only create a subdirectory when its state file approaches its size budget.
- Every file in a subdirectory MUST be listed in its state file (name + one
  line of what it covers). A subdirectory file missing from the index is
  dead content — move it or delete it.
- `ONBOARDING.md` and `HISTORY.md` have no subdirectories: entry points stay
  a single file, and history growth goes to `.agents/history/`.

## Documentation

- When `.agents/HISTORY.md` grows too large, archive older entries to
  `.agents/history/`. Reference them from `.agents/HISTORY.md`.
- Completed plans (`.agents/plans/<YYYY-MM-DD>-<feature-name>/`) are durable
  once implemented: consolidate them into
  `.agents/history/<YYYY-MM-DD-plan-name>.md`, remove the plan directory, and
  reference the archive from `.agents/HISTORY.md`. The trigger is **plan
  completion** — archive when the work lands, not at a later maintenance pass.
- `.agents/history/` IS version-controlled (durable decision records).
- AGENTS.md and state files describe the project's current contracts — never
  append session notes, iteration logs, or changelogs; delete stale text
  instead. `.agents/HISTORY.md` is the only permitted exception and holds
  high-level decisions only.

## Size budget

- `.agents/` files: ≤ **120 lines** (always-injected context).
- Subtree `AGENTS.md`: ≤ **250 lines** (loaded cumulatively with parents).

Exceeding the budget signals restating instead of pointing, or hoarding
rationale. Cut first; split the subtree only as a last resort.

When a state file exceeds its budget, split detail into its matching
subdirectory (`.agents/files/`, `.agents/policies/`, `.agents/tools/`,
`.agents/maintenance/`) — the file stays a lean index and every file in the
subdirectory MUST be listed in it.

## Verification

| Check | Command | Notes |
| ----- | ------- | ----- |
| Submodule pin | `node scripts/check-upstream.mjs` | Runs automatically as `prebuild` |
| CLI smoke test | `npm test` | Prints `--help`; confirms the bundle loads |
| Package contents | `npm pack --dry-run` | Confirms `dist/*.cjs` + `bin/` are what ships |
| Markdown lint | `mise run format-md` | `rumdl` over `.agents/` and the repo root |
| Functional round-trip | see ONBOARDING → Gotchas | `put` / `cat` / `ls` / `mirror` against a temp DB |

Upstream ships its own suites (`npm run test:unit --workspace self-hosted-livesync-cli`
inside `upstream/`); run them when a bump changes upstream behaviour.

## Response format

Concise and specific. No filler, intros, or restated requirements.
Answer direct questions directly.

For review/debugging/analysis: findings with references, conclusion,
approach. Mention caveats.
