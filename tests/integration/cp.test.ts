import { test, expect } from "bun:test";
import { mkdir, realpath } from "node:fs/promises";
import { join } from "node:path";

import { EnvaultDB } from "../../src/db/index.ts";
import { copyFromProjectToCurrent } from "../../src/cli/lib/copy.ts";
import { parse as parseDotenv, getEnvFileName } from "../../src/parser/dotenv.ts";
import { makeTempDir, makeGitRepo, withCwd } from "../helpers/setup.ts";

function makeArgs(flags?: {
  env?: string;
  toEnv?: string;
  all?: boolean;
}) {
  return {
    command: "cp",
    args: [],
    flags: flags ?? {},
  };
}

test("cp: copy single variable into current repo", async () => {
  const base = await makeTempDir();
  const backendDir = join(base, "backend");
  const frontendDir = join(base, "frontend");
  await mkdir(backendDir, { recursive: true });
  await mkdir(frontendDir, { recursive: true });
  await makeGitRepo(backendDir);
  await makeGitRepo(frontendDir);
  const backend = await realpath(backendDir);
  const frontend = await realpath(frontendDir);

  const db = new EnvaultDB(join(base, "envault.db"));
  try {
    const sourceId = db.ensureProject(backend, "backend");
    db.upsertVariable(sourceId, "default", "DATABASE_URL", "postgres://localhost:5432/app");

    await withCwd(frontend, async () => {
      await copyFromProjectToCurrent(makeArgs(), db, "backend", {
        key: "DATABASE_URL",
        copyAll: false,
        confirmFn: async () => true,
      });
    });

    const targetProject = db.findProjectByPath(frontend);
    expect(targetProject).not.toBeNull();

    const dbValue = db.getVariable(targetProject!.id, "default", "DATABASE_URL");
    expect(dbValue).toBe("postgres://localhost:5432/app");

    const envPath = join(frontend, getEnvFileName("default"));
    const envContent = await Bun.file(envPath).text();
    const parsed = parseDotenv(envContent);
    expect(parsed.variables.DATABASE_URL).toBe("postgres://localhost:5432/app");
  } finally {
    db.close();
  }
});

test("cp: copy all variables", async () => {
  const base = await makeTempDir();
  const backendDir = join(base, "backend");
  const frontendDir = join(base, "frontend");
  await mkdir(backendDir, { recursive: true });
  await mkdir(frontendDir, { recursive: true });
  await makeGitRepo(backendDir);
  await makeGitRepo(frontendDir);
  const backend = await realpath(backendDir);
  const frontend = await realpath(frontendDir);

  const db = new EnvaultDB(join(base, "envault.db"));
  try {
    const sourceId = db.ensureProject(backend, "backend");
    db.upsertVariable(sourceId, "default", "A", "1");
    db.upsertVariable(sourceId, "default", "B", "two");

    await withCwd(frontend, async () => {
      await copyFromProjectToCurrent(makeArgs(), db, "backend", {
        copyAll: true,
        confirmFn: async () => true,
      });
    });

    const targetProject = db.findProjectByPath(frontend)!;
    expect(db.getVariable(targetProject.id, "default", "A")).toBe("1");
    expect(db.getVariable(targetProject.id, "default", "B")).toBe("two");

    const envPath = join(frontend, getEnvFileName("default"));
    const envContent = await Bun.file(envPath).text();
    const parsed = parseDotenv(envContent);
    expect(parsed.variables.A).toBe("1");
    expect(parsed.variables.B).toBe("two");
  } finally {
    db.close();
  }
});

