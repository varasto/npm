/**
 * Marker file management for dependency freshness tracking
 */

import fs from "node:fs";
import path from "node:path";

const MARKER_NAME = ".skill-update-check";

/**
 * Get the marker file path for a given scripts directory
 * @param {string} scriptsDir - Directory containing node_modules
 * @returns {string} Path to marker file
 */
export function getMarkerPath(scriptsDir) {
  return path.join(scriptsDir, "node_modules", MARKER_NAME);
}

/**
 * Check if marker is stale or missing
 * @param {string} scriptsDir - Directory containing node_modules
 * @param {number} maxAgeDays - Days before considered stale
 * @returns {boolean} True if stale or missing
 */
export function isMarkerStale(scriptsDir, maxAgeDays = 7) {
  const markerPath = path.join(scriptsDir, "node_modules", MARKER_NAME);

  if (!fs.existsSync(markerPath)) {
    return true;
  }

  try {
    const content = fs.readFileSync(markerPath, "utf8").trim();
    const markerDate = new Date(content);

    if (isNaN(markerDate.getTime())) {
      return true;
    }

    const ageDays = (Date.now() - markerDate.getTime()) / (1000 * 60 * 60 * 24);
    return ageDays > maxAgeDays;
  } catch {
    return true;
  }
}

/**
 * Create or update marker with current timestamp
 * @param {string} scriptsDir - Directory containing node_modules
 * @returns {boolean} True if written successfully
 */
export function touchMarker(scriptsDir) {
  const nodeModules = path.join(scriptsDir, "node_modules");

  if (!fs.existsSync(nodeModules)) {
    return false;
  }

  try {
    const markerPath = path.join(nodeModules, MARKER_NAME);
    fs.writeFileSync(markerPath, new Date().toISOString());
    return true;
  } catch {
    return false;
  }
}
