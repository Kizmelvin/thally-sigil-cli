import { SigilError } from '@sigil/core';
import { parseArgs, UsageError } from './args.js';
import { cmdBackoff, cmdInspect, cmdKeygen, cmdSign, cmdVerify } from './commands.js';
import { EXIT_OK, EXIT_USAGE, exitCodeFor } from './exit-codes.js';
import { HELP } from './help.js';

export interface Streams {
  out: (line: string) => void;
  err: (line: string) => void;
}

/**
 * The whole CLI as a pure-ish function: argv in, exit code out, output through
 * `streams`. `cli.ts` is only the shell that wires it to the real process,
 * which is what makes every path here testable without spawning anything.
 */
export function run(argv: readonly string[], streams: Streams): number {
  const args = parseArgs(argv);

  if (args.command === undefined || args.command === 'help' || args.flags.has('help')) {
    streams.out(HELP.trimEnd());
    return EXIT_OK;
  }

  try {
    switch (args.command) {
      case 'sign':
        cmdSign(args, streams.out);
        return EXIT_OK;
      case 'verify':
        cmdVerify(args, streams.out);
        return EXIT_OK;
      case 'inspect':
        cmdInspect(args, streams.out);
        return EXIT_OK;
      case 'keygen':
        cmdKeygen(args, streams.out);
        return EXIT_OK;
      case 'backoff':
        cmdBackoff(args, streams.out);
        return EXIT_OK;
      default:
        streams.err(`Unknown command "${args.command}". Run \`sigil help\`.`);
        return EXIT_USAGE;
    }
  } catch (error) {
    if (error instanceof SigilError) {
      streams.err(`${error.code}: ${error.message}`);
      return exitCodeFor(error.code);
    }
    if (error instanceof UsageError) {
      streams.err(error.message);
      return EXIT_USAGE;
    }
    throw error;
  }
}
