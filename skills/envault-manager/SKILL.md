---
name: envault-manager
description: Use when managing environment variables across projects, working with .env files, setting up project secrets, or using the envault CLI tool for centralized env var management
---

# Envault Manager

## Overview

Envault is a centralized environment variable management CLI tool that stores variables in a SQLite database (`~/.envault/envault.db`) while keeping `.env` files in sync. It uses git repository roots to identify projects and provides a structured, AI-friendly interface for managing environment variables across multiple projects and environments.

**Core principle:** One database for all projects, with bidirectional sync between the database (store) and project `.env` files.

## Installation

**Before using envault, always check if it's installed:**

```bash
# Check if envault is installed and get version
envault --version

# If not installed, you'll see: "command not found: envault"
# If installed, you'll see: "envault 0.1.0" (or current version)
```

**If envault is not installed, install it:**

**Using Bun (recommended):**
```bash
bun install -g envault-manager
```

**Using npm:**
```bash
npm install -g envault-manager
```

**Verify installation:**
```bash
# Should show version number
envault --version

# Should show help menu
envault --help
```

## When to Use

Use envault when:
- User asks to "set up environment variables" for a project
- User wants to manage secrets across dev/staging/prod environments
- User needs to copy variables between projects
- User has existing `.env` files to import into centralized management
- User wants to view or modify environment variables without editing files directly
- User needs to sync environment variables across team or AI agent sessions

## Quick Reference

| Command | Purpose | Example |
|---------|---------|---------|
| `envault project list` | List all tracked projects | `envault project list --json` |
| `envault env list` | List environments in current or specified project | `envault env list --project backend` |
| `envault var list` | List variables (with partial value display) | `envault var list --env prod` |
| `envault var get <KEY>` | Get full value of a variable | `envault var get DATABASE_URL` |
| `envault var set <KEY>` | Set variable (interactive/secure mode) | `envault var set API_KEY --env prod` |
| `envault var unset <KEY>` | Remove a single variable | `envault var unset OLD_KEY` |
| `envault var clear` | Remove all variables (with confirmation) | `envault var clear --env dev --yes` |
| `envault var copy <project>` | Copy variables from another project | `envault var copy backend --from-env prod --env staging` |
| `envault sync` | Sync store → project (write .env files) | `envault sync` |
| `envault sync --from project` | Sync project → store (import .env files) | `envault sync --from project` |

## Environment Mapping

Envault maps `.env` files to environment names:

| File | Environment Name |
|------|------------------|
| `.env` | `default` |
| `.env.dev` | `dev` |
| `.env.prod` | `prod` |
| `.env.staging` | `staging` |
| `.env.<custom>` | `<custom>` |

**Important notes:**
- **Default environment:** When `--env` flag is omitted, envault uses `default` environment (mapped to `.env` file)
- **Custom environments:** ANY `.env.<name>` file creates a `<name>` environment (e.g., `.env.production` → `production` env, not `prod`)
- **Recommended naming:** Use short, simple names (`dev`, `prod`, `staging`) to avoid confusion

## Command Details

### Project Commands

#### `envault project list`

List all tracked projects in the database.

```bash
# Human-readable format
envault project list

# JSON format
envault project list --json
```

**Output:** Shows project name and absolute path for each tracked project.

### Environment Commands

#### `envault env list`

List environments for current repo or a specific project.

```bash
# Current repo
envault env list

# Specific project by name
envault env list --project backend

# JSON output
envault env list --json
```

**Flags:**
- `--project <name>` or `-p <name>`: Target a tracked project by name
- `--json`: Output as JSON array

### Variable Commands

#### `envault var list`

List all variables with partial value display (first4...last4 for security).

```bash
# Current repo, all environments
envault var list

# Specific project
envault var list --project backend

# Filter by environment
envault var list --env prod

# Combine filters with JSON output
envault var list --project frontend --env staging --json
```

**Flags:**
- `--project <name>` or `-p <name>`: Target a tracked project
- `--env <env>`: Filter by environment
- `--json`: Output as JSON

**Output format:** Variables grouped by environment, values shown as `xxxx...xxxx` (masked).

#### `envault var get <KEY>`

Retrieve the full, unmasked value of a variable (prints to stdout).

