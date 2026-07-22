import { describe, expect, it } from 'vitest';
import { htmlToText, sanitizeEmailHtml } from '../../lib/email-html.js';

describe('sanitizeEmailHtml', () => {
  it('accepts simple html', () => {
    const r = sanitizeEmailHtml('<p>Hello <strong>world</strong></p>');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.html).toContain('Hello');
  });

  it('rejects script tags', () => {
    const r = sanitizeEmailHtml('<p>x</p><script>alert(1)</script>');
    expect(r.ok).toBe(false);
  });

  it('rejects empty', () => {
    expect(sanitizeEmailHtml('   ').ok).toBe(false);
  });

  it('rejects javascript: urls', () => {
    expect(sanitizeEmailHtml('<a href="javascript:alert(1)">x</a>').ok).toBe(false);
  });

  it('rejects event handlers', () => {
    expect(sanitizeEmailHtml('<p onclick="evil()">x</p>').ok).toBe(false);
  });
});

describe('htmlToText', () => {
  it('strips tags', () => {
    expect(htmlToText('<p>Hi<br/>there</p>')).toMatch(/Hi/);
  });
});
