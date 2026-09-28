import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { prisma } from '../../lib/prisma.js';
import { PERMISSIONS, ROLES, planRolePermissions } from '../../prisma/seed-access-control.js';

/**
 * Seed-to-database agreement.
 *
 * `tests/routes/ai-query-authz.test.ts` mocks `prisma.user.findUnique` and
 * hand-writes the permission list it asserts against, so it can only ever prove
 * the GATE is correct — never that the role actually carries the permission.
 * That gap shipped a fully-wired `ai@query` gate to a database that never had
 * the grant: `POST /api/ai/query` answered "Insufficient permissions" to 100%
 * of users, including System Admin, while the suite stayed green.
 *
 * These tests read the real database (the suite is sequential and shares one,
 * per vitest.config.ts) and compare it against the seed's declared intent, so
 * "the seed says X" and "the database has X" cannot silently diverge again.
 */

const AI_QUERY = 'ai@query';

async function dbPermissionNames(): Promise<string[]> {
  const rows = await prisma.permission.findMany({ select: { name: true } });
  return rows.map((r) => r.name);
}

async function rolesHolding(permissionName: string): Promise<string[]> {
  const perm = await prisma.permission.findFirst({
    where: { name: permissionName },
    select: { roles: { select: { role: { select: { name: true } } } } },
  });
  return (perm?.roles ?? []).map((r) => r.role.name).sort();
}

describe('seed permissions exist in the database', () => {
  it('has a row for every permission the seed declares', async () => {
    const inDb = new Set(await dbPermissionNames());
    const missing = PERMISSIONS.map((p) => p.name).filter((name) => !inDb.has(name)).sort();
    // The exact regression this file exists for: a permission declared in the
    // seed whose row was never created, so its gate is unsatisfiable forever.
    expect(missing).toEqual([]);
  });

  it('has a row for every role the seed declares', async () => {
    const roles = await prisma.role.findMany({ select: { name: true } });
    const inDb = new Set(roles.map((r) => r.name));
    const missing = ROLES.map((r) => r.name).filter((name) => !inDb.has(name)).sort();
    expect(missing).toEqual([]);
  });
});

describe('ai@query is granted to System Admin and to nobody else', () => {
  it('grants it to exactly the roles the seed plan assigns it to', async () => {
    // Derived from the shared plan, not hand-written, so this expectation
    // cannot drift away from what the seed actually applies.
    const planned = ROLES.filter((r) =>
      (planRolePermissions(PERMISSIONS.map((p) => p.name)).get(r.name) ?? []).includes(AI_QUERY),
    )
      .map((r) => r.name)
      .sort();

    expect(planned).toEqual(['System Admin']);
    expect(await rolesHolding(AI_QUERY)).toEqual(planned);
  });

  it('keeps it out of every non-admin role, including the @read pattern roles', async () => {
    // The Viewer's `pattern: "@read"` fallback is the specific trap: had this
    // been named `ai@read` it would have been auto-granted to every read-only
    // role, reopening the whole-schema SELECT hole the gate was added to close.
    const nonAdmin = (await rolesHolding(AI_QUERY)).filter((name) => name !== 'System Admin');
    expect(nonAdmin).toEqual([]);
  });
});

/**
 * The reverse direction: every permission the CODE gates on is one the seed creates.
 *
 * The tests above compare the seed to the database. They cannot catch a
 * permission that is missing from *both*, because there is nothing to compare —
 * and that is exactly how the backup module shipped dead: `routers/backup.ts`
 * gated five procedures on `backup@read` / `backup@create` / `backup@delete` /
 * `backup@restore` and `routes/backup-upload.ts:15` gates on `backup@restore`,
 * while `PERMISSIONS` declared none of them. `prisma db seed` `deleteMany`s every
 * permission, so a fresh environment came up with no rows for any of the four and
 * the whole module answered "Insufficient permissions" to every user. The
 * database was right and the gate was right; only the declaration was missing.
 *
 * So this reads the source instead of a hand-written list. A hand-written list
 * would be the same thing that went stale the first time, just relocated.
 */

