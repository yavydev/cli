# @yavydev/cli

CLI for searching, managing, and configuring AI-ready documentation on Yavy.

## Commands

```bash
npm install               # Install dependencies
npm run build             # Build with tsup
npm run dev               # Build in watch mode
npm run check             # Run all checks (typecheck + lint + format + test)
npm run typecheck         # TypeScript strict type checking
npm run lint              # ESLint with typescript-eslint
npm run lint:fix          # ESLint auto-fix
npm run test              # Run tests (vitest)
npm run format:check      # Check formatting (prettier)
npm run format            # Fix formatting
```

## Architecture

The CLI is built on Commander.js with a modular command structure. Each command is a factory function returning a `Command` instance, registered in the entry point.

- **Commands** - one directory or file per command group. Each exports a factory.
- **API Client** - token-based HTTP client with retry logic and exponential backoff.
- **Auth** - OAuth2 PKCE flow with local callback server; credentials stored in `~/.yavy/`.
- **Prompts** - interactive flows using @clack/prompts for multi-select and @inquirer/prompts for input/select.

See [docs/architecture.md](docs/architecture.md) for details.

## Key Design Decisions

- `@/` path aliases throughout (configured in tsconfig, tsup, vitest).
- Strict TypeScript: `strict`, `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`.
- ESLint with typescript-eslint: `consistent-type-imports`, `no-floating-promises`, `no-explicit-any`.
- Commands set `process.exitCode` instead of calling `process.exit()` directly - keeps code testable.
- Two auth patterns coexist: OAuth (login flow) and token-based (API token via env or config file).
- Interactive mode activates when required CLI flags are missing; flags always take precedence.

## After Changing Commands

- Register new commands in the entry point.
- Add the command to README.md under the Commands section.
- If adding a new command group, create a directory under `src/commands/`.

## After Changing the API Client

- Update tests that mock fetch globally.
- If adding new response types, define them alongside existing API interfaces in the client module.

## Documentation

- [Architecture](docs/architecture.md) - layers, data flow, design decisions
- [README](README.md) - install, quick start, command reference
