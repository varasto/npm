/**
 * Install command - Force install dependencies (no staleness check)
 */

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { touchMarker } from "./marker.mjs";

/**
 * Force install npm dependencies for a skill
 * @param {string} packageJsonPath - Path to package.json
 * @returns {boolean} - True if successful
 */
export function install(packageJsonPath) {
  const absPath = resolve(packageJsonPath);
  
  if (!existsSync(absPath)) {
    console.error(`Error: package.json not found at ${absPath}`);
    return false;
  }

  const dir = dirname(absPath);
  
  try {
    console.log(`Installing dependencies in ${dir}...`);
    execSync("npm install", {
      cwd: dir,
      stdio: "inherit",
    });
    
    // Touch marker to track install time
    touchMarker(dir);
    console.log("✓ Dependencies installed successfully");
    return true;
  } catch (error) {
    console.error(`Error installing dependencies: ${error.message}`);
    return false;
  }
}
