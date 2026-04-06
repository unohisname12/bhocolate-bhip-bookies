import type { HelpConfig } from '../../types/help';

export const navigationHelp: HelpConfig = {
  id: 'navigation',
  name: 'World Navigation',
  icon: '/assets/generated/final/nav_icon.png',
  tutorial: [
    {
      id: 'nav-intro',
      text: 'Welcome to the Equation Layer! Your Auralith lives in this cozy home. Look around!',
      speaker: 'guide',
    },
    {
      id: 'nav-rooms',
      text: 'Use the arrows at the edges of the screen to move between rooms. Each room has different things to interact with.',
      target: '[data-help="room-nav"]',
      position: 'left',
      speaker: 'guide',
    },
    {
      id: 'nav-hotspots',
      text: 'Glowing objects are interactive! Tap the mailbox to claim daily rewards, or tap doors to enter new areas.',
      speaker: 'guide',
    },
    {
      id: 'nav-mailbox',
      text: 'Check your mailbox every day for free tokens! The reward grows the more days you visit.',
      speaker: 'guide',
    },
  ],
  quickRef: [
    {
      title: 'Rooms',
      body: 'Navigate between Outside (yard) and Inside (house) using the arrows on screen edges.',
    },
    {
      title: 'Mailbox',
      body: 'Claim daily rewards from the mailbox. Rewards increase each consecutive day you visit.',
    },
    {
      title: 'Interactive Objects',
      body: 'Glowing objects can be tapped. Look for the fireplace, bookshelf, window, and doors inside.',
    },
  ],
};
