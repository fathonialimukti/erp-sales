import { generateText, stepCountIs } from 'ai';
import { chatModel } from './ai-provider.js';
import {
  createEmailConciergeTools,
  type ConciergeRunState,
} from './email-concierge-tools.js';
import { htmlToText, sanitizeEmailHtml } from './email-html.js';
import { sendSmtpEmail } from './email-smtp.js';
import { prisma } from './prisma.js';

const MIN_OUTBOUND_GAP_MS = 60_000;
/** 50 RPM headroom → ~1.2s between agent LLM jobs */
const MIN_JOB_GAP_MS = 1_200;
/** Stuck RUNNING older than this is treated as crashed and may re-enter. */
export const STALE_RUNNING_MS = 5 * 60 * 1000;
const MAX_SUBJECT_LEN = 200;

let queue: Promise<void> = Promise.resolve();
let lastJobStartedAt = 0;

/** True when agentStatus is RUNNING and updatedAt is older than STALE_RUNNING_MS. */
export function isStaleRunning(
  agentStatus: string,
  updatedAt: Date,
  now = Date.now(),
): boolean {
  return agentStatus === 'RUNNING' && now - updatedAt.getTime() >= STALE_RUNNING_MS;
}

export type ConciergeApplyInput = {
  state: ConciergeRunState;
  conversation: {
    id: string;
    email: string;
    subject: string | null;
  };
  lastInboundMessageId?: string | null;
  lastInboundReferences?: string | null;
};

export type ConciergeApplyResult =
  | { ok: true; subject: string; html: string; text: string; messageId: string }
  | { ok: false; reason: string };

/** Pure post-loop gate — testable without AI/SMTP. */
export function validateConciergeResult(
  state: ConciergeRunState,
): { ok: true; html: string; text: string; subject?: string } | { ok: false; reason: string } {
  if (!state.finalized?.htmlBody?.trim()) {
    return { ok: false, reason: 'missing_finalize' };
  }
  const sanitized = sanitizeEmailHtml(state.finalized.htmlBody);
  if (!sanitized.ok) {
    return { ok: false, reason: `sanitize_failed:${sanitized.reason}` };
  }
  for (const doc of state.createdOrderDocNumbers) {
    if (!sanitized.html.includes(doc)) {
      return { ok: false, reason: 'missing_order_reference' };
    }
  }
  const text =
    state.finalized.textBody?.trim() || htmlToText(sanitized.html) || sanitized.html;
  const subject = state.finalized.subject?.trim().slice(0, MAX_SUBJECT_LEN);
  return {
    ok: true,
    html: sanitized.html,
    text,
    ...(subject ? { subject } : {}),
  };
}

export async function applyConciergeResult(
  input: ConciergeApplyInput,
  send: typeof sendSmtpEmail = sendSmtpEmail,
): Promise<ConciergeApplyResult> {
  const validated = validateConciergeResult(input.state);
  if (!validated.ok) return validated;

  const subject =
    validated.subject ??
    (input.conversation.subject
      ? /^re:\s/i.test(input.conversation.subject)
        ? input.conversation.subject
        : `Re: ${input.conversation.subject}`
      : 'Re: your message');

  const inReplyTo = input.lastInboundMessageId ?? undefined;
  const references = [input.lastInboundReferences, input.lastInboundMessageId]
    .filter(Boolean)
    .join(' ')
    .trim() || undefined;

  const { messageId } = await send({
    to: input.conversation.email,
    subject,
    html: validated.html,
    text: validated.text,
    ...(inReplyTo ? { inReplyTo } : {}),
    ...(references ? { references } : {}),
  });

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.emailMessage.create({
      data: {
        conversationId: input.conversation.id,
        direction: 'OUTBOUND',
        body: validated.text,
        htmlBody: validated.html,
        messageId,
        inReplyTo: inReplyTo ?? null,
        references: references ?? null,
        sendStatus: 'SENT',
        sentAt: now,
      },
    });
    await tx.emailConversation.update({
      where: { id: input.conversation.id },
      data: {
        lastMessageAt: now,
        lastOutboundAt: now,
        agentStatus: 'SENT',
        agentError: null,
      },
    });
  });

  return { ok: true, subject, html: validated.html, text: validated.text, messageId };
}

