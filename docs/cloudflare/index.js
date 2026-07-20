/**
 * Cloudflare Email Worker — zero npm deps (dashboard-paste friendly)
 *
 * Docs:
 *   https://developers.cloudflare.com/email-service/
 *   https://developers.cloudflare.com/email-service/api/route-emails/email-handler/
 *
 * Flow:
 *   1. email() receives message
 *   2. Parse raw MIME (built-in, no postal-mime)
 *   3. POST ERP /api/email/auto-reply (store + AI on server)
 *   4. message.reply() with raw MIME (no mimetext)
 *
 * Production:
 *   Client: https://erp-sales.aetherglo.com
 *   Server: https://erp-sales-api.aetherglo.com
 *   Auto:   POST .../api/email/auto-reply
 *   Store:  POST .../api/email/inbound
 *
 * Secrets / vars:
 *   EMAIL_WEBHOOK_SECRET  (required)
 *   ERP_BASE_URL          (optional) default https://erp-sales-api.aetherglo.com
 *   AUTO_REPLY            (optional) default "true"
 *   FORWARD_FALLBACK_TO   (optional)
 *
 * Dashboard:
 *   main = index.js
 *   NO npm packages required
 *   NO nodejs_compat required
 *   Only built-in: cloudflare:email
 */

import { EmailMessage } from "cloudflare:email";

const DEFAULT_ERP_BASE_URL = "https://erp-sales-api.aetherglo.com";

const NOREPLY_RE =
  /^(noreply@|no-reply@|mailer-daemon@|postmaster@|bounce@)/i;

const AUTO_REPLY_SUBJECT_RE =
  /^(auto[- ]?reply|out of office|delivery status)/i;

function header(message, name) {
  const value = message.headers.get(name);
  return value && value.trim() ? value.trim() : undefined;
}

function shouldSkip(from, subject, text) {
  if (NOREPLY_RE.test(String(from).toLowerCase())) return "noreply_sender";
  if (subject && AUTO_REPLY_SUBJECT_RE.test(subject)) return "auto_reply_subject";
  if ((!text || !String(text).trim()) && (!subject || !String(subject).trim())) {
    return "empty_body";
  }
  return null;
}

function erpBaseUrl(env) {
  return (env.ERP_BASE_URL || DEFAULT_ERP_BASE_URL).replace(/\/$/, "");
}

function autoReplyEnabled(env) {
  const v = String(env.AUTO_REPLY ?? "true").toLowerCase();
  return v !== "false" && v !== "0" && v !== "no";
}

function replySubject(subject) {
  const s = (subject || "").trim();
  if (!s) return "Re: Your message";
  if (/^re:\s/i.test(s)) return s;
  return `Re: ${s}`;
}

/** Decode common transfer encodings for a single MIME part body. */
function decodePartBody(rawBody, encoding, charset) {
  const enc = (encoding || "7bit").toLowerCase();
  let bytes;
  if (enc === "base64") {
    const cleaned = rawBody.replace(/\s+/g, "");
    const bin = atob(cleaned);
    bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } else if (enc === "quoted-printable") {
    const soft = rawBody.replace(/=\r?\n/g, "");
    const out = [];
    for (let i = 0; i < soft.length; i++) {
      if (soft[i] === "=" && i + 2 < soft.length) {
        const hex = soft.slice(i + 1, i + 3);
        if (/^[0-9A-Fa-f]{2}$/.test(hex)) {
          out.push(parseInt(hex, 16));
          i += 2;
          continue;
        }
      }
      out.push(soft.charCodeAt(i));
    }
    bytes = new Uint8Array(out);
  } else {
    // 7bit / 8bit / binary — treat as UTF-8 text
    return rawBody;
  }
  try {
    return new TextDecoder(charset || "utf-8").decode(bytes);
  } catch {
    return new TextDecoder("utf-8").decode(bytes);
  }
}

function parseHeadersBlock(block) {
  const headers = {};
  const unfolded = block.replace(/\r?\n[ \t]+/g, " ");
  for (const line of unfolded.split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const val = line.slice(idx + 1).trim();
    headers[key] = val;
  }
  return headers;
}

