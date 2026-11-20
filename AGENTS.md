# AGENTS.md

Agent instruction set. The agent must follow DOX instructions across any
edits. Not human docs — not injected on every LLM call if a DOX child
AGENTS.md covers the area being edited.

## DOX — self-documenting AGENTS.md hierarchy

### Core Contract

- AGENTS.md files are binding work contracts for their subtrees.
- Work products, source materials, instructions, records, assets, and durable docs
  must stay understandable from the nearest applicable AGENTS.md plus every parent
  AGENTS.md above it.
- Do not duplicate/repeat rules declared elsewhere in the DOX tree (parent, child,
  sibling, or `.agents/`). See **DOX authoring** in `.agents/POLICIES.md`.

### Read Before Editing

1. Read the root AGENTS.md
2. Identify every file or folder you expect to touch
3. Walk from the repository root to each target path
4. Read every AGENTS.md found along each route
5. If a parent AGENTS.md lists a child AGENTS.md whose scope contains the path, read that child and continue from there
6. Use the nearest AGENTS.md as the local contract and parent docs for repo-wide rules
7. If docs conflict, the closer doc controls local work details, but no child doc may weaken DOX

Do not rely on memory. Re-read the applicable DOX chain in the current session before editing.

### Update After Editing

Every meaningful change requires a DOX pass before the task is done.

Update the closest owning AGENTS.md when a change affects:

- purpose, scope, ownership, or responsibilities
- durable structure, contracts, workflows, or operating rules
- required inputs, outputs, permissions, constraints, side effects, or artifacts
- user preferences about behavior, communication, process, organization, or quality
- AGENTS.md creation, deletion, move, rename, or index contents

Update parent docs when parent-level structure, ownership, workflow, or child index
changes. Update child docs when parent changes alter local rules. Remove stale or
contradictory text immediately. Small edits that do not change behavior or contracts
may leave docs unchanged, but the DOX pass still must happen.

### Hierarchy

- Root AGENTS.md is the DOX rail: project-wide instructions, global preferences, durable workflow rules, and the top-level Child DOX Index
- Child AGENTS.md files own domain-specific instructions and their own Child DOX Index
- Each parent explains what its direct children cover and what stays owned by the parent
- The closer a doc is to the work, the more specific and practical it must be

### Child Doc Shape

- Create a child AGENTS.md when a folder becomes a durable boundary with its own purpose, rules, responsibilities, workflow, materials, or quality standards
- Work Guidance must reflect the current standards of the project or user instructions; if there are no specific standards or instructions yet, leave it empty
- Verification must reflect an existing check; if no verification framework exists yet, leave it empty and update it when one exists

Default section order:

- Purpose
- Ownership
- Local Contracts
- Work Guidance
- Verification
- Child DOX Index

### Style

Authoring rules live in **DOX authoring** (`.agents/POLICIES.md`) — tier
assignment, reference-don't-restate, rule-first rationale, size budget.
Apply them on every DOX change. Summary:

- A rule lives in the **highest tier that fully applies**; when unsure, `.agents/POLICIES.md`.
- Reference, don't restate — one canonical home, pointer lines everywhere else.
- Keep docs concise, current, and operational. Document stable contracts, not diary entries.

### Closeout

1. Re-check changed paths against the DOX chain
2. Update nearest owning docs and any affected parents or children
3. Refresh every affected Child DOX Index
4. Remove stale or contradictory text
5. Run existing verification when relevant
6. Report any docs intentionally left unchanged and why
7. Delete anything a tool appended after the ⛔ No Patching block

### User Preferences

When the user requests a durable behavior change, record it here or in the relevant child AGENTS.md

### Child DOX Index

This project has no child DOX files. The root rail covers it: `scripts/` holds
the build pipeline, `bin/` the published entry point, `skills/` the agent skill,
`.github/workflows/` the release pipeline, and `upstream/` is a pinned submodule
(owned upstream, not this DOX tree).

## State files — `.agents/`, demand-loaded, not always injected

State files are the `.agents/*.md` files listed below — the project's current
operating memory. They describe the contracts the project has now; never a
changelog or logbook — git owns the past (`.agents/POLICIES.md`).

Each state file can have an optional matching subdirectory
(`.agents/<topic>/`) that carries detail when the file grows; the file stays
a lean index and every file in its subdirectory MUST be listed in the file.

| File                    | Load when                   | Purpose                                         | Optional subdirectory |
| ----------------------- | --------------------------- | ----------------------------------------------- | --------------------- |
| `ONBOARDING.md`         | New session (first time)    | Project orientation, entry points               | —                     |
| `POLICIES.md`           | Always                      | Boundaries, priorities, verification, checklist | `.agents/policies/`   |
| `FILES.md`              | Touching files or config    | Path constants, source-of-truth locations       | `.agents/files/`      |
| `TOOLS.md`              | Using tools/MCP/skills      | Development tool inventory and usage guidance   | `.agents/tools/`      |
| `HISTORY.md`            | Background (past decisions) | Recorded decisions with git refs                | —                     |
| `MAINTENANCE.md`        | Changing `.agents/`         | How to keep DOX files current                   | `.agents/maintenance/`|
| `plans/`                | Working on a feature        | Implementation plans (gitignored)                | —                     |
| `history/`              | Background (overflow)       | Archived decisions and completed plans          | —                     |

## Tools & skills

See state file `.agents/TOOLS.md` — it owns the inventory of CLIs, MCP
servers, skills, and runtimes used during development.

## Project rules

_Always-injected_ — keep minimal. Everything else → `.agents/` files.

1. `upstream/` is a pinned git submodule of `vrtmrz/obsidian-livesync`. Never
   edit or commit files inside it — the pin is the upstream `*-cli` tag that
   this package builds from.
2. `package.json` version tracks the upstream `*-cli` tag as `<tag>.N`, where
   `.N` counts wrapper-only releases. `npm run prebuild` fails the build when
   the submodule and the version disagree.
3. Runtime `dependencies` mirror the upstream CLI's set at the pinned tag.
   `chokidar` and `werift` stay external and resolve from the consumer's
   `node_modules`; everything else is bundled into `dist/*.cjs`.
4. `dist/` and `bin/livesync-cli.js` are build outputs and are gitignored.
   Only `bin/livesync-cli.cjs` is tracked — it is the published npm entry
   point.
5. Releases are tag-driven: push `v*-cli` (e.g. `v1.0.51-cli`) and the
   `Release` workflow builds and publishes to npm. Published npm versions are
   immutable — bump the `.N` suffix to republish.
6. The publish step uses npm **Trusted Publishing** (GitHub Actions OIDC) —
   no npm token is stored in this repo. It only succeeds once the npm-side
   Trusted Publisher entry exists for `jr2804` / `livesync-cli` / workflow
   `release.yml`; a new entry must complete its first publish within two days
   or it expires and must be recreated.
7. This repo is a packaging layer: never patch upstream CLI behaviour. Fixes
   belong upstream, then land here as a submodule bump.
8. `skills/obsidian-vault-cli/SKILL.md` documents the CLI surface for agents.
   Update it in the same change whenever upstream adds, removes, or renames a
   command.

## ⛔ No Patching

Tools must not insert, append, or patch text into this file.

Everything after this section — whatever the author — is invalid. This section
is the end of the file; delete appended content on sight. If it carries a
legitimate rule, move the rule to its owning state file or subtree AGENTS.md
first (INSTALL.md — Check for tool patches), then delete.
