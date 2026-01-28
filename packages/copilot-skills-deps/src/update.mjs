/**
 * Update command - Force update dependencies (ignore marker)
 */

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { touchMarker } from "./marker.mjs";

/**
 * Force update npm dependencies for a skill
 * @param {string} packageJsonPath - Path to package.json
 * @returns {boolean} - True if successful
 */
export function update(packageJsonPath) {
  const absPath = resolve(packageJsonPath);
  
  if (!existsSync(absPath)) {
    console.error(`Error: package.json not found at ${absPath}`);
    return false;
  }

  const dir = dirname(absPath);
  
  try {
    console.log(`Updating dependencies in ${dir}...`);
    execSync("npm update", {
      cwd: dir,
      stdio: "inherit",
    });
    
    // Touch marker to track update time
    touchMarker(dir);
    console.log("✓ Dependencies updated successfully");
    return true;
  } catch (error) {
    console.error(`Error updating dependencies: ${error.message}`);
    return false;
  }
}
