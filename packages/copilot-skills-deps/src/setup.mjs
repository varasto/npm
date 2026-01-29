/**
 * Setup command - Configure npm auth for private packages
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Configure npm auth for GitHub Packages
 * 
 * SECURITY: This stores the .npmrc file in the user's home directory (~/.npmrc)
 * NOT in the repository. This prevents tokens from being committed to git.
 * 
 * @returns {boolean} - True if successful
 */
export function setup() {
  const home = process.env.HOME || process.env.USERPROFILE;
  const npmrcPath = join(home, ".npmrc"); // User home, NOT repo root

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
 * Write npmrc configuration to user home directory (NOT in repo for security)
 * @param {string} npmrcPath - Path to .npmrc in user home directory
 * @param {string} token - GitHub token
 * @returns {boolean} - True if successful
 */
function configureNpmrc(npmrcPath, token) {
  try {
    const content = existsSync(npmrcPath)
      ? readFileSync(npmrcPath, "utf8")
      : "";

    // Define the configuration lines we want to add
    const registryLine = "@varasto:registry=https://npm.pkg.github.com";
    const authTokenPrefix = "//npm.pkg.github.com/:_authToken=";
    const authTokenLine = authTokenPrefix + token;

    // Split into lines and process
    const lines = content.split("\n").filter(line => line.length > 0 || content.length === 0);
    
    // Check if registry line exists
    let hasRegistry = false;
    let tokenIndex = -1;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i] === registryLine) {
        hasRegistry = true;
      }
      if (lines[i].startsWith(authTokenPrefix)) {
        tokenIndex = i;
      }
    }
    
    // Add registry if missing
    if (!hasRegistry) {
      lines.push(registryLine);
    }
    
    // Update or add auth token
    if (tokenIndex >= 0) {
      lines[tokenIndex] = authTokenLine;
    } else {
      lines.push(authTokenLine);
    }
    
    // Write back
    const newContent = lines.join("\n") + "\n";
    writeFileSync(npmrcPath, newContent);
    console.log("✓ npm auth configured in ~/.npmrc");

    return true;
  } catch (error) {
    console.error(`Error configuring npm auth: ${error.message}`);
    return false;
  }
}
