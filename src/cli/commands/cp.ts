import type { ParsedArgs } from "../args.ts";
import type { EnvaultDB } from "../../db/index.ts";
import { copyFromProjectToCurrent } from "../lib/copy.ts";

export async function cp(args: ParsedArgs, db: EnvaultDB): Promise<void> {
  const sourceProjectName = args.args[0];
  const key = args.args[1];

  if (!sourceProjectName) {
    console.error("Error: Missing <project> argument\n");
    console.error("Usage: envault cp <project> [KEY] [--env ENV] [--to-env ENV]");
    process.exit(1);
  }

  const copyAll = !key || (args.flags.all ?? false);

  await copyFromProjectToCurrent(args, db, sourceProjectName, {
    key,
    copyAll,
  });
}
