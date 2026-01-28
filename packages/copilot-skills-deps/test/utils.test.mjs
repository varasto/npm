/**
 * Unit tests for utils.mjs
 */

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { findRepoRoot, ensureGitignore } from "../src/utils.mjs";

describe("utils", () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "utils-test-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe("findRepoRoot", () => {
    it("should find .git directory in current dir", () => {
      fs.mkdirSync(path.join(tempDir, ".git"));
      const result = findRepoRoot(tempDir);
      assert.strictEqual(result, tempDir);
    });

    it("should find .git directory in parent dir", () => {
      fs.mkdirSync(path.join(tempDir, ".git"));
      const subDir = path.join(tempDir, "sub", "dir");
      fs.mkdirSync(subDir, { recursive: true });
      const result = findRepoRoot(subDir);
      assert.strictEqual(result, tempDir);
    });

    it("should return null when no .git found", () => {
      const result = findRepoRoot(tempDir);
      assert.strictEqual(result, null);
    });
  });

  describe("ensureGitignore", () => {
    it("should create .gitignore if missing", () => {
      ensureGitignore(tempDir, [".npmrc"]);
      const content = fs.readFileSync(path.join(tempDir, ".gitignore"), "utf8");
      assert.ok(content.includes(".npmrc"));
    });

    it("should add missing patterns to existing .gitignore", () => {
      fs.writeFileSync(path.join(tempDir, ".gitignore"), "node_modules\n");
      ensureGitignore(tempDir, [".npmrc", ".env"]);
      const content = fs.readFileSync(path.join(tempDir, ".gitignore"), "utf8");
      assert.ok(content.includes("node_modules"));
      assert.ok(content.includes(".npmrc"));
      assert.ok(content.includes(".env"));
    });

    it("should not duplicate existing patterns", () => {
      fs.writeFileSync(path.join(tempDir, ".gitignore"), ".npmrc\nnode_modules\n");
      ensureGitignore(tempDir, [".npmrc"]);
      const content = fs.readFileSync(path.join(tempDir, ".gitignore"), "utf8");
      const matches = content.match(/\.npmrc/g);
      assert.strictEqual(matches.length, 1);
    });
  });
});
