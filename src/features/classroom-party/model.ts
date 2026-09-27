import { createInitialEngineState } from '../../engine/state/createInitialEngineState';
import { freshArcade, reduceArcade, startRun, type ArcadeGame, type ArcadeRun, type Tower } from '../arcade/model';
import type { GameEngineAction } from '../../engine/core/ActionTypes';
export type PartyMember = {
  id: string; alias: string; status: 'invited' | 'joined' | 'declined' | 'left';
  baseline: number; target: number; practice: number; lastSeen: number;
  station: { selected: number; tray: number[] }; racer: ArcadeRun | null;
};
export type PartyState = {
  game: ArcadeGame; host: string; phase: 'lobby' | 'playing' | 'done' | 'closed';
  members: PartyMember[]; run: ArcadeRun; seed: number; startAt: number;
  beat: number; waveAt: number; events: string[]; receipts: string[];
};
export type PartyCommand =
  | { kind: 'lane'; lane: number }
  | { kind: 'build'; slot: number; tower: Tower }
  | { kind: 'wave' }
  | { kind: 'order'; order: number }
  | { kind: 'ingredient'; ingredient: number }
  | { kind: 'clear' } | { kind: 'serve' }
  | { kind: 'restock'; ingredient: number };
export interface PartyRoom { id: string; revision: number; expiresAt: number; state: PartyState }
export interface PartyData {
  me: string; serverNow: number;
  classmates: { id: string; alias: string }[];
  rooms: PartyRoom[];
}
export const PARTY_NAMES: Record<ArcadeGame,string> = { dash: 'Starlight Rally', guard: 'Nest Guardians', cafe: 'Woodland Café Crew' };
export function createParty(game: ArcadeGame, host: PartyMember, seed: number): PartyState {
  return { game, host: host.id, phase: 'lobby', members: [host], seed, run: startRun(game, 1, seed), startAt: 0, beat: 0, waveAt: 0, events: [`${host.alias} opened the room.`], receipts: [] };
}
export function partyEvent(s: PartyState, text: string): PartyState { return { ...s, events: [...s.events, text].slice(-8) }; }
function play(run: ArcadeRun, action: GameEngineAction): ArcadeRun {
  const state = { ...createInitialEngineState(), screen: 'arcade' as const, arcade: { ...freshArcade(), run } };
  return reduceArcade(state, action)?.arcade?.run ?? run;
}
/** Server time, never browser ticks, advances shared games. Reads can safely catch up. */
export function advanceParty(s: PartyState, now: number): PartyState {
  if (s.phase !== 'playing') return s;
  if (s.game === 'dash') {
    const beat = Math.min(60, Math.max(0, Math.floor((now - s.startAt) / 1800)));
    if (beat <= s.beat) return s;
    const members = s.members.map(m => {
      if (m.status !== 'joined' || !m.racer) return m;
      let racer = m.racer;
      for (let n = s.beat; n < beat && !racer.done; n++) racer = play(racer, { type: 'ARCADE_TICK' });
      return { ...m, racer };
    });
    return { ...s, beat, members, phase: members.filter(m => m.status === 'joined').every(m => m.racer?.done) ? 'done' : 'playing' };
  }
  if (s.game === 'guard' && s.waveAt) {
    const target = Math.min(16, Math.max(0, Math.floor((now - s.waveAt) / 700)));
    const base = Math.floor(s.beat / 16) * 16;
    let run = s.run;
    for (let n = run.step; n < base + target && !run.done; n++) run = play(run, { type: 'ARCADE_TICK' });
    if (run === s.run) return s;
    const finishedWave = target === 16 || run.done;
    return { ...s, run, beat: finishedWave ? run.step : s.beat, waveAt: finishedWave ? 0 : s.waveAt, phase: run.done ? 'done' : 'playing' };
  }
  return s;
}
export function commandParty(s: PartyState, actor: string, cmd: PartyCommand): PartyState {
  if (s.phase !== 'playing') return s;
  const me = s.members.find(m => m.id === actor && m.status === 'joined');
  if (!me) return s;
  if (s.game === 'dash' && cmd.kind === 'lane' && me.racer && !me.racer.done) {
    const racer = play(me.racer, { type: 'ARCADE_LANE', lane: cmd.lane });
    return { ...s, members: s.members.map(m => m.id === actor ? { ...m, racer } : m) };
  }
  if (s.game === 'guard' && cmd.kind === 'build' && !s.waveAt) {
    const run = play(s.run, { type: 'ARCADE_BUILD', slot: cmd.slot, tower: cmd.tower });
    if (run === s.run) return s;
    return partyEvent({ ...s, run }, `${me.alias} built or upgraded ${cmd.tower} on plot ${cmd.slot + 1}.`);
  }
  if (s.game !== 'cafe') return s;
  let action: GameEngineAction;
  switch (cmd.kind) {
    case 'order': action = { type: 'ARCADE_CAFE', kind: 'select', value: cmd.order }; break;
    case 'ingredient': action = { type: 'ARCADE_CAFE', kind: 'ingredient', value: cmd.ingredient }; break;
    case 'clear': action = { type: 'ARCADE_CAFE', kind: 'clear', value: 0 }; break;
    case 'serve': action = { type: 'ARCADE_CAFE', kind: 'serve', value: 0 }; break;
    case 'restock': action = { type: 'ARCADE_RESTOCK', ingredient: cmd.ingredient }; break;
    default: return s;
  }
  const run = play({ ...s.run, ...me.station }, action);
  // Each player has a personal tray; all share the orders, supplies, score and victory.
  const served = run.step > s.run.step;
  const members = s.members.map(m => m.id === actor ? { ...m, station: { selected: run.selected, tray: run.tray } }
    : served && m.station.selected === me.station.selected ? { ...m, station: { ...m.station, tray: [] } } : m);
  const next = { ...s, members, run: { ...run, selected: 0, tray: [] }, phase: run.done ? 'done' as const : 'playing' as const };
  return served ? partyEvent(next, `${me.alias} served a customer! Team score: ${run.score}.`) : next;
}
