---
name: obsidian-vault-cli
description: Use the @jr2804/livesync-cli npm package to read, write, list, and manage files in an Obsidian vault synced by Self-hosted LiveSync via CouchDB
---

# obsidian-vault-cli

Use the `@jr2804/livesync-cli` CLI to interact with an Obsidian vault that is synced via [Self-hosted LiveSync](https://github.com/vrtmrz/obsidian-livesync) and CouchDB.

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

The minimum required settings are:

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

**Key settings:**

| Setting | Description |
|---------|-------------|
| `couchDB_URI` | CouchDB server URL (e.g. `http://192.168.1.100:5984`) |
| `couchDB_USER` | CouchDB username |
| `couchDB_PASSWORD` | CouchDB password |
| `couchDB_DBNAME` | CouchDB database name (e.g. `jan`) |
| `encrypt` | `true` if E2E encryption is enabled on the vault, `false` otherwise |
| `passphrase` | E2E encryption passphrase (empty string `""` if encryption is disabled) |
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

Our Obsidian vault is at `/opt/workspace/obsidian/jan/vault/`. The CouchDB database is `jan` on `http://obsidian-livesync.local:5984`. Credentials are stored in Vaultwarden (openclaw vault, entry "CouchDB Jan").

The vault has **no E2E encryption** (`encrypt: false`, `passphrase: ""`).

## Tips

- The `--vault` / `-V` flag separates the PouchDB database directory from the actual `.md` vault directory. Use this when the database is in a different location than the vault files.
- The `--verbose` flag shows detailed LiveSync log output for debugging.
- The `--settings` / `-s` flag lets you specify a custom settings file path.
- For the daemon, place a `.livesync/ignore` file in the vault root to exclude files from sync (supports `.gitignore`-style patterns).
- The daemon responds to `SIGTERM` / `SIGINT` for graceful shutdown.
