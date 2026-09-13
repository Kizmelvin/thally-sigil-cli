# sigil

Sign, verify and inspect [Sigil](https://github.com/fairsplitt/sigil-core)
webhook signatures from the command line, and print the delivery retry
schedule.

Every rule the CLI enforces comes from [`@sigil/core`](https://github.com/fairsplitt/sigil-core);
this package adds argument parsing, output formatting and exit codes.

## Install

```
npm install -g @sigil/cli
```

## Use

```bash
# Sign a file
sigil sign --body payload.json --secret-env WEBHOOK_SECRET

# Sign something you just fetched
curl -s "$URL" | sigil sign --body - --secret-env WEBHOOK_SECRET

# Verify, silently, for a script
sigil verify --body payload.json --header "$SIG" --secret-env WEBHOOK_SECRET --quiet || echo "rejected ($?)"

# See what a header claims, without needing the secret
sigil inspect --header "t=1767225600,v1=45b4..."

# Print the retry schedule
sigil backoff
```

## Secrets

Prefer `--secret-env VAR` over `--secret value`. An argument is visible in `ps`
and lands in shell history; an environment variable does neither.

Both flags repeat, and repeating them is the [key-rotation](https://github.com/fairsplitt/sigil-core/blob/main/docs/key-rotation.md)
path — sign with two secrets, or verify against two, while a rollout is in
flight:

```bash
sigil sign --body payload.json --secret-env SECRET_OLD --secret-env SECRET_NEW
```

## Exit codes

`0` on success, `1` for a usage error, and a distinct code from `10` up for
each way verification can fail — so a script can tell a bad signature from a
bad clock without parsing stderr.

```bash
sigil verify --body payload.json --header "$SIG" --secret-env WEBHOOK_SECRET --quiet
case $? in
  0)  echo "ok" ;;
  14) echo "signature did not match" ;;
  15) echo "timestamp outside the window" ;;
  *)  echo "rejected" ;;
esac
```

The full table is in [docs/exit-codes.md](docs/exit-codes.md).

## Documentation

- [Commands](docs/commands.md) — every command and flag
- [Exit codes](docs/exit-codes.md) — the mapping, and why it is derived

## License

MIT
