import { describe, expect, it } from "vitest";
import { composeContext, globMatches, ruleApplies, type PromptRule } from "../src/match.js";

const ds = { provider: "opencode-go", modelId: "deepseek-v4.1-flash", agentId: "main" };

describe("globMatches", () => {
  it("matches literally, case-insensitively", () => {
    expect(globMatches("DeepSeek-V4", "deepseek-v4")).toBe(true);
    expect(globMatches("deepseek-v4", "deepseek-v4.1")).toBe(false);
  });
  it("supports * and ? and escapes regex characters", () => {
    expect(globMatches("deepseek-*", "deepseek-v4.1-flash")).toBe(true);
    expect(globMatches("deepseek-v?.1*", "deepseek-v4.1-flash")).toBe(true);
    expect(globMatches("v4.1", "v4x1")).toBe(false);
    expect(globMatches("a+b", "a+b")).toBe(true);
    expect(globMatches("*/deepseek-*", "openrouter/deepseek/deepseek-v4")).toBe(true);
  });
});

describe("ruleApplies", () => {
  it("matches a provider/model glob string", () => {
    expect(ruleApplies({ match: "opencode-go/deepseek-*", text: "x" }, ds)).toBe(true);
    expect(ruleApplies({ match: "deepseek/*", text: "x" }, ds)).toBe(false);
  });
  it("covers whole providers and any-provider models with wildcards", () => {
    expect(ruleApplies({ match: "opencode-go/*", text: "x" }, ds)).toBe(true);
    expect(ruleApplies({ match: "*/deepseek-*", text: "x" }, ds)).toBe(true);
    expect(ruleApplies({ match: "deepseek/deepseek-*", text: "x" }, ds)).toBe(false);
  });
  it("never matches model-scoped rules when the model is unknown", () => {
    expect(ruleApplies({ match: "*", text: "x" }, { agentId: "main" })).toBe(false);
    expect(ruleApplies({ match: "*/*", text: "x" }, { provider: "p" })).toBe(false);
  });
  it("filters by agent when agents is set", () => {
    const rule: PromptRule = { match: "opencode-go/*", agents: ["main", "ops-*"], text: "x" };
    expect(ruleApplies(rule, ds)).toBe(true);
    expect(ruleApplies(rule, { ...ds, agentId: "ops-1" })).toBe(true);
    expect(ruleApplies(rule, { ...ds, agentId: "other" })).toBe(false);
    expect(ruleApplies(rule, { ...ds, agentId: undefined })).toBe(false);
  });
  it("respects enabled: false", () => {
    expect(ruleApplies({ match: "*/*", enabled: false, text: "x" }, ds)).toBe(false);
  });
});

describe("composeContext", () => {
  it("returns undefined when nothing applies", () => {
    expect(composeContext([{ match: "other/*", text: "x" }], ds)).toBeUndefined();
    expect(composeContext([], ds)).toBeUndefined();
  });
  it("defaults to append and joins matching rules in config order", () => {
    const out = composeContext(
      [
        { match: "opencode-go/*", text: "first" },
        { match: "nope/*", text: "skipped" },
        { match: "*/deepseek-*", text: " second " },
      ],
      ds,
    );
    expect(out).toEqual({ appendSystemContext: "first\n\nsecond" });
  });
  it("splits prepend and append rules", () => {
    const out = composeContext(
      [
        { match: "*/*", position: "prepend", text: "top" },
        { match: "*/*", position: "append", text: "bottom" },
      ],
      ds,
    );
    expect(out).toEqual({ prependSystemContext: "top", appendSystemContext: "bottom" });
  });
  it("ignores rules whose text is blank", () => {
    expect(composeContext([{ match: "*/*", text: "   " }], ds)).toBeUndefined();
  });
});
