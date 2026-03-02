#!/usr/bin/env bun

import { Command } from "commander";
import { resolve, join, basename, dirname } from "path";
import { readdir, readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { fileURLToPath } from "url";

// ── Constants ────────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TEMPLATE_DIR = resolve(__dirname, "..", "template");
const PLACEHOLDER = "bhvrd";
const PLACEHOLDER_CAP = "BHVRD";
const VERSION = "1.0.0";

const TEXT_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".json",
  ".html",
  ".css",
  ".md",
  ".yml",
  ".yaml",
  ".toml",
  ".txt",
  ".lock",
  ".env",
  ".example",
  ".gitignore",
]);

const SKIP_DIRS = new Set(["node_modules", "dist", ".git"]);

// ── CLI ──────────────────────────────────────────────────────────────────

const program = new Command()
  .name("bhvrd")
  .description(
    "⚡ Scaffold a full-stack monorepo — Bun · Hono · Vite · React · Drizzle",
  )
  .version(VERSION);

program
  .command("create")
  .argument("<name>", 'project name or "." for current directory')
  .description("Create a new bhvrd project")
  .action(async (name: string) => {
    const isDot = name === ".";
    const targetDir = isDot ? resolve(".") : resolve(name);
    const projectName = basename(targetDir);
    const projectNameUpper = projectName.toUpperCase();

    log("");
    log("  ⚡ bhvrd — Bun · Hono · Vite · React · Drizzle");
    log("");

    // ── Validate ──────────────────────────────────────────────────────

    if (!isDot && existsSync(targetDir)) {
      const entries = await readdir(targetDir);
      if (entries.length > 0) {
        error(`Directory "${name}" already exists and is not empty.`);
        process.exit(1);
      }
    }

    // ── Scaffold ──────────────────────────────────────────────────────

    if (!isDot) await mkdir(targetDir, { recursive: true });

    log(`  📁  Scaffolding "${projectName}" ...`);
    log("");

    await copyDir(TEMPLATE_DIR, targetDir);

    await replaceInDir(targetDir, [
      [`@${PLACEHOLDER}/`, `@${projectName}/`],
      [`"${PLACEHOLDER}"`, `"${projectName}"`],
      [`${PLACEHOLDER_CAP} Admin`, `${projectNameUpper} Admin`],
      [`${PLACEHOLDER_CAP} Client`, `${projectNameUpper} Client`],
      [PLACEHOLDER_CAP, projectNameUpper],
      [PLACEHOLDER, projectName],
    ]);

    // ── Install ───────────────────────────────────────────────────────

    log("  📦  Installing dependencies ...");
    log("");

    const proc = Bun.spawn(["bun", "install"], {
      cwd: targetDir,
      stdout: "inherit",
      stderr: "inherit",
    });
    await proc.exited;

    // ── Done ──────────────────────────────────────────────────────────

    log("");
    log(`  ✅  Done! Project "${projectName}" is ready.`);
    log("");
    log("  Next steps:");
    log("");
    if (!isDot) log(`    cd ${name}`);
    log("    cp server/.env.example server/.env");
    log("    bun run dev:server");
    log("    bun run dev:client");
    log("    bun run dev:admin");
    log("");
  });

program.parse();

// ── Helpers ──────────────────────────────────────────────────────────────

function log(msg: string) {
  console.log(msg);
}

function error(msg: string) {
  console.error(`  ✖  ${msg}`);
}

async function copyDir(src: string, dest: string) {
  await mkdir(dest, { recursive: true });

  for (const entry of await readdir(src, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;

    const from = join(src, entry.name);
    const to = join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDir(from, to);
    } else {
      await writeFile(to, await readFile(from));
    }
  }
}

async function replaceInDir(dir: string, replacements: [string, string][]) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;

    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      await replaceInDir(fullPath, replacements);
      continue;
    }

    if (!isTextFile(entry.name)) continue;

    let content = await readFile(fullPath, "utf-8");
    let changed = false;

    for (const [search, replace] of replacements) {
      if (content.includes(search)) {
        content = content.replaceAll(search, replace);
        changed = true;
      }
    }

    if (changed) await writeFile(fullPath, content, "utf-8");
  }
}

function isTextFile(name: string): boolean {
  return TEXT_EXTENSIONS.has(name.slice(name.lastIndexOf(".")));
}
