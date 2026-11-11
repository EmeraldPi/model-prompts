import { readFileSync } from "node:fs";
import { Ajv } from "ajv";
import { describe, expect, it } from "vitest";

const manifest = JSON.parse(readFileSync(new URL("../openclaw.plugin.json", import.meta.url), "utf8"));
const validate = new Ajv({ strict: false }).compile(manifest.configSchema);

describe("manifest configSchema", () => {
  it("accepts the README example", () => {
    expect(
      validate({
        rules: [
          {
            id: "deepseek-tool-preambles",
            match: "opencode-go/deepseek-*",
            text: "Before each tool call, write one short sentence.",
            position: "prepend",
            agents: ["main"],
            enabled: true,
          },
        ],
      }),
    ).toBe(true);
  });
  it("accepts empty config", () => {
    expect(validate({})).toBe(true);
  });
  it("rejects the removed object form of match and unknown keys", () => {
    expect(validate({ rules: [{ match: { provider: "p" }, text: "x" }] })).toBe(false);
    expect(validate({ rules: [{ match: "a/b", text: "x", extra: 1 }] })).toBe(false);
    expect(validate({ rules: [{ match: "a/b", text: "x", position: "middle" }] })).toBe(false);
  });
  it("has a uiHint for every rule field", () => {
    const fields = Object.keys(manifest.configSchema.properties.rules.items.properties);
    for (const f of fields) expect(manifest.uiHints[`rules.*.${f}`], f).toBeDefined();
  });
});
