import type { EngineState } from '../../types/engine';
import { discoveryDays } from '../../services/game/eggDiscovery';

/** Games and systems a student sees. A new student starts with a small, clear set; the rest arrives
 * the first time it becomes meaningful, so nobody meets seven currencies and twelve games on day one. */
export type Feature =
  | 'dash' | 'catch' | 'merge' | 'math' | 'shop'
  | 'cafe' | 'guard' | 'bridge'
  | 'momentum' | 'delivery'
  | 'care' | 'home' | 'battle' | 'first' | 'wardrobe' | 'quests' | 'petGames'
  | 'dungeon' | 'forge' | 'season' | 'prizeStudio';

export interface Unlock { feature: Feature; title: string; line: string }
// Shown once, the first time each group appears. One sentence each: what it is and why it matters.
export const INTROS: Unlock[] = [
  { feature: 'cafe', title: 'Nest Café and Shellguard are open', line: 'Plan with math and watch it happen: your recipe feeds real customers, your equation builds real towers.' },
  { feature: 'momentum', title: 'Momentum and Delivery Districts are open', line: 'A strategy board, and a city where your pet runs a delivery crew.' },
  { feature: 'care', title: 'Your companion is here!', line: 'Care for it in My Pet, build it a home, and take it into battles. Pet Hunt and duels are on Together.' },
  { feature: 'dungeon', title: 'Dungeon, Power Forge and the season track are open', line: 'Your first victory unlocked longer adventures and permanent upgrades for your pet.' },
];

const HATCHED: Feature[] = ['care', 'home', 'battle', 'first', 'wardrobe', 'quests', 'petGames'];
const STARTER: Feature[] = ['dash', 'catch', 'merge', 'math', 'shop'];

export function unlockedFeatures(state: EngineState): Set<Feature> {
  const all = new Set<Feature>([...STARTER, 'cafe', 'guard', 'bridge', 'momentum', 'delivery', ...HATCHED, 'dungeon', 'forge', 'season', 'prizeStudio']);
  if (state.learning.showAllGames) return all;
  const hatched = !!state.pet;
  const days = hatched ? Infinity : state.eggDiscovery ? discoveryDays(state.eggDiscovery) : 0;
  const played = (g: 'dash' | 'guard' | 'cafe') => (state.arcade?.plays?.[g] ?? 0) > 0;
  const wins = state.prizes?.wins ?? 0;
  const out = new Set<Feature>(STARTER);
  // Something a student has already played never disappears.
  if (days >= 2 || played('cafe') || played('guard')) ['cafe', 'guard', 'bridge'].forEach(f => out.add(f as Feature));
  if (days >= 3 || state.momentum.active) ['momentum', 'delivery'].forEach(f => out.add(f as Feature));
  if (hatched) HATCHED.forEach(f => out.add(f));
  if (hatched && (wins >= 1 || state.firstAdventure?.phase === 'complete' || state.run.active)) ['dungeon', 'forge', 'season', 'prizeStudio'].forEach(f => out.add(f as Feature));
  return out;
}

/** The next thing that will open, so a student always knows more is coming and how to get it. */
export function nextUnlock(open: Set<Feature>): string | null {
  if (!open.has('cafe')) return 'Nest Café and Shellguard open after your second day of play.';
  if (!open.has('momentum')) return 'Momentum and Delivery Districts open after your third day of play.';
  if (!open.has('care')) return 'Pet battles, care and your home open when your egg hatches.';
  if (!open.has('dungeon')) return 'Win your first battle to open the dungeon, Power Forge and the season track.';
  return null;
}
