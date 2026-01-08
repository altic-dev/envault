import type { ParsedArgs } from "../args.ts";
import type { EnvaultDB } from "../../db/index.ts";
import { formatProjects, formatVariables } from "../../utils/display.ts";
import type { Variable } from "../../db/types.ts";
import { requireGitRoot, getProjectName } from "../../utils/git.ts";
import { promptHidden, promptMultiline, confirm } from "../../utils/input.ts";
import { partialValue } from "../../utils/partial.ts";
import { writeEnvFile } from "../lib/envfile.ts";
import { copyFromProjectToCurrent } from "../lib/copy.ts";

export async function variable(args: ParsedArgs, db: EnvaultDB): Promise<void> {
  const sub = args.args[0] ?? "";

  switch (sub) {
    case "list":
    case "":
      await listVars(args, db);
      return;
    case "get":
      await getVar(args, db);
      return;
    case "set":
      await setVar(args, db);
      return;
    case "unset":
      await unsetVar(args, db);
      return;
    case "copy":
      await copyVar(args, db);
      return;
    default:
      console.error(`Error: Unknown subcommand 'var ${sub}'\n`);
      console.error("Usage:");
      console.error("  envault var list [-p PROJECT] [--env ENV] [--json]");
      console.error("  envault var get <KEY> [--env ENV]");
      console.error("  envault var set <KEY> [--env ENV] [--value VALUE] [--multiline]");
      console.error("  envault var unset <KEY> [--env ENV]");
      console.error("  envault var copy <fromProject> [KEY] [--from-env ENV] [--env ENV]");
      process.exit(1);
  }
}

async function listVars(args: ParsedArgs, db: EnvaultDB): Promise<void> {
  const projectNameFlag = args.flags.project;
  const environment = args.flags.env;
  const json = args.flags.json ?? false;

  // Resolve project
  let projectName: string;
  let projectId: number;

  if (projectNameFlag) {
    const projects = db.findProjectByName(projectNameFlag);

    if (projects.length === 0) {
      console.error(`Error: Project '${projectNameFlag}' not found\n`);
      console.error("Available projects:");
      const allProjects = db.listProjects();
      if (allProjects.length > 0) {
        console.error(formatProjects(allProjects, false));
      } else {
        console.error("  (no projects tracked yet)");
      }
      console.error("\nUse 'envault project list' to see all projects.");
      process.exit(1);
    }

    let project = projects[0]!;
    if (projects.length > 1) {
      console.log(`Multiple projects named '${projectNameFlag}' found:`);
      projects.forEach((p, i) => {
        console.log(`${i + 1}. ${p.path}`);
      });
      console.log();
      console.log(`Using: ${project.path}\n`);
    }

    projectName = project.name;
    projectId = project.id;
  } else {
    const gitRoot = requireGitRoot();
    projectName = getProjectName(gitRoot);
    const project = db.findProjectByPath(gitRoot);

    if (!project) {
      console.error("Error: Project not tracked yet\n");
      console.error("Run 'envault sync' or 'envault var set <KEY>' to start tracking it.");
      process.exit(1);
    }

    projectId = project.id;
  }

  const variables = db.listVariables(projectId, environment);

  if (variables.length === 0) {
    const envMsg = environment ? ` in ${environment} environment` : "";
    console.log(`No variables found in ${projectName}${envMsg}.`);
    return;
  }

  // Group by environment
  const grouped: Record<string, Variable[]> = {};
  for (const v of variables) {
    if (!grouped[v.environment]) grouped[v.environment] = [];
    grouped[v.environment]!.push(v);
  }

  console.log(formatVariables(grouped, json, true));
}

async function getVar(args: ParsedArgs, db: EnvaultDB): Promise<void> {
  const key = args.args[1];
  const environment = args.flags.env ?? "default";

  if (!key) {
    console.error("Error: Missing KEY argument\n");
    console.error("Usage: envault var get <KEY> [--env ENV]");
    process.exit(1);
  }

  const gitRoot = requireGitRoot();
  const projectName = getProjectName(gitRoot);
  const project = db.findProjectByPath(gitRoot);

  if (!project) {
    console.error(`Error: Project not tracked yet\n`);
    console.error(`Use 'envault var set ${key}' to create it.`);
    process.exit(1);
  }

  const value = db.getVariable(project.id, environment, key);

  if (value === null) {
    const envMsg = environment !== "default" ? ` (${environment})` : "";
    console.error(`Error: Variable '${key}' not found in ${projectName}${envMsg}\n`);
    console.error(`Use 'envault var set ${key}' to create it.`);
    process.exit(1);
  }

  console.log(value);
}

