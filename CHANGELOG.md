# Changelog

## 0.1.0

Initial release.

- `sigil sign`, `verify`, `inspect` and `backoff`.
- `--secret` and `--secret-env`, both repeatable, for key rotation.
- Exit codes derived from `SIGIL_ERROR_CODES` in `@sigil/core`, starting at 10.
- `--now` and `--timestamp` for reproducible output in tests and scripts.