async function markFailed(conversationId: string, reason: string) {
  await prisma.emailConversation.update({
    where: { id: conversationId },
    data: {
      agentStatus: 'FAILED',
      agentError: reason.slice(0, 2000),
    },
  });
}

export async function runEmailConcierge(conversationId: string): Promise<void> {
  const conversation = await prisma.emailConversation.findUnique({
    where: { id: conversationId },
    include: {
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
      customer: { select: { id: true, name: true, code: true } },
    },
  });
  if (!conversation) return;
// Fresh RUNNING = another worker owns it; stale RUNNING = crashed job, allow re-run.
  if (
    conversation.agentStatus === 'RUNNING' &&
    !isStaleRunning(conversation.agentStatus, conversation.updatedAt)
  ) {
    return;
  }
  if (conversation.agentStatus === 'RUNNING') return;
  if (
    conversation.lastOutboundAt &&
    Date.now() - conversation.lastOutboundAt.getTime() < MIN_OUTBOUND_GAP_MS
  ) {
    return;
  }

  await prisma.emailConversation.update({
    where: { id: conversationId },
    data: { agentStatus: 'RUNNING', agentError: null },
  });

  const state: ConciergeRunState = { createdOrderDocNumbers: [] };
  const tools = createEmailConciergeTools({
    conversationId,
    customerId: conversation.customerId,
    state,
  });

  const thread = [...conversation.messages]
    .reverse()
    .map((m) => `${m.direction}: ${m.body}`)
    .join('\n\n');

  const system = [
    'You are the Email Concierge for a B2B ERP sales team.',
    'Use tools for facts (products, discounts, orders). Never invent prices or order numbers.',
    'You MUST call finalizeCustomerReply with HTML before the customer can be emailed.',
    'We cannot process file attachments. If the customer seems to rely on an attachment or the body lacks order details, politely ask them to paste product codes, quantities, and outlet in the email body — do not claim you can open PDFs or files.',
    'Free-form assistant text is never sent to the customer.',
    'If you create a draft sales order, the HTML reply MUST include the document number.',
    'Draft orders only (never auto-approve). Match the customer language.',
    'Keep replies professional and concise.',
  ].join(' ');

  const promptParts = [
    conversation.customer
      ? `Customer: ${conversation.customer.name}${conversation.customer.code ? ` (${conversation.customer.code})` : ''}`
      : `Sender email: ${conversation.email}`,
    conversation.subject ? `Subject: ${conversation.subject}` : null,
    `Conversation id: ${conversation.id}`,
    'Thread (oldest first):',
    thread || '(no messages yet)',
    'Respond to the latest inbound. Call tools as needed, then finalizeCustomerReply({ htmlBody }).',
  ].filter(Boolean);

  try {
    await generateText({
      model: chatModel,
      tools,
      stopWhen: stepCountIs(8),
      system,
      prompt: promptParts.join('\n\n'),
      temperature: 0.3,
    });

    const lastInbound = conversation.messages.find((m) => m.direction === 'INBOUND');
    const result = await applyConciergeResult({
      state,
      conversation: {
        id: conversation.id,
        email: conversation.email,
        subject: conversation.subject,
      },
      lastInboundMessageId: lastInbound?.messageId,
      lastInboundReferences: lastInbound?.references,
    });

    if (!result.ok) {
      await markFailed(conversationId, result.reason);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'concierge_error';
    console.error('email concierge failed', conversationId, err);
    await markFailed(conversationId, message);
  }
}

/**
 * Serial in-process queue with 50 RPM headroom.
 * Never fans out unbounded parallel generateText for inbound bursts.
 */
export function enqueueEmailConcierge(conversationId: string): void {
  queue = queue
    .then(async () => {
      const wait = Math.max(0, MIN_JOB_GAP_MS - (Date.now() - lastJobStartedAt));
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      lastJobStartedAt = Date.now();
      await runEmailConcierge(conversationId);
    })
    .catch((err) => {
      console.error('email concierge queue error', conversationId, err);
    });
}
