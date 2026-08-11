import { randomUUID } from 'crypto';
import nodemailer from 'nodemailer';
import { getSecretValue, getSettingValue } from './settings-service.js';
import { prisma } from './prisma.js';

export async function createSmtpTransport() {
  const host = String(await getSettingValue(prisma, 'smtp.host'));
  const port = Number(await getSettingValue(prisma, 'smtp.port'));
  const user = String(await getSettingValue(prisma, 'smtp.user'));
  const pass = await getSecretValue(prisma, 'smtp.pass');
  if (!user || !pass) throw new Error('SMTP user/pass not configured');
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
  const from = String(await getSettingValue(prisma, 'smtp.from'));
  const domain = String(await getSettingValue(prisma, 'smtp.domain'));
  const messageId = generateMessageId(domain);
  const transport = await createSmtpTransport();
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
