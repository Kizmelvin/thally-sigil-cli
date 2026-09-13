import {
  DEFAULT_TOLERANCE_SECONDS,
  HEADER_NAME,
  MAX_ATTEMPTS,
  parseHeader,
  retrySchedule,
  sign,
  totalRetryWindowMs,
  verify,
} from '@sigil/core';
import { allStrings, boolFlag, intFlag, stringFlag, UsageError, type ParsedArgs } from './args.js';
import { readBody, readSecrets } from './body.js';

function secretsFrom(args: ParsedArgs): string[] {
  return readSecrets(allStrings(args, 'secret'), allStrings(args, 'secret-env'));
}

export function cmdSign(args: ParsedArgs, out: (line: string) => void): void {
  const body = readBody(stringFlag(args, 'body'));
  const header = sign(body, secretsFrom(args), { timestamp: intFlag(args, 'timestamp') });
  out(boolFlag(args, 'header-name') ? `${HEADER_NAME}: ${header}` : header);
}

export function cmdVerify(args: ParsedArgs, out: (line: string) => void): void {
  const body = readBody(stringFlag(args, 'body'));
  const header = stringFlag(args, 'header');
  if (header === undefined) throw new UsageError('Missing --header.');

  const timestamp = verify(body, header, secretsFrom(args), {
    toleranceSeconds: intFlag(args, 'tolerance'),
    now: intFlag(args, 'now'),
  });
  if (!boolFlag(args, 'quiet')) {
    out(`ok  signed at ${new Date(timestamp * 1000).toISOString()}`);
  }
}

export function cmdInspect(args: ParsedArgs, out: (line: string) => void): void {
  const header = stringFlag(args, 'header');
  if (header === undefined) throw new UsageError('Missing --header.');

  const parsed = parseHeader(header);
  const now = intFlag(args, 'now') ?? Math.floor(Date.now() / 1000);
  const age = now - parsed.timestamp;

  out(`timestamp   ${parsed.timestamp}  (${new Date(parsed.timestamp * 1000).toISOString()})`);
  out(`age         ${age}s`);
  out(`within      ${Math.abs(age) <= DEFAULT_TOLERANCE_SECONDS ? 'yes' : 'no'}  (tolerance ${DEFAULT_TOLERANCE_SECONDS}s)`);
  out(`signatures  ${parsed.signatures.length}`);
  for (const signature of parsed.signatures) out(`  v1  ${signature}`);
}

export function cmdBackoff(args: ParsedArgs, out: (line: string) => void): void {
  const maxAttempts = intFlag(args, 'attempts') ?? MAX_ATTEMPTS;
  const schedule = retrySchedule({
    maxAttempts,
    baseDelayMs: intFlag(args, 'base'),
    maxDelayMs: intFlag(args, 'max'),
  });

  out('retry  delay      elapsed');
  let elapsed = 0;
  schedule.forEach((delay, index) => {
    elapsed += delay;
    out(`${String(index + 1).padStart(5)}  ${format(delay).padEnd(9)}  ${format(elapsed)}`);
  });
  out(`total  ${format(totalRetryWindowMs({ maxAttempts, baseDelayMs: intFlag(args, 'base'), maxDelayMs: intFlag(args, 'max') }))}`);
}

function format(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${trim(seconds)}s`;
  const minutes = seconds / 60;
  if (minutes < 60) return `${trim(minutes)}m`;
  return `${trim(minutes / 60)}h`;
}

/** Drop a trailing `.0` so whole numbers read as `2s`, not `2.0s`. */
function trim(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
