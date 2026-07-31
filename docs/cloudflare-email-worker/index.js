/**
 * Cloudflare Email Worker — zero npm deps (dashboard-paste friendly)
 *
 * Flow (Email Concierge / server-owned Brevo SMTP):
 *   1. email() receives message
 *   2. Parse raw MIME (built-in, no postal-mime)
 *   3. POST ERP /api/email/inbound (store + enqueue Email Concierge)
 *   4. Server agent finalizes HTML and sends via Brevo SMTP (info@aetherglo.com)
 *
 * This worker is a thin inbound adapter only. Do NOT call message.reply() —
 * outbound is entirely server-owned.
 *
 * Production:
 *   Client: https://erp-sales.aetherglo.com
 *   Server: https://erp-sales-api.aetherglo.com
 *   Endpoint: POST .../api/email/inbound
 *
 * Secrets / vars:
 *   EMAIL_WEBHOOK_SECRET  (required) — set in Cloudflare dashboard or via wrangler (supports .env)
 *   ERP_BASE_URL          (optional) default https://erp-sales-api.aetherglo.com
 *   FORWARD_FALLBACK_TO   (optional)
 *
 * Local testing tip: wrangler dev --env .env
 */

const DEFAULT_ERP_BASE_URL = "https://erp-sales-api.aetherglo.com";

const NOREPLY_RE =
  /^(noreply@|no-reply@|mailer-daemon@|postmaster@|bounce@)/i;

const AUTO_REPLY_SUBJECT_RE =
  /^(auto[- ]?reply|out of office|delivery status)/i;

function header(message, name) {
  const value = message.headers.get(name);
  return value && value.trim() ? value.trim() : undefined;
}

function hasContent(value) {
  return Boolean(value && String(value).trim());
}

function shouldSkip(from, subject, text, html) {
  if (NOREPLY_RE.test(String(from).toLowerCase())) return "noreply_sender";
  if (subject && AUTO_REPLY_SUBJECT_RE.test(subject)) return "auto_reply_subject";
  if (!hasContent(text) && !hasContent(html) && !hasContent(subject)) {
    return "empty_body";
  }
  return null;
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
 * Fully recursive for nested multipart. Good enough for CRM inbound.
 */
function parseMime(raw) {
  const splitIdx = raw.search(/\r?\n\r?\n/);
  if (splitIdx === -1) {
    return {
      subject: undefined,
      text: raw,
      html: undefined,
      hasAttachments: false,
      attachments: [],
    };
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
    let hasAttachments = false;
    const attachments = [];
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
        const nested = parseMime(part);
        if (!text && nested.text) text = nested.text;
        if (!html && nested.html) html = nested.html;
        if (nested.hasAttachments) hasAttachments = true;
        if (nested.attachments && nested.attachments.length) {
          for (const a of nested.attachments) attachments.push(a);
        }
        continue;
      }

      const disposition = (pHeaders["content-disposition"] || "").toLowerCase();
      let filename = undefined;
      const filenameMatch = /filename="?([^";\n]+)"?/i.exec(
        pHeaders["content-disposition"] || "",
      );
      if (filenameMatch) filename = filenameMatch[1];

      if (
        (disposition && disposition.startsWith("attachment")) ||
        (!pCt.type.startsWith("text/") && pCt.type !== "")
      ) {
        hasAttachments = true;
        attachments.push({
          filename: filename || "unknown",
          contentType: pCt.type || "application/octet-stream",
          size: pBody.length,
        });
        console.log("attachment_detected", {
          filename,
          contentType: pCt.type,
          size: pBody.length,
        });
        continue;
      }

      const decoded = decodePartBody(pBody, pTe, pCt.charset);
      if (pCt.type === "text/plain" && !text) text = decoded.trim();
      if (pCt.type === "text/html" && !html) html = decoded.trim();
    }
    return { subject, text, html, hasAttachments, attachments };
  }

  if (ct.type === "text/html") {
    const html = decodePartBody(body, te, ct.charset).trim();
    return {
      subject,
      text: undefined,
      html,
      hasAttachments: false,
      attachments: [],
    };
  }

  const text = decodePartBody(body, te, ct.charset).trim();
  return {
    subject,
    text,
    html: undefined,
    hasAttachments: false,
    attachments: [],
  };
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

