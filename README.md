# Yavy CLI

Generate AI skills from your indexed documentation on [Yavy](https://yavy.dev).

## Installation

```bash
npm install -g @yavydev/cli
```

Requires Node.js >= 18.

## Quick Start

```bash
# Authenticate with your Yavy account
yavy login

# List your projects
yavy projects

# Generate a skill for a project
yavy generate my-org/my-project
```

## Commands

### `yavy login`

Opens your browser to authenticate with your Yavy account using OAuth (PKCE). Credentials are stored in `~/.yavy/credentials.json`.

### `yavy logout`

Clears stored credentials.

### `yavy projects`

Lists all projects you have access to across your organizations.

| Flag     | Description    |
| -------- | -------------- |
| `--json` | Output as JSON |

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
2. The CLI calls the Yavy API to download a skill using the indexed content
3. The skill file is saved locally for your AI coding tools to discover
4. AI coding assistants automatically activate the skill when working with relevant code

## Configuration

| Environment Variable | Description              | Default            |
| -------------------- | ------------------------ | ------------------ |
| `YAVY_BASE_URL`      | Override API base URL    | `https://yavy.dev` |
| `YAVY_CLIENT_ID`     | Override OAuth client ID | (built-in)         |

## Related

- [Yavy Claude Code Plugin](https://github.com/yavydev/claude-code) — Claude Code plugin with interactive setup
- [Yavy](https://yavy.dev) — Index documentation, generate AI skills

## License

[MIT](LICENSE)
