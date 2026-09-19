import { randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { backupEnvelopeSchema, type BackupEnvelope } from '@repo/schemas/backup';
import { Prisma } from '../prisma/generated/client';
import { prisma, type DbClient } from './prisma.js';

type Row = Record<string, unknown>;

type DmmfField = {
    kind: string;
    name: string;
    type: string;
};

type DmmfModel = {
    name: string;
    dbName?: string;
    fields: DmmfField[];
};

type VectorColumn = {
    field: string;
    column: string;
    nativeType: string;
};

type VectorTableMeta = {
    table: string;
    pk: { field: string; column: string };
    vectors: VectorColumn[];
};

type TableDelegate = {
    findMany: () => Promise<Row[]>;
    createMany: (args: { data: Row[] }) => Promise<{ count: number }>;
    deleteMany: () => Promise<{ count: number }>;
};

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url)); // apps/server/src/lib

export const BACKUPS_DIR: string = path.resolve(MODULE_DIR, '../../backups'); // apps/server/backups

// The generated client copies the exact schema it was built from (see build script).
const GENERATED_SCHEMA_PATH = path.resolve(MODULE_DIR, '../prisma/generated/schema.prisma');

// Directory is created on demand at import time so every consumer can rely on it.
mkdirSync(BACKUPS_DIR, { recursive: true });

const ULID_ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function generateUlid(): string {
    let time = Date.now();
    let timePart = '';
    for (let i = 0; i < 10; i++) {
        timePart = ULID_ENCODING[time % 32] + timePart;
        time = Math.floor(time / 32);
    }
    let random = BigInt(`0x${randomBytes(10).toString('hex')}`);
    let randomPart = '';
    for (let i = 0; i < 16; i++) {
        randomPart = ULID_ENCODING[Number(random % 32n)] + randomPart;
        random /= 32n;
    }
    return timePart + randomPart;
}

function getDmmfModels(): DmmfModel[] {
    return Prisma.dmmf.datamodel.models as unknown as DmmfModel[];
}

/**
 * ponytail: Prisma 7's runtime DMMF drops `relationFromFields`, so FK direction
 * (which side holds the foreign key) is derived by parsing the generated schema
 * snapshot — the exact schema the client was generated from.
 */
