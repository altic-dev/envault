import type { ParsedArgs } from "../args.ts";
import { EnvaultDB } from "../../db/index.ts";
import { getDbPath, ensureEnvaultDir } from "../../utils/paths.ts";
import { formatProjects, formatVariables } from "../../utils/display.ts";
import type { Variable } from "../../db/types.ts";

export async function ls(args: ParsedArgs, db: EnvaultDB): Promise<void> {
  const projectName = args.flags.project;
  const environment = args.flags.env;
  const json = args.flags.json ?? false;

  // List all projects
  if (!projectName) {
    const projects = db.listProjects();

    if (projects.length === 0) {
      console.log("No projects tracked yet.");
      return;
    }

    const output = formatProjects(projects, json);
    console.log(output);
    return;
  }

  // List variables in a project
  const projects = db.findProjectByName(projectName);

  if (projects.length === 0) {
    console.error(`Error: Project '${projectName}' not found\n`);
    console.error("Available projects:");
    const allProjects = db.listProjects();
    if (allProjects.length > 0) {
      console.error(formatProjects(allProjects, false));
    } else {
      console.error("  (no projects tracked yet)");
    }
    console.error("\nUse 'envault ls' to see all projects.");
    process.exit(1);
  }

  // Handle multiple projects with same name
  let project = projects[0]!;
  if (projects.length > 1) {
    console.log(`Multiple projects named '${projectName}' found:`);
    projects.forEach((p, i) => {
      console.log(`${i + 1}. ${p.path}`);
    });
    console.log();

    // For now, use the first one (we'll add interactive selection later)
    console.log(`Using: ${project.path}\n`);
  }

  // Get variables
  const variables = db.listVariables(project.id, environment);

  if (variables.length === 0) {
    const envMsg = environment ? ` in ${environment} environment` : "";
    console.log(`No variables found in ${projectName}${envMsg}.`);
    return;
  }

  // Group by environment
  const grouped: Record<string, Variable[]> = {};
  for (const v of variables) {
    if (!grouped[v.environment]) {
      grouped[v.environment] = [];
    }
    grouped[v.environment]!.push(v);
  }

  const output = formatVariables(grouped, json, true); // true = use partial masking
  console.log(output);
}
