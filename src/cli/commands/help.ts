import type { ParsedArgs } from "../args.ts";

export async function help(args: ParsedArgs): Promise<void> {
  const command = args.args[0];
  const sub = args.args[1];

  if (!command) {
    showGlobalHelp();
    return;
  }

  switch (command) {
    case "project":
      showProjectHelp(sub);
      break;
    case "env":
      showEnvHelp(sub);
      break;
    case "var":
      showVarHelp(sub);
      break;
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
    case "unset":
      showUnsetHelp();
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
  project list     List all tracked projects
  env list         List environments (current repo, or use --project)
  var list         List variables (current repo, or use --project)
  var get          Retrieve the full value of a variable
  var set          Add or update an environment variable
  var unset        Unset (remove) a variable
  ls              List all projects or variables in a project
  envs            List environments for a project
  add             Add or update an environment variable
  cp              Copy variables from another tracked project
  get             Retrieve the full value of a variable
  update          Update an existing variable (alias for add)
  sync            Sync variables between project and store
  unset           Unset (remove) a variable
  help            Show help for a command

Global Options:
  --help          Show this help message
  --version       Show version number
  --json          Output in JSON format (where applicable)

Examples:
  envault project list             # List all projects
  envault env list                 # List envs for current repo
  envault env list --project my-app # List envs for tracked project
  envault var list                 # List vars for current repo
  envault var list --project my-app # List vars for tracked project
  envault var get DATABASE_URL     # Get full value
  envault var set API_KEY          # Set interactively
  envault var unset API_KEY        # Unset (with confirmation)
  envault ls                      # List all projects
  envault ls --project my-app      # List variables in my-app
  envault envs                    # List environments in current repo
  envault add DATABASE_URL        # Add variable interactively
  envault cp backend              # Copy all variables from backend
  envault get DATABASE_URL        # Get full value
  envault sync                    # Sync from .env files

For command-specific help:
  envault help <command> [subcommand]

Documentation: https://github.com/you/envault`);
}

function showProjectHelp(sub?: string): void {
  if (!sub || sub === "list") {
    console.log(`envault project - Manage tracked projects

Usage:
  envault project list

Options:
  --json          Output in JSON format

Examples:
  envault project list
  envault project list --json`);
    return;
  }

  console.error(`Unknown subcommand: project ${sub}`);
  process.exit(1);
}

function showEnvHelp(sub?: string): void {
  if (!sub || sub === "list") {
    console.log(`envault env - Manage environments

Usage:
  envault env list                 # List environments for current repo
  envault env list --project <project>    # List environments for a tracked project

Options:
  --project <project>    Project name (alias: -p)
  --json          Output a JSON array

Examples:
  envault env list
  envault env list --project backend
  envault env list --json`);
    return;
  }

  console.error(`Unknown subcommand: env ${sub}`);
  process.exit(1);
}

function showVarHelp(sub?: string): void {
  if (!sub) {
    console.log(`envault var - Manage environment variables

Usage:
  envault var list [--project PROJECT] [--env ENV] [--json]
  envault var get <KEY> [--env ENV]
  envault var set <KEY> [--env ENV] [--value VALUE] [--multiline]
  envault var unset <KEY> [--env ENV]

Examples:
  envault var list
  envault var list --project backend --env prod
  envault var get DATABASE_URL
  envault var set API_KEY --env prod
  envault var set API_KEY --value "secret"
  envault var unset API_KEY`);
    return;
  }

  switch (sub) {
    case "list":
      console.log(`envault var list - List variables

Usage:
  envault var list                 # List variables for current repo
  envault var list --project <project>    # List variables for a tracked project
  envault var list --env <env>     # Filter by environment

Options:
  --project <project>    Project name (alias: -p)
  --env ENV       Filter by environment
  --json          Output in JSON format`);
      return;
    case "get":
      console.log(`envault var get - Retrieve the full value of a variable

Usage:
  envault var get <KEY> [--env ENV]

Options:
  --env ENV       Environment to get from (default: default)`);
      return;
    case "set":
      console.log(`envault var set - Add or update an environment variable

Usage:
  envault var set <KEY> [value] [--env ENV] [--value VALUE] [--multiline]

Options:
  --env ENV           Target environment (default: default)
  --value VALUE       Provide a value non-interactively (quote if it contains spaces)
  --multiline         Enable multiline value input (Ctrl+D to finish)`);
      return;
    case "unset":
      console.log(`envault var unset - Unset (remove) a variable

Usage:
  envault var unset <KEY> [--env ENV]

Options:
  --env ENV       Environment to unset from (default: default)`);
      return;
    default:
      console.error(`Unknown subcommand: var ${sub}`);
      process.exit(1);
  }
}

function showLsHelp(): void {
  console.log(`envault ls - List projects or variables

Usage:
  envault ls                      # List all projects
  envault ls --project <project>         # List variables in a project
  envault ls --project <project> --env <env>  # List variables in specific environment

Options:
  --project <project>    Project name to list variables for (alias: -p)
  --env ENV       Filter by environment (default: show all)
  --json          Output in JSON format

Examples:
  # List all tracked projects
  envault ls

  # List all variables in current project
  envault ls --project my-app

  # List variables in production environment
  envault ls --project my-app --env prod

  # List in JSON format
  envault ls --json`);
}

function showEnvsHelp(): void {
  console.log(`envault envs - List environments for a project

Usage:
  envault envs                    # List environments for current repo
  envault envs --project <project>       # List environments for a tracked project

Options:
  --project <project>    Project name to list environments for (alias: -p)
  --json          Output a JSON array

Examples:
  # List environments for current repo
  envault envs

  # List environments for a project by name
  envault envs --project Glu-Website

  # Machine-readable output
  envault envs --json`);
}

function showAddHelp(): void {
  console.log(`envault add - Add or update an environment variable

Usage:
  envault add <KEY> [value] [options]

Options:
  --env ENV           Target environment (default: default)
                      Writes to .env.<env> file (or .env for default)
  --multiline         Enable multiline value input
                      End input with Ctrl+D

Examples:
  # Add variable interactively (recommended for secrets)
  envault add DATABASE_URL

  # Add variable inline (WARNING: appears in shell history)
  envault add DEBUG true

  # Add to production environment
  envault add API_KEY --env prod

  # Multiline value (certificate, JSON, etc.)
  envault add SSL_CERT --multiline`);
}

function showCpHelp(): void {
  console.log(`envault cp - Copy variables from another tracked project

Usage:
  envault cp <project> [KEY] [--from-env ENV] [--env ENV|--environment ENV|--to-env ENV]

Options:
  --from-env ENV   Source environment (default: all environments)
  --env ENV        Target environment (default: keep source environment)
  --environment ENV  Alias for --env
  --to-env ENV     Alias for --env

Examples:
  # Copy all variables from a project into the current repo
  envault cp backend

  # Copy a single variable
  envault cp backend DATABASE_URL

  # Copy variables from a specific environment
  envault cp backend --from-env local

  # Copy between environments
  envault cp backend --from-env prod --env staging`);
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
  console.log(`envault sync - Sync variables between project and store

Usage:
  envault sync [--from project|store]

Description:
  Default behavior is project → store: discovers all .env* files in the git
  repository root and syncs them to the store (database).

  With --from store, syncs store → project: writes .env* files from the store
  into the repository root without modifying the store.

Options:
  --from <project|store>   Direction (default: project)

  File mapping:
    .env          → default environment
    .env.dev      → dev environment
    .env.prod     → prod environment
    .env.<name>   → <name> environment

Examples:
  # Import .env* into store (default)
  envault sync

  # Explicit import direction
  envault sync --from project

  # Export store into .env* files
  envault sync --from store`);
}

function showUnsetHelp(): void {
  console.log(`envault unset - Unset (remove) a variable

Usage:
  envault unset <KEY> [--env ENV]

Options:
  --env ENV       Environment to unset from (default: default)

Description:
  Removes a variable from both the database and the .env file.
  You will be prompted to confirm before deletion.

Examples:
  # Remove variable from default environment
  envault unset OLD_API_KEY

  # Remove from production environment
  envault unset DEPRECATED_VAR --env prod`);
}