function contentTypeInfo(ct) {
  if (!ct) return { type: "", charset: "utf-8", boundary: null };
  const parts = ct.split(";").map((p) => p.trim());
  const type = (parts[0] || "").toLowerCase();
  let charset = "utf-8";
  let boundary = null;
  for (const p of parts.slice(1)) {
    const m = /^([^=]+)=(.*)$/.exec(p);
    if (!m) continue;
    const k = m[1].trim().toLowerCase();
    let v = m[2].trim().replace(/^"(.*)"$/, "$1");
    if (k === "charset") charset = v;
    if (k === "boundary") boundary = v;
  }
  return { type, charset, boundary };
}

/**
 * Minimal MIME parse: prefer text/plain, fallback strip text/html.
 * Good enough for CRM inbound; complex nested MIME may be partial.
 */
function parseMime(raw) {
  const splitIdx = raw.search(/\r?\n\r?\n/);
  if (splitIdx === -1) {
    return { subject: undefined, text: raw, html: undefined };
  }
  const headerBlock = raw.slice(0, splitIdx);
  const body = raw.slice(splitIdx).replace(/^\r?\n\r?\n/, "");
  const headers = parseHeadersBlock(headerBlock);
  const subject = headers.subject;
  const ct = contentTypeInfo(headers["content-type"]);
  const te = headers["content-transfer-encoding"];

  if (ct.type.startsWith("multipart/") && ct.boundary) {
    const delim = `--${ct.boundary}`;
    const chunks = body.split(delim);
    let text;
    let html;
    for (const chunk of chunks) {
      if (!chunk || chunk === "--" || chunk.startsWith("--")) continue;
      const part = chunk.replace(/^\r?\n/, "").replace(/\r?\n$/, "");
      if (part === "--" || part.startsWith("--")) continue;
      const pIdx = part.search(/\r?\n\r?\n/);
      if (pIdx === -1) continue;
      const pHeaders = parseHeadersBlock(part.slice(0, pIdx));
      const pBody = part.slice(pIdx).replace(/^\r?\n\r?\n/, "");
      const pCt = contentTypeInfo(pHeaders["content-type"]);
      const pTe = pHeaders["content-transfer-encoding"];
      if (pCt.type.startsWith("multipart/")) {
        // one level nested
        const nested = parseMime(part);
        if (!text && nested.text) text = nested.text;
        if (!html && nested.html) html = nested.html;
        continue;
      }
      const decoded = decodePartBody(pBody, pTe, pCt.charset);
      if (pCt.type === "text/plain" && !text) text = decoded.trim();
      if (pCt.type === "text/html" && !html) html = decoded.trim();
    }
    return { subject, text, html };
  }

  if (ct.type === "text/html") {
    const html = decodePartBody(body, te, ct.charset).trim();
    return { subject, text: undefined, html };
  }

  // text/plain or unknown
  const text = decodePartBody(body, te, ct.charset).trim();
  return { subject, text, html: undefined };
}

