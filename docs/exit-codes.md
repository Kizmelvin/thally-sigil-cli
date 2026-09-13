# Exit codes

```
0    success
1    usage error — a missing or malformed flag, an unreadable body, an unset
     environment variable, or an unknown command
10+  verification failed
```

Splitting the failures out means a script can react to *why* a webhook was
rejected without parsing stderr. A bad signature is an attack or a
misconfiguration; a stale timestamp is usually a clock. They deserve different
alerts.

## The table

| Exit | `SigilErrorCode`             | Cause                                          |
| ---- | ---------------------------- | ---------------------------------------------- |
| 10   | `header_malformed`           | Not `key=value` pairs, missing `t`, or a bad digest |
| 11   | `header_timestamp_invalid`   | `t` is not whole, non-negative seconds          |
| 12   | `header_no_signatures`       | No `v1` element present                         |
| 13   | `header_too_many_signatures` | More than 8 `v1` elements                       |
| 14   | `signature_mismatch`         | No signature matched any secret                 |
| 15   | `timestamp_out_of_tolerance` | Outside the freshness window                    |
| 16   | `secret_empty`               | A supplied secret was the empty string          |
| 17   | `invalid_argument`           | A value the API cannot use                      |

## Why it is derived, not written down

The table is not a literal in the source. It is computed as
`10 + indexOf(code)` over `SIGIL_ERROR_CODES`, which `@sigil/core` exports.

That makes one class of bug impossible: a new error code added upstream cannot
quietly share an exit status with an existing one. It also creates an
obligation — **inserting** a code in the middle of that list renumbers every
code after it, which would silently change the meaning of an exit status a
user's script already branches on.

`@sigil/core` therefore treats `SIGIL_ERROR_CODES` as **append-only**. New
codes go on the end. This table has to be updated in the same change.

## A note on 1 versus 10+

Argument problems exit `1` even when they are *about* verification. Asking for
`--tolerance soon` is a usage error, not a rejected webhook — the signature was
never checked. Only a failure reported by `@sigil/core` reaches the 10+ range.
