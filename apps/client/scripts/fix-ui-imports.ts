#!/usr/bin/env bun
/**
 * One-shot fixer: for every .tsx file under src/ that uses these JSX tags
 * in code, make sure the import line from `../ui` / `../../ui` includes them:
 *   - <TextField>, <TextArea>
 *   - <Table>, <THead>, <TBody>, <TR>, <TH>, <TD>
 *
 * Strategy:
 *  1. Gather every ui import line.
 *  2. Build the merged set of names.
 *  3. Replace the FIRST ui import line with the merged set.
 *  4. Remove all subsequent ui import lines.
 * Idempotent.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(import.meta.dir, "..");
const SRC = join(ROOT, "src");

const TAGS = [
  "TextField",
  "TextArea",
  "Table",
  "THead",
  "TBody",
  "TR",
  "TH",
  "TD",
];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) {
      if (entry === "node_modules" || entry === "dist" || entry.startsWith(".")) continue;
      out.push(...walk(full));
    } else if (/\.(ts|tsx)$/.test(entry) && !entry.endsWith(".d.ts")) {
      out.push(full);
    }
  }
  return out;
}

const files = walk(SRC);
let changed = 0;

for (const file of files) {
  const src = readFileSync(file, "utf8");
  const needed: string[] = [];
  for (const tag of TAGS) {
    if (new RegExp(`<\\s*${tag}\\b`).test(src)) needed.push(tag);
  }
  if (needed.length === 0) continue;

  const importRe = /import\s*\{([^}]+)\}\s*from\s*['"](\.\.?\/+(?:\.\.\/)*ui)['"]\s*;?/g;

  // Find every ui import line.
  const matches: { full: string; names: string; from: string; index: number }[] = [];
  for (const m of src.matchAll(importRe)) {
    matches.push({ full: m[0], names: m[1], from: m[2], index: m.index ?? 0 });
  }

  // Compute merged set of names.
  const merged = new Set<string>();
  for (const m of matches) {
    for (const n of m.names.split(",")) {
      const trimmed = n.trim();
      if (trimmed) merged.add(trimmed);
    }
  }
  for (const tag of needed) merged.add(tag);

  // No existing ui import — insert one.
  if (matches.length === 0) {
    const depth = file.includes("/pages/") || file.includes("/components/") ? "../../ui" : "../ui";
    const insert = `import { ${[...merged].join(", ")} } from '${depth}';\n`;
    writeFileSync(file, insert + src, "utf8");
    changed++;
    console.log("  ✓ " + relative(ROOT, file));
    continue;
  }

  // Replace the first import with merged; remove all subsequent imports.
  const from = matches[0].from;
  const newImport = `import { ${[...merged].join(", ")} } from '${from}';`;
  let modified = src;
  // Replace from the last match to the first so indexes don't shift.
  for (let i = matches.length - 1; i >= 0; i--) {
    const m = matches[i];
    if (i === 0) {
      modified = modified.slice(0, m.index) + newImport + modified.slice(m.index + m.full.length);
    } else {
      // Remove the line (and its trailing newline if any).
      let end = m.index + m.full.length;
      if (modified[end] === "\n") end += 1;
      modified = modified.slice(0, m.index) + modified.slice(end);
    }
  }

  if (modified !== src) {
    writeFileSync(file, modified, "utf8");
    changed++;
    console.log("  ✓ " + relative(ROOT, file));
  }
}

console.log(`\nDone. Patched ${changed} files.`);
