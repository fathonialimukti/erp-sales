#!/usr/bin/env node
// i18n drift gate. Exits non-zero on hard drift, zero on placeholders.
//   bun scripts/check-i18n.mjs            # run locally / in CI
// Hard failures:
//   1. en.json <-> id.json key set mismatch
//   2. code <-> locale drift: a formatMessage id used under apps/client/src
//      that is missing from en.json (or id.json) — reported with file:line
//   3. a call site whose id is not statically knowable growing past the
//      recorded baseline: each one is copy no gate can check
// Warnings (do not fail):
//   4. untranslated copy: an id.json value byte-identical to its en.json value
// Locale files are compared as flattened dotted key sets, so a flat file and a
// nested one both compare correctly.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { flattenMessages, scanMessages } from "./sync-i18n.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const LOCALES = join(root, "apps/client/src/locales");

/**
 * Values that are legitimately byte-identical in Indonesian: loanwords this
 * product's own translations keep (Area, Outlet, Status, Qty, Subtotal, …),
 * brand and product names, and format expressions that carry no words to
 * translate.
 *
 * Curated rather than inferred. The gate used to infer it — "a single word is
 * probably a loanword" — which hid 198 byte-identical values behind one
 * heuristic and reported 11 untranslated. "Error" and "Summary" are single
 * words; this file translates them to Kesalahan and Ringkasan everywhere else.
 * A judgement call belongs in a list a reviewer can read, not in a regex.
 */
const LEGIT_IDENTICAL = new Set([
  "Area", "Outlet", "Outlets", "Status", "Vendor", "Email", "Telepon", "Info",
  "Total", "Subtotal", "Level", "Normal", "Edit", "Edit area", "Edit outlet",
  "Detail", "Menu", "Item", "Items", "File", "Footer", "Program",
  "Qty", "Qty (pcs)", "SKU", "SKUs", "PIC", "Salesman", "Pipeline", "Embedding",
  "Model", "Metadata", "Bio", "Debug", "Spam", "Domain", "Port", "Host",
  "FAQ", "ETA", "AI",
  "GitHub", "LinkedIn", "WhatsApp", "SSL/TLS", "STARTTLS", "Fathoni",
  "B2B CRM", "ROI %",
  "{carton} × {packSize} = {pcs}", "{count, plural, one {# total} other {# total}}",
]);

/**
 * Ratchet on the untranslated count. A warning that never fails is a log line
 * nobody reads, but failing on the current backlog would be a red build on
 * correct code — so the gate holds the line and fails only when it moves.
 * Translating copy lowers it; a term judged a loanword belongs in
 * LEGIT_IDENTICAL above, not in a raised number.
 */
const UNTRANSLATED_BASELINE = 89;

/**
 * Same ratchet, applied to the call sites whose id no rule can read — the
 * `id: someVar` shape and any template whose holes are not literal unions.
 * Every one of them is a string no gate can check, so the count is the honest
 * measure of how much copy is unverified, and growing it is a red build.
 */
const UNVERIFIED_BASELINE = 61;

