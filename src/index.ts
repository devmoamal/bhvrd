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
const VERSION = "1.1.0";

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

// ── Colors ───────────────────────────────────────────────────────────────

const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  magenta: "\x1b[35m",
  blue: "\x1b[34m",
  white: "\x1b[37m",
  gray: "\x1b[90m",
  bgCyan: "\x1b[46m",
  bgMagenta: "\x1b[45m",
};

// ── ASCII Logo ───────────────────────────────────────────────────────────

const LOGO = `
${c.cyan}${c.bold}  ██████╗  ██╗  ██╗ ██╗   ██╗ ██████╗  ██████╗ ${c.reset}
${c.cyan}${c.bold}  ██╔══██╗ ██║  ██║ ██║   ██║ ██╔══██╗ ██╔══██╗${c.reset}
${c.magenta}${c.bold}  ██████╔╝ ███████║ ██║   ██║ ██████╔╝ ██║  ██║${c.reset}
${c.magenta}${c.bold}  ██╔══██╗ ██╔══██║ ╚██╗ ██╔╝ ██╔══██╗ ██║  ██║${c.reset}
${c.blue}${c.bold}  ██████╔╝ ██║  ██║  ╚████╔╝  ██║  ██║ ██████╔╝${c.reset}
${c.blue}${c.bold}  ╚═════╝  ╚═╝  ╚═╝   ╚═══╝   ╚═╝  ╚═╝ ╚═════╝ ${c.reset}
`;

const TAGLINE = `${c.dim}  Bun · Hono · Vite · React · Drizzle${c.reset}`;

// ── Spinner ──────────────────────────────────────────────────────────────

const frames = ["◐", "◓", "◑", "◒"];

function createSpinner(text: string) {
  let i = 0;
  const interval = setInterval(() => {
    process.stdout.write(
      `\r  ${c.cyan}${frames[i++ % frames.length]}${c.reset} ${text}`,
    );
  }, 80);

  return {
    stop(finalText: string) {
      clearInterval(interval);
      process.stdout.write(`\r\x1b[2K  ${c.green}✔${c.reset} ${finalText}\n`);
    },
    fail(finalText: string) {
      clearInterval(interval);
      process.stdout.write(`\r\x1b[2K  ${c.red}✖${c.reset} ${finalText}\n`);
    },
  };
}

// ── CLI ──────────────────────────────────────────────────────────────────

const program = new Command()
  .name("bhvrd")
  .description(
    "Scaffold a full-stack monorepo — Bun · Hono · Vite · React · Drizzle",
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

    // ── Logo ────────────────────────────────────────────────────────
    console.log(LOGO);
    console.log(TAGLINE);
    console.log();

    // ── Validate ────────────────────────────────────────────────────

    if (!isDot && existsSync(targetDir)) {
      const entries = await readdir(targetDir);
      if (entries.length > 0) {
        console.log(
          `  ${c.red}✖${c.reset} Directory ${c.bold}"${name}"${c.reset} already exists and is not empty.`,
        );
        process.exit(1);
      }
    }

    // ── Scaffold ────────────────────────────────────────────────────

    if (!isDot) await mkdir(targetDir, { recursive: true });

    const scaffoldSpinner = createSpinner(
      `Scaffolding ${c.bold}${projectName}${c.reset} ...`,
    );

    await copyDir(TEMPLATE_DIR, targetDir);

    await replaceInDir(targetDir, [
      [`@${PLACEHOLDER}/`, `@${projectName}/`],
      [`"${PLACEHOLDER}"`, `"${projectName}"`],
      [`${PLACEHOLDER_CAP} Admin`, `${projectNameUpper} Admin`],
      [`${PLACEHOLDER_CAP} Client`, `${projectNameUpper} Client`],
      [PLACEHOLDER_CAP, projectNameUpper],
      [PLACEHOLDER, projectName],
    ]);

    scaffoldSpinner.stop(
      `Scaffolded ${c.cyan}${c.bold}${projectName}${c.reset}`,
    );

    // ── Install ─────────────────────────────────────────────────────

    const installSpinner = createSpinner("Installing dependencies ...");

    const proc = Bun.spawn(["bun", "install"], {
      cwd: targetDir,
      stdout: "pipe",
      stderr: "pipe",
    });
    await proc.exited;

    installSpinner.stop("Dependencies installed");

    // ── Summary ─────────────────────────────────────────────────────

    console.log();
    console.log(
      `  ${c.dim}┌──────────────────────────────────────────┐${c.reset}`,
    );
    console.log(
      `  ${c.dim}│${c.reset}                                          ${c.dim}│${c.reset}`,
    );
    console.log(
      `  ${c.dim}│${c.reset}  ${c.green}${c.bold}Project created successfully! 🚀${c.reset}         ${c.dim}│${c.reset}`,
    );
    console.log(
      `  ${c.dim}│${c.reset}                                          ${c.dim}│${c.reset}`,
    );
    console.log(
      `  ${c.dim}│${c.reset}  ${c.cyan}server${c.reset}  ${c.dim}→${c.reset} Hono + Drizzle + PostgreSQL  ${c.dim}│${c.reset}`,
    );
    console.log(
      `  ${c.dim}│${c.reset}  ${c.cyan}client${c.reset}  ${c.dim}→${c.reset} Vite + React ${c.dim}(:5174)${c.reset}        ${c.dim}│${c.reset}`,
    );
    console.log(
      `  ${c.dim}│${c.reset}  ${c.cyan}admin${c.reset}   ${c.dim}→${c.reset} Vite + React ${c.dim}(:5173)${c.reset}        ${c.dim}│${c.reset}`,
    );
    console.log(
      `  ${c.dim}│${c.reset}  ${c.cyan}shared${c.reset}  ${c.dim}→${c.reset} Zod types + validations    ${c.dim}│${c.reset}`,
    );
    console.log(
      `  ${c.dim}│${c.reset}                                          ${c.dim}│${c.reset}`,
    );
    console.log(
      `  ${c.dim}└──────────────────────────────────────────┘${c.reset}`,
    );
    console.log();

    // ── Next Steps ──────────────────────────────────────────────────

    console.log(`  ${c.yellow}${c.bold}Next steps:${c.reset}`);
    console.log();

    let step = 1;
    if (!isDot) {
      console.log(`  ${c.dim}${step}.${c.reset} cd ${c.cyan}${name}${c.reset}`);
      step++;
    }
    console.log(
      `  ${c.dim}${step++}.${c.reset} cp ${c.dim}server/.env.example${c.reset} ${c.cyan}server/.env${c.reset}`,
    );
    console.log(
      `  ${c.dim}${step++}.${c.reset} bun run ${c.green}dev:server${c.reset}`,
    );
    console.log(
      `  ${c.dim}${step++}.${c.reset} bun run ${c.green}dev:client${c.reset}`,
    );
    console.log(
      `  ${c.dim}${step}.${c.reset} bun run ${c.green}dev:admin${c.reset}`,
    );
    console.log();
    console.log(`  ${c.dim}Happy hacking! ⚡${c.reset}`);
    console.log();
  });

program.parse();

// ── Helpers ──────────────────────────────────────────────────────────────

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
