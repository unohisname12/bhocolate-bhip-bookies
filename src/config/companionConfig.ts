import type { BattleMove } from '../types/battle';
import type { Pet, PetStage } from '../types/pet';

export const GROWTH_ART = '/assets/companions-v1';
export const DAY_MS = 86_400_000;
export const GROWTH_STAGES = ['baby', 'juvenile', 'adult'] as const;
export const COMPANIONS = {
  koala_sprite: { name: 'Pip', title: 'Tide Koala', egg: 'koala', theme: '#63d5ef', description: 'A steady friend who channels the tides.', stages: ['Pip', 'Pip Scout', 'Pip Guardian'], powers: ['Tide Pulse', 'Ocean Heart'], stats: { strength: 11, speed: 10, defense: 12 } },
  ember_fox: { name: 'Ember', title: 'Flame Fox', egg: 'ember_fox', theme: '#ff996c', description: 'A spirited fox whose warm spark grows into a blaze.', stages: ['Ember Kit', 'Ember Scout', 'Ember Phoenix'], powers: ['Spark Rush', 'Phoenix Flare'], stats: { strength: 14, speed: 13, defense: 8 } },
  moss_turtle: { name: 'Moss', title: 'Grove Turtle', egg: 'moss_turtle', theme: '#acdb7b', description: 'A gentle protector growing a tiny forest on its shell.', stages: ['Moss Sprout', 'Moss Keeper', 'Moss Ancient'], powers: ['Leaf Guard', 'Crystal Shelter'], stats: { strength: 9, speed: 8, defense: 17 } },
  luna_owl: { name: 'Luna', title: 'Moon Owl', egg: 'luna_owl', theme: '#d5b4ff', description: 'A curious night friend with soothing moonlight magic.', stages: ['Luna Owlet', 'Luna Seeker', 'Luna Celestial'], powers: ['Moon Mending', 'Starlight Renewal'], stats: { strength: 10, speed: 14, defense: 11 } },
  clover_rabbit: { name: 'Clover', title: 'Meadow Rabbit', egg: 'clover_rabbit', theme: '#a8e5bb', description: 'A trail-loving friend who always brings others along.', stages: ['Clover Kit', 'Clover Ranger', 'Clover Keeper'], powers: ['Meadow Leap', 'Spring Renewal'], stats: { strength: 10, speed: 15, defense: 10 } },
  ripple_otter: { name: 'Ripple', title: 'River Otter', egg: 'ripple_otter', theme: '#79d8ed', description: 'A cheerful maker who builds things for the whole crew.', stages: ['Ripple Pup', 'Ripple Builder', 'Ripple Guardian'], powers: ['River Rush', 'Tidal Shelter'], stats: { strength: 11, speed: 12, defense: 12 } },
  nova_axolotl: { name: 'Nova', title: 'Star Axolotl', egg: 'nova_axolotl', theme: '#d5b4ff', description: 'A gentle stargazer who shares every discovery.', stages: ['Nova Spark', 'Nova Seeker', 'Nova Starlight'], powers: ['Star Mending', 'Cosmic Renewal'], stats: { strength: 10, speed: 12, defense: 13 } },
  bramble_hedgehog: { name: 'Bramble', title: 'Leaf Hedgehog', egg: 'bramble_hedgehog', theme: '#c6d478', description: 'An inventive woodland builder with a curious heart.', stages: ['Bramble Bud', 'Bramble Crafter', 'Bramble Ancient'], powers: ['Bramble Guard', 'Golden Canopy'], stats: { strength: 10, speed: 9, defense: 16 } },
  zephyr_dragon: { name: 'Zephyr', title: 'Sky Dragon', egg: 'zephyr_dragon', theme: '#8bcafa', description: 'A sky explorer who loves a good mystery.', stages: ['Zephyr Hatchling', 'Zephyr Scout', 'Zephyr Skykeeper'], powers: ['Gust Rush', 'Sky Spiral'], stats: { strength: 13, speed: 13, defense: 9 } },
  subtrak: { name: 'Subtrak', title: 'Balance Lynx', egg: 'subtrak', theme: '#80bcbc', description: 'A quiet lynx who turns careful practice into precise power.', stages: ['Subtrak Kit', 'Subtrak Prowler', 'Subtrak Warden'], powers: ['Crescent Strike', 'Balance Nova'], stats: { strength: 10, speed: 12, defense: 14 } },
} as const;
// Original pets share the growth system without changing discovery assignments.
export const LEGACY_COMPANIONS = {
  slime_baby: { name: 'Slime', title: 'Crystal Slime', egg: 'slime', theme: '#b9ef63', description: 'A playful jelly friend growing into an emerald guardian.', stages: ['Slime Drop', 'Slime Scout', 'Slime Monarch'], powers: ['Crystal Guard', 'Emerald Renewal'], stats: { strength: 8, speed: 15, defense: 8 } },
  mech_bot: { name: 'Mech Bot', title: 'Circuit Guardian', egg: 'mech', theme: '#6fe1ff', description: 'A loyal little robot who grows stronger with every shared discovery.', stages: ['Mech Spark', 'Mech Scout', 'Mech Sentinel'], powers: ['Pulse Shield', 'Guardian Overdrive'], stats: { strength: 14, speed: 9, defense: 16 } },
} as const;
export const GROWING_PETS = { ...COMPANIONS, ...LEGACY_COMPANIONS };
export type GrowingPetId = keyof typeof GROWING_PETS;
export const isGrowingPet = (id: string): id is GrowingPetId => Object.prototype.hasOwnProperty.call(GROWING_PETS, id);
export type CompanionId = keyof typeof COMPANIONS;
export const isCompanion = (id: string): id is CompanionId => Object.prototype.hasOwnProperty.call(COMPANIONS, id);
export const stageIndex = (stage: PetStage) => stage === 'adult' || stage === 'elder' ? 2 : stage === 'juvenile' ? 1 : 0;
export function petVisualKey(pet: Pick<Pet, 'speciesId' | 'stage'>): string {
  return isGrowingPet(pet.speciesId) && stageIndex(pet.stage) > 0 ? `${pet.speciesId}__${GROWTH_STAGES[stageIndex(pet.stage)]}` : pet.speciesId;
}
export const companionForEgg = (type: string): CompanionId | null => (Object.keys(COMPANIONS) as CompanionId[]).find(id => COMPANIONS[id].egg === type) ?? null;
export const eggArt = (type: string) => `${GROWTH_ART}/${companionForEgg(type) ?? 'koala_sprite'}-egg.png`;

