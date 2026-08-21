# @jr2804/livesync-cli

**npm-published wrapper** for the [Self-hosted LiveSync CLI](https://github.com/vrtmrz/obsidian-livesync/tree/main/src/apps/cli).

No build steps, no Docker — just `npx` or `npm install -g`.

## Usage

```bash
# Run directly
npx @jr2804/livesync-cli <database-path> [options] <command>

# Install globally
npm install -g @jr2804/livesync-cli
livesync-cli <database-path> daemon --vault /path/to/vault
```

## Commands

### Core

| Command | Description |
|---------|-------------|
| `daemon` | (default) Run mirror scan then continuously sync CouchDB ↔ local filesystem |
| `sync` | Run one replication cycle and exit |
| `mirror` | Run a full mirror scan (filesystem → DB) without continuous sync |

### File operations

| Command | Description |
|---------|-------------|
| `ls [prefix]` | List files in local database, optionally filtered by prefix |
| `cat <src>` | Read file from local database to stdout |
| `cat-rev <src> <rev>` | Read file at a specific revision from local database |
| `put <dst>` | Write stdin to local database path |
| `push <src> <dst>` | Push local file into local database |
| `pull <src> <dst>` | Pull file from local database to local file |
| `pull-rev <src> <dst> <rev>` | Pull file at a specific revision to local file |
| `rm <path>` | Mark file as deleted in local database |
| `info <path>` | Show file metadata, conflicts, and revision history |

### Conflict resolution

| Command | Description |
|---------|-------------|
| `resolve <path> <rev>` | Resolve a conflicted file by keeping a specific revision |
| `mark-resolved [remote-id]` | Mark all replication conflicts as resolved, optionally for a specific remote |

### Remote management

| Command | Description |
|---------|-------------|
| `remote-add <name> <connstr>` | Add a remote CouchDB configuration |
| `remote-rm <id>` | Remove a remote configuration |
| `remote-ls` | List configured remotes |
| `remote-export <id>` | Print the connection URI for a remote |
| `remote-set <id> <connstr>` | Update a remote's connection string |
| `remote-activate <id>` | Switch the active remote configuration |
| `remote-status [id]` | Show replication status, optionally for a specific remote |
| `lock-remote [id]` | Lock the remote database, optionally for a specific remote |
| `unlock-remote [id]` | Unlock the remote database, optionally for a specific remote |

### Setup

| Command | Description |
|---------|-------------|
| `init-settings [file]` | Create settings JSON from defaults |
| `setup <setupURI>` | Apply setup URI to settings file |

### P2P

| Command | Description |
|---------|-------------|
| `p2p-host` | Start P2P host mode and wait until interrupted |
| `p2p-peers <timeout>` | Discover P2P peers |
| `p2p-sync <peer> <timeout>` | Sync with a P2P peer |

See the [upstream README](https://github.com/vrtmrz/obsidian-livesync/blob/main/src/apps/cli/README.md) for full documentation.

## How it works

This package wraps the upstream CLI from [vrtmrz/obsidian-livesync](https://github.com/vrtmrz/obsidian-livesync) at the `*-cli` release tag. The build process:

1. Checks out the upstream repo at the matching `*-cli` tag
2. Runs `npm install` and `npm run build` inside `src/apps/cli/`
3. Packages the built `dist/` files into an npm package

No modifications are made to the upstream code — this is purely a packaging layer.

## Versioning

Versions match upstream `*-cli` tags (e.g. `0.25.80-cli`). When a new upstream CLI release is published, this package is updated to match.

## License

MIT — this wrapper project.
The upstream CLI is licensed under MIT by [vorotamoroz](https://github.com/vrtmrz).
