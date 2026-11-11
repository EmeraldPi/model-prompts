import type { ModelMatcher, Position, PromptRule } from "./match.js";

export type ParseResult = { rules: PromptRule[]; warnings: string[] };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function parseMatcher(v: unknown): ModelMatcher | undefined {
  if (typeof v === "string") return v.trim() ? v.trim() : undefined;
  if (!isRecord(v)) return undefined;
  const out: { provider?: string; model?: string } = {};
  if (typeof v.provider === "string" && v.provider.trim()) out.provider = v.provider.trim();
  if (typeof v.model === "string" && v.model.trim()) out.model = v.model.trim();
  return out.provider !== undefined || out.model !== undefined ? out : undefined;
}

/**
 * The host validates the manifest `configSchema`, but this parser is defensive so one bad
 * rule is skipped with a warning instead of disabling every rule.
 */
export function parseConfig(raw: unknown): ParseResult {
  const warnings: string[] = [];
  const rules: PromptRule[] = [];
  const list = isRecord(raw) ? raw.rules : undefined;
  if (list === undefined) return { rules, warnings };
  if (!Array.isArray(list)) {
    return { rules, warnings: ["config.rules must be an array; ignoring it"] };
  }
  list.forEach((entry, i) => {
    const label = isRecord(entry) && typeof entry.id === "string" ? entry.id : `#${i}`;
    if (!isRecord(entry)) {
      warnings.push(`rule ${label}: not an object; skipped`);
      return;
    }
    const match = parseMatcher(entry.match);
    if (!match) {
      warnings.push(`rule ${label}: missing or invalid "match"; skipped`);
      return;
    }
    if (typeof entry.text !== "string" || !entry.text.trim()) {
      warnings.push(`rule ${label}: missing or empty "text"; skipped`);
      return;
    }
    let position: Position | undefined;
    if (entry.position !== undefined) {
      if (entry.position === "append" || entry.position === "prepend") position = entry.position;
      else {
        warnings.push(`rule ${label}: position must be "append" or "prepend"; skipped`);
        return;
      }
    }
    const rule: PromptRule = { match, text: entry.text };
    if (typeof entry.id === "string") rule.id = entry.id;
    if (entry.enabled === false) rule.enabled = false;
    if (position) rule.position = position;
    if (Array.isArray(entry.agents)) {
      const agents = entry.agents.filter((a): a is string => typeof a === "string" && a.trim() !== "");
      if (agents.length > 0) rule.agents = agents;
    }
    rules.push(rule);
  });
  return { rules, warnings };
}
