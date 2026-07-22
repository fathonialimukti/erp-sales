import { randomUUID } from 'crypto';
import nodemailer from 'nodemailer';

export function createSmtpTransport() {
  const host = process.env.SMTP_HOST ?? 'smtp-relay.brevo.com';
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) throw new Error('SMTP_USER/SMTP_PASS not configured');
  return nodemailer.createTransport({
    host,
    port,
    secure: false,
    auth: { user, pass },
  });
}

export function generateMessageId(domain = 'aetherglo.com') {
  return `<${randomUUID()}@${domain}>`;
}

export async function sendSmtpEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
  inReplyTo?: string;
  references?: string;
}): Promise<{ messageId: string }> {
  const from = process.env.SMTP_FROM ?? 'AetherGlo Sales <info@aetherglo.com>';
  const messageId = generateMessageId();
  const transport = createSmtpTransport();
  await transport.sendMail({
    from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    messageId,
    inReplyTo: input.inReplyTo,
    references: input.references,
    headers: {
      'Message-ID': messageId,
      ...(input.inReplyTo ? { 'In-Reply-To': input.inReplyTo } : {}),
      ...(input.references ? { References: input.references } : {}),
    },
  });
  return { messageId };
}
