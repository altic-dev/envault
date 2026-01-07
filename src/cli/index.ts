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
import { rm } from "./commands/rm.ts";
import { help } from "./commands/help.ts";

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
    await help({ command: "help", args: [args.command], flags: {} });
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

      case "rm":
        await rm(args, db);
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
  envault <command> --help

Documentation: https://github.com/you/envault`);
}

// Run main
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
