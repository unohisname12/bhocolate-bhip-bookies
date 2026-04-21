import { describe, it, expect, beforeAll } from 'vitest';
import { shouldStartOnboarding } from '../tutorialEngine';
import { registerAllHelp } from '../../../config/help';
import { ONBOARDING_TUTORIAL_ID } from '../../../config/help/onboardingTutorial';

describe('shouldStartOnboarding', () => {
  beforeAll(() => {
    registerAllHelp();
  });

  it('returns true when player has never onboarded and tutorial not completed', () => {
    expect(shouldStartOnboarding(false, [])).toBe(true);
  });

  it('returns false once hasOnboarded flips to true', () => {
    expect(shouldStartOnboarding(true, [])).toBe(false);
  });

  it('returns false when onboarding tutorial was already completed/skipped', () => {
    expect(shouldStartOnboarding(false, [ONBOARDING_TUTORIAL_ID])).toBe(false);
  });
});
