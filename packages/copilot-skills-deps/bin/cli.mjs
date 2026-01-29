#!/usr/bin/env node
/**
 * CLI entry point for copilot-skills-deps
 */

import { parseArgs } from "node:util";
import { ensure } from "../src/ensure.mjs";
import { install } from "../src/install.mjs";
import { update } from "../src/update.mjs";
import { setup } from "../src/setup.mjs";
import { installAll } from "../src/install-all.mjs";
import { updateAll } from "../src/update-all.mjs";
import { status } from "../src/status.mjs";

const HELP = `
copilot-skills-deps - Manage npm dependencies in Agent Skills

Commands:
  setup       Configure npm auth for private packages
  install     Install dependencies for an Agent Skill
  update      Update dependencies for an Agent Skill
  ensure      Smart install/update (install if missing, update if stale)
  install-all Install dependencies for all Agent Skills in repo
  update-all  Update dependencies for all Agent Skills in repo
  status      Show dependency status and diagnostics

Options:
  --npm <path>     Path to package.json (required for install/update/ensure)
  --max-age <days> Days before marker is stale (default: 7, for ensure)
  --help, -h       Show this help

Environment variables:
  SKILL_UPDATE_CHECK_DAYS   Default max-age in days (default: 7)
  GITHUB_TOKEN         Token for GitHub Packages auth

Examples:
  copilot-skills-deps setup
  copilot-skills-deps install --npm ./scripts/package.json
  copilot-skills-deps update --npm ./scripts/package.json
  copilot-skills-deps ensure --npm ./scripts/package.json
  copilot-skills-deps install-all
  copilot-skills-deps update-all
  copilot-skills-deps status
`;

function showHelp() {
  console.log(HELP.trim());
  process.exit(0);
}

function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      npm: { type: "string" },
      "max-age": { type: "string", default: "7" },
      help: { type: "boolean", short: "h" },
    },
  });

  if (values.help || positionals.length === 0) {
    showHelp();
  }

  const command = positionals[0];
  const maxAgeDays = parseInt(values["max-age"], 10) || 7;

  switch (command) {
    case "setup":
      process.exit(setup() ? 0 : 1);
      break;

    case "install":
      if (!values.npm) {
        console.error("Error: --npm <path> is required");
        process.exit(1);
      }
      process.exit(install(values.npm) ? 0 : 1);
      break;

    case "update":
      if (!values.npm) {
        console.error("Error: --npm <path> is required");
        process.exit(1);
      }
      process.exit(update(values.npm) ? 0 : 1);
      break;

    case "ensure":
      if (!values.npm) {
        console.error("Error: --npm <path> is required");
        process.exit(1);
      }
      process.exit(ensure(values.npm, { maxAgeDays }) ? 0 : 1);
      break;

    case "install-all":
      process.exit(installAll() ? 0 : 1);
      break;

    case "update-all":
      process.exit(updateAll() ? 0 : 1);
      break;

    case "status":
      process.exit(status(values.npm) ? 0 : 1);
      break;

    default:
      console.error(`Unknown command: ${command}`);
      showHelp();
  }
}

main();
