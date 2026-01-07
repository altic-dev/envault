import { test, expect } from "bun:test";
import { mkdir, realpath } from "node:fs/promises";
import { join } from "node:path";

import { EnvaultDB } from "../../src/db/index.ts";
import { envs } from "../../src/cli/commands/envs.ts";
import { makeTempDir, makeGitRepo, withCwd } from "../helpers/setup.ts";

function makeArgs(flags?: { project?: string; json?: boolean }) {
  return {
    command: "envs",
    args: [],
    flags: flags ?? {},
  };
}

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

test("envs: lists envs for current repo", async () => {
  const base = await makeTempDir();
  const repoDir = join(base, "app");
  await mkdir(repoDir, { recursive: true });
  await makeGitRepo(repoDir);
  const repo = await realpath(repoDir);

  const db = new EnvaultDB(join(base, "envault.db"));
  try {
    const projectId = db.ensureProject(repo, "app");
    db.upsertVariable(projectId, "default", "A", "1");
    db.upsertVariable(projectId, "local", "B", "2");
    db.upsertVariable(projectId, "prod", "C", "3");

    const logs = await withCwd(repo, async () => {
      return await captureConsoleLog(async () => {
        await envs(makeArgs(), db);
      });
    });

    expect(logs[0]).toBe(["default", "local", "prod"].join("\n"));
  } finally {
    db.close();
  }
});

test("envs: lists envs for named project", async () => {
  const base = await makeTempDir();
  const backendDir = join(base, "backend");
  await mkdir(backendDir, { recursive: true });
  await makeGitRepo(backendDir);
  const backend = await realpath(backendDir);

  const db = new EnvaultDB(join(base, "envault.db"));
  try {
    const backendId = db.ensureProject(backend, "backend");
    db.upsertVariable(backendId, "dev", "X", "y");

    const logs = await captureConsoleLog(async () => {
      await envs(makeArgs({ project: "backend" }), db);
    });

    expect(logs[0]).toBe("dev");
  } finally {
    db.close();
  }
});

test("envs: json output", async () => {
  const base = await makeTempDir();
  const repoDir = join(base, "app");
  await mkdir(repoDir, { recursive: true });
  await makeGitRepo(repoDir);
  const repo = await realpath(repoDir);

  const db = new EnvaultDB(join(base, "envault.db"));
  try {
    const projectId = db.ensureProject(repo, "app");
    db.upsertVariable(projectId, "default", "A", "1");
    db.upsertVariable(projectId, "local", "B", "2");
    db.upsertVariable(projectId, "prod", "C", "3");

    const logs = await withCwd(repo, async () => {
      return await captureConsoleLog(async () => {
        await envs(makeArgs({ json: true }), db);
      });
    });

    const parsed = JSON.parse(logs[0]!);
    expect(parsed).toEqual(["default", "local", "prod"]);
  } finally {
    db.close();
  }
});

