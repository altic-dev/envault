import type { ParsedArgs } from "../args.ts";

export async function help(args: ParsedArgs): Promise<void> {
  const command = args.args[0];

  if (!command) {
    showGlobalHelp();
    return;
  }

  switch (command) {
    case "ls":
      showLsHelp();
      break;
    case "envs":
      showEnvsHelp();
      break;
    case "add":
      showAddHelp();
      break;
    case "cp":
      showCpHelp();
      break;
    case "get":
      showGetHelp();
      break;
    case "update":
      showUpdateHelp();
      break;
    case "sync":
      showSyncHelp();
      break;
    case "rm":
      showRmHelp();
      break;
    default:
      console.error(`Unknown command: ${command}`);
      console.error("Run 'envault --help' for available commands.");
      process.exit(1);
  }
}

function showGlobalHelp(): void {
  console.log(`envault - Centralized environment variable management

Usage:
  envault <command> [options]

Commands:
  ls              List all projects or variables in a project
  envs            List environments for a project
  add             Add or update an environment variable
  cp              Copy variables from another tracked project
  get             Retrieve the full value of a variable
  update          Update an existing variable (alias for add)
  sync            Sync variables from .env files to database
  rm              Remove a variable
  help            Show help for a command

Global Options:
  --help          Show this help message
  --version       Show version number
  --json          Output in JSON format (where applicable)

Examples:
  envault ls                      # List all projects
  envault ls -p my-app            # List variables in my-app
  envault envs                    # List environments in current repo
  envault add DATABASE_URL        # Add variable interactively
  envault cp backend              # Copy all variables from backend
  envault get DATABASE_URL        # Get full value
  envault sync                    # Sync from .env files

For command-specific help:
  envault help <command>

Documentation: https://github.com/you/envault`);
}

function showLsHelp(): void {
  console.log(`envault ls - List projects or variables

Usage:
  envault ls                      # List all projects
  envault ls -p <project>         # List variables in a project
  envault ls -p <project> --env <env>  # List variables in specific environment

Options:
  -p <project>    Project name to list variables for
  --env ENV       Filter by environment (default: show all)
  --json          Output in JSON format

Examples:
  # List all tracked projects
  envault ls

  # List all variables in current project
  envault ls -p my-app

  # List variables in production environment
  envault ls -p my-app --env prod

  # List in JSON format
  envault ls --json`);
}

function showEnvsHelp(): void {
  console.log(`envault envs - List environments for a project

Usage:
  envault envs                    # List environments for current repo
  envault envs -p <project>       # List environments for a tracked project

Options:
  -p <project>    Project name to list environments for
  --json          Output a JSON array

Examples:
  # List environments for current repo
  envault envs

  # List environments for a project by name
  envault envs -p Glu-Website

  # Machine-readable output
  envault envs --json`);
}

function showAddHelp(): void {
  console.log(`envault add - Add or update an environment variable

Usage:
  envault add <KEY> [value] [options]
  envault add -p <project> <KEY> [options]
  envault add -all -p <project> [options]

Options:
  --env ENV           Target environment (default: default)
                      Writes to .env.ENV file
  --multiline         Enable multiline value input
                      End input with Ctrl+D
  -p <project>        Copy variable from another project
  -all                Copy all variables (used with -p)
  --to-env ENV        Target environment for cross-project copy

Examples:
  # Add variable interactively (recommended for secrets)
  envault add DATABASE_URL

  # Add variable inline (WARNING: appears in shell history)
  envault add DEBUG true

  # Add to production environment
  envault add API_KEY --env prod

  # Multiline value (certificate, JSON, etc.)
  envault add SSL_CERT --multiline

  # Copy from another project
  envault add -p my-api DATABASE_URL

  # Copy all variables from prod environment
  envault add -all -p my-api --env prod

  # Copy to staging environment
  envault add -p backend DATABASE_URL --to-env staging`);
}

function showCpHelp(): void {
  console.log(`envault cp - Copy variables from another tracked project

Usage:
  envault cp <project> [KEY] [--env ENV] [--to-env ENV]

Options:
  --env ENV        Source environment (default: all environments)
  --to-env ENV     Target environment (default: keep source environment)

Examples:
  # Copy all variables from a project into the current repo
  envault cp backend

  # Copy a single variable
  envault cp backend DATABASE_URL

  # Copy variables from a specific environment
  envault cp backend --env local

  # Copy between environments
  envault cp backend --env prod --to-env staging`);
}

function showGetHelp(): void {
  console.log(`envault get - Retrieve the full value of a variable

Usage:
  envault get <KEY> [--env ENV]

Options:
  --env ENV       Environment to get from (default: default)

Examples:
  # Get variable value
  envault get DATABASE_URL

  # Get from production environment
  envault get API_KEY --env prod

  # Use in shell scripts
  export DB=\$(envault get DATABASE_URL)`);
}

function showUpdateHelp(): void {
  console.log(`envault update - Update an existing variable (alias for add)

This is an alias for 'envault add'. See 'envault help add' for details.

Usage:
  envault update <KEY> [value] [options]

Examples:
  envault update DATABASE_URL
  envault update API_KEY --env prod`);
}

function showSyncHelp(): void {
  console.log(`envault sync - Sync variables from .env files to database

Usage:
  envault sync

Description:
  Discovers all .env* files in the git repository root and syncs them
  to the database. The .env file takes precedence - it will overwrite
  existing database values.

  File mapping:
    .env          → default environment
    .env.dev      → dev environment
    .env.prod     → prod environment
    .env.<name>   → <name> environment

Examples:
  # Sync all .env files to database
  envault sync`);
}

function showRmHelp(): void {
  console.log(`envault rm - Remove a variable

Usage:
  envault rm <KEY> [--env ENV]

Options:
  --env ENV       Environment to remove from (default: default)

Description:
  Removes a variable from both the database and the .env file.
  You will be prompted to confirm before deletion.

Examples:
  # Remove variable from default environment
  envault rm OLD_API_KEY

  # Remove from production environment
  envault rm DEPRECATED_VAR --env prod`);
}
