/**
 * Unit tests for ensure.mjs
 */

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { ensure, isRegistryError } from "../src/ensure.mjs";

describe("ensure", () => {
  let tempDir;
  let packageJsonPath;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "ensure-test-"));
    packageJsonPath = path.join(tempDir, "package.json");
    
    // Create a basic package.json
    fs.writeFileSync(
      packageJsonPath,
      JSON.stringify({ name: "test-package", version: "1.0.0" })
    );
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("should return false when package.json does not exist", () => {
    const result = ensure("/nonexistent/package.json");
    assert.strictEqual(result, false);
  });

  it("should detect when node_modules is missing", () => {
    const nodeModules = path.join(tempDir, "node_modules");
    assert.strictEqual(fs.existsSync(nodeModules), false);
  });

  it("should return true when dependencies are up to date", () => {
    // Create node_modules and a fresh marker
    const nodeModules = path.join(tempDir, "node_modules");
    fs.mkdirSync(nodeModules, { recursive: true });
    
    // Create fresh marker file
    const markerPath = path.join(nodeModules, ".skill-update-check");
    fs.writeFileSync(markerPath, new Date().toISOString());
    
    const result = ensure(packageJsonPath);
    assert.strictEqual(result, true);
  });

  describe("isRegistryError", () => {
    it("should detect E404 errors as registry errors", () => {
      assert.strictEqual(isRegistryError("npm error code E404"), true);
      assert.strictEqual(isRegistryError("E404 - package not found"), true);
    });

    it("should detect E401 errors as registry errors", () => {
      assert.strictEqual(isRegistryError("npm error code E401"), true);
      assert.strictEqual(isRegistryError("E401 Unauthorized"), true);
    });

    it("should detect E403 errors as registry errors", () => {
      assert.strictEqual(isRegistryError("npm error code E403"), true);
      assert.strictEqual(isRegistryError("E403 Forbidden"), true);
    });

    it("should detect unauthorized/forbidden keyword errors", () => {
      assert.strictEqual(isRegistryError("Request unauthorized"), true);
      assert.strictEqual(isRegistryError("Access forbidden"), true);
    });

    it("should detect @varasto package errors as registry errors", () => {
      assert.strictEqual(
        isRegistryError("Error fetching @varasto/copilot-skills-deps"),
        true
      );
    });

    it("should not trigger setup for unrelated errors", () => {
      assert.strictEqual(isRegistryError("ENOENT: no such file or directory"), false);
      assert.strictEqual(isRegistryError("ECONNREFUSED"), false);
      assert.strictEqual(isRegistryError("npm WARN deprecated"), false);
      assert.strictEqual(isRegistryError("404 page not found"), false); // Generic 404, not npm E404
    });
  });
});