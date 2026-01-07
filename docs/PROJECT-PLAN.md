 Envault CLI - Implementation Specification (Simplified)

 Project Overview

 Envault is a CLI tool for centralized environment variable management across projects. It provides AI agent-friendly commands,
 multi-environment support, and cross-project variable sharing through a simple SQLite database.

 Core Philosophy

 NOT a security/encryption tool - Envault is an organizational and workflow tool. It:
 - Centralizes env var management across multiple projects
 - Provides structured commands for AI agents (avoiding direct .env file manipulation)
 - Enables cross-project variable sharing
 - Supports multiple environments (dev, staging, prod)
 - Maintains sync between database and .env files

 Threat Model: None. Values are plaintext in both database and .env files. Security relies on filesystem permissions.

 Requirements Summary

 NO Authentication/Encryption

 - No passwords - All operations are unauthenticated
 - No encryption - Values stored as plaintext in SQLite database
 - No session management - No TTL, no daemon needed
 - Security: Standard file permissions (chmod 600 on database file)

 Project Detection

 - Method: Git repository root detection
 - Identifier: Absolute path to git root (unique, portable within same machine)
 - Display Name: Git repo folder name
 - No git repo: Error with helpful message

 Data Storage

 - Location: ${HOME}/.envault/envault.db (SQLite)
 - File permissions: 600 (owner read/write only)
 - Schema: Plaintext keys and values

 CREATE TABLE projects (
   id INTEGER PRIMARY KEY AUTOINCREMENT,
   path TEXT NOT NULL UNIQUE,        -- absolute path to git root
   name TEXT NOT NULL,                -- folder name for display
   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
 );

 CREATE TABLE variables (
   id INTEGER PRIMARY KEY AUTOINCREMENT,
   project_id INTEGER NOT NULL,
   environment TEXT NOT NULL DEFAULT 'default',  -- 'default', 'dev', 'prod', etc.
   key TEXT NOT NULL,
   value TEXT NOT NULL,               -- plaintext!
   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
   UNIQUE(project_id, environment, key),
   FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
 );

 CREATE INDEX idx_variables_lookup ON variables(project_id, environment, key);

 Commands Specification

 1. envault ls

 Without project flag: List all tracked projects

 Output (human-readable):
 my-app (/Users/user/projects/my-app)
 frontend (/Users/user/work/frontend)
 api-service (/Users/user/projects/api-service)

 Output (with --json):
 [
   {"name": "my-app", "path": "/Users/user/projects/my-app"},
   {"name": "frontend", "path": "/Users/user/work/frontend"}
 ]

 envault ls -p <project>

 List variables in a project (all environments by default).

 Output (human-readable):
 [default]
 DATABASE_URL=post...5432
 API_KEY=sk_t...xyz
 DEBUG=true

 [dev]
 DATABASE_URL=post...5433
 DEBUG=true

 [prod]
 DATABASE_URL=post...5432
 API_KEY=sk_p...abc

 Partial value display: First 4 chars + ... + last 4 chars (e.g., sk_test_abc123...xyz789)
 - Values < 12 chars: Show first 4 + ... + last 4 (may overlap in middle)
 - Empty values: Show (empty)

 Filter by environment: envault ls -p <project> --env dev

 Output (with --json):
 {
   "default": [
     {"key": "DATABASE_URL", "value": "post...5432"},
     {"key": "API_KEY", "value": "sk_t...xyz"}
   ],
   "dev": [
     {"key": "DATABASE_URL", "value": "post...5433"}
   ]
 }

 ---
 2. envault add <KEY> [value]

 Add or update an environment variable.

 Syntax:
 envault add KEY [value] [--env ENV] [--multiline]

 Value Input:
 1. If value provided as arg: Use directly
   - Show warning: ⚠ WARNING: Value will appear in shell history. Use interactive mode (no value arg) for sensitive data.
 2. If no value: Interactive prompt
   - Prompt: Enter value for KEY: (hidden input like password prompt)
 3. Empty values: Allowed (store as empty string)

 Multiline support: With --multiline flag only
 envault add SSL_CERT --multiline
 Prompts: Enter value for SSL_CERT (Ctrl+D to finish):

 Environment: --env <name> (default: default)
 - --env dev → environment = 'dev' → writes to .env.dev
 - No --env → environment = 'default' → writes to .env

 Duplicate handling:
 - If key already exists in that environment:
 KEY already exists in <environment> environment.
 Current value: sk_t...xyz
 Overwrite? (y/n):
   - If y: Update value, update updated_at timestamp
   - If n: Abort, exit code 1

 Workflow:
 1. Detect git repository root (CWD and parents)
 2. If no git repo: Error (see Error Handling section)
 3. Ensure project exists in database (insert if new)
 4. Prompt for value if not provided (or --multiline)
 5. Check for duplicates
 6. Insert/update in database
 7. Write to appropriate .env file in alphabetical order
 8. Success message: ✓ Added KEY to <project> (<environment>)

 ---
 3. envault add -p <project> <KEY>

 Copy variable(s) from another project to current project.

 Syntax:
 envault add -p <project> <KEY> [--env SOURCE_ENV] [--to-env TARGET_ENV]
 envault add -all -p <project> [--env SOURCE_ENV] [--to-env TARGET_ENV]

 Examples:
 # Copy specific key from another project (default env)
 envault add -p my-api DATABASE_URL

 # Copy from specific source environment
 envault add -p my-api DATABASE_URL --env prod

 # Copy to specific target environment
 envault add -p my-api DATABASE_URL --to-env staging

 # Copy all variables
 envault add -all -p my-api

 # Copy all from prod to local staging
 envault add -all -p my-api --env prod --to-env staging

 Project Resolution:
 - If <project> matches multiple projects by name:
 Multiple projects named 'my-app' found:
 1. /Users/user/projects/my-app
 2. /Users/user/work/my-app
 Choose project (1-2):
 - User selects by number.
 - If <project> is not found:
 Error: Project 'xyz' not found
 Available projects:
   my-app (/Users/user/projects/my-app)
   frontend (/Users/user/work/frontend)

 Behavior:
 - Copy value as snapshot (not reference/link)
 - Update both database AND .env file in current project
 - If key already exists: Use same duplicate prompt as regular add

 ---
 4. envault update <KEY> [value]

 Alias for add command. Semantically indicates updating existing value.

 Implementation: Same function as add (upsert logic).

 ---
 5. envault get <KEY>

 Retrieve the full plaintext value of a variable.

 Syntax:
 envault get <KEY> [--env ENV]

 Output: Plain value to stdout (for piping)
 $ envault get DATABASE_URL
 postgresql://user:pass@localhost:5432/db

 $ export DB=$(envault get DATABASE_URL)

 Environment: Default to default, or specify with --env

 Error handling:
 - Key not found:
 Error: Variable 'API_KEY' not found in <project> (<environment>)

 Exit codes:
 - 0: Success
 - 1: Key not found or other error

 ---
 6. envault sync

 Sync variables from .env file(s) to database.

 Behavior:
 - Discover all .env* files in git root
 - Parse each file:
   - .env → default environment
   - .env.dev → dev environment
   - .env.prod → prod environment
   - etc.
 - .env takes precedence: Overwrite database values with file contents
 - Insert new keys, update existing keys, do NOT delete keys from DB that aren't in files

 Parsing:
 - Lenient by default: Handle common formats, unquoted values, etc.
 - Add --strict flag for future: Enforce proper syntax
 - Strip comments and blank lines
 - Support quoted values: KEY="value" and KEY='value'
 - Support multiline values (quoted with escaped newlines)

 Error Handling:
 - Unparseable line: Show error and line number, abort entire sync
 Error: Failed to parse .env.dev (line 15)
 Invalid syntax: KEY=value with unescaped " character
 Sync aborted.
 - Missing file: Not an error (just skip that environment)

 Output:
 Syncing .env files for my-app...
 ✓ .env: 5 variables synced
 ✓ .env.dev: 3 variables synced
 ✓ .env.prod: 8 variables synced

 Total: 16 variables synced to database

 ---
 7. envault rm <KEY>

 Remove variable from database and .env file.

 Syntax:
 envault rm <KEY> [--env ENV]

 Confirmation prompt:
 Remove 'DATABASE_URL' from my-app (default)? (y/n):

 Behavior:
 1. If y: Delete from database + remove from .env file
 2. If n: Abort, exit code 1

 Environment: Default to default, or specify with --env

 Output:
 ✓ Removed DATABASE_URL from my-app (default)

 Error:
 - Key not found: Show error, exit code 1

 ---
 Environment Management

 Multi-Environment Support

 Environments: Arbitrary string names (dev, staging, prod, test, etc.)

 File Mapping:
 | Environment | .env File     |
 |-------------|---------------|
 | default     | .env          |
 | dev         | .env.dev      |
 | staging     | .env.staging  |
 | prod        | .env.prod     |
 | <custom>    | .env.<custom> |

 Independence: Each environment is completely separate. No fallback chain, no inheritance.

 .env File Handling

 Writing (from database to file):
 - Format: KEY=VALUE (one per line)
 - Quoting: Apply quotes when value contains spaces, special chars, or newlines
 - Ordering: Alphabetical by key
 - Comments: None (strip all comments on write)

 Reading (from file to database):
 - Parse lenient by default
 - Preserve all values as-is (no trimming unless necessary)
 - Handle quotes, escapes, multiline
 - Strip comments during parse

 Example written .env:
 API_KEY=sk_test_abc123xyz789
 DATABASE_URL=postgresql://localhost:5432/db
 DEBUG=true
 MULTILINE_CERT="-----BEGIN CERTIFICATE-----\nMIIC...\n-----END CERTIFICATE-----"

 ---
 First-Run Experience

 Initial Setup

 When user runs any envault command for the first time:

 1. Check if ${HOME}/.envault/ directory exists
 2. If not: Create directory with permissions 700
 3. Check if ${HOME}/.envault/envault.db exists
 4. If not:
 Initializing envault database at ~/.envault/envault.db...
 ✓ Database created
 5. Create schema (tables, indexes)
 6. Continue with requested command

 No password prompts. No setup wizard. Just create DB and go.

 ---
 Technical Implementation

 Directory Structure

 envault/
 ├── src/
 │   ├── cli/
 │   │   ├── index.ts              # Main entry, command routing
 │   │   ├── commands/
 │   │   │   ├── ls.ts
 │   │   │   ├── add.ts
 │   │   │   ├── get.ts
 │   │   │   ├── update.ts         # Alias to add
 │   │   │   ├── sync.ts
 │   │   │   ├── rm.ts
 │   │   │   └── help.ts
 │   │   └── args.ts               # Minimal argv parser
 │   ├── db/
 │   │   ├── index.ts              # Database operations
 │   │   ├── schema.ts             # Schema creation/migration
 │   │   └── types.ts              # TypeScript types for DB models
 │   ├── parser/
 │   │   ├── dotenv.ts             # Parse/write .env files
 │   │   └── types.ts              # Parser types
 │   ├── utils/
 │   │   ├── git.ts                # Git repo detection
 │   │   ├── input.ts              # Interactive prompts (hidden, multiline, confirm)
 │   │   ├── display.ts            # Output formatting (human/JSON)
 │   │   ├── paths.ts              # Path resolution (HOME, .envault, etc.)
 │   │   └── partial.ts            # Partial value masking logic
 │   └── types/
 │       └── index.ts              # Global types
 ├── tests/
 │   ├── helpers/
 │   │   └── setup.ts              # Test fixtures, temp dirs
 │   ├── unit/
 │   │   ├── parser.test.ts
 │   │   ├── db.test.ts
 │   │   ├── git.test.ts
 │   │   └── partial.test.ts
 │   └── integration/
 │       ├── ls.test.ts
 │       ├── add.test.ts
 │       ├── sync.test.ts
 │       └── cross-project.test.ts
 ├── index.ts                       # Re-export CLI entry
 ├── package.json
 ├── tsconfig.json
 └── README.md

 ---
 CLI Argument Parsing

 Built-in Bun.argv - no external libraries

 Global flags (available to all commands):
 - --help - Show help
 - --version - Show version
 - --json - Output in JSON format (where applicable)

 Command-specific flags:
 - -p <project> - Project name or path (for cross-project operations)
 - --env <name> - Target environment
 - --to-env <name> - Destination environment (for cross-project copy)
 - --multiline - Enable multiline input mode
 - --strict - Strict .env parsing (future)
 - -all - Copy all variables (with -p)

 Parsing logic (src/cli/args.ts):
 interface ParsedArgs {
   command: string
   args: string[]
   flags: {
     help?: boolean
     version?: boolean
     json?: boolean
     env?: string
     toEnv?: string
     project?: string
     multiline?: boolean
     strict?: boolean
     all?: boolean
   }
 }

 export function parseArgs(argv: string[]): ParsedArgs {
   // Simple flag parser
   // - Flags start with -- or -
   // - Flags with values: --env dev or --env=dev
   // - Boolean flags: --json, --multiline
 }

 ---
 Database Module (src/db/index.ts)

 import { Database } from "bun:sqlite"

 export class EnvaultDB {
   private db: Database

   constructor(dbPath: string) {
     this.db = new Database(dbPath, { create: true })
     this.ensureSchema()
     this.setPermissions()
   }

   private ensureSchema() {
     // Create tables if not exist
   }

   private setPermissions() {
     // chmod 600 on db file
     import { chmod } from "node:fs/promises"
     chmod(this.db.filename, 0o600)
   }

   // Project operations
   ensureProject(path: string, name: string): number
   listProjects(): Project[]
   findProjectByName(name: string): Project[]
   findProjectByPath(path: string): Project | null

   // Variable operations
   addVariable(projectId: number, env: string, key: string, value: string): void
   updateVariable(projectId: number, env: string, key: string, value: string): void
   upsertVariable(projectId: number, env: string, key: string, value: string): void
   getVariable(projectId: number, env: string, key: string): string | null
   listVariables(projectId: number, env?: string): Variable[]
   deleteVariable(projectId: number, env: string, key: string): boolean

   // Sync operations
   syncVariables(projectId: number, env: string, vars: Record<string, string>): void
 }

 ---
 .env Parser (src/parser/dotenv.ts)

 export interface ParseResult {
   variables: Record<string, string>
   errors: ParseError[]
 }

 export interface ParseError {
   line: number
   message: string
 }

 export function parse(content: string, options?: { strict?: boolean }): ParseResult {
   // Lenient parsing by default
   // Support:
   // - KEY=value
   // - KEY="value"
   // - KEY='value'
   // - Multiline quoted values
   // - Comments (strip)
   // - Empty lines (skip)
   // - Escape sequences in quoted strings
 }

 export function write(variables: Record<string, string>): string {
   // Sort keys alphabetically
   // Apply quoting as needed
   // Return KEY=VALUE lines
 }

 Quoting logic:
 - No quotes: If value is simple (alphanumeric, -, _)
 - Double quotes: If value contains spaces, special chars, or newlines
 - Escape newlines, quotes, backslashes inside quoted values

 ---
 Git Detection (src/utils/git.ts)

 export function findGitRoot(startPath: string = process.cwd()): string | null {
   // Walk up directory tree
   // Check for .git directory
   // Return absolute path or null
 }

 export function getProjectName(gitRoot: string): string {
   // Return basename of git root
   import { basename } from "node:path"
   return basename(gitRoot)
 }

 Error on no git repo:
 Error: Not in a git repository

 Envault requires git for project detection.
 Run 'git init' to initialize a repository.

 ---
 Interactive Input (src/utils/input.ts)

 export async function promptHidden(message: string): Promise<string> {
   // Use Bun's stdin in raw mode to hide input
   // Display message, read input, hide characters
 }

 export async function promptMultiline(message: string): Promise<string> {
   // Read until Ctrl+D
   // Display message, collect lines, return joined
 }

 export async function confirm(message: string): Promise<boolean> {
   // Display message + (y/n):
   // Read single char, return true/false
 }

 ---
 Partial Value Display (src/utils/partial.ts)

 export function partialValue(value: string): string {
   if (value === "") return "(empty)"
   if (value.length <= 8) {
     // Too short for meaningful partial, just show first 4 + ...
     return value.substring(0, 4) + "..."
   }
   const first = value.substring(0, 4)
   const last = value.substring(value.length - 4)
   return `${first}...${last}`
 }

 ---
 Output Formatting (src/utils/display.ts)

 export function formatProjects(projects: Project[], json: boolean): string {
   if (json) {
     return JSON.stringify(projects, null, 2)
   }
   return projects.map(p => `${p.name} (${p.path})`).join("\n")
 }

 export function formatVariables(
   variables: Record<string, Variable[]>,
   json: boolean,
   partial: boolean
 ): string {
   // Format variables grouped by environment
   // Apply partial masking if partial=true
   // Return human-readable or JSON
 }

 ---
 Error Handling

 Error Messages

 Not in git repository:
 Error: Not in a git repository

 Envault requires git for project detection.
 Run 'git init' to initialize a repository.

 Variable not found:
 Error: Variable 'API_KEY' not found in my-app (default)

 Use 'envault add API_KEY' to create it.

 Project not found:
 Error: Project 'xyz' not found

 Available projects:
   my-app (/Users/user/projects/my-app)
   frontend (/Users/user/work/frontend)

 Use 'envault ls' to see all projects.

 Multiple projects with same name:
 Multiple projects named 'my-app' found:
 1. /Users/user/projects/my-app
 2. /Users/user/work/my-app

 Choose project (1-2):

 .env parse error:
 Error: Failed to parse .env.dev (line 15)
 Invalid syntax: KEY=value with unescaped " character

 Sync aborted. Fix syntax errors and try again.

 Database error:
 Error: Failed to open database at ~/.envault/envault.db
 Database may be corrupted or locked by another process.

 ---
 Help System

 Global Help (envault or envault --help)

 envault - Centralized environment variable management

 Usage:
   envault <command> [options]

 Commands:
   ls              List all projects or variables in a project
   add             Add or update an environment variable
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
   envault add DATABASE_URL        # Add variable interactively
   envault get DATABASE_URL        # Get full value
   envault sync                    # Sync from .env files

 For command-specific help:
   envault <command> --help

 Documentation: https://github.com/you/envault

 ---
 Command Help

 Example: envault add --help

 envault add - Add or update an environment variable

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
   envault add -p backend DATABASE_URL --to-env staging

 ---
 Package Configuration

 package.json

 {
   "name": "envault",
   "version": "0.1.0",
   "description": "Centralized environment variable management CLI",
   "type": "module",
   "main": "./dist/index.js",
   "bin": {
     "envault": "./dist/index.js"
   },
   "scripts": {
     "dev": "bun --watch src/cli/index.ts",
     "build": "bun build src/cli/index.ts --outdir dist --target bun --minify",
     "test": "bun test",
     "test:watch": "bun test --watch",
     "prepublishOnly": "bun run build"
   },
   "files": [
     "dist",
     "README.md",
     "LICENSE"
   ],
   "keywords": [
     "env",
     "environment",
     "dotenv",
     "cli",
     "ai-agent",
     "developer-tools"
   ],
   "devDependencies": {
     "@types/bun": "latest",
     "typescript": "^5"
   },
   "peerDependencies": {
     "typescript": "^5"
   },
   "engines": {
     "bun": ">=1.0.0"
   },
   "author": "Your Name",
   "license": "MIT",
   "repository": {
     "type": "git",
     "url": "https://github.com/you/envault.git"
   }
 }

 tsconfig.json

 {
   "compilerOptions": {
     "target": "ESNext",
     "module": "ESNext",
     "moduleResolution": "bundler",
     "lib": ["ESNext"],
     "types": ["bun-types"],
     "strict": true,
     "esModuleInterop": true,
     "skipLibCheck": true,
     "forceConsistentCasingInFileNames": true,
     "resolveJsonModule": true,
     "outDir": "./dist",
     "rootDir": "./src"
   },
   "include": ["src/**/*"],
   "exclude": ["node_modules", "dist", "tests"]
 }

 ---
 Installation & Distribution

 Installation

 npm/bun package:
 # Global install
 bun install -g envault

 # Or use via bunx (no install)
 bunx envault ls

 Building

 # Development
 bun run dev

 # Production build
 bun run build

 # Creates dist/index.js with #!/usr/bin/env bun shebang

 Publishing

 # Publish to npm
 npm publish

 # Users install with bun or npm
 bun install -g envault
 # or
 npm install -g envault

 ---
 Testing Strategy

 Unit Tests

 Test files:
 - tests/unit/parser.test.ts - .env parsing (valid/invalid syntax, quoting, multiline)
 - tests/unit/db.test.ts - Database CRUD operations
 - tests/unit/git.test.ts - Git root detection
 - tests/unit/partial.test.ts - Partial value masking

 Example (parser.test.ts):
 import { test, expect } from "bun:test"
 import { parse, write } from "@/parser/dotenv"

 test("parse simple .env", () => {
   const content = "KEY=value\nFOO=bar"
   const result = parse(content)
   expect(result.errors).toHaveLength(0)
   expect(result.variables).toEqual({ KEY: "value", FOO: "bar" })
 })

 test("parse quoted values", () => {
   const content = 'KEY="value with spaces"'
   const result = parse(content)
   expect(result.variables.KEY).toBe("value with spaces")
 })

 test("write alphabetically sorted", () => {
   const vars = { ZEBRA: "z", ALPHA: "a", BETA: "b" }
   const output = write(vars)
   expect(output).toBe("ALPHA=a\nBETA=b\nZEBRA=z")
 })

 Integration Tests

 Test files:
 - tests/integration/ls.test.ts - List projects and variables
 - tests/integration/add.test.ts - Add variables, handle duplicates
 - tests/integration/sync.test.ts - Sync from .env files
 - tests/integration/cross-project.test.ts - Cross-project copying

 Test setup (tests/helpers/setup.ts):
 import { beforeEach, afterEach } from "bun:test"
 import { mkdtemp, rm } from "node:fs/promises"
 import { join } from "node:path"
 import { tmpdir } from "node:os"

 export let testDir: string
 export let testHome: string

 beforeEach(async () => {
   // Create temp directory for tests
   testDir = await mkdtemp(join(tmpdir(), "envault-test-"))
   testHome = join(testDir, "home")
   process.env.HOME = testHome
 })

 afterEach(async () => {
   // Cleanup
   await rm(testDir, { recursive: true, force: true })
 })

 export async function createGitRepo(name: string): Promise<string> {
   const repoPath = join(testDir, name)
   await mkdir(repoPath, { recursive: true })
   await mkdir(join(repoPath, ".git"))
   return repoPath
 }

 Example (add.test.ts):
 import { test, expect } from "bun:test"
 import { $, file } from "bun"
 import { createGitRepo, testHome } from "../helpers/setup"

 test("add variable writes to database and .env", async () => {
   const repo = await createGitRepo("my-app")

   // Run envault add
   const result = await $`bun src/cli/index.ts add TEST_KEY test_value`.cwd(repo)
   expect(result.exitCode).toBe(0)

   // Check .env file
   const envContent = await file(join(repo, ".env")).text()
   expect(envContent).toContain("TEST_KEY=test_value")

   // Check database
   const db = new Database(join(testHome, ".envault", "envault.db"))
   const row = db.query("SELECT value FROM variables WHERE key = 'TEST_KEY'").get()
   expect(row.value).toBe("test_value")
 })

 ---
 MVP Scope

 Included in MVP:
 1. ✅ Core commands: ls, add, get, update, rm, sync
 2. ✅ Multi-environment support (--env flag)
 3. ✅ Cross-project variable copying (-p flag)
 4. ✅ Git repository detection
 5. ✅ Interactive value input (hidden, multiline)
 6. ✅ Comprehensive help system
 7. ✅ JSON output mode
 8. ✅ Lenient .env parsing
 9. ✅ Partial value display (first 4, last 4)
 10. ✅ Unit + integration tests

 NOT in MVP (future enhancements):
 - Global variables
 - Export command (separate from add/sync)
 - Backup/restore
 - Shell completions
 - Remote sync / cloud storage
 - Audit logs / history
 - GUI/TUI interface
 - Config file
 - Plugins/extensions

 ---
 Implementation Phases

 Phase 1: Core Infrastructure

 Files to create:
 - src/utils/paths.ts - Resolve HOME, .envault directory
 - src/db/schema.ts - SQL schema, migrations
 - src/db/index.ts - Database wrapper class
 - src/utils/git.ts - Git root detection
 - src/cli/args.ts - Argument parser

 Tests: tests/unit/db.test.ts, tests/unit/git.test.ts

 ---
 Phase 2: .env Parser

 Files to create:
 - src/parser/dotenv.ts - Parse and write .env files
 - src/parser/types.ts - Parser types

 Tests: tests/unit/parser.test.ts

 Edge cases:
 - Empty values
 - Quoted vs unquoted
 - Multiline values
 - Comments and blank lines
 - Special characters
 - Escape sequences

 ---
 Phase 3: Basic Commands

 Files to create:
 - src/cli/index.ts - Command routing
 - src/cli/commands/ls.ts
 - src/cli/commands/add.ts (single-project only)
 - src/cli/commands/get.ts
 - src/utils/display.ts - Output formatting
 - src/utils/partial.ts - Partial value masking

 Tests: tests/integration/ls.test.ts, tests/integration/add.test.ts

 ---
 Phase 4: Interactive Input

 Files to create:
 - src/utils/input.ts - Hidden, multiline, confirm prompts

 Update:
 - src/cli/commands/add.ts - Add interactive prompts, multiline support

 ---
 Phase 5: Multi-Environment

 Update:
 - src/cli/commands/add.ts - Support --env flag
 - src/cli/commands/ls.ts - Filter by environment
 - src/cli/commands/get.ts - Support --env flag
 - src/parser/dotenv.ts - Map env name to filename

 Tests: Integration tests with multiple environments

 ---
 Phase 6: Sync Command

 Files to create:
 - src/cli/commands/sync.ts - Sync from .env files

 Tests: tests/integration/sync.test.ts

 Edge cases:
 - Missing .env files
 - Parse errors
 - Empty files
 - Multiple environments

 ---
 Phase 7: Remove Command

 Files to create:
 - src/cli/commands/rm.ts - Remove with confirmation

 Tests: Integration test for rm

 ---
 Phase 8: Cross-Project Copying

 Update:
 - src/cli/commands/add.ts - Support -p flag, project resolution, -all flag
 - src/db/index.ts - Cross-project query methods

 Tests: tests/integration/cross-project.test.ts

 Edge cases:
 - Multiple projects with same name
 - Non-existent source project
 - Empty source project

 ---
 Phase 9: Help System

 Files to create:
 - src/cli/commands/help.ts - Comprehensive help text

 Update: Add --help handling to all commands

 ---
 Phase 10: Polish

 - Error messages
 - Exit codes
 - Input validation
 - Edge case handling
 - Documentation (README)

 ---
 Implementation Checklist

 - Phase 1: Core Infrastructure
   - Path utilities
   - Database schema
   - Database wrapper
   - Git detection
   - Argument parser
 - Phase 2: .env Parser
   - Parse logic
   - Write logic
   - Quoting/escaping
 - Phase 3: Basic Commands
   - Command routing
   - ls (projects and variables)
   - add (basic)
   - get
   - Output formatting
   - Partial value display
 - Phase 4: Interactive Input
   - Hidden prompt
   - Multiline prompt
   - Confirmation prompt
 - Phase 5: Multi-Environment
   - --env flag support
   - Environment file mapping
 - Phase 6: Sync Command
   - Parse multiple .env files
   - Sync to database
 - Phase 7: Remove Command
   - rm with confirmation
 - Phase 8: Cross-Project Copying
   - -p flag
   - -all flag
   - Project resolution
   - --to-env flag
 - Phase 9: Help System
   - Global help
   - Per-command help
 - Phase 10: Polish
   - Error handling
   - README documentation
   - Publishing setup

 ---
 Path Resolution Details

 Database location: ${HOME}/.envault/envault.db

 Path resolution (src/utils/paths.ts):
 export function getEnvaultHome(): string {
   return join(Bun.env.HOME!, ".envault")
 }

 export function getDbPath(): string {
   return join(getEnvaultHome(), "envault.db")
 }

 export async function ensureEnvaultDir(): Promise<void> {
   const dir = getEnvaultHome()
   await mkdir(dir, { recursive: true, mode: 0o700 })
 }

 ---
 Security Considerations

 File Permissions

 - Database file: chmod 600 (owner read/write only)
 - ~/.envault/ directory: chmod 700 (owner access only)

 Shell History

 - Warn users when passing values as CLI arguments
 - Recommend interactive mode for sensitive data
 - Document in help text

 .env Files

 - .env files are plaintext (as always)
 - Ensure .env is in .gitignore (warn if not)
 - Document that security relies on filesystem permissions

 ---
 Future Enhancements

 - Global variables: Shared pool across all projects
 - Remote sync: Encrypted cloud storage (S3, etc.)
 - Team sharing: Multi-user access with permissions
 - Audit logs: Track who accessed what and when
 - Export command: Explicit .env generation separate from add
 - Import formats: JSON, YAML, etc.
 - Variable templates: Reusable patterns
 - Shell completions: bash, zsh, fish
 - TUI: Interactive terminal UI (Bubble Tea style)
 - Secrets rotation: Remind to rotate old secrets
 - Integration: GitHub Actions, CI/CD pipelines
 - Backup: Automatic database backups
 - Config file: ~/.envault/config.json for defaults

 ---
 Acceptance Criteria

 MVP is complete when:

 1. ✅ User can run envault ls and see all projects
 2. ✅ User can run envault add KEY value and value is stored in DB and .env
 3. ✅ User can run envault get KEY and see full value
 4. ✅ User can run envault sync and .env syncs to DB
 5. ✅ User can use --env flag for multiple environments
 6. ✅ User can copy variables between projects with -p
 7. ✅ User can remove variables with envault rm KEY
 8. ✅ All commands have --help documentation
 9. ✅ JSON output mode works for ls and get
 10. ✅ Interactive prompts work (hidden, multiline)
 11. ✅ Unit and integration tests pass
 12. ✅ Package can be installed globally via bun install -g envault
 13. ✅ README has installation, usage, and examples

 ---
 Notes & Clarifications

 Why no encryption?
 - Original requirement was to protect against agents reading .env
 - But agents can already read .env files if they write them
 - Encryption adds significant complexity for minimal security benefit
 - Focus on organization and workflow instead

 Why SQLite?
 - Fast, serverless, single file
 - Bun has native support
 - No external dependencies
 - Easy to backup (just copy .db file)

 Why partial value display?
 - UX: Easier to identify keys without clutter
 - Still useful without encryption for quick scanning
 - Helps verify correct value without full exposure
