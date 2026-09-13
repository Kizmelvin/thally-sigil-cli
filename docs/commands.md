# Commands

Run `sigil help` for the same information at the terminal.

## `sigil sign`

```
sigil sign --body <file|-> (--secret <s> | --secret-env <VAR>)... [--timestamp <unix>] [--header-name]
```

Prints a `Sigil-Signature` header value.

| Flag             | Notes                                                     |
| ---------------- | --------------------------------------------------------- |
| `--body`         | File path, or `-` for stdin. Required.                     |
| `--secret`       | Literal secret. Repeatable.                                |
| `--secret-env`   | Read the secret from this variable. Repeatable. Preferred. |
| `--timestamp`    | Sign at a fixed Unix time instead of now.                  |
| `--header-name`  | Prefix the output with `Sigil-Signature: `.                |

The body is read as bytes and signed verbatim. Piping through a formatter
between signing and sending will invalidate the signature.

## `sigil verify`

```
sigil verify --body <file|-> --header <value> (--secret <s> | --secret-env <VAR>)...
             [--tolerance <seconds>] [--now <unix>] [--quiet]
```

Exits `0` when the header is valid, or `10`+ when it is not — see
[exit codes](exit-codes.md).

| Flag          | Notes                                                          |
| ------------- | -------------------------------------------------------------- |
| `--header`    | The header value to check. Required.                            |
| `--tolerance` | Override the **300**-second freshness window. `0` disables it.   |
| `--now`       | Treat this Unix time as the present.                             |
| `--quiet`     | Print nothing on success.                                        |

The default window is `DEFAULT_TOLERANCE_SECONDS` from `@sigil/core`. It is not
duplicated here — the CLI reads the constant, so the two cannot disagree.

## `sigil inspect`

```
sigil inspect --header <value> [--now <unix>]
```

Parses a header and reports its timestamp, age, whether it is inside the
default window, and each signature it carries. Needs no secret, so it is safe
to run against a header pasted from a log.

## `sigil backoff`

```
sigil backoff [--attempts <n>] [--base <ms>] [--max <ms>]
```

Prints the delivery retry schedule as a table. Defaults to `MAX_ATTEMPTS`
(**8**) deliveries, which is 7 retries over 2 minutes 7 seconds.

```
$ sigil backoff --attempts 5
retry  delay      elapsed
    1  1s         1s
    2  2s         3s
    3  4s         7s
    4  8s         15s
total  15s
```

The schedule is deterministic — no jitter. See
[retry policy](https://github.com/fairsplitt/sigil-core/blob/main/docs/retry-policy.md)
for why, and where to add your own.

## `sigil keygen`

```
sigil keygen [--bytes <n>] [--prefix <s>]
```

Generates a webhook secret and prints it.

| Flag       | Default    | Notes                                   |
| ---------- | ---------- | --------------------------------------- |
| `--bytes`  | `32`       | Entropy in bytes. Must be **16**–**64**. |
| `--prefix` | `whsec_`   | Prepended to the encoded secret.         |

```
$ sigil keygen
whsec_pC8kZ3nQx1vJ0hL5rT9wY2bN4mS6dF8gK7jH3aE1cX0
```

The secret is base64url — the same entropy as hex in a third fewer characters,
with no `+`, `/` or `=` for a shell, a URL or a `.env` parser to mangle.

Fewer than 16 bytes is rejected: a secret that short is worth brute-forcing
offline against a single captured signature. More than 64 is rejected too,
which catches a mistyped `--bytes 1000000` before it produces an unusable
header.

The prefix is a convention, not a checked format. It exists so that a secret
which leaks into a log or a public repository is recognisable to a scanner.
