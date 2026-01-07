import { join, dirname, basename } from "node:path";
import { existsSync } from "node:fs";

export function findGitRoot(startPath: string = process.cwd()): string | null {
  let currentPath = startPath;

  while (true) {
    const gitPath = join(currentPath, ".git");

    if (existsSync(gitPath)) {
      return currentPath;
    }

    const parentPath = dirname(currentPath);

    // Reached root directory without finding .git
    if (parentPath === currentPath) {
      return null;
    }

    currentPath = parentPath;
  }
}

export function getProjectName(gitRoot: string): string {
  return basename(gitRoot);
}

export function requireGitRoot(): string {
  const gitRoot = findGitRoot();

  if (!gitRoot) {
    console.error("Error: Not in a git repository\n");
    console.error("Envault requires git for project detection.");
    console.error("Run 'git init' to initialize a repository.");
    process.exit(1);
  }

  return gitRoot;
}
