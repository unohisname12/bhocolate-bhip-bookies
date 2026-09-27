import type { HelpConfig } from '../../types/help';
export const momentumHelp: HelpConfig = {
  id: 'momentum', name: 'Momentum', icon: '/assets/generated/final/momentum_icon.png',
  tutorial: [
    { id: 'momentum-intro', text: 'Capture every enemy within the turn limit. Classic has a 5×5 board; Advanced has a 7×7 board and extra tactics.', speaker: 'guide' },
    { id: 'momentum-pieces', text: 'Tap a blue piece. Its energy is its movement budget. Green squares are moves; red targets are captures. Each number shows the energy cost.', target: '[data-help="momentum-board"]', position: 'bottom', speaker: 'guide' },
    { id: 'momentum-capture', text: 'Move up, down, left or right for 1 energy per step. Paths can bend, but pieces block them. Any rank can capture any reachable enemy.', speaker: 'guide' },
    { id: 'momentum-flash', text: 'Higher ranks recharge faster. Use all your energy on a capture, or capture a higher rank, to earn a Flash upgrade or fusion choice.', speaker: 'guide' },
    { id: 'momentum-win', text: 'Use How to play to try a practice capture. There is no clock while you think. Skip Turn saves energy but gives the enemy a turn too.', speaker: 'guide' },
  ],
  quickRef: [
    { title: 'Move and capture', body: 'Select blue, then a highlighted destination. Paths follow horizontal/vertical steps and may bend. Each step costs 1 energy. Any rank can capture any rank.' },
    { title: 'Rank and energy', body: 'Rank 1 gains 1 energy per turn and holds 2; rank 2 gains 2 and holds 4; rank 3 gains 3 and holds 6. Rank 4 is temporary. Skip Turn lets energy build.' },
    { title: 'Advanced tactics', body: 'Guard spends 1 energy and your turn to add 2 to enemy capture cost until your next turn. Transfer gives 2 energy to an adjacent teammate. Hold a lightning station for +1 recharge, within the normal cap.' },
    { title: 'Flash and fusion', body: 'Capturing with all your energy or beating a higher rank grants a Flash choice. Upgrade the attacker, or combine two rank-2 teammates into one rank-3 piece on one of their squares.' },
    { title: 'Victory', body: 'Capture every enemy within the turn limit. Losing all your pieces or reaching the limit is a defeat. Rewards are shown under Win rewards & turn limit.' },
  ],
  hints: [{ id: 'momentum-first-flash', trigger: 'momentum_flash_triggered', text: 'Flash! Upgrade your attacker, or trade two rank-2 pieces for one rank-3 piece.', maxShows: 2, cooldown: 60000 }],
};
