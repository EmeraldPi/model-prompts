import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { parseConfig } from "./config.js";
import { composeContext } from "./match.js";

export default definePluginEntry({
  id: "model-prompts",
  name: "Model Prompts",
  description: "Append or prepend system-prompt text for specific models or providers.",
  register(api) {
    const { rules, warnings } = parseConfig(api.pluginConfig);
    for (const warning of warnings) api.logger.warn(`model-prompts: ${warning}`);
    if (rules.length === 0) {
      api.logger.info("model-prompts: no rules configured; nothing to do");
      return;
    }
    api.logger.info(`model-prompts: ${rules.length} rule(s) loaded`);

    let warnedMissingModel = false;
    api.on("before_prompt_build", (_event, ctx) => {
      if (!ctx.modelId && !warnedMissingModel) {
        warnedMissingModel = true;
        api.logger.warn(
          "model-prompts: hook context has no modelId; model-scoped rules cannot match on this runtime",
        );
      }
      const composed = composeContext(rules, {
        provider: ctx.modelProviderId,
        modelId: ctx.modelId,
        agentId: ctx.agentId,
      });
      if (composed) {
        api.logger.debug?.(
          `model-prompts: applied to ${ctx.modelProviderId ?? "?"}/${ctx.modelId ?? "?"} (agent ${ctx.agentId ?? "?"})`,
        );
      }
      return composed;
    });
  },
});
