/** A tiny flag parser. The CLI has four commands and no need for a dependency. */

export interface ParsedArgs {
  command: string | undefined;
  /** Every occurrence of each flag, in order. Repeating a flag appends. */
  flags: Map<string, Array<string | true>>;
  positionals: string[];
}

export function parseArgs(argv: readonly string[]): ParsedArgs {
  const [command, ...rest] = argv;
  const flags = new Map<string, Array<string | true>>();
  const positionals: string[] = [];

  const push = (name: string, value: string | true): void => {
    const existing = flags.get(name);
    if (existing) existing.push(value);
    else flags.set(name, [value]);
  };

  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i] as string;
    if (!token.startsWith('--')) {
      positionals.push(token);
      continue;
    }

    const body = token.slice(2);
    const eq = body.indexOf('=');
    if (eq !== -1) {
      push(body.slice(0, eq), body.slice(eq + 1));
      continue;
    }

    // `--flag value`, unless the next token is itself a flag, in which case
    // this is a boolean. `--quiet --header x` must not read "--header" as
    // quiet's value.
    const next = rest[i + 1];
    if (next !== undefined && !next.startsWith('--')) {
      push(body, next);
      i += 1;
    } else {
      push(body, true);
    }
  }

  return { command, flags, positionals };
}

/** Every string value given for a flag, in order. Booleans are skipped. */
export function allStrings(args: ParsedArgs, name: string): string[] {
  return (args.flags.get(name) ?? []).filter((v): v is string => typeof v === 'string');
}

/** The last string value given for a flag. */
export function stringFlag(args: ParsedArgs, name: string): string | undefined {
  const values = allStrings(args, name);
  return values.length > 0 ? values[values.length - 1] : undefined;
}

export function boolFlag(args: ParsedArgs, name: string): boolean {
  return (args.flags.get(name) ?? []).includes(true);
}

export function intFlag(args: ParsedArgs, name: string): number | undefined {
  const raw = stringFlag(args, name);
  if (raw === undefined) return undefined;
  if (!/^(0|[1-9][0-9]*)$/.test(raw)) {
    throw new UsageError(`--${name} must be a whole number, got "${raw}".`);
  }
  return Number(raw);
}

export class UsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UsageError';
  }
}
