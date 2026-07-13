import type { Prisma } from '../prisma/generated/client';
import type { DbClient } from './prisma.js';
import type { ServerLocale } from './locale.js';
import { hashPassword } from './password.js';
import { getMessage } from './locale.js';
import { TRPCError } from '@trpc/server';
import type { ActionProgramType } from '../prisma/generated/client';

// ponytail: inline what the user router needs; no speculative abstractions

export const userMutationSelect = {
  id: true,
  email: true,
  name: true,
  photo: true,
  roleId: true,
  role: { select: { id: true, name: true } },
  createdAt: true,
  updatedAt: true,
} as const;

export async function getUserDetailOrThrow(params: {
  db: DbClient;
  id: string;
  locale: ServerLocale;
}) {
  const user = await params.db.user.findUnique({
    where: { id: params.id },
    select: userMutationSelect,
  });
  if (!user) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: getMessage(params.locale, 'user.notFound'),
    });
  }
  return user;
}

export async function ensureUserEmailAvailable(params: {
  db: DbClient;
  email: string;
  locale: ServerLocale;
  excludeUserId?: string;
}) {
  const existing = await params.db.user.findFirst({
    where: {
      email: params.email,
      ...(params.excludeUserId ? { id: { not: params.excludeUserId } } : {}),
    },
    select: { id: true },
  });
  if (existing) {
    throw new TRPCError({
      code: 'CONFLICT',
      message: getMessage(params.locale, 'user.emailAlreadyTaken'),
    });
  }
}

export async function buildCreateUserData(params: {
  input: { email: string; name?: string | null; password?: string; photo?: string | null; roleId?: string | null };
  locale: ServerLocale;
}): Promise<Prisma.UserCreateInput> {
  return {
    email: params.input.email,
    name: params.input.name ?? null,
    password: await hashPassword(params.input.password ?? 'password'),
    photo: params.input.photo ?? null,
    ...(params.input.roleId ? { role: { connect: { id: params.input.roleId } } } : {}),
  };
}

export async function buildUpdateUserData(params: {
  input: { email?: string; name?: string | null; password?: string; photo?: string | null; roleId?: string | null };
  locale: ServerLocale;
}): Promise<Prisma.UserUpdateInput> {
  const data: Prisma.UserUpdateInput = {};
  if (params.input.email !== undefined) data.email = params.input.email;
  if (params.input.name !== undefined) data.name = params.input.name;
  if (params.input.password) data.password = await hashPassword(params.input.password);
  // ponytail: photo lifecycle is simple — just set the new value
  if (params.input.photo !== undefined) data.photo = params.input.photo;
  if (params.input.roleId) data.role = { connect: { id: params.input.roleId } };
  return data;
}

export async function getUserDeletionStateOrThrow(params: {
  db: DbClient;
  id: string;
  locale: ServerLocale;
}) {
  const user = await params.db.user.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, email: true, photo: true },
  });
  if (!user) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: getMessage(params.locale, 'user.notFound'),
    });
  }
  return user;
}

export async function logUserMutation(params: {
  db: DbClient;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  actorUserId: string;
  targetUserId: string;
  targetUserName: string;
  detail: unknown;
}) {
  const messages: Record<string, string> = {
    CREATE: `Created user ${params.targetUserName}`,
    UPDATE: `Updated user ${params.targetUserName}`,
    DELETE: `Deleted user ${params.targetUserName}`,
  };

  await params.db.activityLog.create({
    data: {
      action: params.action,
      userId: params.actorUserId,
      resource: 'user',
      resourceId: params.targetUserId,
      message: messages[params.action] ?? `${params.action} user ${params.targetUserName}`,
      detail: params.detail as Prisma.InputJsonValue,
    },
  });
}