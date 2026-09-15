import { beforeEach, describe, expect, it, vi } from 'vitest';

// Settings are the single source of the transport config — stub them so this
// test never touches the DB or the network. Nodemailer's createTransport does
// not open a connection, so we can assert the exact options it is built with.
const settings: Record<string, unknown> = {};

vi.mock('../../lib/settings-service.js', () => ({
  getSettingValue: vi.fn(async (_db: unknown, key: string) => settings[key]),
  getSecretValue: vi.fn(async (_db: unknown, key: string) => settings[key] ?? ''),
}));

vi.mock('../../lib/prisma.js', () => ({ prisma: {} }));

import { createSmtpTransport } from '../../lib/email-smtp.js';

function optionsOf(transport: unknown): Record<string, unknown> {
  return (transport as { options: Record<string, unknown> }).options;
}

beforeEach(() => {
  for (const key of Object.keys(settings)) delete settings[key];
  settings['smtp.host'] = 'smtp-relay.brevo.com';
  settings['smtp.port'] = 587;
  settings['smtp.user'] = 'b277cd001@smtp-brevo.com';
  settings['smtp.pass'] = 'secret';
});

describe('createSmtpTransport', () => {
  it('uses STARTTLS (secure=false) on port 587', async () => {
    const options = optionsOf(await createSmtpTransport());
    expect(options['port']).toBe(587);
    expect(options['secure']).toBe(false);
  });

  it('uses STARTTLS (secure=false) on Brevo alternative port 2525', async () => {
    settings['smtp.port'] = 2525;
    const options = optionsOf(await createSmtpTransport());
    expect(options['port']).toBe(2525);
    expect(options['secure']).toBe(false);
  });

  it('uses implicit TLS (secure=true) on port 465', async () => {
    settings['smtp.port'] = 465;
    const options = optionsOf(await createSmtpTransport());
    expect(options['secure']).toBe(true);
  });

  // T16: explicit encryption mode wins over port guessing so ANY provider can be
  // configured from Settings alone (e.g. non-standard port + implicit TLS).
  it('explicit smtp.secure=ssl forces implicit TLS on a non-465 port', async () => {
    settings['smtp.port'] = 2525;
    settings['smtp.secure'] = 'ssl';
    const options = optionsOf(await createSmtpTransport());
    expect(options['secure']).toBe(true);
    expect(options['requireTLS']).toBe(false);
  });

  it('explicit smtp.secure=starttls forces STARTTLS even on port 465', async () => {
    settings['smtp.port'] = 465;
    settings['smtp.secure'] = 'starttls';
    const options = optionsOf(await createSmtpTransport());
    expect(options['secure']).toBe(false);
    expect(options['requireTLS']).toBe(true);
  });

  it('explicit smtp.secure=none disables TLS entirely', async () => {
    settings['smtp.port'] = 465;
    settings['smtp.secure'] = 'none';
    const options = optionsOf(await createSmtpTransport());
    expect(options['secure']).toBe(false);
    expect(options['requireTLS']).toBe(false);
  });

  it('accepts tls as an alias for ssl (implicit TLS)', async () => {
    settings['smtp.port'] = 2525;
    settings['smtp.secure'] = 'tls';
    const options = optionsOf(await createSmtpTransport());
    expect(options['secure']).toBe(true);
    expect(options['requireTLS']).toBe(false);
  });

  it('falls back to port inference only when smtp.secure is absent (465 → implicit)', async () => {
    settings['smtp.port'] = 465;
    const options = optionsOf(await createSmtpTransport());
    expect(options['secure']).toBe(true);
  });

  it('rejects an unknown smtp.secure value instead of guessing an encryption mode', async () => {
    settings['smtp.secure'] = 'bogus';
    await expect(createSmtpTransport()).rejects.toThrow(/secure/i);
  });

  it('rejects a missing/invalid port instead of dialing port 0', async () => {
    settings['smtp.port'] = '';
    await expect(createSmtpTransport()).rejects.toThrow(/port/i);
  });

  it('rejects when user or pass is not configured', async () => {
    settings['smtp.pass'] = '';
    await expect(createSmtpTransport()).rejects.toThrow(/user\/pass/i);
  });

  it('fails fast (10s connect) so an unreachable relay cannot outlast the proxy read timeout', async () => {
    const options = optionsOf(await createSmtpTransport());
    // T13: a firewalled port hung 30s+, the reverse proxy gave up first and
    // returned a response without CORS headers → browser reported a CORS error.
    expect(options['connectionTimeout']).toBe(10_000);
    expect(options['greetingTimeout']).toBe(10_000);
  });
});