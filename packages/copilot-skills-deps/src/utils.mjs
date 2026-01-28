/**
 * Shared utilities
 */

import fs from "node:fs";
import path from "node:path";

/**
 * Find repository root by looking for .git directory
 * @param {string} startDir - Directory to start searching from
 * @returns {string|null} Repository root or null
 */
export function findRepoRoot(startDir) {
  let dir = startDir;

  for (let i = 0; i < 20; i++) {
    if (fs.existsSync(path.join(dir, ".git"))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return null;
}

/**
 * Ensure .gitignore contains required patterns
 * @param {string} repoRoot - Repository root path
 * @param {string[]} patterns - Patterns to ensure exist
 */
export function ensureGitignore(repoRoot, patterns = []) {
  const gitignorePath = path.join(repoRoot, ".gitignore");

  const existing = fs.existsSync(gitignorePath)
    ? fs.readFileSync(gitignorePath, "utf8")
    : "";

  const lines = existing.split(/\r?\n/).map((l) => l.trim());
  const missing = patterns.filter((pat) => !lines.includes(pat));

  if (missing.length === 0) {
    console.log("✅ .gitignore OK");
    return;
  }

  fs.writeFileSync(
    gitignorePath,
    existing.trimEnd() + "\n" + missing.join("\n") + "\n"
  );
  console.log(`✅ Added to .gitignore: ${missing.join(", ")}`);
}
