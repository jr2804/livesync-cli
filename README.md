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

| Command | Description |
|---------|-------------|
| `daemon` | (default) Run mirror scan then continuously sync CouchDB ↔ local filesystem |
| `sync` | Run one replication cycle and exit |
| `ls [prefix]` | List DB files |
| `cat <src>` | Read file from local database to stdout |
| `put <dst>` | Write stdin to local database path |
| `push <src> <dst>` | Push local file into local database |
| `pull <src> <dst>` | Pull file from local database to local file |
| `rm <path>` | Mark file as deleted in local database |
| `init-settings [file]` | Create settings JSON from defaults |
| `setup <setupURI>` | Apply setup URI to settings file |
| `remote-add <name> <connstr>` | Add a remote CouchDB |
| `remote-ls` | List configured remotes |
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
