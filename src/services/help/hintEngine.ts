import type { HintRule, HelpState } from '../../types/help';
import { getAllHelpConfigs } from './helpRegistry';

/** Find a hint that should fire for the given game event. */
export const matchHint = (
  eventType: string,
  helpState: HelpState,
): HintRule | null => {
  const now = Date.now();
  const allConfigs = getAllHelpConfigs();

  for (const config of allConfigs) {
    if (!config.hints) continue;
    for (const hint of config.hints) {
      if (hint.trigger !== eventType) continue;
      const showCount = helpState.hintCounts[hint.id] ?? 0;
      if (showCount >= hint.maxShows) continue;
      const lastShown = helpState.hintTimestamps[hint.id] ?? 0;
      if (now - lastShown < hint.cooldown) continue;
      return hint;
    }
  }

  return null;
};
