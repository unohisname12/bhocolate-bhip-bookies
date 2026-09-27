import type { EngineState } from '../../types/engine';
import type { GameEngineAction } from '../../engine/core/ActionTypes';
import { addTokens, TOKENS_PER_MEDAL } from '../../services/game/wallet';

export interface PrizeProgress {
  arenaWinClaims?: string[];
  teacherClaims?: string[];
  earlyHatchPasses?: number;
  wins: number;
  medals: number;
  boosts: { attack: number; defense: number };
  armed: 'attack' | 'defense' | null;
  /** Explicit index signature keeps the generated save schema typed and open to pet IDs. */
  levelClaims: { [petId: string]: number };
  classClaims: string[];
}
export const prizeProgress = (state: EngineState): PrizeProgress => state.prizes ?? { wins: 0, medals: 0, boosts: { attack: 0, defense: 0 }, armed: null, levelClaims: {}, classClaims: [] };
export const DECOR_PRIZES = [
  { id: 'clash_trophy', name: 'Champion Trophy', price: 40, cell: 0 },
  { id: 'clash_bed', name: 'Cozy Pet Bed', price: 25, cell: 1 },
  { id: 'clash_lamp', name: 'Reading Lamp', price: 30, cell: 2 },
  { id: 'clash_rug', name: 'Cozy Rug', price: 25, cell: 3 },
  { id: 'clash_tree', name: 'Pet-House Plant', price: 50, cell: 4 },
  { id: 'clash_books', name: 'Adventure Shelf', price: 35, cell: 5 },
];
export const BATTLE_MILESTONES = [
  { wins: 1, name: 'Cozy Pet Bed', decor: 'clash_bed' },
  { wins: 3, name: 'Star Beret', cosmetic: 'cos_star_beret' },
  { wins: 5, name: 'Reading Lamp', decor: 'clash_lamp' },
  { wins: 10, name: 'Champion Trophy', decor: 'clash_trophy' },
  { wins: 20, name: 'Rainbow Aura', cosmetic: 'cos_rainbow_aura' },
  { wins: 35, name: 'Pet-House Plant', decor: 'clash_tree' },
  { wins: 50, name: 'Crown of Season', cosmetic: 'cos_season_crown' },
];
function notice(state: EngineState, message: string): EngineState {
  return { ...state, notifications: [...state.notifications, { id: crypto.randomUUID(), message, icon: '/assets/generated/final/reward_trophy_gold.png', timestamp: Date.now() }].slice(-30) };
}
export function grantCollectible(state: EngineState, decor?: string, cosmetic?: string): EngineState {
  if (decor && !state.player.unlockedRoomItems.includes(decor)) return { ...state, player: { ...state.player, unlockedRoomItems: [...state.player.unlockedRoomItems, decor] } };
  if (cosmetic && !state.cosmetics.owned.some(c => c.cosmeticId === cosmetic)) return { ...state, cosmetics: { ...state.cosmetics, owned: [...state.cosmetics.owned, { cosmeticId: cosmetic, count: 1, firstObtainedAt: new Date().toISOString() }] } };
  return addTokens(state, 3 * TOKENS_PER_MEDAL);
}
export function grantClassPrize(state: EngineState, round: string, score: number, rank: number): EngineState {
  const p = prizeProgress(state);
  if (score <= 0 || p.classClaims.includes(round)) return state;
  const medals = 3 + Math.min(5, Math.floor(score / 50)) + (rank <= 3 ? 5 : 0);
  state = { ...addTokens(state, medals * TOKENS_PER_MEDAL), prizes: { ...p, boosts: { attack: p.boosts.attack + 1, defense: p.boosts.defense + 1 }, classClaims: [...p.classClaims, round] } };
  state = grantCollectible(state, rank <= 3 ? 'clash_trophy' : 'clash_books');
  if (rank === 1) state = grantCollectible(state, undefined, 'cos_season_crown');
  return notice(state, `Classroom Clash: ${medals * TOKENS_PER_MEDAL} tokens, a permanent decoration and 2 battle boosts!${rank === 1 ? ' Champion crown unlocked!' : ''}`);
}
export function reducePrizes(state: EngineState, action: GameEngineAction): EngineState | null {
  const p = prizeProgress(state);
  if (action.type === 'ARM_PRIZE_BOOST') {
    if (state.battle.active || state.run.active || state.pendingBattleWarmup || (action.boost && p.boosts[action.boost] < 1)) return state;
    return { ...state, prizes: { ...p, armed: action.boost } };
  }
  if (action.type === 'BUY_PRIZE') {
    const decor = DECOR_PRIZES.find(d => d.id === action.itemId);
    const boost = action.itemId === 'attack' || action.itemId === 'defense' ? action.itemId : null;
    const price = decor?.price ?? (boost ? 2 * TOKENS_PER_MEDAL : Infinity);
    if (state.player.currencies.tokens < price || (decor && state.player.unlockedRoomItems.includes(decor.id))) return state;
    state = { ...addTokens(state, -price), prizes: { ...p, boosts: boost ? { ...p.boosts, [boost]: p.boosts[boost] + 1 } : p.boosts } };
    return decor ? grantCollectible(state, decor.id) : state;
  }
  return null;
}
/** Rewards are triggered by actual state transitions, never by closing a result twice. */
export function awardTransitions(before: EngineState, next: EngineState, action: GameEngineAction): EngineState {
  if (next === before || next.mode !== 'normal' || next.devPreview || ['LOAD_LEARNER_PROFILE', 'EXIT_TEST_MODE', 'EXIT_DEV_PREVIEW', 'DEV_PREVIEW_STATE'].includes(action.type)) return next;
  let p = prizeProgress(next);
  if (!before.battle.active && next.battle.active && p.armed && p.boosts[p.armed] > 0) {
    const boost = p.armed;
    p = { ...p, armed: null, boosts: { ...p.boosts, [boost]: p.boosts[boost] - 1 } };
    const pet = next.battle.playerPet;
    next = { ...next, prizes: p, battle: { ...next.battle, playerPet: { ...pet, strength: boost === 'attack' ? Math.ceil(pet.strength * 1.2) : pet.strength, defense: boost === 'defense' ? Math.ceil(pet.defense * 1.2) : pet.defense }, log: [...next.battle.log, { turn: 0, actor: 'player', action: 'prize_boost', message: `Prize boost: +20% ${boost} for this fight only.` }] } };
  }
  const arenaId=before.petArena?.fight?.phase==='active'&&next.petArena?.fight?.phase==='won'&&next.petArena.fight.mode!=='practice'?next.petArena.fight.id:null;
  const arenaWon=!!arenaId&&!p.arenaWinClaims?.includes(arenaId);
  const won = arenaWon || before.battle.active && before.battle.phase !== 'victory' && next.battle.active && next.battle.phase === 'victory';
  if (won) {
    const wins = p.wins + 1;
    next = { ...addTokens(next, 2 * TOKENS_PER_MEDAL), prizes: { ...p, ...(arenaWon?{arenaWinClaims:[...(p.arenaWinClaims??[]),arenaId!].slice(-100)}:{}), wins, boosts: { ...p.boosts, [wins % 2 ? 'attack' : 'defense']: p.boosts[wins % 2 ? 'attack' : 'defense'] + 1 } } };
    const milestone = BATTLE_MILESTONES.find(m => m.wins === wins);
    if (milestone) next = grantCollectible(next, milestone.decor, milestone.cosmetic);
    if (wins % 5 === 0) next = addTokens(next, 5 * TOKENS_PER_MEDAL);
    next = notice(next, `Victory #${wins}! +${2 * TOKENS_PER_MEDAL} tokens and a battle boost.${milestone ? ` Permanent prize: ${milestone.name}!` : ''}${wins % 5 === 0 ? ` +${5 * TOKENS_PER_MEDAL} milestone tokens!` : ''}`);
  }
  if (before.pet && next.pet && before.pet.id === next.pet.id && next.pet.progression.level > before.pet.progression.level) {
    p = prizeProgress(next);
    const from = Math.max(before.pet.progression.level, p.levelClaims[next.pet.id] ?? 1);
    const levels = next.pet.progression.level - from;
    if (levels > 0) {
      next = { ...addTokens(next, levels * 3 * TOKENS_PER_MEDAL), prizes: { ...p, boosts: { attack: p.boosts.attack + levels, defense: p.boosts.defense + levels }, levelClaims: { ...p.levelClaims, [next.pet.id]: next.pet.progression.level } } };
      next = notice(next, `Level ${next.pet!.progression.level}! +${levels * 3 * TOKENS_PER_MEDAL} tokens and ${levels * 2} optional battle boosts. Choose something for your home!`);
    }
  }
  return next;
}
