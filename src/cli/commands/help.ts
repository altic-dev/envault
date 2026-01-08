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
    case "sync":
      showSyncHelp();
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
  var copy         Copy variables from another tracked project into the current repo
  sync            Sync between project files and the store (db)
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
  envault sync                    # Sync from .env files
  envault var copy backend        # Copy vars from backend into current repo

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
  envault var copy <fromProject> [KEY] [--from-env ENV] [--env ENV]

Examples:
  envault var list
  envault var list --project backend --env prod
  envault var get DATABASE_URL
  envault var set API_KEY --env prod
  envault var set API_KEY --value "secret"
  envault var unset API_KEY
  envault var copy backend
  envault var copy backend DATABASE_URL --from-env prod --env staging`);
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
    case "copy":
      console.log(`envault var copy - Copy variables from another tracked project into the current repo

Usage:
  envault var copy <fromProject> [KEY] [--from-env ENV] [--env ENV]

Options:
  --from-env ENV   Source environment (default: all envs when KEY omitted; auto-detect when KEY provided)
  --env ENV        Destination environment (default: keep source environment)

Examples:
  envault var copy backend
  envault var copy backend DATABASE_URL
  envault var copy backend --from-env prod --env staging`);
      return;
    default:
      console.error(`Unknown subcommand: var ${sub}`);
      process.exit(1);
  }
}

function showSyncHelp(): void {
  console.log(`envault sync - Sync between project files and the store (db)

Usage:
  envault sync [--from project]

Description:
  Default behavior is store → project: writes .env* files from the store
  into the repository root without modifying the store.

  With --from project, syncs project → store: discovers all .env* files in the git
  repository root and syncs them to the store (database).

Options:
  --from <project>   Direction (default: store)

  File mapping:
    .env          → default environment
    .env.dev      → dev environment
    .env.prod     → prod environment
    .env.<name>   → <name> environment

Examples:
  # Export store into .env* files (default)
  envault sync

  # Import .env* into store
  envault sync --from project`);
}