```bash
# Get from default environment
envault var get DATABASE_URL

# Get from specific environment
envault var get API_KEY --env prod
```

**Use case:** Piping values to other commands or viewing full secrets.

**Security note:** Output goes to stdout, so avoid logging or displaying in insecure contexts.

#### `envault var set <KEY>`

Add or update an environment variable.

**Interactive mode (RECOMMENDED for secrets):**
```bash
# Hidden input prompt (value NOT in shell history)
envault var set API_KEY

# Multi-line value (certificates, private keys)
envault var set SSL_CERT --multiline
```

**Non-interactive mode (for non-sensitive values only):**
```bash
# Positional value (WARNING: appears in shell history)
envault var set DEBUG true

# Flag-based value (WARNING: appears in shell history)
envault var set PORT --value 3000
```

**With environment:**
```bash
# Set in production environment
envault var set DATABASE_URL --env prod
```

**Behavior:**
- If variable exists, prompts for overwrite confirmation
- Automatically creates project if not tracked yet
- Writes to corresponding `.env` file immediately
- Shows warning when using non-interactive mode

**Flags:**
- `--env <env>`: Target environment (default: `default`)
- `--value <value>`: Non-interactive value (avoid for secrets)
- `--multiline`: Enable multi-line input (Ctrl+D to finish)

#### `envault var unset <KEY>`

Remove a single variable from an environment.

```bash
# Unset from default environment (with confirmation)
envault var unset OLD_API_KEY

# Unset from specific environment
envault var unset TEMP_TOKEN --env staging
```

**Behavior:**
- Prompts for confirmation before deletion
- Updates corresponding `.env` file
- Fails if variable doesn't exist

#### `envault var clear`

Remove all variables from a project or environment.

```bash
# Clear all environments in current repo (with confirmation)
envault var clear

# Clear specific environment only
envault var clear --env dev

# Clear without confirmation
envault var clear --env test --yes

# Clear variables in a tracked project (store only)
envault var clear --project old-app --yes
```

