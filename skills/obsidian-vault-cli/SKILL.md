---
name: obsidian-vault-cli
description: Use when reading, writing, listing, or managing files in an Obsidian vault synced by Self-hosted LiveSync via CouchDB. Uses the @jr2804/livesync-cli npm package.
version: 3.1.0
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

## Connect & Sync

### 1. Install

```bash
# Run directly (no install)
npx @jr2804/livesync-cli <database-path> <command>

# Or install globally
npm install -g @jr2804/livesync-cli
livesync-cli <database-path> <command>
```

### 2. Configure CouchDB connection

Create a settings file:

```bash
livesync-cli init-settings ./my-vault/.livesync/settings.json
```

Edit `<db-path>/.livesync/settings.json` with your CouchDB credentials:

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
| `couchDB_URI` | CouchDB server URL |
| `couchDB_USER` | CouchDB username |
| `couchDB_PASSWORD` | CouchDB password |
| `couchDB_DBNAME` | CouchDB database name |
| `encrypt` | `true` if E2E encryption is enabled, `false` otherwise |
| `passphrase` | E2E passphrase. `""` if encryption is disabled |
| `isConfigured` | Must be `true` for the CLI to operate |
| `usePathObfuscation` | `true` if vault uses path obfuscation (requires passphrase) |

### 3. Sync

```bash
# One-shot sync
livesync-cli ./my-vault sync

# Continuous daemon (watches for changes)
livesync-cli ./my-vault daemon --vault /path/to/vault

# Daemon with polling interval
livesync-cli ./my-vault daemon --interval 30 --vault /path/to/vault

# Mirror database to local filesystem
livesync-cli ./my-vault mirror --vault /path/to/vault
```

## Command Reference

### File Operations

| Command | Description | Example |
|---------|-------------|---------|
| `ls [prefix]` | List files | `livesync-cli ./db ls "Daily Notes/"` |
| `cat <path>` | Read file to stdout | `livesync-cli ./db cat "notes/hello.md"` |
| `put <dst>` | Write stdin to database | `echo "content" \| livesync-cli ./db put "notes/hello.md"` |
| `push <src> <dst>` | Push local file into database | `livesync-cli ./db push ./file.md "vault/file.md"` |
| `pull <src> <dst>` | Pull database file to local | `livesync-cli ./db pull "vault/file.md" ./out.md` |
| `pull-rev <src> <dst> <rev>` | Pull specific revision | `livesync-cli ./db pull-rev "f.md" ./old.md 3-abcdef` |
| `cat-rev <src> <rev>` | Read file at specific revision | `livesync-cli ./db cat-rev "notes/hello.md" 3-abcdef` |
| `rm <path>` | Delete a file | `livesync-cli ./db rm "notes/old.md"` |
| `info <path>` | Show file metadata | `livesync-cli ./db info "notes/hello.md"` |
| `resolve <path> <rev>` | Resolve conflicts | `livesync-cli ./db resolve "f.md" 3-abcdef` |

### Sync & Daemon

| Command | Description | Example |
|---------|-------------|---------|
| `sync` | One replication cycle | `livesync-cli ./db sync` |
| `daemon` | Continuous sync (default) | `livesync-cli ./db daemon --vault /vault` |
| `daemon --interval <N>` | Polling mode | `livesync-cli ./db daemon --interval 30` |
| `mirror` | Mirror DB to filesystem | `livesync-cli ./db mirror --vault /vault` |

### Remote Management

| Command | Description | Example |
|---------|-------------|---------|
| `remote-add <name> <connstr>` | Add remote CouchDB | `livesync-cli ./db remote-add my-remote "sls+https://..."` |
| `remote-ls` | List remotes | `livesync-cli ./db remote-ls` |
| `remote-activate <id>` | Activate remote | `livesync-cli ./db remote-activate remote-abc123` |
| `remote-status [id]` | Check remote status | `livesync-cli ./db remote-status remote-abc123` |
| `unlock-remote [id]` | Unlock remote DB | `livesync-cli ./db unlock-remote remote-abc123` |
| `lock-remote [id]` | Lock remote DB | `livesync-cli ./db lock-remote remote-abc123` |
| `remote-rm <id>` | Remove remote | `livesync-cli ./db remote-rm remote-abc123` |
| `remote-export <id>` | Export remote connection string | `livesync-cli ./db remote-export remote-abc123` |
| `remote-set <id> <connstr>` | Replace remote connection string | `livesync-cli ./db remote-set remote-abc123 "sls+https://..."` |
| `mark-resolved [id]` | Resolve sync status | `livesync-cli ./db mark-resolved remote-abc123` |

### P2P

| Command | Description | Example |
|---------|-------------|---------|
| `p2p-peers <timeout>` | Discover peers | `livesync-cli ./db p2p-peers 5` |
| `p2p-sync <peer> <timeout>` | Sync with peer | `livesync-cli ./db p2p-sync my-peer 15` |
| `p2p-host` | Host mode | `livesync-cli ./db p2p-host` |

### Setup

| Command | Description | Example |
|---------|-------------|---------|
| `init-settings [path]` | Create default settings | `livesync-cli init-settings ./settings.json` |
| `setup <setupURI>` | Apply setup URI | `livesync-cli ./db setup "obsidian://setuplivesync?..."` |

## Our Vault

Vault path, CouchDB URL, database name, and credentials are stored in Vaultwarden (openclaw vault, entry "CouchDB Jan"). The vault has no E2E encryption.

## Common Pitfalls

1. **Missing `isConfigured: true`** — the CLI refuses to operate without this setting.
2. **Wrong `encrypt`/`passphrase` combination** — if `encrypt: true` but passphrase is wrong, all reads fail with decryption errors. If `encrypt: false` but a passphrase is set, the CLI may still try encryption transforms.
3. **Path obfuscation mismatch** — if the vault uses path obfuscation but `usePathObfuscation` is not set, the daemon reports success but writes 0-byte files.
4. **Database directory not initialized** — the first `sync` or `daemon` run creates the PouchDB database. If the directory doesn't exist, create it first.
5. **CouchDB URL not reachable** — the default `.env` URL may only resolve inside the Docker network. Use the external URL when connecting from outside.

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