test("cp: copy all variables (all environments by default)", async () => {
  const base = await makeTempDir();
  const backendDir = join(base, "backend");
  const frontendDir = join(base, "frontend");
  await mkdir(backendDir, { recursive: true });
  await mkdir(frontendDir, { recursive: true });
  await makeGitRepo(backendDir);
  await makeGitRepo(frontendDir);
  const backend = await realpath(backendDir);
  const frontend = await realpath(frontendDir);

  const db = new EnvaultDB(join(base, "envault.db"));
  try {
    const sourceId = db.ensureProject(backend, "backend");
    db.upsertVariable(sourceId, "default", "A", "1");
    db.upsertVariable(sourceId, "local", "LOCAL_ONLY", "yes");

    await withCwd(frontend, async () => {
      await copyFromProjectToCurrent(makeArgs(), db, "backend", {
        copyAll: true,
        confirmFn: async () => true,
      });
    });

    const targetProject = db.findProjectByPath(frontend)!;
    expect(db.getVariable(targetProject.id, "default", "A")).toBe("1");
    expect(db.getVariable(targetProject.id, "local", "LOCAL_ONLY")).toBe("yes");

    const defaultEnvPath = join(frontend, getEnvFileName("default"));
    const defaultEnvContent = await Bun.file(defaultEnvPath).text();
    const defaultParsed = parseDotenv(defaultEnvContent);
    expect(defaultParsed.variables.A).toBe("1");

    const localEnvPath = join(frontend, getEnvFileName("local"));
    const localEnvContent = await Bun.file(localEnvPath).text();
    const localParsed = parseDotenv(localEnvContent);
    expect(localParsed.variables.LOCAL_ONLY).toBe("yes");
  } finally {
    db.close();
  }
});

test("cp: conflict behavior (copy all) skips when confirm=false", async () => {
  const base = await makeTempDir();
  const backendDir = join(base, "backend");
  const frontendDir = join(base, "frontend");
  await mkdir(backendDir, { recursive: true });
  await mkdir(frontendDir, { recursive: true });
  await makeGitRepo(backendDir);
  await makeGitRepo(frontendDir);
  const backend = await realpath(backendDir);
  const frontend = await realpath(frontendDir);

  const db = new EnvaultDB(join(base, "envault.db"));
  try {
    const sourceId = db.ensureProject(backend, "backend");
    db.upsertVariable(sourceId, "default", "CONFLICT", "new");

    const targetId = db.ensureProject(frontend, "frontend");
    db.upsertVariable(targetId, "default", "CONFLICT", "old");

    await withCwd(frontend, async () => {
      await copyFromProjectToCurrent(makeArgs(), db, "backend", {
        copyAll: true,
        confirmFn: async () => false,
      });
    });

    expect(db.getVariable(targetId, "default", "CONFLICT")).toBe("old");

    const envPath = join(frontend, getEnvFileName("default"));
    const envContent = await Bun.file(envPath).text();
    const parsed = parseDotenv(envContent);
    expect(parsed.variables.CONFLICT).toBe("old");
  } finally {
    db.close();
  }
});

test("cp: conflict behavior (single key) exits when confirm=false", async () => {
  const base = await makeTempDir();
  const backendDir = join(base, "backend");
  const frontendDir = join(base, "frontend");
  await mkdir(backendDir, { recursive: true });
  await mkdir(frontendDir, { recursive: true });
  await makeGitRepo(backendDir);
  await makeGitRepo(frontendDir);
  const backend = await realpath(backendDir);
  const frontend = await realpath(frontendDir);

  const db = new EnvaultDB(join(base, "envault.db"));
  try {
    const sourceId = db.ensureProject(backend, "backend");
    db.upsertVariable(sourceId, "default", "CONFLICT", "new");

    const targetId = db.ensureProject(frontend, "frontend");
    db.upsertVariable(targetId, "default", "CONFLICT", "old");

    const originalExit = process.exit;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (process as any).exit = (code?: number) => {
      throw new Error(`EXIT:${code ?? 0}`);
    };

    try {
      await expect(
        withCwd(frontend, async () => {
          await copyFromProjectToCurrent(makeArgs(), db, "backend", {
            key: "CONFLICT",
            copyAll: false,
            confirmFn: async () => false,
          });
        })
      ).rejects.toThrow("EXIT:1");
    } finally {
      process.exit = originalExit;
    }

    expect(db.getVariable(targetId, "default", "CONFLICT")).toBe("old");
  } finally {
    db.close();
  }
});

