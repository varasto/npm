/**
 * Status command - Show dependency status and diagnostics
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { getMarkerPath, isMarkerStale } from "./marker.mjs";
import { findRepoRoot } from "./utils.mjs";

/**
 * Format a duration in human-readable form
 * @param {number} ms - Milliseconds
 * @returns {string} - Human-readable duration
 */
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  return `${seconds} second${seconds !== 1 ? "s" : ""} ago`;
}

/**
 * Check if npm auth is configured
 * @returns {{ configured: boolean, registry: string | null }}
 */
function checkNpmAuth() {
  const home = process.env.HOME || process.env.USERPROFILE;
  const npmrcPath = join(home, ".npmrc");

  if (!existsSync(npmrcPath)) {
    return { configured: false, registry: null };
  }

  try {
    const content = readFileSync(npmrcPath, "utf-8");
    const hasGitHubRegistry = content.includes("npm.pkg.github.com");
    const hasAuthToken = content.includes("//npm.pkg.github.com/:_authToken");
    
    return {
      configured: hasGitHubRegistry && hasAuthToken,
      registry: hasGitHubRegistry ? "npm.pkg.github.com" : null,
    };
  } catch {
    return { configured: false, registry: null };
  }
}

/**
 * Get installed package versions from node_modules
 * @param {string} dir - Directory containing node_modules
 * @returns {Map<string, string>} - Package name to version map
 */
function getInstalledVersions(dir) {
  const nodeModules = join(dir, "node_modules");
  const versions = new Map();

  if (!existsSync(nodeModules)) {
    return versions;
  }

  const packageJson = join(dir, "package.json");
  if (!existsSync(packageJson)) {
    return versions;
  }

  try {
    const pkg = JSON.parse(readFileSync(packageJson, "utf-8"));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    for (const name of Object.keys(deps)) {
      // Handle scoped packages
      const parts = name.split("/");
      const pkgPath = parts.length === 2
        ? join(nodeModules, parts[0], parts[1], "package.json")
        : join(nodeModules, name, "package.json");

      if (existsSync(pkgPath)) {
        const installedPkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
        versions.set(name, installedPkg.version);
      }
    }
  } catch {
    // Ignore errors
  }

  return versions;
}

/**
 * Show status for a specific skill
 * @param {string} packageJsonPath - Path to package.json
 */
function showSkillStatus(packageJsonPath) {
  const absPath = resolve(packageJsonPath);
  const dir = dirname(absPath);

  if (!existsSync(absPath)) {
    console.log(`\n❌ Package not found: ${absPath}`);
    return;
  }

  console.log(`\n📦 Skill: ${absPath}`);

  // Check marker status
  const markerPath = getMarkerPath(dir);
  if (existsSync(markerPath)) {
    const stat = statSync(markerPath);
    const age = Date.now() - stat.mtimeMs;
    const stale = isMarkerStale(dir, 7);
    console.log(`   Marker: ${formatDuration(age)} ${stale ? "⚠️ (stale)" : "✓"}`);
  } else {
    console.log(`   Marker: not found (never installed)`);
  }

  // Check node_modules
  const nodeModules = join(dir, "node_modules");
  if (existsSync(nodeModules)) {
    const versions = getInstalledVersions(dir);
    if (versions.size > 0) {
      console.log(`   Installed packages:`);
      for (const [name, version] of versions) {
        console.log(`     - ${name}@${version}`);
      }
    } else {
      console.log(`   node_modules exists but no packages tracked`);
    }
  } else {
    console.log(`   node_modules: not found (not installed)`);
  }
}

/**
 * Find and show status for all skills
 */
function showAllSkillsStatus() {
  const repoRoot = findRepoRoot(process.cwd());
  
  if (!repoRoot) {
    console.log("Could not find repository root (no .git directory found)");
    return;
  }

  const skillsDir = join(repoRoot, "skills");
  if (!existsSync(skillsDir)) {
    console.log("No skills directory found");
    return;
  }

  const entries = readdirSync(skillsDir, { withFileTypes: true });
  
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    
    const skillDir = join(skillsDir, entry.name);
    const scriptsPackageJson = join(skillDir, "scripts", "package.json");
    const rootPackageJson = join(skillDir, "package.json");
    
    if (existsSync(scriptsPackageJson)) {
      showSkillStatus(scriptsPackageJson);
    } else if (existsSync(rootPackageJson)) {
      showSkillStatus(rootPackageJson);
    }
  }
}

/**
 * Show dependency status and diagnostics
 * @param {string} [packageJsonPath] - Optional path to specific package.json
 * @returns {boolean} - Always true (informational command)
 */
export function status(packageJsonPath) {
  console.log("=== copilot-skills-deps status ===\n");

  // Check npm auth
  const auth = checkNpmAuth();
  console.log("🔐 NPM Auth:");
  console.log(`   GitHub Packages: ${auth.configured ? "✓ configured" : "✗ not configured"}`);
  if (auth.registry) {
    console.log(`   Registry: ${auth.registry}`);
  }

  // Show skill status
  if (packageJsonPath) {
    showSkillStatus(packageJsonPath);
  } else {
    showAllSkillsStatus();
  }

  console.log("");
  return true;
}
