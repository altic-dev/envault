import { mkdir, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export async function makeTempDir(prefix: string = "envault-test-"): Promise<string> {
  return await mkdtemp(join(tmpdir(), prefix));
}

export async function makeGitRepo(dir: string): Promise<void> {
  await mkdir(join(dir, ".git"), { recursive: true });
}

export async function withCwd<T>(cwd: string, fn: () => Promise<T>): Promise<T> {
  const prev = process.cwd();
  process.chdir(cwd);
  try {
    return await fn();
  } finally {
    process.chdir(prev);
  }
}

