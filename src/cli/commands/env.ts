import type { ParsedArgs } from "../args.ts";
import type { EnvaultDB } from "../../db/index.ts";
import { envs } from "./envs.ts";

export async function env(args: ParsedArgs, db: EnvaultDB): Promise<void> {
  const sub = args.args[0] ?? "";

  if (sub === "list" || sub === "") {
    await envs(args, db);
    return;
  }

  console.error(`Error: Unknown subcommand 'env ${sub}'\n`);
  console.error("Usage: envault env list [-p PROJECT] [--json]");
  process.exit(1);
}


