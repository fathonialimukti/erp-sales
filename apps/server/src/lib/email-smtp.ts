import { randomUUID } from 'crypto';
import nodemailer from 'nodemailer';
import { getSecretValue, getSettingValue } from './settings-service.js';
import { prisma } from './prisma.js';

/** Ports that speak implicit TLS; used ONLY when `smtp.secure` is unset. */
const IMPLICIT_TLS_PORTS = new Set([465]);
/**
 * Accepted `smtp.secure` values → canonical mode. Explicit setting always wins
 * over the port heuristic so any provider (Brevo, SES, Mailgun, self-hosted, an
 * unusual port/TLS combo) is configurable from Settings with no code change.
 */
const ENCRYPTION_MODES: Record<string, 'none' | 'starttls' | 'ssl'> = {
  none: 'none',
  plain: 'none',
  off: 'none',
  starttls: 'starttls',
  'start-tls': 'starttls',
  ssl: 'ssl',
  tls: 'ssl',
};
/**
 * Fail well before the reverse proxy's read timeout. A firewalled SMTP port
 * used to hang for 30s+ (T12: ETIMEDOUT) while the proxy gave up first and
 * returned its own error WITHOUT CORS headers — the browser then reported a
 * CORS failure instead of the real timeout (T13). 10s is ample for a reachable
 * relay (Brevo 2525 handshake measured ~1s).
 */
const CONNECTION_TIMEOUT_MS = 10_000;
const SOCKET_TIMEOUT_MS = 60_000;

/**
 * Resolve the transport encryption mode. `smtp.secure` is authoritative when
 * set; when absent we fall back to the legacy port heuristic (465 → implicit
 * TLS, everything else → STARTTLS) for backwards compatibility.
 */
function resolveEncryption(raw: unknown, port: number): 'none' | 'starttls' | 'ssl' {
  if (raw !== undefined && raw !== null && String(raw).trim() !== '') {
    const mode = ENCRYPTION_MODES[String(raw).trim().toLowerCase()];
    if (!mode) {
      throw new Error(
        `SMTP secure mode is invalid: ${String(raw)} (expected none|starttls|ssl)`,
      );
    }
    return mode;
  }
  return IMPLICIT_TLS_PORTS.has(port) ? 'ssl' : 'starttls';
}

export async function createSmtpTransport() {
  const host = String(await getSettingValue(prisma, 'smtp.host'));
  const rawPort = await getSettingValue(prisma, 'smtp.port');
  const port = Number(rawPort);
  const user = String(await getSettingValue(prisma, 'smtp.user'));
  const pass = await getSecretValue(prisma, 'smtp.pass');
  if (!user || !pass) throw new Error('SMTP user/pass not configured');
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`SMTP port is invalid: ${String(rawPort)}`);
  }
  const encryption = resolveEncryption(await getSettingValue(prisma, 'smtp.secure'), port);
  // ssl = implicit TLS (secure=true); starttls = upgrade with requireTLS;
  // none = plain, no TLS. No port is special-cased once the setting is set.
  const secure = encryption === 'ssl';
  const requireTLS = encryption === 'starttls';
  return nodemailer.createTransport({
    host,
    port,
    secure,
    requireTLS,
    auth: { user, pass },
    connectionTimeout: CONNECTION_TIMEOUT_MS,
    greetingTimeout: CONNECTION_TIMEOUT_MS,
    socketTimeout: SOCKET_TIMEOUT_MS,
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
