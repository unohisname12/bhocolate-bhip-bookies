import type { HelpConfig } from '../../types/help';

const registry = new Map<string, HelpConfig>();

/** Register a feature's help configuration. */
export const registerHelp = (config: HelpConfig): void => {
  registry.set(config.id, config);
};

/** Get help config for a feature. */
export const getHelpConfig = (featureId: string): HelpConfig | undefined => {
  return registry.get(featureId);
};

/** Get all registered help configs. */
export const getAllHelpConfigs = (): HelpConfig[] => {
  return Array.from(registry.values());
};

/** Check if a feature has help registered. */
export const hasHelp = (featureId: string): boolean => {
  return registry.has(featureId);
};
