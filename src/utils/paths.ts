import { join } from "node:path";
import { mkdir } from "node:fs/promises";

export function getEnvaultHome(): string {
  const home = Bun.env.HOME;
  if (!home) {
    throw new Error("HOME environment variable not set");
  }
  return join(home, ".envault");
}

export function getDbPath(): string {
  return join(getEnvaultHome(), "envault.db");
}

export async function ensureEnvaultDir(): Promise<void> {
  const dir = getEnvaultHome();
  await mkdir(dir, { recursive: true, mode: 0o700 });
}
