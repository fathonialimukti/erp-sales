import type { Request, Response } from 'express';
import { emailInboundPayloadSchema } from '@repo/schemas/email-crm';
import { enqueueEmailConcierge } from '../lib/email-concierge.js';
import { processInboundEmail } from '../lib/email-inbound.js';
import { isValidEmailWebhookSecret } from '../lib/email-webhook-secret.js';
import { logger } from '../lib/logger.js';

export async function emailInboundHandler(req: Request, res: Response) {
  logger.info('emailInboundHandler started');

  if (!isValidEmailWebhookSecret(req.header('x-email-webhook-secret') ?? undefined)) {
    logger.error('invalid webhook secret');
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  logger.info('webhook secret validated');

  const parsed = emailInboundPayloadSchema.safeParse(req.body);
  if (!parsed.success) {
    logger.error('payload validation failed', { details: parsed.error.flatten() });
    res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
    return;
  }

  logger.info('payload validated successfully');

  try {
    logger.info('calling processInboundEmail', { messageId: parsed.data.messageId });
    const result = await processInboundEmail(parsed.data);
    logger.info('processInboundEmail completed', { result });

    // Enqueue concierge only for new (non-skip, non-dedupe) inbound
    if (
      result.ok &&
      !('skipped' in result) &&
      !('deduped' in result && result.deduped) &&
      'conversationId' in result
    ) {
      logger.info('enqueuing concierge', { conversationId: result.conversationId });
      enqueueEmailConcierge(result.conversationId);
    } else {
      logger.info('skipping concierge step');
    }

    res.status(200).json(result);
  } catch (err) {
    logger.error('email inbound failed', { error: err });
    res.status(500).json({ error: 'Internal error' });
  }
}
