import type { HelpConfig } from '../../types/help';

export const petCareHelp: HelpConfig = {
  id: 'pet-care',
  name: 'Pet Care',
  icon: '/assets/generated/final/pet_care_icon.png',
  tutorial: [
    {
      id: 'petcare-intro',
      text: 'This is your Auralith\'s home! Take care of them by feeding, playing, cleaning, and keeping them healthy.',
      speaker: 'guide',
    },
    {
      id: 'petcare-needs',
      text: 'Your pet has four needs: Hunger, Happiness, Cleanliness, and Health. Keep them all high!',
      speaker: 'guide',
    },
    {
      id: 'petcare-actions',
      text: 'Use the action buttons on the right to care for your pet. Each action costs tokens but keeps your Auralith happy.',
      target: '[data-help="side-panel"]',
      position: 'left',
      speaker: 'guide',
    },
    {
      id: 'petcare-mood',
      text: 'Your pet\'s mood changes based on their needs. A happy pet fights better in battle!',
      speaker: 'guide',
    },
    {
      id: 'petcare-evolution',
      text: 'Keep caring for your pet and winning battles. As they gain XP and level up, they\'ll evolve into stronger forms!',
      speaker: 'guide',
    },
  ],
  quickRef: [
    {
      title: 'Feeding',
      body: 'Buy food from the shop or use the Feed button. Different foods restore different amounts of hunger.',
    },
    {
      title: 'Needs',
      body: 'Hunger, Happiness, Cleanliness, Health — each ranges 0-100. They decay over time, so check in regularly.',
    },
    {
      title: 'Mood',
      body: 'Hungry or sick pets get anxious. Well-cared-for pets are playful and fight better. Dead pets... need healing.',
    },
    {
      title: 'Evolution',
      body: 'Pets evolve through stages: Egg > Baby > Juvenile > Adult > Elder. Level up and meet evolution requirements to progress.',
    },
  ],
  hints: [
    {
      id: 'petcare-hungry',
      trigger: 'pet_hungry',
      text: 'Your pet is getting hungry! Try feeding them.',
      maxShows: 5,
      cooldown: 300000,
    },
    {
      id: 'petcare-dirty',
      trigger: 'pet_dirty',
      text: 'Your Auralith could use a bath. Try the Clean action!',
      maxShows: 3,
      cooldown: 300000,
    },
  ],
};
