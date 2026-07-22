const MAX_HTML_LENGTH = 100_000;

const FORBIDDEN_PATTERNS = [
  /<script\b/i,
  /<iframe\b/i,
  /<object\b/i,
  /<form\b/i,
  /\son\w+\s*=/i,
  /javascript:/i,
];

export type SanitizeEmailHtmlResult =
  | { ok: true; html: string }
  | { ok: false; reason: string };

export function sanitizeEmailHtml(html: string): SanitizeEmailHtmlResult {
  const trimmed = html?.trim() ?? '';
  if (!trimmed) return { ok: false, reason: 'empty' };
  if (trimmed.length > MAX_HTML_LENGTH) return { ok: false, reason: 'too_long' };
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(trimmed)) return { ok: false, reason: 'forbidden_content' };
  }
  return { ok: true, html: trimmed };
}

export function htmlToText(html: string): string {
  return html
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*p\s*>/gi, '\n')
    .replace(/<\/\s*div\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/\s+\n/g, '\n')
    .replace(/\n\s+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function wrapPlainTextAsHtml(text: string): string {
  const escaped = escapeHtml(text.trim());
  return `<p>${escaped.replace(/\n/g, '<br/>')}</p>`;
}
