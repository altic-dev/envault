import type { ParsedArgs } from "../args.ts";
import { EnvaultDB } from "../../db/index.ts";
import { requireGitRoot, getProjectName } from "../../utils/git.ts";

export async function get(args: ParsedArgs, db: EnvaultDB): Promise<void> {
  const key = args.args[0];
  const environment = args.flags.env ?? "default";

  if (!key) {
    console.error("Error: Missing KEY argument\n");
    console.error("Usage: envault get <KEY> [--env ENV]");
    process.exit(1);
  }

  // Get current project
  const gitRoot = requireGitRoot();
  const projectName = getProjectName(gitRoot);
  const project = db.findProjectByPath(gitRoot);

  if (!project) {
    console.error(`Error: Project not tracked yet\n`);
    console.error(`Use 'envault add ${key} <value>' to create it.`);
    process.exit(1);
  }

  // Get variable
  const value = db.getVariable(project.id, environment, key);

  if (value === null) {
    const envMsg = environment !== "default" ? ` (${environment})` : "";
    console.error(`Error: Variable '${key}' not found in ${projectName}${envMsg}\n`);
    console.error(`Use 'envault add ${key}' to create it.`);
    process.exit(1);
  }

  // Output plain value to stdout (for piping)
  console.log(value);
}
