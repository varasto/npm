/**
 * Ensure command - Smart install/update (install if missing, update if stale)
 */

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { isMarkerStale, touchMarker } from "./marker.mjs";

/**
 * Ensure npm dependencies are installed and fresh
 * @param {string} packageJsonPath - Path to package.json
 * @param {object} options - Options
 * @param {number} options.maxAgeDays - Days before marker is stale
 * @returns {boolean} - True if successful
 */
export function ensure(packageJsonPath, options = {}) {
  const { maxAgeDays = 7 } = options;
  const absPath = resolve(packageJsonPath);
  
  if (!existsSync(absPath)) {
    console.error(`Error: package.json not found at ${absPath}`);
    return false;
  }

  const dir = dirname(absPath);
  const nodeModules = `${dir}/node_modules`;
  
  // Check if install needed
  const needsInstall = !existsSync(nodeModules);
  const needsUpdate = !needsInstall && isMarkerStale(dir, maxAgeDays);

  if (!needsInstall && !needsUpdate) {
    console.log("✓ Dependencies are up to date");
    return true;
  }

  try {
    if (needsInstall) {
      console.log(`Installing dependencies in ${dir}...`);
      execSync("npm install", { cwd: dir, stdio: "inherit" });
    } else {
      console.log(`Updating dependencies in ${dir}...`);
      execSync("npm update", { cwd: dir, stdio: "inherit" });
    }
    
    touchMarker(dir);
    console.log("✓ Dependencies ready");
    return true;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    return false;
  }
}
