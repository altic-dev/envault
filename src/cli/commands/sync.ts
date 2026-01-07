import type { ParsedArgs } from "../args.ts";
import { EnvaultDB } from "../../db/index.ts";
import { requireGitRoot, getProjectName } from "../../utils/git.ts";
import { parse } from "../../parser/dotenv.ts";
import { join } from "node:path";
import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";

export async function sync(args: ParsedArgs, db: EnvaultDB): Promise<void> {
  // Get current project
  const gitRoot = requireGitRoot();
  const projectName = getProjectName(gitRoot);

  // Ensure project exists in database
  const projectId = db.ensureProject(gitRoot, projectName);

  console.log(`Syncing .env files for ${projectName}...`);

  // Find all .env* files
  const envFiles = await findEnvFiles(gitRoot);

  if (envFiles.length === 0) {
    console.log("No .env files found.");
    return;
  }

  let totalSynced = 0;
  const synced: Array<{ env: string; count: number }> = [];

  for (const { filePath, environment } of envFiles) {
    try {
      const content = await readFile(filePath, "utf-8");
      const result = parse(content);

      // Check for parse errors
      if (result.errors.length > 0) {
        const fileName = filePath.split("/").pop();
        const firstError = result.errors[0]!;
        console.error(`Error: Failed to parse ${fileName} (line ${firstError.line})`);
        console.error(`${firstError.message}`);
        console.error("\nSync aborted. Fix syntax errors and try again.");
        process.exit(1);
      }

      // Sync variables to database
      db.syncVariables(projectId, environment, result.variables);

      const count = Object.keys(result.variables).length;
      totalSynced += count;

      const fileName = filePath.split("/").pop();
      synced.push({ env: fileName!, count });
      console.log(`✓ ${fileName}: ${count} variable${count === 1 ? "" : "s"} synced`);
    } catch (error) {
      const fileName = filePath.split("/").pop();
      console.error(`Error reading ${fileName}:`, error);
      process.exit(1);
    }
  }

  console.log(`\nTotal: ${totalSynced} variable${totalSynced === 1 ? "" : "s"} synced to database`);
}

async function findEnvFiles(
  gitRoot: string
): Promise<Array<{ filePath: string; environment: string }>> {
  const files: Array<{ filePath: string; environment: string }> = [];

  try {
    const entries = await readdir(gitRoot);

    for (const entry of entries) {
      if (entry === ".env") {
        files.push({
          filePath: join(gitRoot, entry),
          environment: "default",
        });
      } else if (entry.startsWith(".env.")) {
        const environment = entry.slice(5); // Remove ".env." prefix
        files.push({
          filePath: join(gitRoot, entry),
          environment,
        });
      }
    }
  } catch (error) {
    console.error("Error reading directory:", error);
    process.exit(1);
  }

  return files;
}
