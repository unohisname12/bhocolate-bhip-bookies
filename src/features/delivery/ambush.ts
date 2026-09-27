import type { EngineState } from '../../types/engine';
import type { GameEngineAction } from '../../engine/core/ActionTypes';
import { engineReducer } from '../../engine/state/engineReducer';
import { initBattle } from '../../engine/systems/BattleSystem';
import { createCombatFeelState } from '../../engine/systems/CombatFeelSystem';
import type { City } from './model';

// Only combat choices cross the classroom API; clients cannot supply rewards,
// damage, trace scores, or a replacement battle state.
export type AmbushAction = 'start' | Extract<GameEngineAction, { type:
  'PLAYER_MOVE' | 'PLAYER_FOCUS' | 'PLAYER_DEFEND_ACTION' | 'PLAYER_FLEE_ATTEMPT' | 'FLEE_BATTLE'
}>;
export function parseAmbushAction(value: unknown): AmbushAction {
  if (value === 'start') return value;
  if (!value || typeof value !== 'object' || !('type' in value)) throw new Error('Choose an available battle action.');
  switch (value.type) {
    case 'PLAYER_MOVE':
      if (!('moveId' in value) || typeof value.moveId !== 'string') break;
      return { type: value.type, moveId: value.moveId };
    case 'PLAYER_FOCUS': case 'PLAYER_DEFEND_ACTION': case 'PLAYER_FLEE_ATTEMPT': case 'FLEE_BATTLE':
      return { type: value.type };
  }
  throw new Error('Choose an available battle action.');
}
export function ambushAction(s: City, actor: string, input: unknown, state: EngineState): City {
  const action = parseAmbushAction(input);
  const p = s.players.find(p => p.id === actor && p.joined && !p.bot);
  if (s.phase !== 'planning' || !p || p.submitted || s.event?.kind !== 'ambush') throw new Error('This ambush is no longer active.');
  if (action === 'start') {
    if (!state.pet || ['dead', 'sick'].includes(state.pet.state) || p.practice < 2 || p.ambush?.round === s.round || p.challenge?.status === 'active') {
      throw new Error('Prepare a healthy pet and finish your briefing first. One ambush attempt per round; eggs can take the scenic route.');
    }
    const battle = { ...initBattle(state.pet), combatFeel: { ...createCombatFeelState(), collapseUsed: true } };
    return { ...s, players: s.players.map(r => r.id === actor ? { ...p, ambush: { round: s.round, node: s.event!.a, status: 'active', battle } } : r) };
  }
  const encounter = p.ambush;
  if (encounter?.round !== s.round || encounter.node !== s.event.a || encounter.status !== 'active') throw new Error('Choose an active ambush.');
  if (encounter.battle.phase !== 'player_turn') throw new Error('Wait for your battle turn.');
  if (action.type === 'PLAYER_MOVE') {
    const move = encounter.battle.playerPet.moves.find(m => m.id === action.moveId);
    if (!move || move.cost > encounter.battle.playerPet.energy) throw new Error('Choose an affordable move your pet knows.');
  }
  const next = engineReducer({ ...state, battle: encounter.battle, run: { ...state.run, active: false } }, action);
  const battle = next.battle.active ? next.battle : encounter.battle;
  const status = battle.phase === 'victory' ? 'won' : !next.battle.active || battle.phase === 'defeat' ? 'lost' : 'active';
  return {
    ...s,
    players: s.players.map(r => r.id === actor ? {
      ...p, score: p.score - (status === 'lost' ? 3 : 0), expenses: (p.expenses ?? 0) + (status === 'lost' ? 3 : 0),
      ambush: { ...encounter, battle, status },
    } : r),
    log: status === 'active' ? s.log : [...s.log, `${p.alias}: ${status === 'won' ? 'cleared the delivery ambush; direct route unlocked for this round' : 'lost or retreated from the ambush; 3 match coins lost. Choose a detour or another customer'}.`].slice(-30),
  };
}
