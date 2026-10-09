/**
 * Icon-system guard rails. Run after touching brand art or module tokens:
 *
 *   bun run icons:check
 *
 * Enforces the two invariants the plate system depends on:
 *   1. No SVG source contains a gradient (solid fills only, per DESIGN.md §2
 *      anti-signature "saturated gradient" and the solid/iOS brief).
 *   2. Every --module-* token carries a white glyph at >= 4.5:1 in BOTH themes,
 *      so a solid plate + white icon can never fail AA-text.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const app = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/* ── 1. gradient / defs sweep ─────────────────────────────────────────────── */

const SVG_ROOTS = [
  resolve(app, "src/assets/brand"),
  resolve(app, "src/assets/icons"),
  resolve(app, "public"),
];
const BANNED = /<(linear|radial)Gradient\b|<filter\b|<mask\b/;

const offenders: string[] = [];
let svgCount = 0;

function walk(dir: string) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith(".svg")) {
      svgCount++;
      if (BANNED.test(readFileSync(p, "utf8"))) {
        offenders.push(p.replace(app + "/", ""));
      }
    }
  }
}
for (const r of SVG_ROOTS) walk(r);

/* ── 2. white-glyph contrast on module tokens ────────────────────────────── */

function oklchToLinear(L: number, C: number, H: number): number[] {
  const h = (H * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}
const luminance = ([r, g, b]: number[]) =>
  0.2126 * Math.max(r, 0) + 0.7152 * Math.max(g, 0) + 0.0722 * Math.max(b, 0);
const contrastOnWhite = (L: number, C: number, H: number) =>
  1.05 / (luminance(oklchToLinear(L, C, H)) + 0.05);

const lines = readFileSync(resolve(app, "src/index.css"), "utf8").split("\n");
const light: Record<string, [number, number, number]> = {};
const dark: Record<string, [number, number, number]> = {};
lines.forEach((ln, i) => {
  const m = ln.match(/^\s*--module-([a-z-]+):\s*oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/);
  if (!m) return;
  const val: [number, number, number] = [Number(m[2]), Number(m[3]), Number(m[4])];
  (i < 190 ? light : dark)[m[1]] = val;
});

/* ── 3. every plate's token must actually be defined ──────────────────────── */

// A typo'd token silently renders the *fallback* hex and looks fine in the
// editor preview, but pins the plate to light mode forever. Catch it here.
const declaredVars = new Set<string>();
for (const ln of lines) {
  const m = ln.match(/^\s*(--[a-z0-9-]+):/);
  if (m) declaredVars.add(m[1]);
}

/**
 * `--plate-*` are owned by the plate component (assets/plates.tsx), not by
 * index.css: they switch a single SVG between the `solid` and `wash` variants
 * and always carry a fallback in the file. They're excluded from the token
 * check by design, not by accident.
 */
const COMPONENT_OWNED = /^--plate-(alpha|ink|detail)$/;

const unresolved: string[] = [];
for (const f of readdirSync(resolve(app, "src/assets/icons"))) {
  if (!f.endsWith(".svg")) continue;
  const svg = readFileSync(resolve(app, "src/assets/icons", f), "utf8");
  for (const m of svg.matchAll(/var\((--[a-z0-9-]+)/g)) {
    if (COMPONENT_OWNED.test(m[1])) continue;
    if (!declaredVars.has(m[1])) {
      unresolved.push(`src/assets/icons/${f} uses ${m[1]}, which index.css never declares`);
    }
  }
}

const AA_TEXT = 4.5;
const contrastFails: string[] = [];
let worst = { ratio: Infinity, where: "" };

for (const key of Object.keys(light)) {
  for (const [theme, table] of [
    ["light", light],
    ["dark", dark],
  ] as const) {
    const t = table[key];
    if (!t) {
      contrastFails.push(`--module-${key} missing in ${theme}`);
      continue;
    }
    const r = contrastOnWhite(t[0], t[1], t[2]);
    if (r < worst.ratio) worst = { ratio: r, where: `--module-${key} (${theme})` };
    if (r < AA_TEXT) {
      contrastFails.push(`--module-${key} ${theme} = ${r.toFixed(2)}:1 (needs ${AA_TEXT})`);
    }
  }
}

/* ── report ───────────────────────────────────────────────────────────────── */

console.log(`scanned ${svgCount} svg files`);
if (offenders.length) {
  console.error(`\nFAIL  gradient/defs found in ${offenders.length} file(s):`);
  for (const o of offenders) console.error(`      ${o}`);
} else {
  console.log("PASS  no gradients, filters or masks in any svg source");
}

console.log(
  `\nworst white-glyph contrast: ${worst.ratio.toFixed(2)}:1  (${worst.where})`,
);
if (contrastFails.length) {
  console.error(`FAIL  ${contrastFails.length} token contrast problem(s):`);
  for (const f of contrastFails) console.error(`      ${f}`);
} else {
  console.log(`PASS  all ${Object.keys(light).length} module tokens clear ${AA_TEXT}:1 in both themes`);
}

if (unresolved.length) {
  console.error(`\nFAIL  ${unresolved.length} unresolved CSS variable(s):`);
  for (const u of unresolved) console.error(`      ${u}`);
} else {
  console.log("PASS  every plate token resolves to a declared index.css variable");
}

if (offenders.length || contrastFails.length || unresolved.length) process.exit(1);