const load = (name) => {
  try {
    return flattenMessages(JSON.parse(readFileSync(join(LOCALES, name), "utf8")));
  } catch (error) {
    throw new Error(`${name}: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

let en;
let id;
try {
  en = load("en.json");
  id = load("id.json");
} catch (error) {
  console.error(`i18n FAIL — ${error.message}`);
  process.exit(1);
}

const { sites, files, calls, dynamic, unverified } = scanMessages();

console.log(
  `i18n — ${plural(en.size, "en key")} · ${plural(id.size, "id key")} · ${plural(sites.size, "id")} referenced in ${plural(files, "file")} (${plural(calls, "call site")}, ${dynamic} dynamic id expressions unverified)`,
);

const hardFailures = [];

// 1. en <-> id key set
const missingInId = [...en.keys()].filter((k) => !id.has(k)).sort();
const missingInEn = [...id.keys()].filter((k) => !en.has(k)).sort();
if (missingInId.length > 0 || missingInEn.length > 0) {
  if (missingInId.length > 0) {
    hardFailures.push(`keys missing in id.json (${missingInId.length}):\n${missingInId.map((k) => `  - ${k}`).join("\n")}`);
  }
  if (missingInEn.length > 0) {
    hardFailures.push(`keys missing in en.json (${missingInEn.length}):\n${missingInEn.map((k) => `  - ${k}`).join("\n")}`);
  }
}

// 2. code <-> locale drift, with the first offending call site per id
const codeDrift = [];
for (const [key, list] of sites) {
  const where = en.has(key) ? null : "en.json";
  const whereId = id.has(key) ? null : "id.json";
  if (!where && !whereId) continue;
  const [first] = list;
  codeDrift.push({
    key,
    files: `${where ?? ""}${where && whereId ? " + " : ""}${whereId ?? ""}`,
    at: `${first.file}:${first.line}`,
    refs: list.length,
  });
}
codeDrift.sort((a, b) => a.key.localeCompare(b.key));
if (codeDrift.length > 0) {
  hardFailures.push(
    `ids referenced in code but missing from the locale files (${codeDrift.length}):\n${codeDrift
      .map((d) => `  - ${d.key}  [missing: ${d.files}]  ${d.at}${d.refs > 1 ? ` (+${d.refs - 1} more refs)` : ""}`)
      .join("\n")}\n  fix: bun scripts/sync-i18n.mjs`,
  );
}

// 3. ratchet on unverifiable call sites
if (dynamic > UNVERIFIED_BASELINE) {
  hardFailures.push(
    `dynamic id expressions now ${dynamic}, over the recorded ${UNVERIFIED_BASELINE} (copy no gate can check):\n${unverified
      .map((site) => `  - ${site.file}:${site.line}${site.template ? "  [template]" : ""}  ${site.expr}`)
      .join("\n")}\n  fix: give the id a literal value, or a literal union, so it can be read statically — or accept the new count by raising the baseline deliberately.`,
  );
}

// 4. untranslated copy — every id.json value byte-identical to its en.json
// value, split by whether that is defensible. Never a hard failure on its own:
// a loanword must not be able to redden a build over correct code.
const identical = [...en.keys()]
  .filter((key) => typeof id.get(key) === "string" && id.get(key) === en.get(key))
  .sort();
const legit = identical.filter((key) => LEGIT_IDENTICAL.has(en.get(key)));
const untranslated = identical.filter((key) => !LEGIT_IDENTICAL.has(en.get(key)));

// Grouped by value so a shared word is one line, not one line per id.
const byValue = new Map();
for (const key of untranslated) {
  const value = en.get(key);
  if (!byValue.has(value)) byValue.set(value, []);
  byValue.get(value).push(key);
}
const untranslatedRows = [...byValue.entries()]
  .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
  .map(([value, keys]) => `  ${String(keys.length).padStart(3)}x  ${JSON.stringify(value)}  (e.g. ${keys[0]})`);

console.log(
  `WARN untranslated — ${identical.length} of ${en.size} id values are byte-identical to en.json: ${legit.length} legitimately identical (loanword / brand / format, see LEGIT_IDENTICAL), ${untranslated.length} probably untranslated English:`,
);
for (const row of untranslatedRows) console.log(row);
console.log(
  `  fix: translate into Indonesian, or — if the term really is a loanword — add it to LEGIT_IDENTICAL. Baseline ${UNTRANSLATED_BASELINE}; ${untranslated.length} today.`,
);

// 5. ratchet on untranslated copy, so a warning cannot sit green forever
if (untranslated.length > UNTRANSLATED_BASELINE) {
  hardFailures.push(
    `${untranslated.length} id values are untranslated English, over the recorded ${UNTRANSLATED_BASELINE} (list above).\n  fix: translate them, add the term to LEGIT_IDENTICAL if it is a loanword, or accept the new count by raising the baseline deliberately.`,
  );
}

if (hardFailures.length > 0) {
  for (const failure of hardFailures) console.error(`i18n FAIL — ${failure}`);
  console.error(
    `i18n FAILED — ${hardFailures.length} hard failure class(es), ${untranslated.length} untranslated value(s).`,
  );
  process.exit(1);
}

console.log(
  `i18n OK — ${en.size} keys, en/id in sync, every statically-known referenced id present${dynamic > 0 ? `, ${dynamic} dynamic id expressions unverified` : ""}, ${identical.length} id values byte-identical (${untranslated.length} probably untranslated).`,
);
