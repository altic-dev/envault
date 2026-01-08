import type { ParsedArgs } from "../args.ts";
import type { EnvaultDB } from "../../db/index.ts";
import { formatProjects } from "../../utils/display.ts";

export async function project(args: ParsedArgs, db: EnvaultDB): Promise<void> {
  const sub = args.args[0] ?? "";
  const json = args.flags.json ?? false;

  if (sub === "list" || sub === "") {
    const projects = db.listProjects();

    if (projects.length === 0) {
      console.log("No projects tracked yet.");
      return;
    }

    console.log(formatProjects(projects, json));
    return;
  }

  console.error(`Error: Unknown subcommand 'project ${sub}'\n`);
  console.error("Usage: envault project list");
  process.exit(1);
}


