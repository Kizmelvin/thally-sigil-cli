import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { sign, SIGIL_ERROR_CODES } from '@sigil/core';
import { run } from '../src/run.js';
import { EXIT_ERROR_BASE, EXIT_CODES, EXIT_OK, EXIT_USAGE } from '../src/exit-codes.js';

const SECRET = 'whsec_test';
const BODY = '{"id":"evt_1"}';
const TS = 1767225600;

let bodyFile: string;
beforeAll(() => {
  bodyFile = join(mkdtempSync(join(tmpdir(), 'sigil-')), 'payload.json');
  writeFileSync(bodyFile, BODY);
});

function invoke(argv: string[]): { code: number; out: string[]; err: string[] } {
  const out: string[] = [];
  const err: string[] = [];
  const code = run(argv, { out: (l) => out.push(l), err: (l) => err.push(l) });
  return { code, out, err };
}

describe('sign', () => {
  it('prints a header that verify accepts', () => {
    const signed = invoke(['sign', '--body', bodyFile, '--secret', SECRET, '--timestamp', String(TS)]);
    expect(signed.code).toBe(EXIT_OK);
    expect(signed.out[0]).toBe(sign(BODY, SECRET, { timestamp: TS }));

    const checked = invoke([
      'verify', '--body', bodyFile, '--header', signed.out[0] as string,
      '--secret', SECRET, '--now', String(TS),
    ]);
    expect(checked.code).toBe(EXIT_OK);
  });

  it('emits one v1 per repeated --secret', () => {
    const r = invoke([
      'sign', '--body', bodyFile, '--secret', 'old', '--secret', 'new', '--timestamp', String(TS),
    ]);
    expect((r.out[0] as string).match(/v1=/g)).toHaveLength(2);
  });

  it('reads the secret from the environment', () => {
    process.env.SIGIL_TEST_SECRET = SECRET;
    const r = invoke([
      'sign', '--body', bodyFile, '--secret-env', 'SIGIL_TEST_SECRET', '--timestamp', String(TS),
    ]);
    expect(r.out[0]).toBe(sign(BODY, SECRET, { timestamp: TS }));
  });

  it('fails usage when the named variable is unset', () => {
    const r = invoke(['sign', '--body', bodyFile, '--secret-env', 'SIGIL_DEFINITELY_UNSET']);
    expect(r.code).toBe(EXIT_USAGE);
  });

  it('can prefix the header name', () => {
    const r = invoke([
      'sign', '--body', bodyFile, '--secret', SECRET, '--timestamp', String(TS), '--header-name',
    ]);
    expect(r.out[0]).toMatch(/^Sigil-Signature: t=/);
  });
});

describe('verify', () => {
  const header = sign(BODY, SECRET, { timestamp: TS });

  it('is silent with --quiet on success', () => {
    const r = invoke([
      'verify', '--body', bodyFile, '--header', header, '--secret', SECRET,
      '--now', String(TS), '--quiet',
    ]);
    expect(r).toMatchObject({ code: EXIT_OK, out: [] });
  });

  it('exits with the signature-mismatch code for a wrong secret', () => {
    const r = invoke([
      'verify', '--body', bodyFile, '--header', header, '--secret', 'nope', '--now', String(TS),
    ]);
    expect(r.code).toBe(EXIT_CODES.signature_mismatch);
    expect(r.err[0]).toMatch(/^signature_mismatch: /);
  });

  it('exits with the tolerance code for a stale timestamp', () => {
    const r = invoke([
      'verify', '--body', bodyFile, '--header', header, '--secret', SECRET, '--now', String(TS + 10_000),
    ]);
    expect(r.code).toBe(EXIT_CODES.timestamp_out_of_tolerance);
  });

  it('accepts a stale timestamp when the window is disabled', () => {
    const r = invoke([
      'verify', '--body', bodyFile, '--header', header, '--secret', SECRET,
      '--now', String(TS + 10_000), '--tolerance', '0',
    ]);
    expect(r.code).toBe(EXIT_OK);
  });

  it('verifies against the second of two secrets', () => {
    const r = invoke([
      'verify', '--body', bodyFile, '--header', header, '--secret', 'wrong', '--secret', SECRET,
      '--now', String(TS),
    ]);
    expect(r.code).toBe(EXIT_OK);
  });

  it('reports a usage error when --header is missing', () => {
    const r = invoke(['verify', '--body', bodyFile, '--secret', SECRET]);
    expect(r.code).toBe(EXIT_USAGE);
  });

  it('rejects a non-numeric --tolerance as usage, not verification', () => {
    const r = invoke([
      'verify', '--body', bodyFile, '--header', header, '--secret', SECRET, '--tolerance', 'soon',
    ]);
    expect(r.code).toBe(EXIT_USAGE);
  });
});