async function readRawEmail(message) {
  const reader = message.raw.getReader();
  const chunks = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const total = chunks.reduce((n, c) => n + c.byteLength, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(merged);
}

function encodeSubject(subject) {
  // ASCII-safe; non-ASCII → RFC 2047 UTF-8 B
  if (/^[\x20-\x7E]*$/.test(subject)) return subject;
  const bytes = new TextEncoder().encode(subject);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return `=?UTF-8?B?${btoa(bin)}?=`;
}

/**
 * Build raw MIME for message.reply().
 * CF: from = message.to, to = message.from
 */
function buildReplyRaw(message, reply) {
  const originalMessageId = header(message, "message-id");
  const originalRefs = header(message, "references");
  const subject = reply.subject || replySubject(header(message, "subject"));
  const text = String(reply.text || "").replace(/\r\n/g, "\n").replace(/\n/g, "\r\n");

  const lines = [
    `From: ${message.to}`,
    `To: ${message.from}`,
    `Subject: ${encodeSubject(subject)}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
  ];
  if (originalMessageId) {
    lines.push(`In-Reply-To: ${originalMessageId}`);
    lines.push(
      `References: ${originalRefs ? `${originalRefs} ${originalMessageId}` : originalMessageId}`,
    );
  }
  lines.push("");
  lines.push(text);
  if (!text.endsWith("\r\n")) lines.push("");
  return lines.join("\r\n");
}

function buildReplyEmailMessage(message, reply) {
  const raw = buildReplyRaw(message, reply);
  return new EmailMessage(message.to, message.from, raw);
}

async function postToErp(env, payload, useAutoReply) {
  const path = useAutoReply ? "/api/email/auto-reply" : "/api/email/inbound";
  const url = `${erpBaseUrl(env)}${path}`;
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Email-Webhook-Secret": env.EMAIL_WEBHOOK_SECRET,
    },
    body: JSON.stringify(payload),
  });
}

function scheduleFallbackForward(message, env, ctx) {
  if (!env.FORWARD_FALLBACK_TO || !message.canBeForwarded) return;
  ctx.waitUntil(
    message.forward(env.FORWARD_FALLBACK_TO).catch((err) => {
      console.error("fallback forward failed", err);
    }),
  );
}

export default {
  async email(message, env, ctx) {
    if (!env.EMAIL_WEBHOOK_SECRET) {
      console.error("Missing EMAIL_WEBHOOK_SECRET");
      return;
    }

    const subjectHdr = header(message, "subject");
    const messageId = header(message, "message-id");
    const inReplyTo = header(message, "in-reply-to");
    const references = header(message, "references");
    const date = header(message, "date");

    let text;
    let html;
    let parsedSubject = subjectHdr;

    try {
      const raw = await readRawEmail(message);
      const parsed = parseMime(raw);
      text = parsed.text;
      html = parsed.html;
      if (!parsedSubject && parsed.subject) parsedSubject = parsed.subject;
    } catch (err) {
      console.error("MIME parse failed", err);
    }

    const skipReason = shouldSkip(message.from, parsedSubject, text);
    if (skipReason) {
      console.log("skip_inbound", {
        from: message.from,
        reason: skipReason,
        messageId,
      });
      return;
    }

    const payload = {
      from: message.from,
      to: message.to,
      subject: parsedSubject,
      text,
      html,
      messageId,
      inReplyTo,
      references,
      date,
      rawSize: message.rawSize,
    };

    const useAuto = autoReplyEnabled(env);

    try {
      const res = await postToErp(env, payload, useAuto);

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        console.error("ERP request failed", {
          status: res.status,
          body: body.slice(0, 500),
          from: message.from,
          messageId,
          path: useAuto ? "/api/email/auto-reply" : "/api/email/inbound",
        });
        scheduleFallbackForward(message, env, ctx);
        return;
      }

      const result = await res.json().catch(() => null);

      console.log("ERP ok", {
        conversationId: result && result.conversationId,
        messageId: result && result.messageId,
        skipped: result && result.skipped,
        deduped: result && result.deduped,
        hasReply: !!(result && result.reply && result.reply.text),
        aiError: result && result.aiError,
        from: message.from,
      });

      if (!useAuto) return;
      if (!result || result.skipped || result.deduped) return;
      if (!result.reply || !result.reply.text) return;

      try {
        const replyMsg = buildReplyEmailMessage(message, {
          text: result.reply.text,
          subject: result.reply.subject,
        });
        await message.reply(replyMsg);
        console.log("CF reply sent", {
          to: message.from,
          conversationId: result.conversationId,
        });
      } catch (replyErr) {
        console.error("message.reply failed", replyErr);
        scheduleFallbackForward(message, env, ctx);
      }
    } catch (err) {
      console.error("ERP network error", err);
      if (env.FORWARD_FALLBACK_TO && message.canBeForwarded) {
        try {
          await message.forward(env.FORWARD_FALLBACK_TO);
        } catch (forwardErr) {
          console.error("fallback forward failed", forwardErr);
        }
      }
    }
  },
};
