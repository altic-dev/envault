import { mkdir, mkdtemp } from "node:fs/promises";
import { join } from "node:path";

export async function makeTempDir(prefix: string = "envault-test-"): Promise<string> {
  // Tests run in a sandbox that may not allow writing to OS temp directories.
  // Keep temp test data inside the workspace to avoid EPERM failures.
  const base = join(process.cwd(), ".tmp-tests");
  await mkdir(base, { recursive: true });
  return await mkdtemp(join(base, prefix));
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

