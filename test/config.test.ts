import { describe, expect, it } from "vitest";
import { parseConfig } from "../src/config.js";

describe("parseConfig", () => {
  it("returns no rules for missing config", () => {
    expect(parseConfig(undefined)).toEqual({ rules: [], warnings: [] });
    expect(parseConfig({})).toEqual({ rules: [], warnings: [] });
  });
  it("parses valid rules", () => {
    const { rules, warnings } = parseConfig({
      rules: [
        { id: "a", match: "p/m*", text: "hi", position: "prepend", agents: ["main", ""] },
        { match: { provider: "p" }, text: "yo", enabled: false },
      ],
    });
    expect(warnings).toEqual([]);
    expect(rules).toEqual([
      { id: "a", match: "p/m*", text: "hi", position: "prepend", agents: ["main"] },
      { match: { provider: "p" }, text: "yo", enabled: false },
    ]);
  });
  it("skips bad rules with a warning but keeps good ones", () => {
    const { rules, warnings } = parseConfig({
      rules: [
        "nope",
        { match: "", text: "x" },
        { match: "a/b", text: "  " },
        { id: "bad-pos", match: "a/b", text: "x", position: "middle" },
        { id: "ok", match: "a/b", text: "x" },
      ],
    });
    expect(rules).toEqual([{ id: "ok", match: "a/b", text: "x" }]);
    expect(warnings).toHaveLength(4);
    expect(warnings[3]).toContain("bad-pos");
  });
  it("warns when rules is not an array", () => {
    expect(parseConfig({ rules: "x" }).warnings).toHaveLength(1);
  });
});
