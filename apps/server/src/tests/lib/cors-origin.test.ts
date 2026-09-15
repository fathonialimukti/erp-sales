import { describe, expect, it } from 'vitest';
import {
  isAllowedDevOrigin,
  isOriginAllowed,
  parseAllowedOrigins,
} from '../../lib/cors-origin.js';

// T13: the live preflight for https://erp-sales.aetherglo.com returned 204 with
// an Access-Control-Allow-Origin header, proving the production origin is in the
// allow-list. These tests lock that in so a future CORS_ORIGIN edit can't
// silently drop the cross-origin client (erp-sales → erp-sales-api).
describe('parseAllowedOrigins', () => {
  it('splits, trims and drops empty entries', () => {
    expect(parseAllowedOrigins(' https://a.example.com , https://b.example.com ,, ')).toEqual([
      'https://a.example.com',
      'https://b.example.com',
    ]);
  });

  it('returns an empty list for undefined', () => {
    expect(parseAllowedOrigins(undefined)).toEqual([]);
  });
});

describe('isOriginAllowed', () => {
  const allowed = ['https://erp-sales.aetherglo.com'];

  it('allows the production client origin', () => {
    expect(isOriginAllowed('https://erp-sales.aetherglo.com', allowed)).toBe(true);
  });

  it('allows requests with no Origin header (curl, same-origin, server-to-server)', () => {
    expect(isOriginAllowed(undefined, [])).toBe(true);
  });

  it('rejects an origin that is not in the allow-list', () => {
    expect(isOriginAllowed('https://evil.example.com', allowed)).toBe(false);
  });

  it('allows any localhost port in development', () => {
    expect(isOriginAllowed('http://localhost:5173', [])).toBe(true);
    expect(isOriginAllowed('http://127.0.0.1:5173', [])).toBe(true);
  });

  it('allows the Tauri webview origin', () => {
    expect(isOriginAllowed('tauri://localhost', [])).toBe(true);
  });

  it('does not treat https localhost as a dev origin', () => {
    expect(isOriginAllowed('https://localhost:5173', [])).toBe(false);
  });

  it('keeps dev origins out of the explicit allow-list parser match (regex only)', () => {
    expect(isAllowedDevOrigin('http://localhost:3000')).toBe(true);
    expect(isAllowedDevOrigin('https://erp-sales.aetherglo.com')).toBe(false);
  });
});