#!/usr/bin/env node
// Injects i18n ids that are referenced in client code but missing from the
// locale files, so no message ever falls back to its English defaultMessage.
//
//   bun scripts/sync-i18n.mjs           # inject missing ids (idempotent)
//   bun scripts/sync-i18n.mjs --check   # exit 1 if any injection is needed
//
// Idempotent: a second run injects nothing. en.json gets the `defaultMessage`
// from the call site; id.json gets the same text as a PLACEHOLDER that a
// translation pass must clear (machine-translating 300+ strings here would
// ship worse Indonesian than a visible untranslated list).
//
// Exports scanMessages()/flattenMessages() so check-i18n.mjs shares one scanner.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(root, "apps/client/src");
const LOCALES = join(SRC, "locales");

const CODE_FILE = /\.(ts|tsx)$/;
const SKIP_FILE = /(\.test\.|\.spec\.|\.stories\.|\/__tests__\/|\/__mocks__\/)/;
// Local translate seam, e.g. PrivateLayout.tsx:
//   const t = (id, fallback) => intl.formatMessage({ id, defaultMessage: fallback })
// so `t("some.id", "Some text")` is the same shape as formatMessage({...}).
const TRANSLATE_ALIAS = /\bt\s*\(/g;

/** Every .ts/.tsx file under src, sorted, test files excluded. */
export function sourceFiles(dir = SRC) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "locales" || entry.name === "node_modules") continue;
      out.push(...sourceFiles(path));
    } else if (CODE_FILE.test(entry.name) && !SKIP_FILE.test(entry.name)) {
      out.push(path);
    }
  }
  return out;
}

/**
 * Blank out comments in place (same length, newlines kept) so call-site
 * regexes never match prose in a JSDoc example. Strings are left untouched —
 * their contents are the values we want to read.
 */
const maskComments = (src) => {
  const out = src.split("");
  let i = 0;
  while (i < src.length) {
    const two = src.slice(i, i + 2);
    if (two === "//") {
      while (i < src.length && src[i] !== "\n") out[i++] = " ";
      continue;
    }
    if (two === "/*") {
      while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) {
        if (src[i] !== "\n") out[i] = " ";
        i++;
      }
      out[i] = " ";
      if (i + 1 < src.length) out[i + 1] = " ";
      i += 2;
      continue;
    }
    if (src[i] === '"' || src[i] === "'" || src[i] === "`") {
      // A template literal is skipped as one string, so its `${…}` holes are
      // invisible to the call-site regexes below. Message ids ARE built in
      // templates (`nav.${meta.kicker}`, `report.dimension.${dimension}`), so
      // they are resolved separately, by expanding the holes against the
      // literal unions the source declares (see `unionsFor`). A hole no union
      // covers is reported as an unverified dynamic id — never assumed absent,
      // and never counted as verified.
      i = skipString(src, i);
      continue;
    }
    i++;
  }
  return out.join("");
};

/** Index just past the closing quote of the string starting at `open`. */
function skipString(s, open) {
  const quote = s[open];
  for (let i = open + 1; i < s.length; i++) {
    if (s[i] === "\\") i++;
    else if (s[i] === quote) return i + 1;
  }
  return s.length;
}

/** Index just past the bracket matching the opener at `open`, or -1. */
function matchBracket(s, open) {
  const stack = [];
  for (let i = open; i < s.length; i++) {
    const c = s[i];
    if (c === '"' || c === "'" || c === "`") {
      i = skipString(s, i) - 1;
      continue;
    }
    if (c === "(" || c === "[" || c === "{") stack.push(c);
    else if (c === ")" || c === "]" || c === "}") {
      if (stack.pop() !== { ")": "(", "]": "[", "}": "{" }[c]) return -1;
      if (stack.length === 0) return i + 1;
    }
  }
  return -1;
}