describe('inspect', () => {
  it('reports age and freshness without needing a secret', () => {
    const header = sign(BODY, SECRET, { timestamp: TS });
    const r = invoke(['inspect', '--header', header, '--now', String(TS + 60)]);
    expect(r.code).toBe(EXIT_OK);
    expect(r.out.join('\n')).toContain('age         60s');
    expect(r.out.join('\n')).toContain('within      yes');
  });

  it('says so when the header is stale', () => {
    const header = sign(BODY, SECRET, { timestamp: TS });
    const r = invoke(['inspect', '--header', header, '--now', String(TS + 400)]);
    expect(r.out.join('\n')).toContain('within      no');
  });
});

describe('backoff', () => {
  it('prints the default schedule and total', () => {
    const r = invoke(['backoff']);
    expect(r.code).toBe(EXIT_OK);
    expect(r.out).toHaveLength(9); // header + 7 retries + total
    expect(r.out.at(-1)).toBe('total  2.1m');
  });

  it('honours --attempts', () => {
    const r = invoke(['backoff', '--attempts', '3']);
    expect(r.out).toHaveLength(4);
  });
});

describe('exit-code table', () => {
  it('assigns a distinct code to every core error code', () => {
    const codes = Object.values(EXIT_CODES);
    expect(new Set(codes).size).toBe(SIGIL_ERROR_CODES.length);
  });

  it('starts at the documented base', () => {
    expect(EXIT_CODES[SIGIL_ERROR_CODES[0] as 'header_malformed']).toBe(EXIT_ERROR_BASE);
  });

  it('never collides with success or usage', () => {
    expect(Object.values(EXIT_CODES).every((c) => c > EXIT_USAGE)).toBe(true);
  });
});

describe('help', () => {
  it('is shown with no arguments and exits 0', () => {
    const r = invoke([]);
    expect(r.code).toBe(EXIT_OK);
    expect(r.out.join('\n')).toContain('sigil sign');
  });

  it('rejects an unknown command', () => {
    expect(invoke(['frobnicate']).code).toBe(EXIT_USAGE);
  });
});

describe('keygen', () => {
  it('prints a prefixed base64url secret', () => {
    const r = invoke(['keygen']);
    expect(r.code).toBe(EXIT_OK);
    expect(r.out[0]).toMatch(/^whsec_[A-Za-z0-9_-]+$/);
  });

  it('produces 32 bytes of entropy by default', () => {
    const secret = (invoke(['keygen']).out[0] as string).slice('whsec_'.length);
    expect(Buffer.from(secret, 'base64url')).toHaveLength(32);
  });

  it('does not repeat itself', () => {
    expect(invoke(['keygen']).out[0]).not.toBe(invoke(['keygen']).out[0]);
  });

  it('honours --bytes and --prefix', () => {
    const r = invoke(['keygen', '--bytes', '16', '--prefix', 'sk_']);
    expect(r.out[0]).toMatch(/^sk_/);
    expect(Buffer.from((r.out[0] as string).slice(3), 'base64url')).toHaveLength(16);
  });

  it('refuses a secret short enough to brute-force', () => {
    expect(invoke(['keygen', '--bytes', '8']).code).toBe(EXIT_USAGE);
  });

  it('refuses an absurdly long one', () => {
    expect(invoke(['keygen', '--bytes', '100']).code).toBe(EXIT_USAGE);
  });

  it('generates a secret that actually round-trips', () => {
    const secret = invoke(['keygen']).out[0] as string;
    const header = sign(BODY, secret, { timestamp: TS });
    const r = invoke([
      'verify', '--body', bodyFile, '--header', header, '--secret', secret, '--now', String(TS),
    ]);
    expect(r.code).toBe(EXIT_OK);
  });
});
