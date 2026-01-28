/**
 * Setup command - Configure npm auth and repo-level .env for skill dependencies
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { findRepoRoot, ensureGitignore } from "./utils.mjs";

/**
 * Patterns that should be in .gitignore
 */
const GITIGNORE_PATTERNS = [
  ".npmrc",
  ".env",
  "**/skills/*/scripts/node_modules",
];

/**
 * Default .env content for skill dependency management
 */
const ENV_SKILL_SECTION = `# Skill dependency management (copilot-skills-deps)
# How often to check for package updates (days). Set to 0 to disable.
SKILL_UPDATE_CHECK_DAYS=7
`;

/**
 * Ensure repo-level .env exists with skill config section
 * @param {string} repoRoot - Repository root path
 */
function ensureEnvFile(repoRoot) {
  const envPath = join(repoRoot, ".env");

  if (existsSync(envPath)) {
    const content = readFileSync(envPath, "utf8");
    if (content.includes("SKILL_UPDATE_CHECK_DAYS")) {
      console.log("\u2713 .env already has skill config");
      return;
    }
    // Append skill config section
    writeFileSync(envPath, content.trimEnd() + "\n\n" + ENV_SKILL_SECTION);
    console.log("\u2713 Added skill config to .env");
  } else {
    // Create new .env
    writeFileSync(envPath, ENV_SKILL_SECTION);
    console.log("\u2713 Created .env with skill config");
  }
}

/**
 * Configure npm auth for GitHub Packages
 * @returns {boolean} - True if successful
 */
export function setup() {
  const home = process.env.HOME || process.env.USERPROFILE;
  const npmrcPath = join(home, ".npmrc");
  const repoRoot = findRepoRoot(process.cwd());

  // Step 1: Update .gitignore
  if (repoRoot) {
    ensureGitignore(repoRoot, GITIGNORE_PATTERNS);
  }

  // Step 2: Ensure .env exists with skill config
  if (repoRoot) {
    ensureEnvFile(repoRoot);
  }

  // Step 3: Check if npm auth already configured
  if (existsSync(npmrcPath)) {
    const content = readFileSync(npmrcPath, "utf8");
    if (content.includes("//npm.pkg.github.com/:_authToken")) {
      console.log("\u2713 npm auth already configured in ~/.npmrc");
      return true;
    }
  }

  // Step 4: Get GitHub token
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
 * Write npmrc configuration to user home directory
 * @param {string} npmrcPath - Path to ~/.npmrc
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
    console.log("\u2713 npm auth configured in ~/.npmrc");

    return true;
  } catch (error) {
    console.error(`Error configuring npm auth: ${error.message}`);
    return false;
  }
}
