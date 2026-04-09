# Architecture

How the CLI is structured, where things live, and why.

## Layers

### Entry Point

`bin/yavy.js` is the shebang entry that loads the built output. The source entry registers all commands with Commander.js and calls `parseAsync()`. Top-level error handler catches unhandled rejections and exits with code 1.

### Commands

Each command is a factory function that returns a configured `Command`. Commands live in `src/commands/` - either as single files (login, logout, search) or directories when they have submodules (init, project).

Command factories wire up flags, descriptions, and an async action handler. The action handler orchestrates: validate inputs, call API, format output. No business logic lives in the action - it delegates to dedicated modules.

### API Client

Single HTTP client class handles all Yavy API communication. Key behaviors:

- Bearer token auth (loaded from credential store or environment)
- Retry with exponential backoff on 429/502/503/504
- Request timeout with AbortController
- Typed response parsing

### Authentication

Two paths:

1. **OAuth PKCE** - `yavy login` opens browser, spawns local HTTP server for callback, exchanges code for token. Credentials persisted to `~/.yavy/credentials.json` with 0600 permissions. Auto-refresh when token nears expiry.
2. **Token-based** - `YAVY_API_TOKEN` env variable or `~/.yavy/config.json`. Used by the project creation flow and CI environments.

### Interactive Prompts

When required CLI flags are missing, commands fall back to interactive mode. Prompts collect the missing values, then merge with any flags that were provided. Two prompt libraries are in use: @clack/prompts (multi-select, spinners) and @inquirer/prompts (input, select).

### Utilities

- **Output** - colored terminal helpers (success, error, warn, info) using chalk
- **Paths** - skill output directories, zip-slip prevention, safe directory creation
- **Errors** - API error formatting that maps HTTP status codes to actionable messages

## Data Flow

```
User runs command
  -> Commander parses flags
  -> Command action handler runs
  -> If missing flags: interactive prompts fill them in
  -> API client makes request (with retry)
  -> Response formatted and printed to stdout
  -> Errors caught, formatted, printed to stderr
```

## Build & Distribution

tsup bundles to ESM targeting Node 20+. The dist includes declarations and source maps. Published to npm as `@yavydev/cli` with `dist/` and `bin/` in the package.

## Testing Strategy

Vitest with globals enabled. Tests mock at module boundaries - the API client, prompts, and filesystem are mocked; pure functions (payload builders, error formatters, org extractors) are tested directly. Console output is verified via spies on console.log/console.error.
