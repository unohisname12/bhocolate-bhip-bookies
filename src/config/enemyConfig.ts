import type { BattleMove } from '../types/battle';
import type { RunEnemyTemplate } from '../types/run';

/** Combat-only creatures. Never enter pet adoption, saves, or questionnaire matching. */
export const ENEMIES = {
  thorn_maw: { name: 'Thorn Maw', tier: 1, stats: { strength: 11, speed: 8, defense: 12 }, attack: 'Briar Bite', special: 'Thorn Burst', hint: 'A tough hide, but slow attacks. Build energy behind your guard.' },
  gloom_bat: { name: 'Gloom Bat', tier: 1, stats: { strength: 10, speed: 16, defense: 7 }, attack: 'Wing Rake', special: 'Night Echo', hint: 'Fast but fragile. Watch its intent and strike when it opens up.' },
  cinder_imp: { name: 'Cinder Imp', tier: 1, stats: { strength: 13, speed: 12, defense: 7 }, attack: 'Coal Claw', special: 'Ember Orb', hint: 'Its heavy fire attack costs energy. Guard, then counterattack.' },
  crypt_cap: { name: 'Crypt Cap', tier: 2, stats: { strength: 10, speed: 9, defense: 13 }, attack: 'Root Rake', special: 'Spore Storm', hint: 'It can recover health. Save energy for a strong finishing attack.' },
  rust_reaver: { name: 'Rust Reaver', tier: 2, stats: { strength: 14, speed: 7, defense: 15 }, attack: 'Iron Pincer', special: 'Scrap Vortex', hint: 'Armored and slow. Focus while it braces, then use a special.' },
  frost_fang: { name: 'Frost Fang', tier: 2, stats: { strength: 13, speed: 15, defense: 8 }, attack: 'Frost Pounce', special: 'Ice Howl', hint: 'A quick attacker. Keep enough energy for healing after its howl.' },
  bog_lurker: { name: 'Bog Lurker', tier: 3, stats: { strength: 12, speed: 8, defense: 14 }, attack: 'Marsh Claw', special: 'Bog Blast', hint: 'Durable with recovery magic. Alternate focus and strong attacks.' },
  hollow_knight: { name: 'Hollow Knight', tier: 3, stats: { strength: 14, speed: 9, defense: 14 }, attack: 'Hollow Cleave', special: 'Spectral Arc', hint: 'Watch for its heavy strike. Defend before the blade comes down.' },
  storm_mantis: { name: 'Storm Mantis', tier: 3, stats: { strength: 13, speed: 16, defense: 8 }, attack: 'Sickle Swipe', special: 'Thunder Spiral', hint: 'Fast blades, light armor. Accurate attacks beat a long fight.' },
  dusk_hydra: { name: 'Dusk Hydra', tier: 'boss', stats: { strength: 14, speed: 11, defense: 12 }, attack: 'Twin Bite', special: 'Twilight Breath', hint: 'Two heads, one health bar. Guard the breath and keep your HP up.' },
  obsidian_golem: { name: 'Obsidian Golem', tier: 'boss', stats: { strength: 15, speed: 6, defense: 17 }, attack: 'Obsidian Fist', special: 'Rift Quake', hint: 'Very tough and slow. Use Focus and specials to break through.' },
  nightmare_drake: { name: 'Nightmare Drake', tier: 'boss', stats: { strength: 15, speed: 13, defense: 10 }, attack: 'Shadow Talon', special: 'Nightfire', hint: 'A fierce final rival. Read its intent, defend heavy blows, then retaliate.' },
} as const;
export type EnemyId = keyof typeof ENEMIES;
export const ENEMY_IDS = Object.keys(ENEMIES) as EnemyId[];
export const isEnemy = (id: string): id is EnemyId => Object.hasOwn(ENEMIES, id);
export function enemyMoves(id: EnemyId): BattleMove[] {
  const e = ENEMIES[id];
  return [
    { id: `${id}_attack`, name: e.attack, type: 'attack', power: 55, accuracy: 95, cost: 8, description: 'A quick, accurate strike.', effectId: 'slash' },
    { id: `${id}_special`, name: e.special, type: 'special', power: 95, accuracy: 90, cost: 22, description: 'A powerful themed attack.', effectId: 'burst' },
    { id: `${id}_guard`, name: 'Dark Guard', type: 'defend', power: 0, accuracy: 100, cost: 5, description: 'Brace against the next attack.', effectId: 'shield' },
    { id: `${id}_heal`, name: 'Gather Shadows', type: 'heal', power: 24, accuracy: 100, cost: 16, description: 'Spend energy to recover HP.', effectId: 'heal' },
  ];
}
export const NEW_RUN_ENEMIES: RunEnemyTemplate[] = ENEMY_IDS.map(id => ({
  id, name: ENEMIES[id].name, speciesId: id, tier: ENEMIES[id].tier,
  behavior: ENEMIES[id].tier === 'boss' ? 'boss' : ENEMIES[id].stats.defense > 12 ? 'defensive' : 'aggressive',
  statScale: ENEMIES[id].tier === 1 ? 0.8 : ENEMIES[id].tier === 'boss' ? 1.1 : 0.9,
  hpScale: ENEMIES[id].tier === 'boss' ? 1.3 : 0.95,
  description: ENEMIES[id].hint, counterplayHint: ENEMIES[id].hint,
}));
