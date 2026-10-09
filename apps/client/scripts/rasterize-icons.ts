/**
 * Regenerates every rasterized brand asset from its SVG source.
 *
 * The PNG icons and og-image.png are hand-maintained by default, which means
 * any brand-mark edit silently desyncs them. Run this after touching the SVGs:
 *
 *   bun run icons:raster
 *
 * Sources:
 *   src/assets/brand/mark.svg          -> favicon-16/32, apple-touch, android-chrome
 *   src/assets/brand/mark-maskable.svg-> maskable-icon-192/512 (safe-zone padded)
 *   public/og-image.svg               -> og-image.png (1200x630)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

const here = dirname(fileURLToPath(import.meta.url));
const app = resolve(here, "..");
const pub = resolve(app, "public");
const brand = resolve(app, "src/assets/brand");

const read = (p: string) => Bun.file(p).text();

/** Render an SVG source to a PNG buffer at the given pixel width. */
async function png(svg: string, width: number): Promise<Uint8Array> {
  const r = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    // Icons are drawn on their own tile, but og-image.png is flattened so it
    // renders identically on social scrapers that ignore alpha.
    background: svg.includes("og-image") ? undefined : "rgba(0,0,0,0)",
  });
  return r.render().asPng();
}

/** Minimal single-image ICO wrapping a PNG payload. */
function ico(pngBytes: Uint8Array, size: number): Uint8Array {
  const header = new Uint8Array(6);
  const view = new DataView(header.buffer);
  view.setUint16(0, 0, true); // reserved
  view.setUint16(2, 1, true); // type: icon
  view.setUint16(4, 1, true); // image count

  const entry = new Uint8Array(16);
  const ev = new DataView(entry.buffer);
  entry[0] = size >= 256 ? 0 : size; // 0 encodes 256
  entry[1] = size >= 256 ? 0 : size;
  entry[2] = 0; // palette size
  entry[3] = 0; // reserved
  ev.setUint16(4, 1, true); // color planes
  ev.setUint16(6, 32, true); // bits per pixel
  ev.setUint32(8, pngBytes.length, true);
  ev.setUint32(12, 6 + 16, true); // offset

  const out = new Uint8Array(header.length + entry.length + pngBytes.length);
  out.set(header, 0);
  out.set(entry, header.length);
  out.set(pngBytes, header.length + entry.length);
  return out;
}

async function emit(path: string, bytes: Uint8Array) {
  await Bun.write(path, bytes);
  console.log(`  ${path.replace(app + "/", "")}  (${bytes.length} B)`);
}

const [markSvg, maskableSvg, ogSvg] = await Promise.all([
  read(resolve(brand, "mark.svg")),
  read(resolve(brand, "mark-maskable.svg")),
  read(resolve(pub, "og-image.svg")),
]);

mkdirSync(pub, { recursive: true });

console.log("favicon + touch icons (mark.svg):");
for (const [file, size] of [
  ["favicon-16x16.png", 16],
  ["favicon-32x32.png", 32],
  ["apple-touch-icon.png", 180],
  ["android-chrome-192x192.png", 192],
  ["android-chrome-512x512.png", 512],
] as const) {
  await emit(resolve(pub, file), await png(markSvg, size));
}
await emit(resolve(pub, "favicon.ico"), ico(await png(markSvg, 32), 32));

console.log("maskable icons (mark-maskable.svg):");
for (const [file, size] of [
  ["maskable-icon-192.png", 192],
  ["maskable-icon-512.png", 512],
] as const) {
  await emit(resolve(pub, file), await png(maskableSvg, size));
}

console.log("og image + brand sheet:");
await emit(resolve(pub, "og-image.png"), await png(ogSvg, 1200));
await emit(resolve(brand, "brand-1024.png"), await png(markSvg, 1024));

console.log("done.");