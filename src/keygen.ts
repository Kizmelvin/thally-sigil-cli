import { randomBytes } from 'node:crypto';
import { UsageError } from './args.js';

/** Bytes of entropy in a generated secret when `--bytes` is not given. */
export const DEFAULT_SECRET_BYTES = 32;

/** Below this, a secret is short enough to be worth brute-forcing offline. */
export const MIN_SECRET_BYTES = 16;

/** Guards against a typo like `--bytes 1000000` producing an unusable header. */
export const MAX_SECRET_BYTES = 64;

/** Conventional prefix, so a leaked secret is recognisable in a log or a scan. */
export const SECRET_PREFIX = 'whsec_';

/**
 * Generate a webhook secret.
 *
 * base64url rather than hex: same entropy in a third fewer characters, and no
 * `+`, `/` or `=` to be mangled by a shell, a URL or a `.env` parser.
 */
export function generateSecret(bytes: number = DEFAULT_SECRET_BYTES, prefix: string = SECRET_PREFIX): string {
  if (!Number.isInteger(bytes) || bytes < MIN_SECRET_BYTES || bytes > MAX_SECRET_BYTES) {
    throw new UsageError(
      `--bytes must be a whole number between ${MIN_SECRET_BYTES} and ${MAX_SECRET_BYTES}, got ${bytes}.`,
    );
  }
  return prefix + randomBytes(bytes).toString('base64url');
}