const SRC_DIR = fileURLToPath(new URL('../../', import.meta.url));
const GATED_DIRS = ['routers', 'lib', 'routes'] as const;
/** `resource@action` is the convention placeholder in a doc comment, not a permission. */
const PLACEHOLDER_PERMISSION = 'resource@action';
/** `x@y` or `x@y@z` — the resource half may be kebab or camel, the action half may be `*`. */
const PERMISSION_SHAPED = /^[a-zA-Z][a-zA-Z0-9_-]*@[a-zA-Z0-9_@-]+$/;

type Gate = { permission: string; via: 'trpc' | 'express'; at: string };

/** Every `resource@action` string literal passed to `hasPermission` or `withAuth`. */
function collectGates(): Gate[] {
  const files = GATED_DIRS.flatMap((dir) =>
    readdirSync(join(SRC_DIR, dir))
      .filter((name) => name.endsWith('.ts') && statSync(join(SRC_DIR, dir, name)).isFile())
      .map((name) => join(dir, name)),
  ).concat(['index.ts']);

  const gates: Gate[] = [];
  for (const file of files) {
    readFileSync(join(SRC_DIR, file), 'utf8')
      .split('\n')
      .forEach((line, i) => {
        const trpc = line.includes('hasPermission(');
        const express = /permission:\s*['"]/.test(line);
        if (!trpc && !express) return;
        for (const match of line.matchAll(/['"]([a-zA-Z][a-zA-Z0-9_-]*@[a-zA-Z0-9_@-]+)['"]/g)) {
          const permission = match[1];
          if (!permission || permission === PLACEHOLDER_PERMISSION || !PERMISSION_SHAPED.test(permission)) continue;
          gates.push({ permission, via: trpc ? 'trpc' : 'express', at: `${file}:${i + 1}` });
        }
      });
  }
  return gates;
}

const GATES = collectGates();
const SYSTEM_ADMIN = ROLES.find((role) => role.name === 'System Admin');

describe('every permission the code gates on is declared in the seed', () => {
  it('finds the gates — a sweep that silently matches nothing is worse than none', () => {
    // If this ever drops toward zero the extraction broke, and the assertion
    // below would start passing for the wrong reason.
    expect(GATES.length).toBeGreaterThan(100);
  });

  it('declares each of them in PERMISSIONS', () => {
    const declared = new Set(PERMISSIONS.map((p) => p.name));
    const undeclared = [...new Set(GATES.map((g) => g.permission))].filter((p) => !declared.has(p)).sort();
    // The exact regression: `backup@create` / `backup@delete` / `backup@read` /
    // `backup@restore` were gated in routers/backup.ts + routes/backup-upload.ts
    // and absent from PERMISSIONS, so a fresh seed created no row for any of them.
    expect(undeclared).toEqual([]);
  });

  it('names the undeclared gates with their file, so a failure is actionable', () => {
    const declared = new Set(PERMISSIONS.map((p) => p.name));
    const undeclared = GATES.filter((g) => !declared.has(g.permission));
    expect(undeclared.map((g) => `${g.permission} (${g.via} ${g.at})`)).toEqual([]);
  });
});

describe('Express-gated permissions are granted to System Admin by exact name', () => {
  it('lists every one of them in System Admin\'s explicit grant array', () => {
    // `withAuth` matches permission strings exactly — it does not honour the `*`
    // or `resource@*` wildcards that tRPC's `hasPermission` does
    // (lib/express-auth.ts:87 vs trpc.ts:34). A wildcard-only role therefore
    // passes a tRPC gate and is refused by the Express one. System Admin's list
    // is explicit, so the two agree; this keeps them agreeing.
    const expressGated = [...new Set(GATES.filter((g) => g.via === 'express').map((g) => g.permission))].sort();
    expect(expressGated.length).toBeGreaterThan(0);

    const granted = SYSTEM_ADMIN?.permissions ?? [];
    expect(expressGated.filter((p) => !granted.includes(p))).toEqual([]);
  });

  it('has no pattern on System Admin, so nothing there depends on wildcard expansion', () => {
    expect(SYSTEM_ADMIN?.pattern).toBeUndefined();
  });
});

