# Model Prompts

An [OpenClaw](https://github.com/openclaw/openclaw) plugin that adds text to the system prompt for
specific models or providers.

Some models need a nudge that others don't. The motivating case is
[openclaw/openclaw#197253](https://github.com/openclaw/openclaw/issues/197253): with thinking on,
DeepSeek V4.x returns `content: null` on tool-call turns and keeps its "what I'm about to do"
narration in `reasoning_content`, so OpenClaw shows no interim updates between tool calls. One
sentence in the system prompt fixes it, but putting it in `AGENTS.md` applies it to every model and
has to be repeated in every workspace. This plugin scopes prompt text to the models that need it.

Nothing is applied by default. You write the rules.

## Install

From ClawHub (once published):

```bash
openclaw plugins install model-prompts
```

From a clone of this repo:

```bash
npm install && npm run build
openclaw plugins install --link /path/to/model-prompts --force
```

OpenClaw `2026.11.2` or newer. See [Compatibility](#compatibility).

## Configure

You can set this up in the Control UI (Settings, then Model Prompts) or in `openclaw.json`. In the
UI, turn on conversation access for the plugin under **Permissions**, then add rules with **+**.

Non-bundled plugins must be granted conversation access before OpenClaw will run their
`before_prompt_build` hook. **Without this grant the plugin loads but does nothing.**

```json5
// ~/.openclaw/openclaw.json
plugins: {
  entries: {
    "model-prompts": {
      enabled: true,
      hooks: { allowConversationAccess: true },
      config: {
        rules: [
          {
            id: "deepseek-tool-preambles",
            match: "opencode-go/deepseek-*",
            text: "Before each tool call or batch of tool calls, write one short sentence in your visible reply (not in your reasoning) saying what you're about to do."
          }
        ]
      }
    }
  }
}
```

Config changes hot-reload; no gateway restart is needed.

### Rule fields

| Field      | Required | Description |
| ---------- | -------- | ----------- |
| `match`    | yes      | Which model the rule applies to: a glob over `provider/model`, such as `opencode-go/deepseek-*`. |
| `text`     | yes      | The text to add. |
| `position` | no       | `"append"` (default) or `"prepend"`. See [Where the text goes](#where-the-text-goes). |
| `agents`   | no       | Agent ids (globs allowed). When set, the rule applies only to those agents. |
| `enabled`  | no       | Set `false` to switch a rule off without deleting it. |
| `id`       | no       | A label used in warnings. |

### Matching

- Matching is case-insensitive. `*` matches any run of characters, including `/`; `?` matches one character.
- `match` is tested against `provider/model`, for example `opencode-go/deepseek-v4.1-flash`.
- Use `opencode-go/*` for a whole provider, or `*/deepseek-*` for a model on any provider.
- Every rule that matches applies. Their text is joined with a blank line, in config order, separately for each position.
- A rule never matches when the model is unknown to the hook.
- A malformed rule is skipped with a warning in the gateway log; the other rules still load.

## Where the text goes

OpenClaw wraps each block of plugin text in `---` fences under the heading
`OpenClaw plugin-injected system context. This block is not workspace file content.` The two
positions differ in where that block lands. Offsets below are from a real 62,000-character prompt on
2026.11.2.

| Position  | Lands | Cache behaviour |
| --------- | ----- | --------------- |
| `prepend` | At the very top (offset ~90), before OpenClaw's stable section. | Part of the stable, cacheable prefix. |
| `append`  | Near the end (offset ~51,000 of ~62,000), after the dynamic section. Content that other plugins add later can follow it. | Sits after the cache boundary. |

`append` is the default because it leaves the start of OpenClaw's own prompt untouched. If you add
long static text and care about prompt caching, `prepend` keeps it inside the stable prefix.
In informal testing with the DeepSeek rule above, both positions produced a visible preamble on most
tool-call turns (see [Results](#results)); neither was clearly better.

Per OpenClaw's hook docs, each plugin block is capped at 25% of the model's context window.

## Results

Tested on OpenClaw 2026.11.2 (embedded runner), `opencode-go/deepseek-v4.1-flash`, thinking `high`,
one prompt that triggers a single `ls` tool call.

| Setup | Tool-call turns with visible text |
| ----- | --------------------------------- |
| Instruction not in the prompt (plugin off, ungranted, or rule not matching) | 0 of 4 |
| Rule, `append` | 6 of 8 |
| Rule, `prepend` | 5 of 6 |

These are small samples from a stochastic model, so treat them as "helps most of the time", not a
guarantee. The prompt text, and not the plugin, determines how reliably a given model follows it.

Also verified: a rule scoped to another agent id, and a run on a different model
(`muse-spark-1.3-contributor`), left the system prompt unchanged.

## Compatibility

- **Minimum:** OpenClaw `2026.11.2`, the oldest version tested. Older versions are untested and not claimed.
- **Runtime:** tested on the embedded runner only. OpenClaw documents `before_prompt_build` for CLI,
  Codex, ACPX and Copilot runtimes too, but this plugin has not been run on them.
- The hook context must include the resolved model (`modelProviderId` and `modelId`). It does on 2026.11.2.
  If it ever does not, the plugin logs a one-time warning and model-scoped rules cannot match.
- OpenClaw's plugin APIs are marked experimental, so a future release may need a plugin update.

## Troubleshooting

| Symptom | Cause |
| ------- | ----- |
| Nothing happens | Look in the gateway log for `typed hook "before_prompt_build" blocked because non-bundled plugins must set plugins.entries.model-prompts.hooks.allowConversationAccess=true`. Add the grant shown above. |
| `no rules configured; nothing to do` | `plugins.entries.model-prompts.config.rules` is missing or empty. |
| `rule …: … skipped` | That rule is malformed; the message says why. |
| Rule never matches | Check the exact refs with `openclaw agents list`. Match against `provider/model`, for example `opencode-go/deepseek-v4.1-flash`. |

`openclaw plugins inspect model-prompts --runtime` shows whether the plugin loaded.

## Development

```bash
npm install
npm run typecheck
npm test
npm run build      # emits dist/
```

The OpenClaw SDK is provided by the host at runtime, so it is not a dev dependency. A minimal type
shim for the slice used lives in `src/openclaw-shim.d.ts`.

To try a local build, link it (see [Install](#install)) and grant the hook:

```bash
openclaw config set plugins.entries.model-prompts.hooks.allowConversationAccess true --strict-json
```

`scripts/inspect-trajectory.mjs` summarizes an exported session
(`openclaw sessions export-trajectory`) and shows, per assistant turn, whether it called tools and
whether it carried visible text.

## License

MIT
