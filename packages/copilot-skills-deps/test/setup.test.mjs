/**
 * Unit tests for setup.mjs
 */

import { describe, it, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { setup } from "../src/setup.mjs";

describe("setup", () => {
  let tempDir;
  let originalHome;
  let originalGithubToken;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "setup-test-"));
    originalHome = process.env.HOME;
    originalGithubToken = process.env.GITHUB_TOKEN;
    process.env.HOME = tempDir;
    process.env.GITHUB_TOKEN = "ghp_test_token_12345";
    
    // Create a fake .git directory so findRepoRoot works
    fs.mkdirSync(path.join(tempDir, ".git"));
  });

  afterEach(() => {
    process.env.HOME = originalHome;
    if (originalGithubToken) {
      process.env.GITHUB_TOKEN = originalGithubToken;
    } else {
      delete process.env.GITHUB_TOKEN;
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("should create .npmrc with auth config when file does not exist", () => {
    const result = setup();
    
    assert.strictEqual(result, true);
    
    const npmrcPath = path.join(tempDir, ".npmrc");
    assert.ok(fs.existsSync(npmrcPath));
    
    const content = fs.readFileSync(npmrcPath, "utf8");
    assert.ok(content.includes("@varasto:registry=https://npm.pkg.github.com"));
    assert.ok(content.includes("//npm.pkg.github.com/:_authToken=ghp_test_token_12345"));
  });

  it("should append to existing .npmrc without duplicating registry", () => {
    const npmrcPath = path.join(tempDir, ".npmrc");
    fs.writeFileSync(npmrcPath, "some-other-config=value\n");
    
    const result = setup();
    
    assert.strictEqual(result, true);
    
    const content = fs.readFileSync(npmrcPath, "utf8");
    assert.ok(content.includes("some-other-config=value"));
    assert.ok(content.includes("@varasto:registry=https://npm.pkg.github.com"));
    assert.ok(content.includes("//npm.pkg.github.com/:_authToken=ghp_test_token_12345"));
    
    // Check no duplicates
    const registryMatches = content.match(/@varasto:registry=https:\/\/npm\.pkg\.github\.com/g);
    assert.strictEqual(registryMatches.length, 1, "Registry line should appear only once");
  });

  it("should update existing auth token instead of duplicating", () => {
    const npmrcPath = path.join(tempDir, ".npmrc");
    const existingContent = `@varasto:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=old_token_123
`;
    fs.writeFileSync(npmrcPath, existingContent);
    
    const result = setup();
    
    assert.strictEqual(result, true);
    
    const content = fs.readFileSync(npmrcPath, "utf8");
    
    // Old token should be replaced
    assert.ok(!content.includes("old_token_123"));
    assert.ok(content.includes("//npm.pkg.github.com/:_authToken=ghp_test_token_12345"));
    
    // Check no duplicates
    const tokenMatches = content.match(/\/\/npm\.pkg\.github\.com\/:_authToken=/g);
    assert.strictEqual(tokenMatches.length, 1, "Auth token line should appear only once");
  });

  it("should handle multiple setup runs without creating duplicates", () => {
    // Run setup 3 times
    setup();
    setup();
    setup();
    
    const npmrcPath = path.join(tempDir, ".npmrc");
    const content = fs.readFileSync(npmrcPath, "utf8");
    
    // Check no duplicates
    const registryMatches = content.match(/@varasto:registry=https:\/\/npm\.pkg\.github\.com/g);
    const tokenMatches = content.match(/\/\/npm\.pkg\.github\.com\/:_authToken=/g);
    
    assert.strictEqual(registryMatches.length, 1, "Registry line should appear only once after multiple runs");
    assert.strictEqual(tokenMatches.length, 1, "Auth token line should appear only once after multiple runs");
  });

  it("should preserve other npmrc content when updating", () => {
    const npmrcPath = path.join(tempDir, ".npmrc");
    const existingContent = `# My custom config
registry=https://registry.npmjs.org/
always-auth=true
@other:registry=https://npm.example.com
//npm.example.com/:_authToken=example_token
`;
    fs.writeFileSync(npmrcPath, existingContent);
    
    const result = setup();
    
    assert.strictEqual(result, true);
    
    const content = fs.readFileSync(npmrcPath, "utf8");
    
    // Original content should be preserved
    assert.ok(content.includes("# My custom config"));
    assert.ok(content.includes("registry=https://registry.npmjs.org/"));
    assert.ok(content.includes("always-auth=true"));
    assert.ok(content.includes("@other:registry=https://npm.example.com"));
    assert.ok(content.includes("//npm.example.com/:_authToken=example_token"));
    
    // New content should be added
    assert.ok(content.includes("@varasto:registry=https://npm.pkg.github.com"));
    assert.ok(content.includes("//npm.pkg.github.com/:_authToken=ghp_test_token_12345"));
  });

  it("should succeed when running setup multiple times", () => {
    // First setup
    const result1 = setup();
    assert.strictEqual(result1, true);
    
    // Second setup should also succeed (updates token if needed)
    const result2 = setup();
    assert.strictEqual(result2, true);
  });



  it("should fail when no token is available", () => {
    delete process.env.GITHUB_TOKEN;
    delete process.env.GH_TOKEN;
    
    const result = setup();
    
    assert.strictEqual(result, false);
  });
});