function extractForeignKeyEdges(schemaText: string): Map<string, string[]> {
    const edges = new Map<string, string[]>();
    let currentModel: string | null = null;
    for (const line of schemaText.split('\n')) {
        const modelMatch = /^model\s+(\w+)\s*\{/.exec(line);
        const modelName = modelMatch?.[1];
        if (modelName) {
            currentModel = modelName;
            if (!edges.has(currentModel)) edges.set(currentModel, []);
            continue;
        }
        if (currentModel !== null && line.startsWith('}')) {
            currentModel = null;
            continue;
        }
        if (currentModel === null || line.trimStart().startsWith('//')) continue;
        const fkMatch = /^\s{2,}\w+\s+(\w+)\??(?:\[\])?\s*.*@relation\([^)]*\bfields\s*:/.exec(line);
        const depModel = fkMatch?.[1];
        if (depModel) {
            const deps = edges.get(currentModel)!;
            if (!deps.includes(depModel)) deps.push(depModel);
        }
    }
    return edges;
}

// ponytail: delegates are accessed by lowerFirst(modelName) via the client map
function tableDelegate(db: DbClient, name: string): TableDelegate {
    const delegate = (db as Record<string, unknown>)[name.charAt(0).toLowerCase() + name.slice(1)];
    if (!delegate) throw new Error(`UNKNOWN_TABLE: ${name}`);
    return delegate as TableDelegate;
}

// Side-channel key attached to exported rows of tables that own pgvector `Unsupported` columns.
const VECTOR_TEXT_KEY = '__vectorText';

/**
 * ponytail: Prisma 7's runtime DMMF drops `Unsupported` fields entirely — the pgvector
 * `embedding` column is invisible to both the DMMF and Prisma Client — so vector round-trip
 * metadata is parsed from the same generated schema snapshot used for FK ordering.
 * Not hardcoded per model: every `Unsupported("<native>")` scalar with a field-level `@id`
 * pk in the schema gets round-tripped.
 */
function extractVectorSchema(schemaText: string): Map<string, { pk: { field: string; column: string } | null; vectors: VectorColumn[] }> {
    const parsed = new Map<string, { pk: { field: string; column: string } | null; vectors: VectorColumn[] }>();
    let currentModel: string | null = null;
    for (const line of schemaText.split('\n')) {
        const modelMatch = /^model\s+(\w+)\s*\{/.exec(line);
        const modelName = modelMatch?.[1];
        if (modelName) {
            currentModel = modelName;
            continue;
        }
        if (currentModel !== null && line.startsWith('}')) {
            currentModel = null;
            continue;
        }
        if (currentModel === null || line.trimStart().startsWith('//')) continue;
        const fieldMatch = /^\s{2,}(\w+)\s/.exec(line);
        const field = fieldMatch?.[1];
        if (!field) continue; // @@model-level directives start with '@' and never match here.
        const column = /@map\("([^"]+)"\)/.exec(line)?.[1] ?? field;
        const vectorMatch = /^\s{2,}\w+\s+Unsupported\("(\w+)"\)/.exec(line);
        const isPk = /(?<!@)@id\b/.test(line);
        if (!isPk && !vectorMatch?.[1]) continue;

        const entry = parsed.get(currentModel) ?? { pk: null, vectors: [] as VectorColumn[] };
        if (isPk) entry.pk = { field, column };
        if (vectorMatch?.[1]) entry.vectors.push({ field, column, nativeType: vectorMatch[1] });
        parsed.set(currentModel, entry);
    }
    return parsed;
}

function getVectorTableMeta(): Map<string, VectorTableMeta> {
    const schemaText = readFileSync(GENERATED_SCHEMA_PATH, 'utf8');
    const models = getDmmfModels();
    const meta = new Map<string, VectorTableMeta>();
    for (const [modelName, { pk, vectors }] of extractVectorSchema(schemaText)) {
        if (!pk || vectors.length === 0) continue;
        const table = models.find((model) => model.name === modelName)?.dbName ?? modelName;
        meta.set(modelName, { table, pk, vectors });
    }
    return meta;
}

export async function getOrderedTableNames(): Promise<string[]> {
    const models = getDmmfModels();
    const fkEdges = extractForeignKeyEdges(readFileSync(GENERATED_SCHEMA_PATH, 'utf8'));
    const known = new Set(models.map((model) => model.name));

    // Post-order DFS: parents (referenced tables) before children (FK holders).
    const order: string[] = [];
    const state = new Map<string, 'visiting' | 'done'>();
    const visit = (name: string): void => {
        const current = state.get(name);
        if (current === 'done') return;
        if (current === 'visiting') throw new Error(`CIRCULAR_TABLE_DEPENDENCY: ${name}`);
        state.set(name, 'visiting');
        for (const dep of fkEdges.get(name) ?? []) {
            if (dep !== name && known.has(dep)) visit(dep);
        }
        state.set(name, 'done');
        order.push(name);
    };
    for (const model of models) visit(model.name);
    return order;
}

function getDateFieldNames(model: DmmfModel | undefined): string[] {
    if (!model) return [];
    return model.fields.filter((field) => field.kind === 'scalar' && field.type === 'DateTime').map((field) => field.name);
}

function reviveDateFields(row: Row, dateFieldNames: string[]): Row {
    const revived: Row = { ...row };
    for (const field of dateFieldNames) {
        const value = revived[field];
        if (typeof value === 'string') revived[field] = new Date(value);
    }
    return revived;
}

export async function exportBackupToDisk(input: {
    schemaVersion: string;
}): Promise<{ filename: string; sizeBytes: number; tableCounts: Record<string, number>; schemaVersion: string }> {
    const ordered = await getOrderedTableNames();
    const vectorMeta = getVectorTableMeta();
    const data: Record<string, Row[]> = {};
    const tableCounts: Record<string, number> = {};
    for (const name of ordered) {
        const rows = await tableDelegate(prisma, name).findMany();
        // Prisma Client cannot read Unsupported columns — capture vectors as text side-channel.
        const meta = vectorMeta.get(name);
        if (meta && rows.length > 0) await attachVectorText(prisma, meta, rows);
        data[name] = rows;
        tableCounts[name] = rows.length;
    }
    const envelope: BackupEnvelope = {
        meta: {
            schemaVersion: input.schemaVersion,
            createdAt: new Date().toISOString(),
            tableCounts,
        },
        data,
    };
    const { filename, sizeBytes } = await writeBackupFile(envelope);
    return { filename, sizeBytes, tableCounts, schemaVersion: input.schemaVersion };
}

export async function writeBackupFile(envelope: BackupEnvelope): Promise<{ filename: string; sizeBytes: number }> {
    await fs.mkdir(BACKUPS_DIR, { recursive: true });
    const content = JSON.stringify(envelope);
    const filename = `${generateUlid()}-${new Date().toISOString()}.json`;
    await fs.writeFile(path.join(BACKUPS_DIR, filename), content, 'utf8');
    return { filename, sizeBytes: Buffer.byteLength(content, 'utf8') };
}

export async function readBackupFile(filename: string): Promise<string> {
    const filePath = path.join(BACKUPS_DIR, path.basename(filename));
    try {
        return await fs.readFile(filePath, 'utf8');
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            throw new Error('BACKUP_FILE_NOT_FOUND');
        }
        throw error;
    }
}

