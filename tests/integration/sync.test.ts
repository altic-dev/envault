import { test, expect } from "bun:test";
import { mkdir, realpath, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { EnvaultDB } from "../../src/db/index.ts";
import { sync } from "../../src/cli/commands/sync.ts";
import { parse as parseDotenv, getEnvFileName } from "../../src/parser/dotenv.ts";
import { makeTempDir, makeGitRepo, withCwd } from "../helpers/setup.ts";

function makeArgs(flags?: { from?: string }) {
  return {
    command: "sync",
    args: [],
    flags: flags ?? {},
  };
}

test("sync: default project → store imports .env* into store", async () => {
  const base = await makeTempDir();
  const repoDir = join(base, "app");
  await mkdir(repoDir, { recursive: true });
  await makeGitRepo(repoDir);
  const repo = await realpath(repoDir);

  await writeFile(join(repo, ".env"), "A=1\n", "utf-8");
  await writeFile(join(repo, ".env.prod"), "B=two\n", "utf-8");

  const db = new EnvaultDB(join(base, "envault.db"));
  try {
    await withCwd(repo, async () => {
      await sync(makeArgs(), db);
    });

    const project = db.findProjectByPath(repo);
    expect(project).not.toBeNull();

    expect(db.getVariable(project!.id, "default", "A")).toBe("1");
    expect(db.getVariable(project!.id, "prod", "B")).toBe("two");
  } finally {
    db.close();
  }
});

test("sync: --from store writes .env* files without mutating store", async () => {
  const base = await makeTempDir();
  const repoDir = join(base, "app");
  await mkdir(repoDir, { recursive: true });
  await makeGitRepo(repoDir);
  const repo = await realpath(repoDir);

  const db = new EnvaultDB(join(base, "envault.db"));
  try {
    const projectId = db.ensureProject(repo, "app");
    db.upsertVariable(projectId, "default", "A", "1");
    db.upsertVariable(projectId, "local", "B", "two");

    const before = db.listVariables(projectId).map((v) => `${v.environment}:${v.key}=${v.value}`);

    await withCwd(repo, async () => {
      await sync(makeArgs({ from: "store" }), db);
    });

    const after = db.listVariables(projectId).map((v) => `${v.environment}:${v.key}=${v.value}`);
    expect(after).toEqual(before);

    const defaultPath = join(repo, getEnvFileName("default"));
    const defaultContent = await Bun.file(defaultPath).text();
    const defaultParsed = parseDotenv(defaultContent);
    expect(defaultParsed.variables.A).toBe("1");

    const localPath = join(repo, getEnvFileName("local"));
    const localContent = await Bun.file(localPath).text();
    const localParsed = parseDotenv(localContent);
    expect(localParsed.variables.B).toBe("two");
  } finally {
    db.close();
  }
});


