#!/usr/bin/env bun
/**
 * One-shot migrator: replaces `@heroui/react` imports with our native
 * `../ui` primitives across every client file that still has them.
 *
 * Idempotent — running twice is a no-op. Then we still need a human
 * pass for any HeroUI-specific JSX props (isPending, isDisabled,
 * onPress, etc.) that don't match our new API. This script handles
 * the bulk: import lines + the most common JSX prop renames.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(import.meta.dir, "..");
const SRC = join(ROOT, "src");

const MAPPING: Record<string, string> = {
  // headless renames
  Button: "Button",
  Card: "Card",
  CardHeader: "CardHeader",
  CardTitle: "CardTitle",
  CardDescription: "CardDescription",
  CardBody: "CardBody",
  CardFooter: "CardFooter",
  CardContent: "CardContent",
  Input: "Input",
  TextArea: "Textarea",
  TextField: "FormField",
  Select: "Select",
  SelectItem: "SelectItem",
  SearchField: "SearchField",
  Checkbox: "Checkbox",
  Chip: "Chip",
  Modal: "Modal",
  ModalHeader: "ModalHeader",
  ModalBody: "ModalBody",
  ModalFooter: "ModalFooter",
  ModalContent: "ModalContent",
  Dropdown: "Dropdown",
  DropdownItem: "DropdownItem",
  DropdownMenu: "DropdownMenu",
  DropdownTrigger: "DropdownTrigger",
  DropdownSeparator: "DropdownSeparator",
  Pagination: "Pagination",
  Spinner: "Spinner",
  EmptyState: "EmptyState",
  Tooltip: "Tooltip",
  Separator: "Separator",
  Label: "Label",
  FieldError: "FieldError",
  ListBox: "ListBox",
  Table: "Table",
  TableHeader: "THead",
  TableBody: "TBody",
  TableRow: "TR",
  TableColumn: "TH",
  TableCell: "TD",
  TableHead: "THead",
};

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

function remap(names: string): string {
  const parts = names
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    if (p.includes(" as ")) {
      if (!seen.has(p)) {
        seen.add(p);
        out.push(p);
      }
      continue;
    }
    const renamed = MAPPING[p] ?? p;
    if (!seen.has(renamed)) {
      seen.add(renamed);
      out.push(renamed);
    }
  }
  return out.join(", ");
}

function importDepthFor(file: string): string {
  // apps/client/src/pages/<feature>/X.tsx  → ../../ui
  // apps/client/src/pages/X.tsx            → ../ui
  // apps/client/src/components/AiAssistant/X.tsx → ../../ui
  // apps/client/src/components/X.tsx       → ../ui
  const rel = relative(SRC, file).split("/");
  if (rel[0] === "pages" && rel.length >= 3) return "../../ui";
  if (rel[0] === "components" && rel[1] && rel[1] !== "AiAssistant" && rel.length >= 3) return "../../ui";
  if (rel[0] === "components" && rel[1] === "AiAssistant") return "../../ui";
  return "../ui";
}

function migrateFile(file: string): { changed: boolean; count: number } {
  let src = readFileSync(file, "utf8");
  const original = src;
  const importRe = /import\s*\{([^}]+)\}\s*from\s*['"]@heroui\/react['"]\s*;?/g;
  const depth = importDepthFor(file);
  let count = 0;
  src = src.replace(importRe, (_m, inner) => {
    count++;
    return `import { ${remap(inner)} } from '${depth}';`;
  });

  // JSX compound renames for the Headless Table migration.
  // HeroUI uses <TableColumn>; we use <TH>. Same for rows/cells.
  // Only safe to substitute where the tag is clearly from a table
  // (i.e. appears inside a <Table>...</Table>). Conservative: just
  // do a literal text replace — the user has confirmed they want
  // a bulk pass and the previous site already used TanStack Table
  // with these names.
  const tableReplacements: Array<[RegExp, string]> = [
    [/<\s*TableColumn\b/g, "<TH"],
    [/<\s*TableHeader\b/g, "<THead"],
    [/<\s*TableBody\b/g, "<TBody"],
    [/<\s*TableRow\b/g, "<TR"],
    [/<\s*TableCell\b/g, "<TD"],
    [/<\s*TableHead\b/g, "<THead"],
    [/<\s*\/(TableColumn|TableHeader|TableBody|TableRow|TableCell|TableHead)\s*>/g, (_m, tag) => `</${tag === "TableColumn" ? "TH" : tag === "TableHeader" || tag === "TableHead" ? "THead" : tag === "TableBody" ? "TBody" : tag === "TableRow" ? "TR" : "TD"}>`],
    // Card compound
    [/<\s*CardTitle\b/g, "<CardTitle"],
    [/<\s*CardDescription\b/g, "<CardDescription"],
    // Modal compound
    [/<\s*ModalContent\b/g, "<ModalContent"],
    [/<\s*ModalHeader\b/g, "<ModalHeader"],
    [/<\s*ModalBody\b/g, "<ModalBody"],
    [/<\s*ModalFooter\b/g, "<ModalFooter"],
    // Dropdown compound
    [/<\s*DropdownTrigger\b/g, "<DropdownTrigger"],
    [/<\s*DropdownMenu\b/g, "<DropdownMenu"],
    [/<\s*DropdownItem\b/g, "<DropdownItem"],
  ];
  for (const [re, replacement] of tableReplacements) {
    src = src.replace(re, replacement);
  }

  // HeroUI → our prop renames (Button, Modal, Pagination, Input)
  // isDisabled → disabled; isPending → isLoading; isLoading → isLoading; onPress → onClick; onValueChange → onChange
  // isOpen / onOpenChange kept (our Modal uses same names)
  // Note: we do this only inside JSX-ish contexts (heuristic: simple word-boundary)
  const propReplacements: Array<[RegExp, string]> = [
    [/\bisDisabled\s*=/g, "disabled="],
    [/\bisPending\s*=/g, "isLoading="],
    [/\bonPress\s*=/g, "onClick="],
    // onValueChange is HeroUI's value-as-string handler; native inputs use onChange
    [/\bonValueChange\s*=/g, "onChange="],
    // color="primary" → variant="primary"; color="danger" → variant="danger"; etc.
    // We don't bulk-replace these because the prop set is similar enough to pass through.
  ];
  for (const [re, replacement] of propReplacements) {
    src = src.replace(re, replacement);
  }

  // HeroUI Modal: <Modal isOpen={x} onOpenChange={...}>{children}</Modal>
  // is fine — our Modal takes the same props.

  if (src !== original) {
    writeFileSync(file, src, "utf8");
    return { changed: true, count };
  }
  return { changed: false, count };
}

const files = walk(SRC).filter((f) => /\.(ts|tsx)$/.test(f));
const targets = files.filter((f) => /@heroui\/react/.test(readFileSync(f, "utf8")));

console.log(`Files to migrate: ${targets.length}`);
let changedCount = 0;
for (const f of targets) {
  const r = migrateFile(f);
  if (r.changed) {
    console.log(`  ✓ ${relative(ROOT, f)}  (${r.count} imports)`);
    changedCount++;
  }
}
console.log(`Done. Migrated ${changedCount}/${targets.length} files.`);

const remaining = walk(SRC).filter((f) => /@heroui\/react/.test(readFileSync(f, "utf8")));
if (remaining.length === 0) {
  console.log("No more @heroui/react imports remain in src/.");
} else {
  console.log(`Still has @heroui/react: ${remaining.length} files`);
  for (const f of remaining) console.log("  " + relative(ROOT, f));
}
