import { readFileSync } from 'node:fs';
import { UsageError } from './args.js';

/**
 * Read the body to sign or verify.
 *
 * `--body -` reads stdin. Bytes are returned rather than a string: the digest
 * covers exactly what was read, and decoding to UTF-8 and back could alter it.
 */
export function readBody(source: string | undefined): Uint8Array {
  if (source === undefined) {
    throw new UsageError('Missing --body. Pass a file path, or "-" to read stdin.');
  }
  try {
    return source === '-' ? readFileSync(0) : readFileSync(source);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new UsageError(`Could not read body from ${source === '-' ? 'stdin' : source}: ${reason}`);
  }
}

/**
 * Resolve the secret.
 *
 * `--secret-env` is preferred over `--secret`: an argument is visible in `ps`
 * and lands in shell history, an environment variable does neither.
 * Repeating either flag builds the list used during key rotation.
 */
export function readSecrets(secrets: string[], envNames: string[]): string[] {
  const resolved = [...secrets];
  for (const name of envNames) {
    const value = process.env[name];
    if (value === undefined) {
      throw new UsageError(`Environment variable ${name} is not set.`);
    }
    resolved.push(value);
  }
  if (resolved.length === 0) {
    throw new UsageError('Missing --secret or --secret-env.');
  }
  return resolved;
}
