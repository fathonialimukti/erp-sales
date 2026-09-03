import type { Request, Response } from 'express';
import { emailInboundPayloadSchema } from '@repo/schemas/email-crm';
import { enqueueEmailConcierge } from '../lib/email-concierge.js';
import { processInboundEmail } from '../lib/email-inbound.js';
import { isValidEmailWebhookSecret } from '../lib/email-webhook-secret.js';
import { logger } from '../lib/logger.js';

/**
 * Alias of inbound store + enqueue Email Concierge.
 * Auto-reply is server-owned SMTP after finalizeCustomerReply — NOT Cloudflare message.reply AI body.
 */
export async function emailAutoReplyHandler(req: Request, res: Response) {
  if (!isValidEmailWebhookSecret(req.header('x-email-webhook-secret') ?? undefined)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const parsed = emailInboundPayloadSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
    return;
  }

  try {
    const result = await processInboundEmail(parsed.data);

    if ('skipped' in result) {
      res.status(200).json({ ok: true, skipped: result.skipped, reply: null });
      return;
    }

    if ('deduped' in result && result.deduped) {
      res.status(200).json({
        ok: true,
        deduped: true,
        conversationId: result.conversationId,
        messageId: result.messageId,
        reply: null,
      });
      return;
    }

    enqueueEmailConcierge(result.conversationId);

    res.status(200).json({
      ok: true,
      conversationId: result.conversationId,
      messageId: result.messageId,
      linkedCustomerId: result.linkedCustomerId,
      reply: null,
    });
  } catch (err) {
    logger.error('email auto-reply failed', { error: err });
    res.status(500).json({ error: 'Internal error' });
  }
}
