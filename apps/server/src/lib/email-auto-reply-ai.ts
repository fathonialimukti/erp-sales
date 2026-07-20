import { generateText } from 'ai';
import { chatModel } from './ai-provider.js';

type ConversationForReply = {
  email: string;
  subject: string | null;
  customer: { name: string; code: string | null } | null;
  messages: Array<{ direction: string; body: string }>;
};

/** Draft plain-text reply body from recent thread (same style as emailCrm.suggestReply). */
export async function generateEmailAutoReplyDraft(
  conversation: ConversationForReply,
): Promise<string> {
  const thread = [...conversation.messages]
    .reverse()
    .map((m) => `${m.direction}: ${m.body}`)
    .join('\n\n');

  const system = [
    'You are a B2B sales customer-service assistant drafting email replies for an ERP sales team.',
    "Match the customer's language. Be professional and concise.",
    'Do not invent order numbers, prices, or commitments without evidence in the thread.',
  ].join(' ');

  const promptParts = [
    conversation.customer
      ? `Customer: ${conversation.customer.name}${conversation.customer.code ? ` (${conversation.customer.code})` : ''}`
      : `Sender email: ${conversation.email}`,
    conversation.subject ? `Subject: ${conversation.subject}` : null,
    'Thread:',
    thread || '(no messages yet)',
    'Draft a reply email body only (no subject line).',
  ].filter(Boolean);

  const { text } = await generateText({
    model: chatModel,
    system,
    prompt: promptParts.join('\n\n'),
  });

  return text.trim();
}
