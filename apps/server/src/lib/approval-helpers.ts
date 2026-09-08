import { prisma } from './prisma.js';
import type { DbClient } from './prisma.js';
import type { NotificationTargetType, NotificationType } from '../prisma/generated/client';

// Standard approval history entry: { process, name, dateTime, message }
export interface ApprovalHistoryEntry {
  process: string; // "Submit" | "Approve" | "Reject" | "Area Manager" | "Regional Manager" | "Finance PIC" | "Director"
  name: string; // Display name of the actor
  dateTime: string; // ISO 8601 timestamp
  message: string; // Human-readable reason / note
}

export function pushApprovalHistory(
  existingHistory: unknown,
  entry: ApprovalHistoryEntry,
): ApprovalHistoryEntry[] {
  const prev = Array.isArray(existingHistory) ? existingHistory : [];
  return [...prev, entry];
}

export async function sendApprovalNotification(params: {
  recipientId: string;
  createdById: string;
  title: string;
  message: string;
  targetType: NotificationTargetType;
  targetId: string;
  type?: NotificationType;
  actionUrl?: string;
  /** Pass a transaction client to create the notification atomically with the state change. */
  db?: DbClient;
}) {
  const db = params.db ?? prisma;
  await db.notification.create({
    data: {
      userId: params.recipientId,
      createdById: params.createdById,
      title: params.title,
      message: params.message,
      type: params.type ?? 'INFO',
      targetType: params.targetType,
      targetId: params.targetId,
      actionUrl: params.actionUrl ?? null,
    },
  });
}