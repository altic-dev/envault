#!/usr/bin/env bun

import { parseArgs } from "./args.ts";
import { EnvaultDB } from "../db/index.ts";
import { getDbPath, ensureEnvaultDir } from "../utils/paths.ts";
import { ls } from "./commands/ls.ts";
import { envs } from "./commands/envs.ts";
import { get } from "./commands/get.ts";
import { add } from "./commands/add.ts";
import { cp } from "./commands/cp.ts";
import { sync } from "./commands/sync.ts";
import { unset } from "./commands/unset.ts";
import { help } from "./commands/help.ts";
import { project } from "./commands/project.ts";
import { env } from "./commands/env.ts";
import { variable } from "./commands/var.ts";

const VERSION = "0.1.0";

async function main() {
  const args = parseArgs(Bun.argv);

  // Handle global flags
  if (args.flags.version) {
    console.log(`envault ${VERSION}`);
    process.exit(0);
  }

  if (args.flags.help && !args.command) {
    showGlobalHelp();
    process.exit(0);
  }

  // Support `envault <command> --help` by delegating to `envault help <command>`
  if (args.flags.help && args.command) {
    await help({ command: "help", args: [args.command, ...args.args], flags: {} });
    process.exit(0);
  }

  // Ensure .envault directory exists
  await ensureEnvaultDir();

  // Initialize database
  const dbPath = getDbPath();
  const db = new EnvaultDB(dbPath);

  try {
    // Route to command
    switch (args.command) {
      case "project":
        await project(args, db);
        break;

      case "env":
        await env(args, db);
        break;

      case "var":
        await variable(args, db);
        break;

      case "ls":
        await ls(args, db);
        break;

      case "envs":
        await envs(args, db);
        break;

      case "get":
        await get(args, db);
        break;

      case "add":
      case "update":
        await add(args, db);
        break;

      case "cp":
        await cp(args, db);
        break;

      case "sync":
        await sync(args, db);
        break;

      case "unset":
        await unset(args, db);
        break;

      case "help":
        await help(args);
        break;

      case "":
        showGlobalHelp();
        break;

      default:
        console.error(`Error: Unknown command '${args.command}'\n`);
        console.error("Run 'envault --help' for usage information.");
        process.exit(1);
    }
  } finally {
    db.close();
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
  envault sync                    # Sync project → store (.env* → db)
  envault sync --from store       # Sync store → project (db → .env*)

For command-specific help:
  envault <command> --help

Documentation: https://github.com/you/envault`);
}

// Run main
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
