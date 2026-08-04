import type { Request, Response } from 'express';
import { emailInboundPayloadSchema } from '@repo/schemas/email-crm';
import { enqueueEmailConcierge } from '../lib/email-concierge.js';
import { processInboundEmail } from '../lib/email-inbound.js';
import { isValidEmailWebhookSecret } from '../lib/email-webhook-secret.js';

export async function emailInboundHandler(req: Request, res: Response) {
  console.log('🧩 Server - emailInboundHandler started');

  if (!isValidEmailWebhookSecret(req.header('x-email-webhook-secret') ?? undefined)) {
    console.error('❌ Server - invalid webhook secret');
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  console.log('✅ Server - webhook secret validated');

  const parsed = emailInboundPayloadSchema.safeParse(req.body);
  if (!parsed.success) {
    console.error('❌ Server - payload validation failed', parsed.error.flatten());
    res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
    return;
  }

  console.log('✅ Server - payload validated successfully');

  try {
    console.log('🔄 Server - calling processInboundEmail for messageId:', parsed.data.messageId);
    const result = await processInboundEmail(parsed.data);
    console.log('✅ Server - processInboundEmail completed', result);

    // Enqueue concierge only for new (non-skip, non-dedupe) inbound
    if (
      result.ok &&
      !('skipped' in result) &&
      !('deduped' in result && result.deduped) &&
      'conversationId' in result
    ) {
      console.log('🚀 Server - enqueuing concierge for conversationId:', result.conversationId);
      enqueueEmailConcierge(result.conversationId);
    } else {
      console.log('⏭️ Server - skipping concierge step');
    }

    res.status(200).json(result);
  } catch (err) {
    console.error('❌ Server - email inbound failed', err);
    res.status(500).json({ error: 'Internal error' });
  }
}
