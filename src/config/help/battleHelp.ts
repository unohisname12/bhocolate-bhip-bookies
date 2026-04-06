import type { HelpConfig } from '../../types/help';

export const battleHelp: HelpConfig = {
  id: 'battle',
  name: 'Battle',
  icon: '/assets/generated/final/battle_icon.png',
  tutorial: [
    {
      id: 'battle-intro',
      text: 'Welcome to battle! Your Auralith will fight an opponent in turn-based combat. Choose your moves wisely!',
      speaker: 'guide',
    },
    {
      id: 'battle-hp',
      text: 'Both fighters have HP bars at the top. When one reaches zero, the battle ends.',
      target: '[data-help="hp-bars"]',
      position: 'bottom',
      speaker: 'guide',
    },
    {
      id: 'battle-energy',
      text: 'Every move costs energy. You gain a little energy each turn. Use Focus to recover more when you\'re running low.',
      speaker: 'guide',
    },
    {
      id: 'battle-moves',
      text: 'Tap an action to use it. Attacks deal damage, Defend reduces incoming hits, and special moves have unique effects.',
      target: '[data-help="action-bar"]',
      position: 'top',
      speaker: 'guide',
      action: 'tap',
    },
    {
      id: 'battle-combos',
      text: 'Landing consecutive attacks builds a combo. Each combo stack increases your damage by 5%!',
      speaker: 'guide',
    },
  ],
  quickRef: [
    {
      title: 'Moves',
      body: 'Attack deals damage, Defend halves incoming damage for one turn, Focus restores energy, and special moves have unique effects.',
    },
    {
      title: 'Energy',
      body: 'You gain 4 energy per turn. Moves cost 10-30 energy. Use Focus when low to gain a large energy boost.',
    },
    {
      title: 'Combos',
      body: 'Each consecutive attack adds a 5% damage stack. Defending or using Focus resets your combo.',
    },
    {
      title: 'Victory',
      body: 'Reduce the enemy\'s HP to 0 to win. You\'ll earn XP, tokens, and your pet gets happier!',
    },
  ],
  hints: [
    {
      id: 'battle-low-energy',
      trigger: 'battle_low_energy',
      text: 'Tip: Your energy is low! Try using Focus to recover.',
      maxShows: 3,
      cooldown: 60000,
    },
    {
      id: 'battle-combo-hint',
      trigger: 'battle_combo_3',
      text: 'Nice combo! Keep attacking to stack even more damage.',
      maxShows: 2,
      cooldown: 120000,
    },
  ],
};
