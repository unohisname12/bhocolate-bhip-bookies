import { addTokens, TOKENS_PER_MEDAL } from '../../services/game/wallet';
import type { EngineState } from '../../types/engine';
import type { GameEngineAction } from '../../engine/core/ActionTypes';
import { BATTLE_MILESTONES, prizeProgress } from '../clash/rewards';

export type AdventurePhase = 'learn' | 'reward' | 'place' | 'bond' | 'battle' | 'complete';
export interface FirstAdventure { phase: AdventurePhase; solved: number }
export const ADVENTURE_FURNITURE = 'clash_books';
export const adventureBusy = (s: EngineState) => s.battle.active || s.run.active || s.momentum.active || !!s.pendingBattleWarmup;
export const adventureAvailable = (s: EngineState) => !!s.pet && s.pet.state !== 'dead' && s.mode === 'normal' && !s.devPreview;
export function validFirstAdventure(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const a = value as FirstAdventure;
  return ['learn', 'reward', 'place', 'bond', 'battle', 'complete'].includes(a.phase)
    && Number.isInteger(a.solved) && a.solved >= 0 && a.solved <= 3
    && (a.phase === 'learn' ? a.solved < 3 : a.solved === 3);
}
export function reduceFirstAdventure(s: EngineState, action: GameEngineAction): EngineState | null {
  if (action.type !== 'START_FIRST_ADVENTURE' && action.type !== 'CLAIM_FIRST_ADVENTURE') return null;
  if (!adventureAvailable(s) || adventureBusy(s)) return s;
  if (action.type === 'START_FIRST_ADVENTURE') return { ...s, firstAdventure: s.firstAdventure ?? { phase: 'learn', solved: 0 }, screen: s.firstAdventure && s.firstAdventure.phase !== 'learn' ? 'first_adventure' : 'math' };
  if (s.firstAdventure?.phase !== 'reward') return s;
  const prizes = prizeProgress(s);
  return { ...s, firstAdventure: { ...s.firstAdventure, phase: 'place' },
    player: { ...s.player, unlockedRoomItems: Array.from(new Set([...s.player.unlockedRoomItems, ADVENTURE_FURNITURE])) },
    prizes: { ...prizes, boosts: { ...prizes.boosts, defense: prizes.boosts.defense + 1 } } };
}
/** Advance only on accepted gameplay transitions. Loading and previewing never earn rewards. */
export function observeFirstAdventure(before: EngineState, next: EngineState, action: GameEngineAction): EngineState {
  if (['LOAD_LEARNER_PROFILE', 'EXIT_TEST_MODE', 'EXIT_DEV_PREVIEW', 'DEV_PREVIEW_STATE'].includes(action.type)) return next;
  const a = before.firstAdventure;
  if (!a || !adventureAvailable(before) || !adventureAvailable(next) || before === next) return next;
  if (a.phase === 'learn' && ['SOLVE_MATH', 'RECORD_LEARNING_ATTEMPT', 'ANSWER_BRIDGE_QUESTION', 'ANSWER_DISCOVERY_MISSION', 'ANSWER_GROWTH_TRIAL'].includes(action.type)
    && next.player.lifetimeMathCorrect > before.player.lifetimeMathCorrect) {
    const solved = Math.min(3, a.solved + 1);
    return { ...next, firstAdventure: { solved, phase: solved === 3 ? 'reward' : 'learn' } };
  }
  if (a.phase === 'place' && action.type === 'HOME_PLACE' && action.furnitureId === ADVENTURE_FURNITURE && next.homeBase !== before.homeBase)
    return { ...next, firstAdventure: { ...a, phase: 'bond' } };
  if (a.phase === 'bond' && action.type === 'PET_HOME_MEMORY' && before.pet?.mind !== next.pet?.mind)
    return { ...next, firstAdventure: { ...a, phase: 'battle' } };
  if (a.phase === 'battle' && before.battle.active && next.battle.active
    && !['victory', 'defeat'].includes(before.battle.phase) && ['victory', 'defeat'].includes(next.battle.phase)) {
    const paid = addTokens(next, 2 * TOKENS_PER_MEDAL);
    return { ...paid, firstAdventure: { ...a, phase: 'complete' },
      notifications: [...next.notifications, { id: 'first-adventure-complete', message: `First Adventure complete! +${2 * TOKENS_PER_MEDAL} tokens for trying a battle. Your Adventure Shelf is yours to keep.`, icon: '/assets/generated/final/reward_trophy_gold.png', timestamp: Date.now() }].slice(-30) };
  }
  return next;
}

export const ADVENTURE_STEPS = ['Solve 3 questions', 'Open your reward', 'Place your shelf', 'Time together', 'Try a battle'];
export const ADVENTURE_PHASES = ['learn', 'reward', 'place', 'bond', 'battle', 'complete'];
export function nextAdventureGoal(state: EngineState): string {
  const a = state.firstAdventure;
  if (!a) return 'First Adventure · earn a shelf for your home';
  if (a.phase === 'complete') {
    const wins = prizeProgress(state).wins, next = BATTLE_MILESTONES.find(m => m.wins > wins);
    return next ? `${next.name} · ${wins}/${next.wins} battle wins` : 'Choose your next collection reward';
  }
  return a.phase === 'learn' ? `Earn your Adventure Shelf · ${a.solved}/3 questions` : ADVENTURE_STEPS[ADVENTURE_PHASES.indexOf(a.phase)];
}
