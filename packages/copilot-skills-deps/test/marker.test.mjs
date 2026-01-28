/**
 * Unit tests for marker.mjs
 */

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { getMarkerPath, isMarkerStale, touchMarker } from "../src/marker.mjs";

describe("marker", () => {
  let tempDir;
  let nodeModulesDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "marker-test-"));
    nodeModulesDir = path.join(tempDir, "node_modules");
    fs.mkdirSync(nodeModulesDir);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe("getMarkerPath", () => {
    it("should return path inside node_modules", () => {
      const result = getMarkerPath(tempDir);
      assert.ok(result.includes("node_modules"));
      assert.ok(result.endsWith(".skill-update-check"));
    });
  });

  describe("isMarkerStale", () => {
    it("should return true when marker does not exist", () => {
      assert.strictEqual(isMarkerStale(tempDir), true);
    });

    it("should return false when marker is fresh", () => {
      const markerPath = getMarkerPath(tempDir);
      fs.writeFileSync(markerPath, new Date().toISOString());
      assert.strictEqual(isMarkerStale(tempDir), false);
    });

    it("should return true when marker is old", () => {
      const markerPath = getMarkerPath(tempDir);
      const oldDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      fs.writeFileSync(markerPath, oldDate.toISOString());
      assert.strictEqual(isMarkerStale(tempDir, 7), true);
    });

    it("should respect custom maxAgeDays", () => {
      const markerPath = getMarkerPath(tempDir);
      const date = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
      fs.writeFileSync(markerPath, date.toISOString());
      assert.strictEqual(isMarkerStale(tempDir, 7), false);
      assert.strictEqual(isMarkerStale(tempDir, 3), true);
    });

    it("should return true for invalid date content", () => {
      const markerPath = getMarkerPath(tempDir);
      fs.writeFileSync(markerPath, "not-a-date");
      assert.strictEqual(isMarkerStale(tempDir), true);
    });
  });

  describe("touchMarker", () => {
    it("should create marker file when node_modules exists", () => {
      const result = touchMarker(tempDir);
      assert.strictEqual(result, true);
      const markerPath = getMarkerPath(tempDir);
      assert.ok(fs.existsSync(markerPath));
    });

    it("should update marker content with valid ISO date", () => {
      touchMarker(tempDir);
      const markerPath = getMarkerPath(tempDir);
      const content = fs.readFileSync(markerPath, "utf8");
      assert.ok(!isNaN(new Date(content).getTime()));
    });

    it("should return false when node_modules does not exist", () => {
      fs.rmSync(nodeModulesDir, { recursive: true });
      const result = touchMarker(tempDir);
      assert.strictEqual(result, false);
    });
  });
});
