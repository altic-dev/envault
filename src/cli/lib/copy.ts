import type { ParsedArgs } from "../args.ts";
import type { EnvaultDB } from "../../db/index.ts";
import { requireGitRoot, getProjectName } from "../../utils/git.ts";
import { confirm } from "../../utils/input.ts";
import { partialValue } from "../../utils/partial.ts";
import { writeEnvFile } from "./envfile.ts";

export async function copyFromProjectToCurrent(
  args: ParsedArgs,
  db: EnvaultDB,
  sourceProjectName: string,
  opts: {
    key?: string;
    copyAll: boolean;
    confirmFn?: (msg: string) => Promise<boolean>;
  }
): Promise<void> {
  const key = opts.key;
  // Flag semantics:
  // - --from-env: source environment (copy/import only)
  // - --env/--environment/--to-env: target environment (destination)
  const sourceEnvFlag = args.flags.fromEnv;
  const targetEnvFlag = args.flags.toEnv ?? args.flags.env;
  const sourceEnvSpecified = args.flags.fromEnv !== undefined;
  const targetEnvSpecified = args.flags.toEnv !== undefined || args.flags.env !== undefined;
  const sourceEnv = sourceEnvFlag ?? "default";
  const targetEnv = targetEnvFlag ?? "default";
  const confirmFn = opts.confirmFn ?? confirm;

  // Validate arguments (kept consistent with `cp` behavior)
  if (!opts.copyAll && !key) {
    console.error("Error: Missing KEY argument\n");
    console.error(
      "Usage: envault var copy <fromProject> <KEY> [--from-env ENV] [--env ENV|--environment ENV|--to-env ENV]"
    );
    process.exit(1);
  }

  // Get current (target) project
  const gitRoot = requireGitRoot();
  const targetProjectName = getProjectName(gitRoot);
  const targetProjectId = db.ensureProject(gitRoot, targetProjectName);

  // Find source project
  const sourceProjects = db.findProjectByName(sourceProjectName);

  if (sourceProjects.length === 0) {
    console.error(`Error: Project '${sourceProjectName}' not found\n`);
    console.error("Available projects:");
    const allProjects = db.listProjects();
    if (allProjects.length > 0) {
      for (const p of allProjects) {
        console.error(`  ${p.name} (${p.path})`);
      }
    } else {
      console.error("  (no projects tracked yet)");
    }
    console.error("\nUse 'envault project list' to see all projects.");
    process.exit(1);
  }

  // Handle multiple projects with same name
  let sourceProject = sourceProjects[0]!;
  if (sourceProjects.length > 1) {
    console.log(`Multiple projects named '${sourceProjectName}' found:`);
    sourceProjects.forEach((p, i) => {
      console.log(`${i + 1}. ${p.path}`);
    });

    // Simple selection - use first one (in real implementation, we'd prompt)
    console.log(`\nUsing: ${sourceProject.path}\n`);
  }

  if (opts.copyAll) {
    const variables = sourceEnvSpecified
      ? db.listVariables(sourceProject.id, sourceEnv)
      : db.listVariables(sourceProject.id);

    if (variables.length === 0) {
      if (sourceEnvSpecified) {
        const envMsg = sourceEnv !== "default" ? ` (${sourceEnv})` : "";
        console.log(`No variables found in ${sourceProjectName}${envMsg}`);
      } else {
        console.log(`No variables found in ${sourceProjectName}`);
      }
      return;
    }

    // Group variables by source environment (so cp matches what ls shows).
    const grouped: Record<string, typeof variables> = {};
    for (const v of variables) {
      if (!grouped[v.environment]) grouped[v.environment] = [];
      grouped[v.environment]!.push(v);
    }

    const sourceEnvs = Object.keys(grouped).sort((a, b) => {
      if (a === "default" && b !== "default") return -1;
      if (b === "default" && a !== "default") return 1;
      return a.localeCompare(b);
    });

    let copiedCount = 0;
    const targetEnvsTouched = new Set<string>();

    for (const srcEnv of sourceEnvs) {
      const destEnv = targetEnvSpecified ? targetEnv : srcEnv;
      targetEnvsTouched.add(destEnv);

      for (const v of grouped[srcEnv]!) {
        const existingValue = db.getVariable(targetProjectId, destEnv, v.key);
        if (existingValue !== null) {
          const envMsg = destEnv !== "default" ? ` ${destEnv}` : "";
          console.log(`${v.key} already exists in${envMsg} environment.`);
          console.log(`Current value: ${partialValue(existingValue)}`);

          const shouldOverwrite = await confirmFn("Overwrite? (y/n): ");
          if (!shouldOverwrite) {
            console.log(`Skipped ${v.key}`);
            continue;
          }
        }

        db.upsertVariable(targetProjectId, destEnv, v.key, v.value);
        copiedCount++;
      }
    }

    // Write affected env files (.env, .env.<env>, etc.)
    for (const env of targetEnvsTouched) {
      await writeEnvFile(db, targetProjectId, gitRoot, env);
    }

    if (targetEnvSpecified) {
      const envMsg = targetEnv !== "default" ? ` (${targetEnv})` : "";
      console.log(
        `✓ Copied ${copiedCount} variable${copiedCount === 1 ? "" : "s"} to ${targetProjectName}${envMsg}`
      );
    } else if (sourceEnvSpecified) {
      const envMsg = sourceEnv !== "default" ? ` (${sourceEnv})` : "";
      console.log(
        `✓ Copied ${copiedCount} variable${copiedCount === 1 ? "" : "s"} to ${targetProjectName}${envMsg}`
      );
    } else {
      console.log(
        `✓ Copied ${copiedCount} variable${copiedCount === 1 ? "" : "s"} to ${targetProjectName} (all environments)`
      );
    }
  } else {
    let resolvedSourceEnv = sourceEnv;

    // If --from-env wasn't specified, try to auto-detect which env contains the key.
    if (!sourceEnvSpecified) {
      const all = db.listVariables(sourceProject.id);
      const matches = all.filter((v) => v.key === key);

      if (matches.length === 0) {
        console.error(`Error: Variable '${key}' not found in ${sourceProjectName}\n`);
        console.error(
          `Use 'envault var list --project ${sourceProjectName}' to see available variables.`
        );
        process.exit(1);
      }

      const envs = [...new Set(matches.map((m) => m.environment))];
      if (envs.length > 1) {
        console.error(
          `Error: Variable '${key}' exists in multiple environments in ${sourceProjectName}\n`
        );
        console.error(`Specify which one with --from-env. Found in: ${envs.join(", ")}`);
        process.exit(1);
      }

      resolvedSourceEnv = envs[0]!;
    }

    const resolvedTargetEnv = targetEnvSpecified ? targetEnv : resolvedSourceEnv;
    const value = db.getVariable(sourceProject.id, resolvedSourceEnv, key!);

    if (value === null) {
      const envMsg = resolvedSourceEnv !== "default" ? ` (${resolvedSourceEnv})` : "";
      console.error(`Error: Variable '${key}' not found in ${sourceProjectName}${envMsg}`);
      process.exit(1);
    }

    const existingValue = db.getVariable(targetProjectId, resolvedTargetEnv, key!);
    if (existingValue !== null) {
      const envMsg = resolvedTargetEnv !== "default" ? ` ${resolvedTargetEnv}` : "";
      console.log(`${key} already exists in${envMsg} environment.`);
      console.log(`Current value: ${partialValue(existingValue)}`);

      const shouldOverwrite = await confirmFn("Overwrite? (y/n): ");
      if (!shouldOverwrite) {
        console.log("Aborted.");
        process.exit(1);
      }
    }

    db.upsertVariable(targetProjectId, resolvedTargetEnv, key!, value);

    await writeEnvFile(db, targetProjectId, gitRoot, resolvedTargetEnv);

    const envMsg = resolvedTargetEnv !== "default" ? ` (${resolvedTargetEnv})` : "";
    console.log(`✓ Copied ${key} from ${sourceProjectName} to ${targetProjectName}${envMsg}`);
  }
}
