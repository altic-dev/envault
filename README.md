# Envault

Centralized environment variable management for developers and AI agents.

Envault is a CLI tool that helps you manage environment variables across multiple projects with a simple, consistent interface. It stores variables in a centralized SQLite database while keeping your `.env` files in sync.

## Features

- **Centralized Management**: One database for all your projects' environment variables
- **Multi-Environment Support**: Manage dev, staging, prod, and custom environments
- **Cross-Project Sharing**: Copy variables between projects easily
- **AI Agent Friendly**: Structured commands instead of direct file manipulation
- **Interactive & Secure**: Hidden input for sensitive values, no shell history exposure
- **Git-Based Projects**: Automatic project detection via git repository root
- **Partial Value Display**: Shows masked values (first4...last4) for security

## Installation

### Using Bun (recommended)

```bash
bun install -g envault
```

### Using npm

```bash
npm install -g envault
```

### From source

```bash
git clone https://github.com/you/envault.git
cd envault
bun install
bun run build
bun link
```

## Quick Start

```bash
# Initialize (automatic on first use)
cd /path/to/your/project

# Add a variable (interactive mode - recommended for secrets)
envault add DATABASE_URL

# Add with inline value (appears in shell history)
envault add DEBUG true

# List all variables
envault ls -p my-project

# Get a specific value
envault get DATABASE_URL

# Sync existing .env files to database
envault sync
```

## Commands

### `envault ls`

List all tracked projects or variables in a project.

```bash
# List all projects
envault ls

# List variables in current project
envault ls -p my-app

# List variables in specific environment
envault ls -p my-app --env prod

# Output as JSON
envault ls -p my-app --json
```

### `envault add`

Add or update environment variables.

```bash
# Interactive mode (hidden input)
envault add API_KEY

# Inline value (WARNING: appears in shell history)
envault add DEBUG true

# Add to specific environment
envault add DATABASE_URL --env prod

# Multiline value (e.g., certificates)
envault add SSL_CERT --multiline

# Copy from another project
envault add -p backend DATABASE_URL

# Copy all variables from another project
envault add -all -p backend --env prod

# Copy to different environment
envault add -p api DATABASE_URL --env prod --to-env staging
```

### `envault cp`

Copy variables from a source project (tracked in Envault) into the current git repo.
This is a convenience wrapper around the existing cross-project copy flow in `envault add -p`.

```bash
# Copy all variables from a project into the current repo
envault cp backend

# Copy a single variable into the current repo
envault cp backend DATABASE_URL

# Copy between environments
envault cp backend --env prod --to-env staging
```

### `envault get`

Retrieve the full plaintext value of a variable.

```bash
# Get variable from default environment
envault get DATABASE_URL

# Get from specific environment
envault get API_KEY --env prod

# Use in scripts
export DB=$(envault get DATABASE_URL)
```

### `envault sync`

Sync variables from .env files to the database.

```bash
# Sync all .env* files in current project
envault sync
```

File mapping:
- `.env` → `default` environment
- `.env.dev` → `dev` environment
- `.env.prod` → `prod` environment
- `.env.<custom>` → `<custom>` environment

### `envault rm`

Remove a variable (with confirmation).

```bash
# Remove from default environment
envault rm OLD_VAR

# Remove from specific environment
envault rm DEPRECATED --env prod
```

### `envault help`

Get help for any command.

```bash
# Global help
envault --help

# Command-specific help
envault help add
```

## Workflow Examples

### Setting up a new project

```bash
cd my-new-project
git init

# Add variables interactively
envault add DATABASE_URL
envault add API_KEY
envault add JWT_SECRET

# Variables are now in both database and .env file
cat .env
```

### Managing multiple environments

```bash
# Add production variables
envault add DATABASE_URL --env prod
envault add API_KEY --env prod

# Add development variables
envault add DATABASE_URL --env dev
envault add DEBUG true --env dev

# List all environments
envault ls -p my-app
```

### Copying variables between projects

```bash
cd my-frontend
# Copy DATABASE_URL from backend project
envault add -p backend DATABASE_URL

# Copy all prod variables to local staging
envault add -all -p backend --env prod --to-env staging
```

### Migrating existing .env files

```bash
cd existing-project
# Envault will read your existing .env files
envault sync

# Now managed by envault
envault ls -p existing-project
```

## How It Works

### Project Detection

Envault uses git repository roots to identify projects. Each project is uniquely identified by its absolute path on your system.

### Storage

- **Database**: `~/.envault/envault.db` (SQLite, plaintext)
- **Permissions**: Database file is `chmod 600` (owner read/write only)
- **.env Files**: Remain in your project directories, synced with database

### Security Model

Envault is **not** an encryption or secrets management tool. It's a workflow and organization tool that:

- Stores values as plaintext (same as `.env` files)
- Relies on filesystem permissions for security
- Helps prevent accidental exposure via shell history (interactive mode)
- Provides partial value display for quick verification

For true secrets management, use tools like HashiCorp Vault, AWS Secrets Manager, or similar.

## Requirements

- Bun >= 1.0.0 (or Node.js with appropriate modifications)
- Git (for project detection)

## Development

```bash
# Clone repository
git clone https://github.com/you/envault.git
cd envault

# Install dependencies
bun install

# Run in development mode
bun run dev

# Build for production
bun run build

# Run tests
bun test
```

## License

MIT

## Contributing

Contributions welcome! Please open an issue or PR.

## Acknowledgments

Built with [Bun](https://bun.com) - a fast all-in-one JavaScript runtime.
