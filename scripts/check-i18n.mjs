#!/usr/bin/env node
// Fails when en.json and id.json key sets drift apart.
// Run in CI (bun scripts/check-i18n.mjs) and locally before pushing.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const load = (name) => JSON.parse(readFileSync(join(root, 'apps/client/src/locales', name), 'utf8'));

const en = load('en.json');
const id = load('id.json');

const enKeys = new Set(Object.keys(en));
const idKeys = new Set(Object.keys(id));

const missingInId = [...enKeys].filter((k) => !idKeys.has(k)).sort();
const missingInEn = [...idKeys].filter((k) => !enKeys.has(k)).sort();

if (missingInId.length > 0 || missingInEn.length > 0) {
  if (missingInId.length > 0) {
    console.error(`Keys missing in id.json (${missingInId.length}):`);
    for (const k of missingInId) console.error(`  - ${k}`);
  }
  if (missingInEn.length > 0) {
    console.error(`Keys missing in en.json (${missingInEn.length}):`);
    for (const k of missingInEn) console.error(`  - ${k}`);
  }
  process.exit(1);
}

console.log(`i18n OK — ${enKeys.size} keys, en/id in sync.`);
