# Changelog

## 0.1.1

- **Breaking:** `match` is now a single glob string over `provider/model`. The `{ provider, model }`
  object form is removed; use `opencode-go/*` (whole provider) or `*/deepseek-*` (model on any provider).
- Control UI: labels, help text, placeholders, and a multiline box for rule text, so the generated
  settings form is easier to fill in.

## 0.1.0

- Initial release.
- Rules that append or prepend system-prompt text, matched on `provider/model` globs, provider and
  model separately, and optionally on agent id.
- Tested on OpenClaw 2026.11.2 (embedded runner).
