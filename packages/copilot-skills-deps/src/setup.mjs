/**
 * Setup command - Configure npm auth for private packages
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { findRepoRoot, ensureGitignore } from "./utils.mjs";

/**
 * Configure npm auth for GitHub Packages
 * @returns {boolean} - True if successful
 */
export function setup() {
  const home = process.env.HOME || process.env.USERPROFILE;
  const npmrcPath = join(home, ".npmrc");

  // Check if already configured
  if (existsSync(npmrcPath)) {
    const content = readFileSync(npmrcPath, "utf8");
    if (content.includes("//npm.pkg.github.com/:_authToken")) {
      console.log("✓ npm auth already configured");
      
      // Still ensure .gitignore is updated
      const repoRoot = findRepoRoot(process.cwd());
      if (repoRoot) {
        ensureGitignore(repoRoot, [".npmrc"]);
      }
      
      return true;
    }
  }

  // Get GitHub token
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  
  if (!token) {
    // Try to get from gh CLI
    try {
      const ghToken = execSync("gh auth token", { encoding: "utf8" }).trim();
      if (ghToken) {
        return configureNpmrc(npmrcPath, ghToken);
      }
    } catch {
      // gh CLI not available or not logged in
    }

    console.error("Error: No GitHub token found");
    console.error("Set GITHUB_TOKEN environment variable or run 'gh auth login'");
    return false;
  }

  return configureNpmrc(npmrcPath, token);
}

/**
 * Write npmrc configuration
 * @param {string} npmrcPath - Path to .npmrc
 * @param {string} token - GitHub token
 * @returns {boolean} - True if successful
 */
function configureNpmrc(npmrcPath, token) {
  try {
    const existing = existsSync(npmrcPath)
      ? readFileSync(npmrcPath, "utf8")
      : "";

    const lines = [
      "@varasto:registry=https://npm.pkg.github.com",
      "//npm.pkg.github.com/:_authToken=" + token,
    ];

    const newContent = existing.trimEnd() + "\n" + lines.join("\n") + "\n";
    writeFileSync(npmrcPath, newContent);
    console.log("✓ npm auth configured in ~/.npmrc");

    // Update .gitignore
    const repoRoot = findRepoRoot(process.cwd());
    if (repoRoot) {
      ensureGitignore(repoRoot, [".npmrc"]);
    }

    return true;
  } catch (error) {
    console.error(`Error configuring npm auth: ${error.message}`);
    return false;
  }
}
