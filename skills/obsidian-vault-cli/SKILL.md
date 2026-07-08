---
name: obsidian-vault-cli
description: Use when reading, writing, listing, or managing files in an Obsidian vault synced by Self-hosted LiveSync via CouchDB. Uses the @jr2804/livesync-cli npm package.
version: 3.0.0
author: Jan Reimes
license: MIT
metadata:
  hermes:
    tags: [obsidian, livesync, vault, couchdb, cli]
    related_skills: [vaultwarden]
---

# obsidian-vault-cli

Interact with an Obsidian vault synced via [Self-hosted LiveSync](https://github.com/vrtmrz/obsidian-livesync) and CouchDB using the `@jr2804/livesync-cli` CLI.

## When to Use

- List files in the vault
- Read a note's content
- Write or update a note
- Delete a note
- Push/pull files between local filesystem and the vault database
- Run a one-shot sync or continuous daemon
- Check file metadata (revisions, conflicts, chunks)

## Quick Start

```bash
# Run directly (no install needed)
npx @jr2804/livesync-cli <database-path> <command>

# Or install globally
npm install -g @jr2804/livesync-cli
livesync-cli <database-path> <command>
```

## Configuration

The CLI needs a **local database directory** (PouchDB) and a **settings file** at `<database-path>/.livesync/settings.json`.

### Step 1: Create settings

```bash
livesync-cli init-settings ./my-vault/.livesync/settings.json
```

### Step 2: Edit the settings file

Minimum required settings:

```json
{
  "couchDB_URI": "http://your-couchdb:5984",
  "couchDB_USER": "your-username",
  "couchDB_PASSWORD": "your-password",
  "couchDB_DBNAME": "your-database-name",
  "isConfigured": true,
  "encrypt": false,
  "passphrase": ""
}
```

| Setting | Description |
|---------|-------------|
| `couchDB_URI` | CouchDB server URL (e.g. `http://192.168.1.100:5984`) |
| `couchDB_USER` | CouchDB username |
| `couchDB_PASSWORD` | CouchDB password |
| `couchDB_DBNAME` | CouchDB database name |
| `encrypt` | `true` if E2E encryption is enabled on the vault, `false` otherwise |
| `passphrase` | E2E encryption passphrase. Empty string `""` if encryption is disabled |
| `isConfigured` | Must be `true` for the CLI to operate |
| `usePathObfuscation` | `true` if the vault uses path obfuscation (requires passphrase) |

### Step 3: Sync the vault

```bash
# One-shot sync
livesync-cli ./my-vault sync

# Continuous daemon (watches for changes)
livesync-cli ./my-vault daemon --vault /path/to/actual/vault
```

## Commands

### File Operations

```bash
# List files
livesync-cli ./my-vault ls
livesync-cli ./my-vault ls "Daily Notes/"

# Read a file (to stdout)
livesync-cli ./my-vault cat "Daily Notes/2026-01-15.md"

# Write a file (from stdin)
echo "# Hello" | livesync-cli ./my-vault put "notes/hello.md"

# Push a local file into the database
livesync-cli ./my-vault push ./local-file.md "vault/path/file.md"

# Pull a file from the database to local filesystem
livesync-cli ./my-vault pull "vault/path/file.md" ./output.md

# Pull a specific revision
livesync-cli ./my-vault pull-rev "vault/path/file.md" ./old-version.md 3-abcdef

# Delete a file
livesync-cli ./my-vault rm "notes/old-note.md"

# Show file metadata (ID, revision, conflicts, chunks)
livesync-cli ./my-vault info "notes/hello.md"

# Resolve conflicts (keep one revision)
livesync-cli ./my-vault resolve "notes/hello.md" 3-abcdef
```

### Sync Operations

```bash
# One-shot sync (pull from CouchDB, push local changes)
livesync-cli ./my-vault sync

# Continuous daemon
livesync-cli ./my-vault daemon --vault /path/to/vault

# Daemon with polling (instead of _changes feed)
livesync-cli ./my-vault daemon --interval 30 --vault /path/to/vault

# Mirror database to local filesystem
livesync-cli ./my-vault mirror /path/to/vault
```

### Remote Management

```bash
# Add a remote CouchDB
livesync-cli ./my-vault remote-add my-remote "sls+https://user:pass@example.com/db"

# List remotes
livesync-cli ./my-vault remote-ls

# Activate/deactivate a remote
livesync-cli ./my-vault remote-activate remote-abc123

# Check remote status
livesync-cli ./my-vault remote-status remote-abc123

# Unlock a locked remote database
livesync-cli ./my-vault unlock-remote remote-abc123

# Lock a remote database
livesync-cli ./my-vault lock-remote remote-abc123
```

### P2P Operations

```bash
# Discover peers
livesync-cli ./my-vault p2p-peers 5

# Sync with a peer
livesync-cli ./my-vault p2p-sync my-peer-name 15

# Host mode (wait for connections)
livesync-cli ./my-vault p2p-host
```

### Setup URI

```bash
# Apply a setup URI from Obsidian's "Copy Setup URI"
livesync-cli ./my-vault setup "obsidian://setuplivesync?settings=..."
```

## Our Vault

Our Obsidian vault is at `/opt/workspace/obsidian/jan/vault/`. The CouchDB database is `jan` on `http://obsidian-livesync.local:5984`. Credentials are in Vaultwarden (openclaw vault, entry "CouchDB Jan").

The vault has **no E2E encryption** (`encrypt: false`, `passphrase: ""`).

## Common Pitfalls

1. **Missing `isConfigured: true`** — the CLI refuses to operate without this setting.
2. **Wrong `encrypt`/`passphrase` combination** — if `encrypt: true` but passphrase is wrong, all reads fail with decryption errors. If `encrypt: false` but a passphrase is set, the CLI may still try encryption transforms.
3. **Path obfuscation mismatch** — if the vault uses path obfuscation but `usePathObfuscation` is not set, the daemon reports success but writes 0-byte files.
4. **Database directory not initialized** — the first `sync` or `daemon` run creates the PouchDB database. If the directory doesn't exist, create it first.
5. **CouchDB URL not reachable** — the default `.env` URL `http://obsidian-livesync.local:5984` only resolves inside the Docker network. From outside, use `https://obsidian-livesync.reimes.uk`.

## Tips

- The `--vault` / `-V` flag separates the PouchDB database directory from the actual `.md` vault directory.
- The `--verbose` flag shows detailed LiveSync log output for debugging.
- The `--settings` / `-s` flag lets you specify a custom settings file path.
- Place a `.livesync/ignore` file in the vault root to exclude files from sync (supports `.gitignore`-style patterns).
- The daemon responds to `SIGTERM` / `SIGINT` for graceful shutdown.

## Verification Checklist

- [ ] `npx @jr2804/livesync-cli --help` shows the full command list
- [ ] Settings file exists at `<db-path>/.livesync/settings.json`
- [ ] `couchDB_URI`, `couchDB_USER`, `couchDB_PASSWORD`, `couchDB_DBNAME` are set
- [ ] `isConfigured` is `true`
- [ ] `encrypt` and `passphrase` match the vault's actual encryption state
- [ ] `ls` returns expected files
- [ ] `cat <path>` returns expected content
