import type { Project, Variable } from "../db/types.ts";
import { partialValue } from "./partial.ts";

export function formatProjects(projects: Project[], json: boolean): string {
  if (json) {
    return JSON.stringify(
      projects.map((p) => ({ name: p.name, path: p.path })),
      null,
      2
    );
  }

  return projects.map((p) => `${p.name} (${p.path})`).join("\n");
}

export function formatEnvironments(envs: string[], json: boolean): string {
  if (json) {
    return JSON.stringify(envs, null, 2);
  }

  return envs.join("\n");
}

export function formatVariables(
  variables: Record<string, Variable[]>,
  json: boolean,
  partial: boolean
): string {
  if (json) {
    const output: Record<string, Array<{ key: string; value: string }>> = {};

    for (const [env, vars] of Object.entries(variables)) {
      output[env] = vars.map((v) => ({
        key: v.key,
        value: partial ? partialValue(v.value) : v.value,
      }));
    }

    return JSON.stringify(output, null, 2);
  }

  // Human-readable format
  const lines: string[] = [];

  for (const [env, vars] of Object.entries(variables)) {
    lines.push(`[${env}]`);

    for (const v of vars) {
      const displayValue = partial ? partialValue(v.value) : v.value;
      lines.push(`${v.key}=${displayValue}`);
    }

    lines.push(""); // Empty line between environments
  }

  // Remove trailing empty line
  if (lines[lines.length - 1] === "") {
    lines.pop();
  }

  return lines.join("\n");
}

export function formatVariablesList(
  variables: Variable[],
  json: boolean,
  partial: boolean
): string {
  if (json) {
    return JSON.stringify(
      variables.map((v) => ({
        key: v.key,
        value: partial ? partialValue(v.value) : v.value,
      })),
      null,
      2
    );
  }

  // Human-readable format
  return variables
    .map((v) => {
      const displayValue = partial ? partialValue(v.value) : v.value;
      return `${v.key}=${displayValue}`;
    })
    .join("\n");
}
