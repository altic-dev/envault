import type { ParsedArgs } from "../args.ts";
import { EnvaultDB } from "../../db/index.ts";
import { requireGitRoot, getProjectName } from "../../utils/git.ts";
import { promptHidden, promptMultiline, confirm } from "../../utils/input.ts";
import { partialValue } from "../../utils/partial.ts";
import { writeEnvFile } from "../lib/envfile.ts";

export async function add(args: ParsedArgs, db: EnvaultDB): Promise<void> {
  // `add` is strictly for setting/updating variables in the current project.
  // Cross-project copy is handled by `envault cp`.
  if (args.flags.project || args.flags.all || args.flags.toEnv || args.flags.fromEnv) {
    console.error("Error: 'envault add' only sets/updates variables in the current project.\n");
    console.error("Use: envault cp <fromProject> [KEY] [--from-env ENV] [--to-env ENV]");
    process.exit(1);
  }

  // Regular add mode
  const key = args.args[0];
  const environment = args.flags.env ?? "default";
  const multiline = args.flags.multiline ?? false;

  if (!key) {
    console.error("Error: Missing KEY argument\n");
    console.error("Usage: envault add <KEY> [value] [--env ENV] [--multiline]");
    process.exit(1);
  }

  // Get current project
  const gitRoot = requireGitRoot();
  const projectName = getProjectName(gitRoot);

  // Ensure project exists in database
  const projectId = db.ensureProject(gitRoot, projectName);

  // Determine the value
  let value: string;

  if (args.args.length > 1) {
    // Value provided as argument
    value = args.args.slice(1).join(" ");
    console.warn("⚠ WARNING: Value will appear in shell history. Use interactive mode (no value arg) for sensitive data.\n");
  } else if (multiline) {
    // Multiline input
    console.log(`Enter value for ${key} (Ctrl+D to finish):`);
    value = await promptMultiline("");
  } else {
    // Interactive hidden input
    value = await promptHidden(`Enter value for ${key}: `);
  }

  // Check for duplicates
  const existingValue = db.getVariable(projectId, environment, key);
  if (existingValue !== null) {
    const envMsg = environment !== "default" ? ` ${environment}` : "";
    console.log(`${key} already exists in${envMsg} environment.`);
    console.log(`Current value: ${partialValue(existingValue)}`);

    const shouldOverwrite = await confirm("Overwrite? (y/n): ");
    if (!shouldOverwrite) {
      console.log("Aborted.");
      process.exit(1);
    }
  }

  // Add variable to database (upsert)
  db.upsertVariable(projectId, environment, key, value);

  // Write to .env file
  await writeEnvFile(db, projectId, gitRoot, environment);

  const envMsg = environment !== "default" ? ` (${environment})` : "";
  console.log(`✓ Added ${key} to ${projectName}${envMsg}`);
}