function scheduleFallbackForward(message, env, ctx) {
  if (!env.FORWARD_FALLBACK_TO) return;
  ctx.waitUntil(
    message.forward(env.FORWARD_FALLBACK_TO).catch((err) => {
      console.error("fallback forward failed", err);
    }),
  );
}

async function postInbound(payload, env) {
  const url = `https://erp-sales-api.aetherglo.com/api/email/inbound`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    return await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Email-Webhook-Secret": env.EMAIL_WEBHOOK_SECRET,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export default {
  async email(message, env, ctx) {
  console.log('=== email() START ===');

  const subjectHdr = header(message, "subject");
  const messageId = header(message, "message-id");
  const inReplyTo = header(message, "in-reply-to");
  const references = header(message, "references");
  const date = header(message, "date");
  const cc = header(message, "cc");
  const bcc = header(message, "bcc");

  console.log('Step 1', {
    from: message.from,
    to: message.to,
    rawSize: message.rawSize,
    subject: subjectHdr,
    messageId,
    inReplyTo,
    references,
    date,
    cc,
    bcc
  });

  if (!env.EMAIL_WEBHOOK_SECRET) {
    console.log('[Step 1] ❌ EMAIL_WEBHOOK_SECRET is MISSING');
    try {
      message.setReject("Configuration error: missing webhook secret");
    } catch (e) {}
    return;
  }
  console.log('[Step 1] ✅ EMAIL_WEBHOOK_SECRET present');

  let text;
  let html;
  let parsedSubject = subjectHdr;
  let hasAttachments = false;
  let attachments = [];

  try {
    console.log('Step 2 - Reading raw email stream...');
    const raw = await readRawEmail(message);
    console.log('Step 3 - Starting MIME parse...', { rawSize: raw.length });

    const parsed = parseMime(raw);
    text = parsed.text;
    html = parsed.html;
    hasAttachments = parsed.hasAttachments;
    attachments = parsed.attachments || [];

    if (!parsedSubject && parsed.subject) parsedSubject = parsed.subject;

    console.log('Step 3 - Parse results:', {
      subject: parsedSubject,
      textLength: text?.length || 0,
      htmlLength: html?.length || 0,
      hasAttachments,
      attachmentCount: attachments.length
    });
  } catch (err) {
    console.error('Step 3 - MIME parse failed', err);
  }

  const skipReason = shouldSkip(message.from, parsedSubject, text, html);
  if (skipReason) {
    console.log(`[Step 4] SKIP - ${skipReason}`, {
      from: message.from,
      subject: parsedSubject,
      messageId
    });
    return;
  }
  console.log('[Step 4] ✅ No skip rule matched');

  const payload = {
    from: message.from,
    to: message.to,
    cc,
    bcc,
    subject: parsedSubject,
    text,
    html,
    messageId,
    inReplyTo,
    references,
    date,
    rawSize: message.rawSize,
    hasAttachments,
    attachments: attachments || []
  };

  console.log('Step 5 - Final payload shape:', {
    subject: payload.subject,
    textLength: payload.text?.length || 0,
    htmlLength: payload.html?.length || 0,
    hasAttachments: payload.hasAttachments,
    attachmentCount: payload.attachments.length
  });

  try {
    console.log('Step 6 - POSTing to ERP /api/email/inbound...');
    const res = await postInbound(payload, env);

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error('Step 6 - ERP request failed', {
        status: res.status,
        body: body.slice(0, 800)
      });
      scheduleFallbackForward(message, env, ctx);
      return;
    }

    const result = await res.json().catch(() => null);
    console.log('Step 7 - ERP response:', {
      success: true,
      conversationId: result?.conversationId,
      deduped: result?.deduped,
      skipped: result?.skipped,
      from: message.from,
      to: message.to,
      hasAttachments: payload.hasAttachments
    });
  } catch (err) {
    console.error('Step 7 - Network/ERP error', err);
    if (env.FORWARD_FALLBACK_TO) {
      try {
        await message.forward(env.FORWARD_FALLBACK_TO);
      } catch (forwardErr) {
        console.error('Fallback forward failed', forwardErr);
      }
    }
  } finally {
    console.log('=== email() END ===');
  }
}
};