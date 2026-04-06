import type { HelpConfig } from '../../types/help';

export const momentumHelp: HelpConfig = {
  id: 'momentum',
  name: 'Momentum',
  icon: '/assets/generated/final/momentum_icon.png',
  tutorial: [
    {
      id: 'momentum-intro',
      text: 'Momentum is a tactical board game! Move your pieces on a 5x5 grid to capture the enemy\'s pieces.',
      speaker: 'guide',
    },
    {
      id: 'momentum-pieces',
      text: 'Each piece has a rank (1-4). Higher rank pieces are stronger. Tap a piece to select it and see its moves.',
      target: '[data-help="momentum-board"]',
      position: 'bottom',
      speaker: 'guide',
    },
    {
      id: 'momentum-capture',
      text: 'Move onto an enemy piece to attack it. Higher rank usually wins. Equal ranks — the attacker wins!',
      speaker: 'guide',
    },
    {
      id: 'momentum-flash',
      text: 'Flash Moments trigger on special conditions like exact-energy kills or underdog wins. You\'ll get to choose a powerful bonus!',
      speaker: 'guide',
    },
    {
      id: 'momentum-win',
      text: 'Capture all enemy pieces or have more pieces when turns run out to win. Good luck!',
      speaker: 'guide',
    },
  ],
  quickRef: [
    {
      title: 'Piece Ranks',
      body: 'Pieces are ranked 1-4. Higher rank beats lower. Equal rank — attacker wins. Rank-4 pieces are temporary upgrades.',
    },
    {
      title: 'Movement',
      body: 'Tap a piece to select it, then tap a highlighted cell to move. Each piece moves one tile (orthogonal or diagonal).',
    },
    {
      title: 'Flash Moments',
      body: 'Triggered by exact-energy kills or underdog wins. Choose between upgrading a piece or fusing two pieces together.',
    },
    {
      title: 'Victory',
      body: 'Capture all enemy pieces, or have more pieces remaining when the turn limit is reached.',
    },
  ],
  hints: [
    {
      id: 'momentum-first-flash',
      trigger: 'momentum_flash_triggered',
      text: 'Flash Moment! Choose wisely — upgrade a piece or fuse two together.',
      maxShows: 2,
      cooldown: 60000,
    },
  ],
};
