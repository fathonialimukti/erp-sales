/**
 * Read-only SQL keywords allowed for AI database queries.
 * Any SQL containing forbidden write keywords is rejected before execution.
 */
const FORBIDDEN_KEYWORDS = [
    'INSERT',
    'UPDATE',
    'DELETE',
    'DROP',
    'TRUNCATE',
    'ALTER',
    'CREATE',
    'GRANT',
    'REVOKE',
    'EXECUTE',
    'CALL',
    'MERGE',
    'REPLACE',
];

/**
 * Functions that read as "query" but are not read-only in effect: server-side
 * file reads, large-object import/export, session GUC writes (which can flip
 * `role`/`search_path` for the rest of the pooled connection) and sleep.
 * Denied with the same word-boundary scan as the write keywords.
 */
const FORBIDDEN_FUNCTIONS = [
    'PG_READ_FILE',
    'PG_READ_BINARY_FILE',
    'PG_LS_DIR',
    'LO_IMPORT',
    'LO_EXPORT',
    'SET_CONFIG',
    'PG_SLEEP',
];

/**
 * Rows returned to the model when the caller does not ask for a size.
 * Kept in sync with the SQL guidelines in the AI system prompt.
 */
export const DEFAULT_QUERY_ROWS = 100;

/**
 * Hard server-side row ceiling. The caller-supplied `limit` and any `LIMIT`
 * written into the SQL are both advisory — `applyRowCap` appends its own cap
 * so an untrusted statement can never stream a whole table.
 */
export const MAX_QUERY_ROWS = 500;

/** Hard ceiling on the serialized result handed back to the model. */
export const MAX_RESULT_BYTES = 512 * 1024;

/**
 * Same byte budget, applied to a result snapshot that is PERSISTED (the admin
 * SQL gate stores rows on the AiActionConfirmation row). The row cap alone does
 * not bound size: 200 rows × 200 wide columns of 200-char values is ~8 MB of
 * JSON in a Json column, and a whole-schema SELECT is exactly the shape that
 * produces it.
 */
export const MAX_STORED_RESULT_BYTES = MAX_RESULT_BYTES;

/**
 * Drop trailing rows until the encoded snapshot fits `maxBytes`. Same contract
 * as the inner loop of `formatQueryResult`, factored out so the persisted
 * snapshot is bounded by the same number instead of a second one. Floor is one
 * row: a single already-sanitized row is far below the ceiling, so a row is
 * never dropped to zero and the result is never emptied by a size cut.
 */
export function capRowsByBytes<T>(
    rows: T[],
    maxBytes: number = MAX_STORED_RESULT_BYTES,
): { rows: T[]; truncated: boolean } {
    let kept = rows;
    while (kept.length > 1 && Buffer.byteLength(JSON.stringify(kept), 'utf8') > maxBytes) {
        kept = kept.slice(0, Math.floor(kept.length / 2));
    }
    return { rows: kept, truncated: kept.length < rows.length };
}

/**
 * Validates that a SQL string contains only read-only operations.
 * Checks for forbidden keywords, comment-based injection, and
 * semicolon-separated multi-statements.
 */
export function validateReadOnlySql(sql: string): { valid: boolean; reason?: string } {
    const trimmed = sql.trim();

    // Must start with SELECT or WITH (for CTEs)
    const upper = trimmed.toUpperCase();
    if (!upper.startsWith('SELECT') && !upper.startsWith('WITH') && !upper.startsWith('EXPLAIN')) {
        return { valid: false, reason: 'Only SELECT, WITH (CTE), and EXPLAIN queries are allowed.' };
    }

    // Block comment-based injection
    if (trimmed.includes('--') || trimmed.includes('/*')) {
        return { valid: false, reason: 'Comments are not allowed in queries.' };
    }

    // Block multi-statement queries (semicolons not inside string literals).
    // A single trailing semicolon is tolerated (the caller strips it anyway);
    // any other semicolon means a second statement and is rejected.
    const normalized = trimmed.replace(/;\s*$/, '');
    let inQuote = false;
    let semicolonCount = 0;
    for (let i = 0; i < normalized.length; i++) {
        if (normalized[i] === "'" && (i === 0 || normalized[i - 1] !== '\\')) {
            inQuote = !inQuote;
        } else if (normalized[i] === ';' && !inQuote) {
            semicolonCount++;
        }
    }
    if (semicolonCount > 0) {
        return { valid: false, reason: 'Multiple statements are not allowed.' };
    }

    // Check forbidden keywords (outside of string literals)
    // Remove string literals first, then check
    const withoutStrings = trimmed.replace(/'(?:[^'\\]|\\.)*'/g, "''");
    const upperNoStrings = withoutStrings.toUpperCase();

    for (const keyword of [...FORBIDDEN_KEYWORDS, ...FORBIDDEN_FUNCTIONS]) {
        // Use word boundary check to avoid false positives (e.g., "description" contains "delete")
        const regex = new RegExp(`\\b${keyword}\\b`, 'i');
        if (regex.test(upperNoStrings)) {
            return { valid: false, reason: `Query rejected: ${keyword} is not allowed. Only read-only queries are permitted.` };
        }
    }

    return { valid: true };
}

/**
 * Wrap a validated query so `maxRows` is enforced server-side.
 *
 * A user-written `LIMIT` is inside the subquery and therefore advisory: the
 * outer cap is what the database is obliged to honour. `EXPLAIN` is left alone
 * — it returns a plan rather than table rows, so a row cap is meaningless there
 * (the result-size ceiling still applies to what comes back).
 */
export function applyRowCap(sql: string, maxRows: number = MAX_QUERY_ROWS): string {
    const body = sql.trim().replace(/;\s*$/, '');
    if (/^EXPLAIN\b/i.test(body)) return body;
    return `SELECT * FROM (${body}) AS __ai_capped LIMIT ${maxRows}`;
}

/**
 * Format a query result for the AI, handling Prisma Decimal types
 * and truncating long strings to keep token usage low.
 *
 * The encoded envelope is also held under MAX_RESULT_BYTES: rows are dropped
 * until it fits, because a wide result (many columns × 500-char values) can
 * still flood the model context after the row cap. `truncated` already means
 * "rows may be missing", so the size cut reuses that flag.
 */
export function formatQueryResult(data: unknown, rowCount: number, limit: number): string {
    const rows = Array.isArray(data) ? data : [];

    const encode = (kept: unknown[]) => {
        const truncated = kept.length < rows.length || rowCount >= limit;
        return JSON.stringify(
            {
                success: true,
                rowCount,
                data: kept,
                truncated,
                hint: truncated
                    ? 'Results truncated. Add a more specific WHERE clause or reduce the LIMIT to get targeted data.'
                    : null,
            },
            (_key, value) => {
                // Handle Prisma Decimal type (has toNumber method)
                if (value && typeof value === 'object' && typeof (value as { toNumber?: unknown }).toNumber === 'function') {
                    return (value as { toNumber: () => number }).toNumber();
                }
                // Handle BigInt
                if (typeof value === 'bigint') return value.toString();
                // Truncate very long strings to save tokens
                if (typeof value === 'string' && value.length > 500) {
                    return value.substring(0, 500) + '... [truncated]';
                }
                return value;
            },
        );
    };

    let kept = rows;
    let encoded = encode(kept);
    while (Buffer.byteLength(encoded, 'utf8') > MAX_RESULT_BYTES && kept.length > 1) {
        kept = kept.slice(0, Math.floor(kept.length / 2));
        encoded = encode(kept);
    }
    return encoded;
}

