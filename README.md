# Yavy CLI

Search and manage your AI-ready documentation on [Yavy](https://yavy.dev).

## Installation

```bash
npm install -g @yavydev/cli
```

Requires Node.js >= 20.

## Quick Start

```bash
# Interactive setup: authenticate, select projects, configure AI tools
yavy init

# Or authenticate manually
yavy login

# Search your indexed documentation
yavy search "how do I get started?"

# List your projects
yavy projects
```

## Commands

### `yavy init`

Interactive setup wizard that authenticates, selects projects, and configures your AI tools (skills + MCP config) in one step.

| Flag            | Description                                             |
| --------------- | ------------------------------------------------------- |
| `--tool <name>` | Configure a specific tool only                          |
| `--yes`         | Non-interactive mode: all detected tools + all projects |

### `yavy search <query>`

Search your indexed documentation directly from the terminal.

| Flag                      | Description                        |
| ------------------------- | ---------------------------------- |
| `--project <org/project>` | Scope search to a specific project |
| `--limit <number>`        | Maximum results (1-20, default 10) |
| `--json`                  | Output as JSON                     |

### `yavy login`

Opens your browser to authenticate with your Yavy account using OAuth (PKCE). Credentials are stored in `~/.yavy/credentials.json`.

### `yavy logout`

Clears stored credentials.

### `yavy projects`

Lists all projects you have access to across your organizations.

| Flag     | Description    |
| -------- | -------------- |
| `--json` | Output as JSON |

### `yavy project create`

Create a new documentation project. Runs interactively when `--url` or `--github` is omitted.

| Flag              | Description                              |
| ----------------- | ---------------------------------------- |
| `--url <url>`     | Documentation URL (web crawl source)     |
| `--github <repo>` | GitHub repository (e.g. laravel/docs)    |
| `--org <slug>`    | Organization slug                        |
| `--name <name>`   | Project name (auto-generated if omitted) |
| `--public`        | Make project public (default)            |
| `--private`       | Make project private                     |
| `--branch <name>` | GitHub branch override                   |
| `--docs-path <p>` | GitHub docs path                         |
| `--no-sync`       | Skip initial auto-sync                   |

### `yavy generate <org/project>`

Downloads a skill from a project's indexed documentation.

| Flag              | Description                                           |
| ----------------- | ----------------------------------------------------- |
| `--global`        | Save to global skills directory (`~/.claude/skills/`) |
| `--output <path>` | Custom output path                                    |
| `--force`         | Overwrite existing skill files                        |
| `--json`          | Output as JSON                                        |

By default, skills are saved to `.claude/skills/<project>/` in the current directory.

## How It Works

1. Yavy indexes your documentation sources (websites, GitHub repos, Confluence, Notion)
2. The CLI calls the Yavy API to search or download skills using the indexed content
3. Skills and MCP configs are saved locally for your AI coding tools to discover
4. AI coding assistants automatically activate the skill when working with relevant code

## Configuration

| Environment Variable | Description              | Default            |
| -------------------- | ------------------------ | ------------------ |
| `YAVY_BASE_URL`      | Override API base URL    | `https://yavy.dev` |
| `YAVY_CLIENT_ID`     | Override OAuth client ID | (built-in)         |

## Related

- [Yavy Claude Code Plugin](https://github.com/yavydev/claude-code) — Claude Code plugin with interactive setup
- [Yavy](https://yavy.dev) — Index documentation, search with AI

## License

[MIT](LICENSE)
