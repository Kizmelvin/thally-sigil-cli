import { DEFAULT_TOLERANCE_SECONDS, MAX_ATTEMPTS } from '@sigil/core';

export const HELP = `sigil — sign, verify and inspect webhook signatures

Usage
  sigil sign     --body <file|-> (--secret <s> | --secret-env <VAR>)... [--timestamp <unix>] [--header-name]
  sigil verify   --body <file|-> --header <value> (--secret <s> | --secret-env <VAR>)...
                 [--tolerance <seconds>] [--now <unix>] [--quiet]
  sigil inspect  --header <value> [--now <unix>]
  sigil backoff  [--attempts <n>] [--base <ms>] [--max <ms>]

Secrets
  --secret <s>        A secret, given literally. Visible in ps and shell history.
  --secret-env <VAR>  Read the secret from an environment variable. Prefer this.
  Repeat either flag to sign with, or verify against, several secrets at once.
  That is the key-rotation path.

Options
  --body <file|->     File to read, or "-" for stdin.
  --timestamp <unix>  Sign at a fixed time instead of now. For reproducible tests.
  --tolerance <secs>  Override the ${DEFAULT_TOLERANCE_SECONDS}s freshness window. 0 disables it.
  --now <unix>        Treat this as the current time.
  --quiet             Print nothing on success; rely on the exit code.
  --header-name       Prefix the output with the header name.
  --attempts <n>      Deliveries to schedule, counting the first (default ${MAX_ATTEMPTS}).

Exit codes
  0   ok
  1   usage error
  10+ verification failed; one code per failure reason. See docs/exit-codes.md.

Examples
  sigil sign --body payload.json --secret-env WEBHOOK_SECRET
  curl -s "$URL" | sigil sign --body - --secret-env WEBHOOK_SECRET
  sigil verify --body payload.json --header "$SIG" --secret-env WEBHOOK_SECRET --quiet
  sigil inspect --header "t=1767225600,v1=6b1f..."
  sigil backoff --attempts 5
`;