export async function deleteBackupFile(filename: string): Promise<void> {
    await fs.rm(path.join(BACKUPS_DIR, path.basename(filename)), { force: true });
}

export function parseBackupEnvelope(content: string): BackupEnvelope {
    let parsed: unknown;
    try {
        parsed = JSON.parse(content);
    } catch {
        throw new Error('BACKUP_FILE_MALFORMED');
    }
    return backupEnvelopeSchema.parse(parsed);
}

// ponytail: Prisma Client cannot read Unsupported columns, so vector values ride along as
// `<column>::text` in a per-row side-channel object — zod's `data` rows are `unknown[]`, so the
// envelope stays a valid backupEnvelopeSchema document. pgvector's text output is a valid
// vector literal input, so the same string re-casts with `::vector` on restore.
async function attachVectorText(db: DbClient, meta: VectorTableMeta, rows: Row[]): Promise<void> {
    const selects = [
        `"${meta.pk.column}" AS "__pk"`,
        ...meta.vectors.map((v) => `"${v.column}"::text AS "${v.field}"`),
    ];
    const rawRows = await db.$queryRawUnsafe<Row[]>(`SELECT ${selects.join(', ')} FROM "${meta.table}"`);
    const textByPk = new Map<string, Record<string, string | null>>();
    for (const rawRow of rawRows) {
        const pk = rawRow['__pk'];
        if (typeof pk !== 'string') continue;
        const text: Record<string, string | null> = {};
        for (const v of meta.vectors) {
            const value = rawRow[v.field];
            text[v.field] = typeof value === 'string' ? value : null;
        }
        textByPk.set(pk, text);
    }
    for (const row of rows) {
        const pk = row[meta.pk.field];
        if (typeof pk !== 'string') continue;
        const text = textByPk.get(pk);
        if (text) row[VECTOR_TEXT_KEY] = text;
    }
}

// Re-cast the exported vector text (`::vector`) inside the same restore transaction. createMany
// has just re-inserted these rows with their original ids, so the UPDATE targets exactly those.
async function applyVectorText(db: Prisma.TransactionClient, meta: VectorTableMeta, rows: Row[]): Promise<void> {
    for (const row of rows) {
        const vectorText = row[VECTOR_TEXT_KEY] as Record<string, string | null> | undefined;
        if (!vectorText) continue; // legacy envelope captured before the vector side-channel existed
        const pk = row[meta.pk.field];
        if (typeof pk !== 'string') continue;
        for (const v of meta.vectors) {
            const text = vectorText[v.field] ?? null;
            const updated = await db.$executeRawUnsafe(
                `UPDATE "${meta.table}" SET "${v.column}" = $1::${v.nativeType} WHERE "${meta.pk.column}" = $2`,
                text,
                pk,
            );
            // Never fall back to silent NULL: a miss means the row vanished mid-restore.
            if (updated === 0) throw new Error(`VECTOR_RESTORE_MISS: ${meta.table}.${v.column} pk=${pk}`);
        }
    }
}

// All-or-nothing is the caller's transaction: this only receives `db` and never opens one.
export async function restoreFromBackup(
    db: Prisma.TransactionClient,
    envelope: BackupEnvelope,
): Promise<{ tableCounts: Record<string, number> }> {
    const ordered = await getOrderedTableNames();

    // A schema-valid envelope whose `data` omits table keys (e.g. a truncated upload with a
    // matching schemaVersion) would silently wipe every unlisted table below. Refuse before
    // the first deleteMany; the caller's transaction rolls back having written nothing.
    const missingTable = ordered.find((name) => !(name in envelope.data));
    if (missingTable) throw new Error(`BACKUP_FILE_INCOMPLETE: ${missingTable}`);

    const models = getDmmfModels();
    const vectorMeta = getVectorTableMeta();

    // Wipe children before parents (reverse topological order) ...
    for (const name of [...ordered].reverse()) {
        await tableDelegate(db, name).deleteMany();
    }

    // ... then insert parents before children.
    const tableCounts: Record<string, number> = {};
    for (const name of ordered) {
        // The guard above guarantees every ordered table key exists; `?? []` is a type-level fallback only.
        const rows = (envelope.data[name] ?? []) as Row[];
        const dateFieldNames = getDateFieldNames(models.find((model) => model.name === name));
        // Strip the vector side-channel before createMany — Prisma rejects unknown fields, and
        // Unsupported columns are re-applied via raw SQL right after the insert.
        const data = rows.map((row) => {
            const { [VECTOR_TEXT_KEY]: _vectorText, ...rest } = row;
            return reviveDateFields(rest, dateFieldNames);
        });
        if (data.length > 0) {
            await tableDelegate(db, name).createMany({ data });
        }
        const meta = vectorMeta.get(name);
        if (meta && rows.length > 0) {
            await applyVectorText(db, meta, rows);
        }
        tableCounts[name] = data.length;
    }
    return { tableCounts };
}
