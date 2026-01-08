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
envault var set DATABASE_URL

# Add with inline value (appears in shell history)
envault var set DEBUG true

# List all variables in the current repo
envault var list

# Get a specific value
envault var get DATABASE_URL

# Sync existing .env files to database
envault sync
```

## Commands

Envault uses a **noun + verb** interface optimized for both humans and AI agents.

### `envault project`

List tracked projects in the store.

```bash
# List all projects
envault project list

# Output as JSON
envault project list --json
```

### `envault env`

List environments for the current repo (default) or a tracked project.

```bash
# List environments for current repo
envault env list

# List environments for a tracked project by name
envault env list --project my-app

# Alias for --project
envault env list -p my-app

# Output as JSON
envault env list --json
```

### `envault var`

Manage variables for the current repo (default) or a tracked project.

```bash
# List variables for current repo
envault var list

# List variables for a tracked project
envault var list --project my-app

# Filter by environment
envault var list --env prod

# Output as JSON
envault var list --json

# Get a specific value (prints plaintext to stdout)
envault var get DATABASE_URL

# Set interactively (hidden input)
envault var set API_KEY

# Set with inline value (WARNING: appears in shell history)
envault var set DEBUG true

# Set with non-interactive flag (quote if it contains spaces)
envault var set API_KEY --value "secret"

# Multiline value (Ctrl+D to finish)
envault var set SSL_CERT --multiline

# Unset (remove) a variable (with confirmation)
envault var unset OLD_VAR

# Clear (remove) ALL variables in a project (with confirmation unless --yes)
envault var clear

# Clear variables for one environment only
envault var clear --env prod

# Clear variables for a tracked project by name (store only; run sync in that repo to update .env files)
envault var clear --project my-app --yes

# Copy variables from another tracked project into the current repo
envault var copy backend
envault var copy backend DATABASE_URL --from-env prod --env staging
```

### `envault sync`

Sync variables between your project (`.env*` files) and the store (database).

```bash
# Sync store → project (default): write .env* files from database
envault sync

# Sync project → store (.env* → db): import .env* into the store
envault sync --from project
```

File mapping:
- `.env` → `default` environment
- `.env.dev` → `dev` environment
- `.env.prod` → `prod` environment
- `.env.<custom>` → `<custom>` environment


### `envault help`

Get help for any command.

```bash
# Global help
envault --help

# Command-specific help
envault help var set
```

## Workflow Examples

### Setting up a new project

```bash
cd my-new-project
git init

# Add variables interactively
envault var set DATABASE_URL
envault var set API_KEY
envault var set JWT_SECRET

# Variables are now in both database and .env file
cat .env
```

### Managing multiple environments

```bash
# Add production variables
envault var set DATABASE_URL --env prod
envault var set API_KEY --env prod

# Add development variables
envault var set DATABASE_URL --env dev
envault var set DEBUG true --env dev

# List all environments
envault env list
```

### Copying variables between projects

```bash
cd my-frontend
# Copy DATABASE_URL from backend project
envault var copy backend DATABASE_URL

# Copy all prod variables to local staging
envault var copy backend --from-env prod --env staging
```

### Migrating existing .env files

```bash
cd existing-project
# Import your existing .env files into the store
envault sync --from project

# Now managed by envault
envault var list
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
