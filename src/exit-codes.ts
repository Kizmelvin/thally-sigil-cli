import { SIGIL_ERROR_CODES, type SigilErrorCode } from '@sigil/core';

/**
 * Process exit codes.
 *
 * 0 and 1 are the usual success/usage pair. Every verification failure gets
 * its own code from 10 upwards, so a shell script can tell "the signature was
 * wrong" from "the clock was wrong" without parsing stderr.
 */
export const EXIT_OK = 0;
export const EXIT_USAGE = 1;

/** First code assigned to a `SigilErrorCode`. */
export const EXIT_ERROR_BASE = 10;

/**
 * One exit code per error code, assigned by position in `SIGIL_ERROR_CODES`.
 *
 * Deriving the table rather than writing it out means a code added to
 * `@sigil/core` cannot silently share an exit status with an existing one —
 * though it does mean *inserting* a code renumbers every code after it, which
 * is why the core package treats that list as append-only.
 */
export const EXIT_CODES: Readonly<Record<SigilErrorCode, number>> = Object.freeze(
  Object.fromEntries(SIGIL_ERROR_CODES.map((code, index) => [code, EXIT_ERROR_BASE + index])),
) as Record<SigilErrorCode, number>;

export function exitCodeFor(code: SigilErrorCode): number {
  return EXIT_CODES[code] ?? EXIT_USAGE;
}
