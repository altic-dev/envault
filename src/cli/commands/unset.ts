import type { ParsedArgs } from "../args.ts";
import { EnvaultDB } from "../../db/index.ts";
import { requireGitRoot, getProjectName } from "../../utils/git.ts";
import { confirm } from "../../utils/input.ts";
import { writeEnvFile } from "../lib/envfile.ts";

export async function unset(args: ParsedArgs, db: EnvaultDB): Promise<void> {
  const key = args.args[0];
  const environment = args.flags.env ?? "default";

  if (!key) {
    console.error("Error: Missing KEY argument\n");
    console.error(`Usage: envault ${args.command || "unset"} <KEY> [--env ENV]`);
    process.exit(1);
  }

  // Get current project
  const gitRoot = requireGitRoot();
  const projectName = getProjectName(gitRoot);
  const project = db.findProjectByPath(gitRoot);

  if (!project) {
    console.error(`Error: Project not tracked yet`);
    process.exit(1);
  }

  // Check if variable exists
  const value = db.getVariable(project.id, environment, key);
  if (value === null) {
    const envMsg = environment !== "default" ? ` (${environment})` : "";
    console.error(`Error: Variable '${key}' not found in ${projectName}${envMsg}`);
    process.exit(1);
  }

  // Confirm removal
  const envMsg = environment !== "default" ? ` (${environment})` : "";
  const shouldUnset = await confirm(`Unset '${key}' from ${projectName}${envMsg}? (y/n): `);

  if (!shouldUnset) {
    console.log("Aborted.");
    process.exit(1);
  }

  // Remove from database
  const deleted = db.deleteVariable(project.id, environment, key);

  if (!deleted) {
    console.error(`Error: Failed to unset '${key}'`);
    process.exit(1);
  }

  // Update .env file
  await writeEnvFile(db, project.id, gitRoot, environment);

  console.log(`✓ Unset ${key} from ${projectName}${envMsg}`);
}