/** Split call arguments on top-level commas. */
const splitArgs = (body) => {
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (c === '"' || c === "'" || c === "`") {
      i = skipString(body, i) - 1;
      continue;
    }
    if (c === "(" || c === "[" || c === "{") depth++;
    else if (c === ")" || c === "]" || c === "}") depth--;
    else if (c === "," && depth === 0) {
      parts.push(body.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(body.slice(start));
  return parts;
};

const unquote = (raw) => raw.slice(1, -1).replace(/\\(.)/g, "$1");

/**
 * `"a" | "b" | "c"`, `"a", "b"`, or a single `"a"` → its members, else null.
 * Rejects anything carrying structure beyond `|`, `,` and whitespace, so an
 * array of objects never masquerades as a union of strings.
 */
const stringUnion = (body) => {
  const literals = [...body.matchAll(/"([^"]*)"|'([^']*)'/g)];
  if (literals.length === 0) return null;
  if (body.replace(/"[^"]*"|'[^']*'/g, "").replace(/[|,\s]/g, "") !== "") return null;
  return literals.map((m) => m[1] ?? m[2]);
};

const ALIAS_OF_ARRAY = /\(typeof\s+([A-Za-z_$][\w$]*)\s*\)\s*\[\s*number\s*\]/;

/**
 * Every name in one file that TypeScript already constrains to a string-literal
 * union, mapped to that union's members. Only the syntactic shapes below are
 * recognised, and that is sound rather than approximate: in each of them the
 * compiler rejects a value outside the union, so every member list covers the
 * variable at runtime.
 *
 *   const DIMENSIONS = ["a","b"] as const;
 *   type K = "a" | "b";              type K = (typeof DIMENSIONS)[number];
 *   const name: K = …                const [name, setName] = useState<…>(…)
 *   DIMENSIONS.map((name) => …)
 */
function unionsFor(src) {
  const values = new Map(); // value name → members
  const aliases = new Map(); // type-alias name → members

  const membersOfType = (typeExpr) =>
    stringUnion(typeExpr) ??
    (() => {
      const ref = ALIAS_OF_ARRAY.exec(typeExpr);
      return ref ? (values.get(ref[1]) ?? null) : null;
    })();

  for (const m of src.matchAll(/\b(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*\[([\s\S]*?)\]\s*as\s+const\b/g)) {
    const members = stringUnion(m[2]);
    if (members) values.set(m[1], members);
  }
  for (const m of src.matchAll(/\btype\s+([A-Za-z_$][\w$]*)\s*=\s*([^;]+);/g)) {
    const members = membersOfType(m[2]);
    if (members) aliases.set(m[1], members);
  }
  for (const m of src.matchAll(/\bconst\s+([A-Za-z_$][\w$]*)\s*:\s*([^=;\n]+?)\s*=/g)) {
    const type = m[2].trim();
    const members = aliases.get(type) ?? membersOfType(type);
    if (members) values.set(m[1], members);
  }
  for (const m of src.matchAll(/\bconst\s*\[\s*([A-Za-z_$][\w$]*)\s*,[^\]]*\]\s*=\s*useState\s*<\s*([^>]*?)\s*>\s*\(/g)) {
    const members = membersOfType(m[2]);
    if (members) values.set(m[1], members);
  }
  for (const m of src.matchAll(/\b([A-Za-z_$][\w$]*)\s*\.\s*map\s*\(\s*\(\s*([A-Za-z_$][\w$]*)\s*\)/g)) {
    const members = values.get(m[1]);
    if (members) values.set(m[2], members);
  }
  return { values, aliases };
}

/** The `\${…}` hole expressions of a template literal, trimmed. */
const templateHoles = (expr) => {
  const trimmed = expr.trim();
  if (!trimmed.startsWith("`") || !trimmed.endsWith("`")) return null;
  return [...trimmed.matchAll(/\$\{([\s\S]*?)\}/g)].map((m) => m[1].trim());
};

/**
 * Every id a template literal can produce, or null when a hole is not bound to
 * a declared literal union. The cartesian order is the union order, so index i
 * of the result pairs with index i of the hole members.
 */
function expandTemplate(expr, unions) {
  const holes = templateHoles(expr);
  if (holes === null) return null;
  const inner = expr.trim().slice(1, -1);
  if (holes.length === 0) return [inner];

  const parts = [];
  let last = 0;
  for (const h of inner.matchAll(/\$\{[\s\S]*?\}/g)) {
    parts.push(inner.slice(last, h.index));
    last = h.index + h[0].length;
  }
  parts.push(inner.slice(last));

  let out = [parts[0]];
  for (const [i, hole] of holes.entries()) {
    const members = unions.values.get(hole);
    if (!members) return null;
    const tail = parts[i + 1];
    out = out.flatMap((base) => members.map((member) => base + member + tail));
  }
  return out;
}

/**
 * String literals that sit in value position inside an expression, in source
 * order — ternaries yield both branches, comparisons and call arguments are
 * skipped: `row.source === "CREATED" ? "a" : "b"` yields ["a", "b"], and
 * `kicker.startsWith("nav.")` yields nothing.
 *
 * A template literal is one more value position: a hole-free one yields its
 * text, and one with holes yields the ids its union-typed holes expand to (or
 * nothing, which the caller reports as unverified).
 */
function valueLiterals(expr, unions) {
  const trimmed = expr.trim();
  if (trimmed.startsWith("`") && trimmed.endsWith("`")) {
    if (!trimmed.includes("${")) return [unquote(trimmed)];
    return expandTemplate(trimmed, unions) ?? [];
  }
  const out = [];
  const back = (from, floor) => {
    for (let j = from; j >= floor; j--) {
      if (!/\s/.test(expr[j])) return expr[j];
    }
    return "";
  };
  for (let i = 0; i < expr.length; i++) {
    if (expr[i] === '"' || expr[i] === "'") {
      const end = skipString(expr, i);
      const before = back(i - 1, 0);
      const isCallArg = before === "(" && /[\w$.]/.test(back(i - 2, 0));
      if (!isCallArg && (before === "" || "?:([,".includes(before))) {
        // An empty literal is not a value. `kicker.replace("nav.", "")` used to
        // read as a defaultMessage of "" and was stored as one, so a missing id
        // would have been injected as an empty string.
        const literal = unquote(expr.slice(i, end));
        if (literal !== "") out.push(literal);
      }
      i = end - 1;
    }
  }
  return out;
}

/** { id, defaultMessage } property values of a descriptor object literal. */
function descriptorProps(body) {
  const props = {};
  for (const part of splitArgs(body)) {
    const at = part.search(/(?:^|[\s{(,])[A-Za-z_$][\w$]*\s*:/);
    if (at < 0) continue;
    const m = /^\s*([A-Za-z_$][\w$]*)\s*:\s*([\s\S]+)$/.exec(part.slice(at));
    if (m) props[m[1]] = m[2];
  }
  return props;
}

const lineIndex = (src) => {
  const starts = [0];
  for (let i = 0; i < src.length; i++) if (src[i] === "\n") starts.push(i + 1);
  return (offset) => {
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid] <= offset) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  };
};

/**
 * Scan src for message ids.
 *
 * `unverified` is the honest residue: call sites whose id could not be reduced
 * to a literal by any rule above. They are neither passed nor failed — they are
 * reported, so a caller can never claim coverage it does not have.
 * @returns {{sites: Map<string, {file: string, line: number, defaultMessage: string|null}[]>,
 *            dynamic: number, calls: number, files: number,
 *            unverified: {file: string, line: number, expr: string, template: boolean}[]}}
 */
export function scanMessages(files = sourceFiles()) {
  const sites = new Map();
  const unverified = [];
  let dynamic = 0;
  let calls = 0;

  const record = (id, defaultMessage, file, line) => {
    if (!id) return;
    const list = sites.get(id) ?? [];
    list.push({ file, line, defaultMessage });
    sites.set(id, list);
  };

  /** No id could be read off this expression — count it and say so. */
  const unresolved = (expr, file, line) => {
    dynamic++;
    unverified.push({
      file,
      line,
      expr: expr.replace(/\s+/g, " ").trim().slice(0, 120),
      template: templateHoles(expr) !== null,
    });
  };

  for (const path of files) {
    const src = readFileSync(path, "utf8");
    const masked = maskComments(src);
    const unions = unionsFor(masked);
    const at = lineIndex(src);
    const file = relative(root, path);

    // formatMessage({ id: "…", defaultMessage: "…" })
    for (const m of masked.matchAll(/formatMessage\s*\(/g)) {
      const open = m.index + m[0].length - 1;
      const end = matchBracket(masked, open);
      if (end < 0) continue;
      calls++;
      const line = at(m.index + m[0].length);
      const arg = splitArgs(masked.slice(open + 1, end - 1))[0]?.trim() ?? "";
      if (!arg.startsWith("{")) {
        unresolved(arg, file, line);
        continue;
      }
      const props = descriptorProps(arg.slice(1, -1));
      if (props.id === undefined) {
        unresolved(arg, file, line);
        continue;
      }
      const ids = valueLiterals(props.id, unions);
      if (ids.length === 0) {
        unresolved(props.id, file, line);
        continue;
      }
      const msgs = valueLiterals(props.defaultMessage ?? "", unions);
      // `id: `ns.${part}`, defaultMessage: part` — the same expression on both
      // sides means each id owns the member it was built from, so the defaults
      // pair up instead of leaving every expanded id without one. Only safe
      // while there is a single hole to pair against.
      const holes = templateHoles(props.id);
      const dmExpr = (props.defaultMessage ?? "").trim();
      const defaults =
        msgs.length === 0 && holes?.length === 1 && holes[0] === dmExpr
          ? (unions.values.get(dmExpr) ?? [])
          : msgs;
      ids.forEach((id, i) => {
        // Equal branch counts pair up (ternary ids); a single default applies
        // to all; anything else is left unresolved rather than invented.
        const dm = defaults.length === 1 ? defaults[0] : (defaults[i] ?? null);
        record(id, dm ?? null, file, line);
      });
    }

    // t("…", "…") — the local translate seam
    for (const m of masked.matchAll(TRANSLATE_ALIAS)) {
      const open = m.index + m[0].length - 1;
      const end = matchBracket(masked, open);
      if (end < 0) continue;
      calls++;
      const line = at(m.index + m[0].length);
      const args = splitArgs(masked.slice(open + 1, end - 1));
      const ids = valueLiterals(args[0] ?? "", unions);
      if (ids.length === 0) {
        unresolved(args[0] ?? "", file, line);
        continue;
      }
      const msgs = valueLiterals(args[1] ?? "", unions);
      ids.forEach((id, i) => {
        const dm = msgs.length === 1 ? msgs[0] : (msgs[i] ?? null);
        record(id, dm ?? null, file, line);
      });
    }
  }

  return { sites, dynamic, calls, files: files.length, unverified };
}

/** Best defaultMessage per id (first site that supplies one wins). */
export function defaultsFor(sites) {
  const defaults = new Map();
  for (const [id, list] of sites) {
    const found = list.find((s) => typeof s.defaultMessage === "string");
    if (found) defaults.set(id, found.defaultMessage);
  }
  return defaults;
}

/**
 * Dotted key → value for flat *or* nested locale files, so both shapes
 * compare as one key space. A file that mixes the two is rejected: the same
 * id would then resolve to two different places.
 */
export function flattenMessages(obj, prefix = "", out = new Map(), from = "") {
  for (const [key, value] of Object.entries(obj)) {
    const dotted = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      flattenMessages(value, dotted, out, `${from}${key}.`);
    } else {
      if (out.has(dotted)) {
        throw new Error(
          `locale file mixes flat and nested keys: "${dotted}" exists both flat and nested under "${from}"`,
        );
      }
      out.set(dotted, value);
    }
  }
  return out;
}

const hasNested = (obj) => Object.values(obj).some((v) => v && typeof v === "object");

/** Assign a dotted key without changing the file's flat/nested shape. */
const setMessage = (obj, dottedKey, value) => {
  if (!hasNested(obj)) {
    obj[dottedKey] = value;
    return;
  }
  const parts = dottedKey.split(".");
  let node = obj;
  for (const part of parts.slice(0, -1)) {
    if (!node[part] || typeof node[part] !== "object") node[part] = {};
    node = node[part];
  }
  node[parts.at(-1)] = value;
};

const localePath = (name) => join(LOCALES, name);
const readLocale = (name) => JSON.parse(readFileSync(localePath(name), "utf8"));
const writeLocale = (name, obj) => writeFileSync(localePath(name), `${JSON.stringify(obj, null, 2)}\n`);

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function main(argv = []) {
  const check = argv.includes("--check");
  const scan = scanMessages();
  const defaults = defaultsFor(scan.sites);
  const en = readLocale("en.json");
  const id = readLocale("id.json");
  const enKeys = flattenMessages(en);
  const idKeys = flattenMessages(id);

  const referenced = [...scan.sites.keys()].sort();
  // Referenced but absent, and nothing in code to fall back on: a human has to
  // supply the default. Never inject a guess — and never report OK, because
  // "absent with no default to inject" is exactly the shape of a bug that ships
  // an English fallback into a translated page.
  const unresolvable = referenced.filter((k) => !enKeys.has(k) && !defaults.has(k));
  const missingEn = referenced.filter((k) => !enKeys.has(k) && defaults.has(k));
  const missingId = referenced.filter((k) => !idKeys.has(k) && defaults.has(k));
  const absentEn = referenced.filter((k) => !enKeys.has(k));
  const absentId = referenced.filter((k) => !idKeys.has(k));

  // A template id nobody could expand is not a maybe. When the catalogs hold
  // no key at all under its literal prefix, every id it can build is missing —
  // provable without knowing the hole, so it is a hard failure.
  const orphanTemplates = scan.unverified
    .filter((site) => site.template)
    .map((site) => ({ ...site, prefix: site.expr.split("${")[0] }))
    .filter(
      (site) =>
        site.prefix.length >= 2 &&
        ![...enKeys.keys()].some((k) => k.startsWith(site.prefix)) &&
        ![...idKeys.keys()].some((k) => k.startsWith(site.prefix)),
    );

  console.log(
    `i18n sync${check ? " --check" : ""} — scanned ${plural(scan.files, "file")} under apps/client/src`,
  );
  console.log(
    `  ${plural(scan.calls, "message call site")} · ${plural(referenced.length, "unique id")} · ${plural(scan.dynamic, "dynamic id expression")} UNVERIFIED (no static id to check)`,
  );

  if (scan.unverified.length > 0) {
    console.log(
      `  these ${scan.dynamic} call sites are not machine-checked — add a literal union or a literal id to cover one:`,
    );
    for (const site of scan.unverified) {
      console.log(`  - ${site.file}:${site.line}${site.template ? "  [template]" : ""}  ${site.expr}`);
    }
  }

  if (unresolvable.length > 0) {
    console.log(`  referenced without defaultMessage, cannot inject (${unresolvable.length}):`);
    for (const key of unresolvable) {
      for (const site of scan.sites.get(key)) {
        console.log(`  - ${key}  ${site.file}:${site.line}`);
      }
    }
  }

  // An id present in code and in no catalog is a defect, not a to-do — and
  // `--check` used to pass on it, because with no defaultMessage there was
  // nothing to inject. Report the catalog it is missing from.
  const absentCatalogs = [
    ["en.json", absentEn],
    ["id.json", absentId],
  ].filter(([, keys]) => keys.length > 0);
  for (const [file, keys] of absentCatalogs) {
    console.log(`  referenced in code but absent from ${file} (${keys.length}):`);
    for (const key of keys) console.log(`  - ${key}  ${scan.sites.get(key)[0].file}:${scan.sites.get(key)[0].line}`);
  }

  if (orphanTemplates.length > 0) {
    console.log(
      `  template id built under a prefix no locale key uses (${orphanTemplates.length}) — every id it can produce is missing:`,
    );
    for (const site of orphanTemplates) {
      console.log(`  - ${site.file}:${site.line}  ${site.expr}`);
    }
  }

  if (missingEn.length === 0 && missingId.length === 0) {
    console.log(`  injected into en.json: 0`);
    console.log(`  injected into id.json: 0`);
    if (unresolvable.length === 0 && orphanTemplates.length === 0 && absentCatalogs.length === 0) {
      console.log(
        `i18n sync OK — every id this gate can read statically exists in en.json and id.json; ${scan.dynamic} dynamic id expressions remain unverified and are listed above.`,
      );
      return 0;
    }
    console.log("FAIL — ids above have no locale entry and no defaultMessage in code.");
    return 1;
  }

  for (const key of missingEn) setMessage(en, key, defaults.get(key));
  for (const key of missingId) setMessage(id, key, defaults.get(key));

  console.log(`  injected into en.json: ${missingEn.length} (value = defaultMessage from code)`);
  console.log(`  injected into id.json: ${missingId.length} (value = defaultMessage — PLACEHOLDER)`);
  console.log(`Indonesian placeholders awaiting translation (${missingId.length}):`);
  for (const key of missingId) {
    console.log(`  - ${key} = "${defaults.get(key)}"`);
  }

  // One shared id reused with page-specific wording can only store one string.
  // Report the clash instead of letting the alphabetically-first page win
  // silently — splitting the id is a code change, not a locale one.
  const clashing = missingEn.filter(
    (key) => new Set(scan.sites.get(key).map((site) => site.defaultMessage)).size > 1,
  );
  if (clashing.length > 0) {
    console.log(`  shared id reused with page-specific defaultMessage (${clashing.length}) — one string won, split the id:`);
    for (const key of clashing) {
      const variants = [...new Set(scan.sites.get(key).map((site) => site.defaultMessage))];
      console.log(`  - ${key} = ${variants.map((variant) => `"${variant}"`).join(" | ")}`);
    }
  }

  if (check) {
    console.log(
      `FAIL — run \`bun scripts/sync-i18n.mjs\` locally and commit apps/client/src/locales/{en,id}.json.`,
    );
    return 1;
  }

  writeLocale("en.json", en);
  writeLocale("id.json", id);
  console.log(
    `wrote en.json (+${missingEn.length} → ${flattenMessages(readLocale("en.json")).size} keys), id.json (+${missingId.length} → ${flattenMessages(readLocale("id.json")).size} keys)`,
  );
  return unresolvable.length > 0 || orphanTemplates.length > 0 ? 1 : 0;
}

const isMain = import.meta.main ?? process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    process.exit(main(process.argv.slice(2)));
  } catch (error) {
    console.error(`i18n sync FAIL — ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
