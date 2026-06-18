#!/usr/bin/env bash
# Migrate remaining @heroui/react imports to native ui/ primitives.
# Idempotent — only rewrites files that still have HeroUI imports.
set -euo pipefail

cd /workspaces/erp-sales/apps/client

# 1) Find all files with HeroUI imports
FILES=$(grep -rl "@heroui" src/ 2>/dev/null || true)
if [ -z "$FILES" ]; then
  echo "No files with @heroui imports found."
  exit 0
fi

for F in $FILES; do
  echo "Migrating: $F"

  # Read the file
  python3 - "$F" <<'PY'
import sys, re

path = sys.argv[1]
with open(path, 'r', encoding='utf-8') as f:
    src = f.read()

# 1) Map HeroUI exports to our ui/ exports
mapping = {
    # JSX components
    'Button': 'Button',
    'Card': 'Card',
    'CardHeader': 'CardHeader',
    'CardTitle': 'CardTitle',
    'CardDescription': 'CardDescription',
    'CardBody': 'CardBody',
    'CardFooter': 'CardFooter',
    'CardContent': 'CardContent',
    'Input': 'Input',
    'TextArea': 'Textarea',       # case differs in our lib
    'TextField': 'FormField',     # wrapper around Input; we'll do best-effort
    'Select': 'Select',
    'SelectItem': 'SelectItem',
    'SearchField': 'SearchField',
    'Checkbox': 'Checkbox',
    'Chip': 'Chip',
    'Modal': 'Modal',
    'ModalHeader': 'ModalHeader',
    'ModalBody': 'ModalBody',
    'ModalFooter': 'ModalFooter',
    'ModalContent': 'ModalContent',
    'Dropdown': 'Dropdown',
    'DropdownItem': 'DropdownItem',
    'DropdownMenu': 'DropdownMenu',
    'DropdownTrigger': 'DropdownTrigger',
    'DropdownSeparator': 'DropdownSeparator',
    'Pagination': 'Pagination',
    'Spinner': 'Spinner',
    'EmptyState': 'EmptyState',
    'Tooltip': 'Tooltip',
    'Separator': 'Separator',
    'Label': 'Label',
    'FieldError': 'FieldError',
    'ListBox': 'ListBox',
    # Table compound → our headless table
    'Table': 'Table',
    'TableHeader': 'THead',
    'TableBody': 'TBody',
    'TableRow': 'TR',
    'TableColumn': 'TH',
    'TableCell': 'TD',
    'TableHead': 'THead',
}

# 2) Replace import line(s) from @heroui/react with our barrel
import_pattern = re.compile(
    r"import\s*\{([^}]*)\}\s*from\s*['\"]@heroui/react['\"]\s*;?",
    re.MULTILINE,
)

def remap_names(names_text: str) -> str:
    parts = [p.strip() for p in names_text.split(',') if p.strip()]
    out = []
    for p in parts:
        # handle "X as Y" — keep as is
        if ' as ' in p:
            out.append(p)
            continue
        out.append(mapping.get(p, p))
    return ', '.join(dict.fromkeys(out))  # dedupe, preserve order

def replace_import(m):
    inner = remap_names(m.group(1))
    return f"import {{ {inner} }} from '../ui';"

new_src, n = import_pattern.subn(replace_import, src)
print(f"  imports replaced: {n}")

# 3) Adjust relative import depth based on file location
# pages/<feature>/*.tsx → ../../ui
# pages/*.tsx → ../ui
# components/*.tsx → ../ui
# components/AiAssistant/*.tsx → ../../ui
# (already done above by string '../ui' — but for pages/<feature> we need '../../ui')
if '/pages/' in path and path.count('/') > 4:
    # e.g. apps/client/src/pages/region/RegionIndexPage.tsx
    new_src = new_src.replace("from '../ui';", "from '../../ui';")
elif '/components/' in path and '/components/AiAssistant/' in path:
    new_src = new_src.replace("from '../ui';", "from '../../ui';")

with open(path, 'w', encoding='utf-8') as f:
    f.write(new_src)
PY

done

echo "Done. Re-running grep to confirm no more @heroui imports..."
REMAINING=$(grep -rl "@heroui" src/ 2>/dev/null || true)
if [ -z "$REMAINING" ]; then
  echo "  All clear."
else
  echo "  Remaining: $REMAINING"
fi
