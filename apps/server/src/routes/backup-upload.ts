import type { NextFunction, Request, Response } from 'express';
import type { BackupEnvelope } from '@repo/schemas/backup';
import { logActivity } from '../lib/activity-log.js';
import { deleteBackupFile, parseBackupEnvelope, writeBackupFile } from '../lib/backup.js';
import { withAuth } from '../lib/express-auth.js';
import { buildCreateLogDetail } from '../lib/log-detail.js';
import { prisma } from '../lib/prisma.js';

/**
 * POST /api/backups/upload — accepts a backup envelope as a raw JSON body
 * (the client POSTs the backup file's text with Content-Type: application/json).
 * Stored as an ordinary Backup row (source: UPLOADED) so it is visible and
 * restorable via the standard tRPC backup procedures.
 */
export const backupUploadHandler = withAuth({ permission: 'backup@restore' }, async (req, res, user) => {
    // express.json already parsed the envelope; round-trip to a string for the parser.
    // ponytail: deliberate JSON.stringify round-trip to reuse parseBackupEnvelope's
    // string input contract — zod still validates the actual shape.
    let envelope: BackupEnvelope;
    try {
        envelope = parseBackupEnvelope(JSON.stringify(req.body));
    } catch {
        res.status(400).json({ error: 'INVALID_BACKUP_FILE' });
        return;
    }

    const { filename, sizeBytes } = await writeBackupFile(envelope);

    // The file is already on disk — if the row insert fails, remove it instead of
    // leaving an orphaned file that no Backup row references.
    const created = await prisma.backup
        .create({
            data: {
                filename,
                sizeBytes,
                tableCounts: envelope.meta.tableCounts,
                schemaVersion: envelope.meta.schemaVersion,
                source: 'UPLOADED',
                note: req.get('x-backup-filename') ?? null,
                createdById: user.userId,
            },
            include: { createdBy: { select: { id: true, name: true } } },
        })
        .catch(async (error) => {
            await deleteBackupFile(filename);
            throw error;
        });

    await logActivity(prisma, {
        action: 'CREATE',
        userId: user.userId,
        resource: 'backup',
        resourceId: created.id,
        message: `Uploaded backup ${created.filename}`,
        detail: buildCreateLogDetail(created as unknown as Record<string, unknown>),
    });

    res.status(201).json({ backup: created });
});

/**
 * Scoped error handler for the upload route only: body-parser SyntaxError
 * (invalid JSON body, oversized body) → the contract's 400 error shape.
 * Anything else falls through to Express's default handler.
 */
export const backupUploadErrorHandler = (error: unknown, _req: Request, res: Response, next: NextFunction): void => {
    if (res.headersSent) {
        next(error);
        return;
    }
    // body-parser sets `status: 400` on malformed JSON and `413` on oversized
    // bodies — keep the HTTP status but normalize the error shape for the client.
    const status = (error as { status?: number } | null)?.status;
    if (status === 400 || status === 413) {
        res.status(status).json({ error: 'INVALID_BACKUP_FILE' });
        return;
    }
    next(error);
};
