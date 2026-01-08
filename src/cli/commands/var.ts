import type { ParsedArgs } from "../args.ts";
import type { EnvaultDB } from "../../db/index.ts";
import { formatProjects, formatVariables } from "../../utils/display.ts";
import type { Variable } from "../../db/types.ts";
import { requireGitRoot, getProjectName } from "../../utils/git.ts";
import { get } from "./get.ts";
import { add } from "./add.ts";
import { unset } from "./unset.ts";

export async function variable(args: ParsedArgs, db: EnvaultDB): Promise<void> {
  const sub = args.args[0] ?? "";

  switch (sub) {
    case "list":
    case "":
      await listVars(args, db);
      return;
    case "get":
      await get(remapArgs(args, "get"), db);
      return;
    case "set":
      await add(remapArgsForSet(args), db);
      return;
    case "unset":
      await unset(remapArgs(args, sub), db);
      return;
    default:
      console.error(`Error: Unknown subcommand 'var ${sub}'\n`);
      console.error("Usage:");
      console.error("  envault var list [-p PROJECT] [--env ENV] [--json]");
      console.error("  envault var get <KEY> [--env ENV]");
      console.error("  envault var set <KEY> [--env ENV] [--value VALUE] [--multiline]");
      console.error("  envault var unset <KEY> [--env ENV]");
      process.exit(1);
  }
}

function remapArgs(args: ParsedArgs, command: string): ParsedArgs {
  // Drops the noun-verb prefix: `var <sub> ...` -> `<command> ...`
  return {
    command,
    args: args.args.slice(1),
    flags: args.flags,
  };
}

function remapArgsForSet(args: ParsedArgs): ParsedArgs {
  const mapped = remapArgs(args, "add");
  const key = mapped.args[0];

  // Support: `envault var set <KEY> --value <VALUE>`
  if (key && mapped.args.length === 1 && args.flags.value) {
    mapped.args.push(args.flags.value);
  }

  return mapped;
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