export function evolutionMoves(pet: Pet, basic: BattleMove[]): BattleMove[] {
  if (!isGrowingPet(pet.speciesId)) return basic;
  const rank = stageIndex(pet.stage);
  const powers = GROWING_PETS[pet.speciesId].powers;
  const type = ['moss_turtle', 'bramble_hedgehog', 'ripple_otter'].includes(pet.speciesId) ? 'defend' : ['luna_owl', 'nova_axolotl', 'clover_rabbit'].includes(pet.speciesId) ? 'heal' : 'special';
  // Keep all familiar basic moves. Only the new growth powers are stage-gated.
  return [...basic, ...Array.from({ length: rank }, (_, i): BattleMove => ({
    id: `growth_${pet.speciesId}_${i + 1}`, name: powers[i], type,
    power: type === 'heal' ? 24 + i * 18 : type === 'defend' ? 40 + i * 30 : 105 + i * 35,
    accuracy: 100, cost: 18 + i * 9,
    description: type === 'defend' ? `Raise defense by ${40 + i * 30}% for 2 turns.` : type === 'heal' ? 'Restore your HP with moonlight.' : 'An accurate elemental strike unlocked by evolution.',
    effectId: type === 'heal' ? 'heal' : type === 'defend' ? 'shield' : 'burst',
  }))];
}