async function setVar(args: ParsedArgs, db: EnvaultDB): Promise<void> {
  const key = args.args[1];
  const environment = args.flags.env ?? "default";
  const multiline = args.flags.multiline ?? false;

  if (!key) {
    console.error("Error: Missing KEY argument\n");
    console.error("Usage: envault var set <KEY> [value] [--env ENV] [--value VALUE] [--multiline]");
    process.exit(1);
  }

  const positionalValue =
    args.args.length > 2 ? args.args.slice(2).join(" ") : undefined;

  if (positionalValue !== undefined && args.flags.value !== undefined) {
    console.error("Error: Provide the value either positionally or via --value, not both.\n");
    console.error("Usage: envault var set <KEY> [value] [--value VALUE]");
    process.exit(1);
  }

  const gitRoot = requireGitRoot();
  const projectName = getProjectName(gitRoot);
  const projectId = db.ensureProject(gitRoot, projectName);

  let value: string;

  if (positionalValue !== undefined) {
    value = positionalValue;
    console.warn(
      "⚠ WARNING: Value will appear in shell history. Prefer interactive mode (omit value) for sensitive data.\n"
    );
  } else if (args.flags.value !== undefined) {
    value = args.flags.value;
    console.warn(
      "⚠ WARNING: Value will appear in shell history. Prefer interactive mode (omit --value) for sensitive data.\n"
    );
  } else if (multiline) {
    console.log(`Enter value for ${key} (Ctrl+D to finish):`);
    value = await promptMultiline("");
  } else {
    value = await promptHidden(`Enter value for ${key}: `);
  }

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

  db.upsertVariable(projectId, environment, key, value);
  await writeEnvFile(db, projectId, gitRoot, environment);

  const envMsg = environment !== "default" ? ` (${environment})` : "";
  console.log(`✓ Set ${key} in ${projectName}${envMsg}`);
}

async function unsetVar(args: ParsedArgs, db: EnvaultDB): Promise<void> {
  const key = args.args[1];
  const environment = args.flags.env ?? "default";

  if (!key) {
    console.error("Error: Missing KEY argument\n");
    console.error("Usage: envault var unset <KEY> [--env ENV]");
    process.exit(1);
  }

  const gitRoot = requireGitRoot();
  const projectName = getProjectName(gitRoot);
  const project = db.findProjectByPath(gitRoot);

  if (!project) {
    console.error("Error: Project not tracked yet");
    process.exit(1);
  }

  const value = db.getVariable(project.id, environment, key);
  if (value === null) {
    const envMsg = environment !== "default" ? ` (${environment})` : "";
    console.error(`Error: Variable '${key}' not found in ${projectName}${envMsg}`);
    process.exit(1);
  }

  const envMsg = environment !== "default" ? ` (${environment})` : "";
  const shouldUnset = await confirm(`Unset '${key}' from ${projectName}${envMsg}? (y/n): `);

  if (!shouldUnset) {
    console.log("Aborted.");
    process.exit(1);
  }

  const deleted = db.deleteVariable(project.id, environment, key);
  if (!deleted) {
    console.error(`Error: Failed to unset '${key}'`);
    process.exit(1);
  }

  await writeEnvFile(db, project.id, gitRoot, environment);
  console.log(`✓ Unset ${key} from ${projectName}${envMsg}`);
}

async function copyVar(args: ParsedArgs, db: EnvaultDB): Promise<void> {
  const fromProject = args.args[1];
  const key = args.args[2];

  if (!fromProject) {
    console.error("Error: Missing <fromProject> argument\n");
    console.error("Usage: envault var copy <fromProject> [KEY] [--from-env ENV] [--env ENV]");
    process.exit(1);
  }

  // Destination env can be provided via either flag (aliases) but must agree if both are present.
  if (
    args.flags.env !== undefined &&
    args.flags.toEnv !== undefined &&
    args.flags.env !== args.flags.toEnv
  ) {
    console.error("Error: Use only one destination flag: --env/--environment or --to-env.\n");
    console.error("Preferred: --env");
    process.exit(1);
  }

  const copyAll = !key;
  await copyFromProjectToCurrent(args, db, fromProject, { key, copyAll });
}


