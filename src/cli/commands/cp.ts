import type { ParsedArgs } from "../args.ts";
import type { EnvaultDB } from "../../db/index.ts";
import { copyFromProjectToCurrent } from "../lib/copy.ts";

export async function cp(args: ParsedArgs, db: EnvaultDB): Promise<void> {
  const sourceProjectName = args.args[0];
  const key = args.args[1];

  if (!sourceProjectName) {
    console.error("Error: Missing <project> argument\n");
    console.error(
      "Usage: envault cp <fromProject> [KEY] [--from-env ENV] [--env ENV|--environment ENV|--to-env ENV]"
    );
    process.exit(1);
  }

  if (args.flags.all) {
    if (key) {
      console.error("Error: --all cannot be used with a specific KEY.\n");
      console.error("To copy all variables, omit KEY:");
      console.error("  envault cp <fromProject> [--from-env ENV] [--env ENV|--to-env ENV]");
      process.exit(1);
    }
    // Backwards-compatible no-op: `cp` copies all when KEY is omitted.
  }

  // Destination env can be provided via either flag (aliases)
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

  await copyFromProjectToCurrent(args, db, sourceProjectName, {
    key,
    copyAll,
  });
}