**Flags:**
- `--project <name>` or `-p <name>`: Target a tracked project (store only; doesn't update .env files)
- `--env <env>`: Clear specific environment only
- `--yes` or `-y`: Skip confirmation prompt

**Important:** When using `--project`, only the database is modified. Run `envault sync` in that project directory to update `.env` files.

#### `envault var copy <fromProject>`

Copy variables from another tracked project into the current repository.

**Copy all variables (preserves environments):**
```bash
# Copy all variables from all environments
envault var copy backend

# Copy all from specific source environment to same environment
envault var copy backend --from-env prod
```

**Copy specific variable:**
```bash
# Auto-detect which environment contains the key
envault var copy backend DATABASE_URL

# Copy from specific source to target environment
envault var copy backend DATABASE_URL --from-env prod --env staging
```

**Flags:**
- `--from-env <env>`: Source environment (default: all environments or auto-detect)
- `--env <env>` or `--to-env <env>`: Target environment (default: same as source)

**Behavior:**
- Prompts for overwrite if variable exists in target
- Automatically creates target project if not tracked
- Updates corresponding `.env` files in current repo
- Handles multiple projects with same name (prompts to select)

### Sync Commands

#### `envault sync`

Sync between database (store) and project files.

**Default: Store → Project (write .env files from database):**
```bash
envault sync
```

**Reverse: Project → Store (import .env files into database):**
```bash
envault sync --from project
```

**Direction:**
- **Default (`envault sync`)**: Reads variables from database and writes to `.env*` files in current repo
- **`--from project`**: Reads `.env*` files from current repo and imports into database

**Use cases:**
- **Store → Project**: After copying variables, updating from another machine, or restoring from database
- **Project → Store**: Initial import of existing `.env` files, or after manually editing files

**Behavior:**
- Discovers all `.env*` files in git repository root
- Maps files to environments (`.env` → default, `.env.dev` → dev, etc.)
- Validates `.env` syntax before importing
- Fails if parse errors detected (with line number and message)

## Common Workflows

### Setting up a new project

```bash
cd my-new-project
git init  # Required

# Add variables interactively (secure)
envault var set DATABASE_URL
envault var set API_KEY
envault var set JWT_SECRET

# Check what was created
envault var list
cat .env  # Variables now in .env file
```

### Managing multiple environments

```bash
# Set up development
envault var set DATABASE_URL --env dev
envault var set DEBUG --value true --env dev

# Set up production
envault var set DATABASE_URL --env prod
envault var set DEBUG --value false --env prod

# List all environments
envault env list

# View production variables
envault var list --env prod
```

### Copying variables between projects

```bash
cd my-frontend

# Copy all variables from backend
envault var copy backend

# Copy specific variable
envault var copy backend API_BASE_URL

# Copy prod to staging
envault var copy backend --from-env prod --env staging
```

### Migrating existing .env files

```bash
cd existing-project

# Import all .env* files into database
envault sync --from project

# Verify import
envault var list
```

### Working with tracked projects remotely

```bash
# From any directory, list variables in another project
envault var list --project backend --env prod

# Clear variables in a different project
envault var clear --project old-project --yes

# Note: .env files only update when you run sync IN that project directory
```

## Security Best Practices

### DO:
- ✅ Use interactive mode for secrets: `envault var set API_KEY` (no value arg)
- ✅ Use `--multiline` for certificates and multi-line secrets
- ✅ Use `var get` output in pipes carefully (avoid logging)
- ✅ Rely on filesystem permissions (database is `chmod 600`)

### DON'T:
- ❌ Use `envault var set KEY value` for secrets (appears in shell history)
- ❌ Use `--value` flag for sensitive data
- ❌ Treat envault as encryption (it's plaintext storage)
- ❌ Commit `.env` files to git (envault doesn't prevent this)

**Important:** Envault is NOT a secrets management tool like HashiCorp Vault or AWS Secrets Manager. It stores values as plaintext (same as `.env` files) and relies on filesystem permissions for security. Its value is in centralized management and workflow improvement, not encryption.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using envault without checking if installed | Always run `envault --version` first. If not found, install with `bun install -g envault-manager` |
| Running outside git repo | Run `git init` first - envault requires git for project detection |
| Wrong sync direction | `envault sync` = store→project (default). Use `--from project` to import files |
| Environment name confusion | Use simple names: `dev`, `prod`, `staging` (not `development`, `production`) |
| Expecting `.env.production` | File should be `.env.prod` (environment name, not full word) |
| Using `--project` with `var set` | `var set` only works in current repo. `cd` to target project first |
| Forgetting `--env` flag | Defaults to `default` environment (`.env` file) |
| Overwrite without confirmation | Most commands prompt for confirmation; use `--yes` to skip (use carefully) |
| Shell history exposure | Use interactive mode (no value arg) to avoid secrets in history |
| Clearing wrong environment | Double-check `--env` flag before confirming `var clear` |

## Error Messages

| Error | Meaning | Solution |
|-------|---------|----------|
| `command not found: envault` | Envault is not installed on the system | Install with `bun install -g envault-manager`, then verify with `envault --version` |
| `Error: Not in a git repository` | Current directory is not in a git repo | Run `git init` or `cd` to a git repository |
| `Error: Project not tracked yet` | Project not in database | Run `envault var set <KEY>` or `envault sync --from project` to initialize |
| `Error: Variable 'KEY' not found` | Variable doesn't exist in specified environment | Check with `envault var list` or set with `envault var set` |
| `Error: Project 'name' not found` | No tracked project with that name | Check `envault project list` for available projects |
| `Error: Failed to parse .env` | Syntax error in .env file | Fix syntax error at reported line number before syncing |

## JSON Output

Many commands support `--json` flag for programmatic use:

```bash
# Get structured project data
envault project list --json

# Get environment list as array
envault env list --json

# Get variables as structured data
envault var list --json
```

**Use case:** Parsing output in scripts, CI/CD pipelines, or when building tools on top of envault.

## Project Detection

Envault automatically identifies projects by their git repository root (absolute path). This means:

- **Same project, different machines:** May have different absolute paths (considered different projects)
- **Multiple projects, same name:** Envault prompts you to select which one
- **Project tracking:** Happens automatically on first `var set` or `sync --from project`

To work across machines, use `envault sync --from project` to re-import on each machine, or use the `var copy` command to share variables between tracked projects.
