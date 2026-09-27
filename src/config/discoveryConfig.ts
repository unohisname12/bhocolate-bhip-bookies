import type { AdventureStyle } from '../types/discovery';
import type { CompanionId } from './companionConfig';

export const DISCOVERY_DAYS = 5;
export const ADVENTURE_STYLES: Record<AdventureStyle, { label: string; icon: string; mission: string; story: string; companion: CompanionId }> = {
  explore: { label: 'Explore', icon: '✦', mission: 'Trail Scouts', story: 'Light three trail markers so the woodland crew can explore a new path.', companion: 'ember_fox' },
  build: { label: 'Build', icon: '▦', mission: 'Bridge Builders', story: 'Place three bridge pieces to connect the woodland paths.', companion: 'moss_turtle' },
  help: { label: 'Help', icon: '♥', mission: 'Picnic Crew', story: 'Pack three picnic baskets for our imaginary woodland friends.', companion: 'koala_sprite' },
  wonder: { label: 'Wonder', icon: '☾', mission: 'Star Detectives', story: 'Find three star clues for the woodland sky map.', companion: 'luna_owl' },
};
export const STYLE_KEYS = Object.keys(ADVENTURE_STYLES) as AdventureStyle[];
// Each position maps to the same style; screen rotates their visual order.
export const DISCOVERY_QUIZ = [
  { question: 'Our woodland club has a free afternoon. What sounds fun?', choices: ['Follow a new trail', 'Build a tiny bridge', 'Plan a picnic together', 'Find shapes in the stars'] },
  { question: 'Pick a make-believe tool for today’s adventure.', choices: ['A treasure map', 'A box of building blocks', 'A basket of supplies', 'A magnifying glass'] },
  { question: 'Which mini-project would you like to try?', choices: ['Design an obstacle path', 'Create a block tower', 'Make a welcome sign', 'Invent a number riddle'] },
  { question: 'Choose a woodland club celebration.', choices: ['A treasure hunt', 'A building fair', 'A picnic party', 'A star show'] },
];
