import { registerHelp } from '../../services/help/helpRegistry';
import { battleHelp } from './battleHelp';
import { traceHelp } from './traceHelp';
import { momentumHelp } from './momentumHelp';
import { petCareHelp } from './petCareHelp';
import { navigationHelp } from './navigationHelp';
import { mathHelp } from './mathHelp';
import { onboardingTutorial } from './onboardingTutorial';

/** Register all feature help configs. Call once at app startup. */
export const registerAllHelp = (): void => {
  registerHelp(battleHelp);
  registerHelp(traceHelp);
  registerHelp(momentumHelp);
  registerHelp(petCareHelp);
  registerHelp(navigationHelp);
  registerHelp(mathHelp);
  registerHelp(onboardingTutorial);
};
