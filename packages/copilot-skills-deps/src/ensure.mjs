/**
 * Ensure command - Smart install/update (install if missing, update if stale)
 */

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { isMarkerStale, touchMarker } from "./marker.mjs";
import { setup } from "./setup.mjs";

/**
 * Check if an error message indicates a registry/authentication issue
 * that would benefit from running the setup command.
 * @param {string} message - Error message to check
 * @returns {boolean} - True if it's a registry/auth error
 */
export function isRegistryError(message) {
  const errorMessage = message.toLowerCase();
  return (
    errorMessage.includes("e404") ||
    errorMessage.includes("e401") ||
    errorMessage.includes("e403") ||
    errorMessage.includes("unauthorized") ||
    errorMessage.includes("forbidden") ||
    errorMessage.includes("@varasto")
  );
}

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
    // Check for registry/authentication errors
    if (isRegistryError(error.message)) {
      console.log("\n⚠️  Detected registry access issue. Running setup automatically...\n");
      
      try {
        // Configure npm for GitHub Packages using the local setup() implementation
        const setupOk = setup();
        if (!setupOk) {
          console.error("\n❌ Error: Failed to configure npm for GitHub Packages.");
          console.error("Please check your GitHub authentication and try again.\n");
          return false;
        }
        
        console.log("\n✓ Setup complete. Retrying installation...\n");
        
        try {
          // Retry the install/update
          if (needsInstall) {
            execSync("npm install", { cwd: dir, stdio: "inherit" });
          } else {
            execSync("npm update", { cwd: dir, stdio: "inherit" });
          }
        } catch (retryError) {
          console.error("\n❌ Error: Install/update failed after setup.");
          console.error(`Details: ${retryError.message}`);
          return false;
        }
        
        touchMarker(dir);
        console.log("✓ Dependencies ready");
        return true;
      } catch (setupError) {
        console.error("\n❌ Error: Failed to configure npm or install dependencies.");
        console.error("Please check your GitHub authentication and try again.\n");
        console.error(`Details: ${setupError.message}`);
        return false;
      }
    } else {
      console.error(`Error: ${error.message}`);
    }
    return false;
  }
}
