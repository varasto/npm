# @varasto/copilot-skills-deps

CLI for managing npm dependencies in GitHub Copilot Agent Skills.

## Installation

```bash
npx @varasto/copilot-skills-deps --help
```

## Commands

| Command | Description |
|---------|-------------|
| `setup` | Configure npm auth for private packages |
| `install` | Install dependencies for an Agent Skill |
| `update` | Update dependencies for an Agent Skill |
| `ensure` | Smart install/update (install if missing, update if stale) |
| `install-all` | Install dependencies for all Agent Skills in repo |
| `update-all` | Update dependencies for all Agent Skills in repo |
| `status` | Show dependency status and diagnostics |

## Usage

```bash
# Configure npm auth (one-time setup)
npx @varasto/copilot-skills-deps setup

# Install dependencies for an Agent Skill
npx @varasto/copilot-skills-deps install --npm ./scripts/package.json

# Smart install/update (recommended in SKILL.md)
npx @varasto/copilot-skills-deps ensure --npm ./scripts/package.json

# Check status of all Agent Skills
npx @varasto/copilot-skills-deps status
```

## License

MIT
