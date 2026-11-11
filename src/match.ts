export type ModelMatcher = string | { provider?: string; model?: string };

export type Position = "append" | "prepend";

export type PromptRule = {
  id?: string;
  enabled?: boolean;
  match: ModelMatcher;
  agents?: string[];
  position?: Position;
  text: string;
};

export type RunTarget = {
  provider?: string;
  modelId?: string;
  agentId?: string;
};

const globCache = new Map<string, RegExp>();

/** Case-insensitive glob: `*` matches any run of characters (including `/`), `?` one character. */
export function globToRegExp(pattern: string): RegExp {
  let re = globCache.get(pattern);
  if (!re) {
    const body = pattern
      .split("")
      .map((ch) => (ch === "*" ? ".*" : ch === "?" ? "." : ch.replace(/[.+^${}()|[\]\\]/g, "\\$&")))
      .join("");
    re = new RegExp(`^${body}$`, "i");
    globCache.set(pattern, re);
  }
  return re;
}

export function globMatches(pattern: string, value: string): boolean {
  return globToRegExp(pattern).test(value);
}

function matcherApplies(matcher: ModelMatcher, target: RunTarget): boolean {
  const { provider, modelId } = target;
  if (typeof matcher === "string") {
    // A bare string is a glob over the full "provider/model" reference.
    if (!provider || !modelId) return false;
    return globMatches(matcher, `${provider}/${modelId}`);
  }
  if (matcher.provider !== undefined) {
    if (!provider || !globMatches(matcher.provider, provider)) return false;
  }
  if (matcher.model !== undefined) {
    if (!modelId || !globMatches(matcher.model, modelId)) return false;
  }
  return true;
}

export function ruleApplies(rule: PromptRule, target: RunTarget): boolean {
  if (rule.enabled === false) return false;
  if (rule.agents && rule.agents.length > 0) {
    if (!target.agentId || !rule.agents.some((a) => globMatches(a, target.agentId as string))) {
      return false;
    }
  }
  return matcherApplies(rule.match, target);
}

export type Composed = {
  prependSystemContext?: string;
  appendSystemContext?: string;
};

/** Collect the text of every applicable rule, in config order, per position. */
export function composeContext(rules: readonly PromptRule[], target: RunTarget): Composed | undefined {
  const prepend: string[] = [];
  const append: string[] = [];
  for (const rule of rules) {
    if (!ruleApplies(rule, target)) continue;
    const text = rule.text.trim();
    if (!text) continue;
    (rule.position === "prepend" ? prepend : append).push(text);
  }
  if (prepend.length === 0 && append.length === 0) return undefined;
  const out: Composed = {};
  if (prepend.length > 0) out.prependSystemContext = prepend.join("\n\n");
  if (append.length > 0) out.appendSystemContext = append.join("\n\n");
  return out;
}
