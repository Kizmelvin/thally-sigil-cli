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
