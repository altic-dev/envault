import type { ParsedArgs } from "../args.ts";
import type { EnvaultDB } from "../../db/index.ts";
import { requireGitRoot, getProjectName } from "../../utils/git.ts";
import { formatEnvironments, formatProjects } from "../../utils/display.ts";

export async function env(args: ParsedArgs, db: EnvaultDB): Promise<void> {
  const sub = args.args[0] ?? "";
  const json = args.flags.json ?? false;

  if (sub === "list" || sub === "") {
    // Resolve project
    const projectNameFlag = args.flags.project;

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

    const environments = db.listEnvironments(projectId);

    if (environments.length === 0) {
      console.log(`No environments found in ${projectName}.`);
      return;
    }

    console.log(formatEnvironments(environments, json));
    return;
  }

  console.error(`Error: Unknown subcommand 'env ${sub}'\n`);
  console.error("Usage: envault env list [-p PROJECT] [--json]");
  process.exit(1);
}


