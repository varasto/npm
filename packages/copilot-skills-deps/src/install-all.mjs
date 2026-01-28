/**
 * Install-all command - Batch install all skills in repo
 */

import { execSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { touchMarker } from "./marker.mjs";
import { findRepoRoot } from "./utils.mjs";

/**
 * Find all skill package.json files in the repo
 * @param {string} repoRoot - Repository root path
 * @returns {string[]} - Array of package.json paths
 */
function findSkillPackageJsons(repoRoot) {
  const skillsDir = join(repoRoot, "skills");
  const packageJsons = [];

  if (!existsSync(skillsDir)) {
    return packageJsons;
  }

  const entries = readdirSync(skillsDir, { withFileTypes: true });
  
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    
    const skillDir = join(skillsDir, entry.name);
    const scriptsPackageJson = join(skillDir, "scripts", "package.json");
    const rootPackageJson = join(skillDir, "package.json");
    
    // Check scripts/package.json first, then root package.json
    if (existsSync(scriptsPackageJson)) {
      packageJsons.push(scriptsPackageJson);
    } else if (existsSync(rootPackageJson)) {
      packageJsons.push(rootPackageJson);
    }
  }

  return packageJsons;
}

/**
 * Install all skills in the repository
 * @returns {boolean} - True if all successful
 */
export function installAll() {
  const repoRoot = findRepoRoot(process.cwd());
  
  if (!repoRoot) {
    console.error("Error: Could not find repository root");
    return false;
  }

  const packageJsons = findSkillPackageJsons(repoRoot);

  if (packageJsons.length === 0) {
    console.log("No skill package.json files found");
    return true;
  }

  console.log(`Found ${packageJsons.length} skill(s) to install`);
  
  let allSucceeded = true;

  for (const packageJsonPath of packageJsons) {
    const dir = dirname(packageJsonPath);
    const skillName = packageJsonPath.replace(repoRoot, "").replace(/^\//, "");
    
    try {
      console.log(`\nInstalling ${skillName}...`);
      execSync("npm install", {
        cwd: dir,
        stdio: "inherit",
      });
      touchMarker(dir);
      console.log(`✓ ${skillName} installed`);
    } catch (error) {
      console.error(`✗ Failed to install ${skillName}: ${error.message}`);
      allSucceeded = false;
    }
  }

  console.log(`\n${allSucceeded ? "✓" : "✗"} Install-all ${allSucceeded ? "completed" : "completed with errors"}`);
  return allSucceeded;
}
