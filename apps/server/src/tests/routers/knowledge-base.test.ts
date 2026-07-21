import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'crypto';
import { createCaller } from '../helpers/caller.js';
import { seedRoleWithPermissions, seedTestUser, deleteTestUser, deleteTestRole } from '../helpers/seed.js';
import { prisma } from '../../lib/prisma.js';

let caller: ReturnType<typeof createCaller>;
let actorUserId: string;
let actorRoleId: string;
const createdIds: string[] = [];

beforeAll(async () => {
  const role = await seedRoleWithPermissions([
    'knowledge-base@read', 'knowledge-base@create', 'knowledge-base@update', 'knowledge-base@delete',
  ]);
  actorRoleId = role.id;
  const actor = await seedTestUser({
    roleId: actorRoleId,
    email: `knowledge-base-actor-${randomUUID()}@example.com`,
    name: 'Knowledge Base Actor',
  });
  actorUserId = actor.id;
  caller = createCaller({ userId: actor.id, email: actor.email, name: actor.name });
});

afterAll(async () => {
  for (const id of createdIds) {
    await prisma.knowledgeChunk.delete({ where: { id } }).catch(() => {});
  }
  await deleteTestUser(actorUserId);
  await deleteTestRole(actorRoleId);
});

describe('knowledge-base router', () => {
  it('lists knowledge-base entries and supports CRUD', async () => {
    const result = await caller.knowledgeBase.list({ page: 1, limit: 10 });
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.meta).toBeDefined();

    const created = await caller.knowledgeBase.create({
      title: `Test KB ${randomUUID()}`,
      content: 'This is a test knowledge entry for the RAG system.',
      source: 'unit-test',
    });
    expect(created.id).toBeTruthy();
    createdIds.push(created.id);

    const detail = await caller.knowledgeBase.detail({ id: created.id });
    expect(detail.id).toBe(created.id);

    const updated = await caller.knowledgeBase.update({
      currentId: created.id,
      title: `Updated ${created.title}`,
      content: created.content,
      source: created.source,
    });
    expect(updated.title).toContain('Updated');

    const deleted = await caller.knowledgeBase.delete({ id: created.id });
    expect(deleted.success).toBe(true);
    createdIds.splice(createdIds.indexOf(created.id), 1);
  });
});
