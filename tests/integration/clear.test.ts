import { test, expect } from "bun:test";
import { mkdir, readFile, realpath } from "node:fs/promises";
import { join } from "node:path";

import { EnvaultDB } from "../../src/db/index.ts";
import { variable } from "../../src/cli/commands/var.ts";
import { makeTempDir, makeGitRepo, withCwd } from "../helpers/setup.ts";

async function captureConsoleLog(fn: () => Promise<void>): Promise<string[]> {
  const lines: string[] = [];
  const original = console.log;
  console.log = (...args: unknown[]) => {
    lines.push(args.map((a) => String(a)).join(" "));
  };

  try {
    await fn();
  } finally {
    console.log = original;
  }

  return lines;
}

test("var clear: clears all envs for current repo and rewrites .env files", async () => {
  const base = await makeTempDir();
  const repoDir = join(base, "app");
  await mkdir(repoDir, { recursive: true });
  await makeGitRepo(repoDir);
  const repo = await realpath(repoDir);

  const db = new EnvaultDB(join(base, "envault.db"));
  try {
    const projectId = db.ensureProject(repo, "app");
    db.upsertVariable(projectId, "default", "A", "1");
    db.upsertVariable(projectId, "prod", "B", "2");

    const logs = await withCwd(repo, async () => {
      return await captureConsoleLog(async () => {
        await variable({ command: "var", args: ["clear"], flags: { yes: true } }, db);
      });
    });

    expect(logs.join("\n")).toContain("Removed");
    expect(db.listVariables(projectId).length).toBe(0);

    // Files are rewritten to empty content
    expect(await readFile(join(repo, ".env"), "utf-8")).toBe("");
    expect(await readFile(join(repo, ".env.prod"), "utf-8")).toBe("");
  } finally {
    db.close();
  }
});

test("var clear: clears variables for a named project without requiring git cwd", async () => {
  const base = await makeTempDir();
  const backendDir = join(base, "backend");
  await mkdir(backendDir, { recursive: true });
  await makeGitRepo(backendDir);
  const backend = await realpath(backendDir);

  const db = new EnvaultDB(join(base, "envault.db"));
  try {
    const backendId = db.ensureProject(backend, "backend");
    db.upsertVariable(backendId, "default", "X", "y");
    db.upsertVariable(backendId, "dev", "Z", "w");

    const logs = await captureConsoleLog(async () => {
      await variable(
        { command: "var", args: ["clear"], flags: { project: "backend", yes: true } },
        db
      );
    });

    expect(db.listVariables(backendId).length).toBe(0);
    expect(logs.join("\n")).toContain("Note: To update .env files");
  } finally {
    db.close();
  }
});


