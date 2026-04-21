import type { HelpConfig } from '../../types/help';

export const ONBOARDING_TUTORIAL_ID = 'first-run-onboarding';

export const onboardingTutorial: HelpConfig = {
  id: ONBOARDING_TUTORIAL_ID,
  name: 'Getting Started',
  icon: '/assets/generated/final/pet_care_icon.png',
  tutorial: [
    {
      id: 'onboard-welcome',
      text: "Hi! I'm your new Auralith. We're partners now — feed me, play with me, and I'll grow strong for you.",
      speaker: 'guide',
    },
    {
      id: 'onboard-care',
      text: 'Check in on me during the day. When I get hungry or dirty, use the actions on the right to take care of me.',
      speaker: 'guide',
    },
    {
      id: 'onboard-math',
      text: 'Solve math problems to charge up my power. Every correct answer adds to my next battle — the more you train, the stronger I fight!',
      speaker: 'guide',
    },
    {
      id: 'onboard-battle',
      text: "Then take that power into battle! Win fights to level up, earn rewards, and unlock new friends.",
      speaker: 'guide',
    },
    {
      id: 'onboard-daily',
      text: 'Come back every day! You\'ll get new quests, your streak will grow, and there are always new things to discover. Let\'s go!',
      speaker: 'guide',
    },
  ],
  quickRef: [
    {
      title: 'The Daily Loop',
      body: 'Care → Train (math) → Fight → Move. Doing all four completes your Power Path for the day.',
    },
    {
      title: 'Math Buffs',
      body: 'Correct math answers accumulate as +ATK/+DEF/+HP. The pool empties when your next battle starts.',
    },
    {
      title: 'Streaks',
      body: 'Log in every day to grow your streak. Math streaks unlock tier bonuses (Bronze, Silver, Gold, Platinum).',
    },
  ],
};
