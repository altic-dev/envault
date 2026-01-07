import type { EnvaultDB } from "../../db/index.ts";
import { write as writeEnv, getEnvFileName } from "../../parser/dotenv.ts";
import { join } from "node:path";
import { writeFile } from "node:fs/promises";

export async function writeEnvFile(
  db: EnvaultDB,
  projectId: number,
  gitRoot: string,
  environment: string
): Promise<void> {
  const variables = db.listVariables(projectId, environment);

  const varsRecord: Record<string, string> = {};
  for (const v of variables) {
    varsRecord[v.key] = v.value;
  }

  const content = writeEnv(varsRecord);
  const fileName = getEnvFileName(environment);
  const filePath = join(gitRoot, fileName);

  await writeFile(filePath, content, { mode: 0o644 });
}
