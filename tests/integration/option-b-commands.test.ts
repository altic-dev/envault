import { test, expect } from "bun:test";
import { mkdir, realpath } from "node:fs/promises";
import { join } from "node:path";

import { EnvaultDB } from "../../src/db/index.ts";
import { project } from "../../src/cli/commands/project.ts";
import { env } from "../../src/cli/commands/env.ts";
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

test("project list: lists tracked projects", async () => {
  const base = await makeTempDir();
  const repoDir = join(base, "app");
  await mkdir(repoDir, { recursive: true });
  await makeGitRepo(repoDir);
  const repo = await realpath(repoDir);

  const db = new EnvaultDB(join(base, "envault.db"));
  try {
    db.ensureProject(repo, "app");

    const logs = await captureConsoleLog(async () => {
      await project({ command: "project", args: ["list"], flags: {} }, db);
    });

    expect(logs.length).toBe(1);
    expect(logs[0]).toContain("app");
  } finally {
    db.close();
  }
});

test("env list: lists envs for current repo", async () => {
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
        await env({ command: "env", args: ["list"], flags: {} }, db);
      });
    });

    expect(logs[0]).toBe(["default", "prod"].join("\n"));
  } finally {
    db.close();
  }
});

test("var list: defaults to current repo when -p is omitted", async () => {
  const base = await makeTempDir();
  const repoDir = join(base, "app");
  await mkdir(repoDir, { recursive: true });
  await makeGitRepo(repoDir);
  const repo = await realpath(repoDir);

  const db = new EnvaultDB(join(base, "envault.db"));
  try {
    const projectId = db.ensureProject(repo, "app");
    db.upsertVariable(projectId, "default", "A", "1");

    const logs = await withCwd(repo, async () => {
      return await captureConsoleLog(async () => {
        await variable({ command: "var", args: ["list"], flags: {} }, db);
      });
    });

    expect(logs[0]).toContain("[default]");
    expect(logs[0]).toContain("A=");
  } finally {
    db.close();
  }
});


