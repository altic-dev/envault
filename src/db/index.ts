import { Database } from "bun:sqlite";
import { chmod } from "node:fs/promises";
import { createSchema } from "./schema.ts";
import type { Project, Variable } from "./types.ts";

export class EnvaultDB {
  private db: Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath, { create: true });
    this.ensureSchema();
    this.setPermissions();
  }

  private ensureSchema(): void {
    createSchema(this.db);
  }

  private async setPermissions(): Promise<void> {
    try {
      await chmod(this.db.filename, 0o600);
    } catch (error) {
      // Permissions might fail on some systems, but we'll continue
      console.error("Warning: Could not set database file permissions:", error);
    }
  }

  // Project operations
  ensureProject(path: string, name: string): number {
    // Try to get existing project
    const existing = this.findProjectByPath(path);
    if (existing) {
      return existing.id;
    }

    // Insert new project
    const result = this.db.run(
      "INSERT INTO projects (path, name) VALUES (?, ?)",
      [path, name]
    );
    return result.lastInsertRowid as number;
  }

  listProjects(): Project[] {
    const query = this.db.query<Project, []>("SELECT * FROM projects ORDER BY name");
    return query.all();
  }

  findProjectByName(name: string): Project[] {
    const query = this.db.query<Project, [string]>(
      "SELECT * FROM projects WHERE name = ? ORDER BY path"
    );
    return query.all(name);
  }

  findProjectByPath(path: string): Project | null {
    const query = this.db.query<Project, [string]>(
      "SELECT * FROM projects WHERE path = ?"
    );
    return query.get(path) ?? null;
  }

  // Variable operations
  addVariable(projectId: number, env: string, key: string, value: string): void {
    this.db.run(
      "INSERT INTO variables (project_id, environment, key, value) VALUES (?, ?, ?, ?)",
      [projectId, env, key, value]
    );
  }

  updateVariable(projectId: number, env: string, key: string, value: string): void {
    this.db.run(
      "UPDATE variables SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE project_id = ? AND environment = ? AND key = ?",
      [value, projectId, env, key]
    );
  }

  upsertVariable(projectId: number, env: string, key: string, value: string): void {
    this.db.run(
      `INSERT INTO variables (project_id, environment, key, value)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(project_id, environment, key)
       DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
      [projectId, env, key, value]
    );
  }

  getVariable(projectId: number, env: string, key: string): string | null {
    const query = this.db.query<{ value: string }, [number, string, string]>(
      "SELECT value FROM variables WHERE project_id = ? AND environment = ? AND key = ?"
    );
    const result = query.get(projectId, env, key);
    return result?.value ?? null;
  }

  listVariables(projectId: number, env?: string): Variable[] {
    if (env) {
      const query = this.db.query<Variable, [number, string]>(
        "SELECT * FROM variables WHERE project_id = ? AND environment = ? ORDER BY key"
      );
      return query.all(projectId, env);
    } else {
      const query = this.db.query<Variable, [number]>(
        "SELECT * FROM variables WHERE project_id = ? ORDER BY environment, key"
      );
      return query.all(projectId);
    }
  }

  listEnvironments(projectId: number): string[] {
    const query = this.db.query<{ environment: string }, [number]>(
      "SELECT DISTINCT environment FROM variables WHERE project_id = ? ORDER BY environment"
    );
    const envs = query.all(projectId).map((r) => r.environment);

    envs.sort((a, b) => {
      if (a === "default") return -1;
      if (b === "default") return 1;
      return a.localeCompare(b);
    });

    return envs;
  }

  deleteVariable(projectId: number, env: string, key: string): boolean {
    const result = this.db.run(
      "DELETE FROM variables WHERE project_id = ? AND environment = ? AND key = ?",
      [projectId, env, key]
    );
    return result.changes > 0;
  }

  // Sync operations
  syncVariables(projectId: number, env: string, vars: Record<string, string>): void {
    // Use upsert for each variable
    for (const [key, value] of Object.entries(vars)) {
      this.upsertVariable(projectId, env, key, value);
    }
  }

  close(): void {
    this.db.close();
  }
}
