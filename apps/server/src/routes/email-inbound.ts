import type { Request, Response } from 'express';
import { emailInboundPayloadSchema } from '@repo/schemas/email-crm';
import { enqueueEmailConcierge } from '../lib/email-concierge.js';
import { processInboundEmail } from '../lib/email-inbound.js';
import { isValidEmailWebhookSecret } from '../lib/email-webhook-secret.js';

export async function emailInboundHandler(req: Request, res: Response) {
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
    // Enqueue concierge only for new (non-skip, non-dedupe) inbound
    if (
      result.ok &&
      !('skipped' in result) &&
      !('deduped' in result && result.deduped) &&
      'conversationId' in result
    ) {
      enqueueEmailConcierge(result.conversationId);
    }
    res.status(200).json(result);
  } catch (err) {
    console.error('email inbound failed', err);
    res.status(500).json({ error: 'Internal error' });
  }
}
