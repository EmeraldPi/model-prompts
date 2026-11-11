// Minimal typings for the slice of the OpenClaw plugin SDK this plugin uses. The real SDK is
// supplied by the host at runtime (peer dependency), so it is not installed for builds or CI.
// Shapes follow https://docs.openclaw.ai/plugins/hooks/prompt-and-session (2026.11.2).
declare module "openclaw/plugin-sdk/plugin-entry" {
  export type PluginLoggerLike = {
    debug?: (message: string) => void;
    info: (message: string) => void;
    warn: (message: string) => void;
  };

  export type BeforePromptBuildContext = {
    agentId?: string;
    modelProviderId?: string;
    modelId?: string;
    [key: string]: unknown;
  };

  export type BeforePromptBuildResult = {
    prependSystemContext?: string;
    appendSystemContext?: string;
  };

  export type PluginApiLike = {
    pluginConfig?: Record<string, unknown>;
    logger: PluginLoggerLike;
    on(
      hook: "before_prompt_build",
      handler: (
        event: unknown,
        ctx: BeforePromptBuildContext,
      ) => BeforePromptBuildResult | undefined | Promise<BeforePromptBuildResult | undefined>,
    ): void;
  };

  export function definePluginEntry(definition: {
    id: string;
    name: string;
    description: string;
    register: (api: PluginApiLike) => void;
  }): unknown;
}
