import { afterEach, describe, expect, it, vi } from 'vitest';
import { createScreenPreview } from '../../devtools/screenCatalog';
import { DEFAULT_LEARNING } from '../../services/game/curriculum';
import { ambushAction, parseAmbushAction } from './ambush';
import { createCity, driver, DEFAULT_RULES, publicCity, resolve, startCity, submit, syncPractice, type City, type Order } from './model';
const order: Order = { destination: 0, route: 'direct', bid: 0, partner: '', perk: '' };
function fixture() {
  const state = createScreenPreview('home', DEFAULT_LEARNING, { species: 'ember_fox', stage: 'juvenile', ready: true });
  let city = createCity('ambush-test', driver(state.player.id, 'Courier', state.pet), { ...DEFAULT_RULES, length: 'campaign', rounds: 12, minutes: 0, events: false });
  city = syncPractice(startCity(city, 0), { [state.player.id]: 2 });
  city.event = { kind: 'ambush', a: 0, b: 1, title: 'Route ambush', text: 'Blocked route' };
  return { state, city, actor: state.player.id };
}
function started() {
  const f = fixture();
  return { ...f, city: ambushAction(f.city, f.actor, 'start', f.state) };
}
afterEach(() => vi.restoreAllMocks());
describe('delivery ambushes', () => {
  it('requires briefing and a healthy hatched pet, and blocks direct delivery', () => {
    const { state, city, actor } = fixture();
    expect(() => ambushAction(city, actor, 'start', { ...state, pet: null })).toThrow(/healthy pet/);
    expect(() => ambushAction(syncPractice(city, { [actor]: 1 }), actor, 'start', state)).toThrow(/briefing/);
    expect(() => submit(city, actor, order)).toThrow(/Clear the ambush/);
    expect(submit(city, actor, { ...order, route: 'scenic' }).players[0].submitted).toBe(true);
    city.players[0].perks.teleport = 1;
    expect(submit(city, actor, { ...order, perk: 'teleport' }).players[0].submitted).toBe(true);
  });
  it('persists the same battle and rejects duplicate starts and fabricated actions', () => {
    const { state, city, actor } = started();
    const saved: City = JSON.parse(JSON.stringify(city));
    expect(saved.players[0].ambush).toEqual(city.players[0].ambush);
    expect(() => ambushAction(saved, actor, 'start', state)).toThrow(/One ambush/);
    expect(() => ambushAction(saved, actor, { type: 'END_BATTLE' }, state)).toThrow(/available battle/);
    expect(() => ambushAction(saved, actor, { type: 'MATH_BONUS_CORRECT' }, state)).toThrow(/available battle/);
    expect(() => ambushAction(saved, actor, { type: 'PLAYER_MOVE', moveId: 'fake' }, state)).toThrow(/affordable move/);
    expect(() => parseAmbushAction(null)).toThrow();
    expect(() => submit(saved, actor, { ...order, route: 'scenic' })).toThrow(/Finish the ambush/);
    expect(publicCity(saved, 'opponent').players[0].ambush).toBeUndefined();
  });
  it('charges retreat exactly once and leaves the permanent pet and currency untouched', () => {
    const { state, city, actor } = started();
    const original = JSON.stringify(state);
    const lost = ambushAction(city, actor, { type: 'FLEE_BATTLE' }, state);
    expect(lost.players[0]).toMatchObject({ score: -3, expenses: 3, ambush: { status: 'lost' } });
    expect(() => ambushAction(lost, actor, { type: 'FLEE_BATTLE' }, state)).toThrow(/active ambush/);
    expect(() => ambushAction(lost, actor, 'start', state)).toThrow(/One ambush/);
    expect(() => submit(lost, actor, order)).toThrow(/Clear the ambush/);
    expect(submit(lost, actor, { ...order, route: 'scenic' }).players[0].submitted).toBe(true);
    expect(JSON.stringify(state)).toBe(original);
  });
  it('a failed flee remains in battle instead of charging a loss', () => {
    const { state, city, actor } = started();
    vi.spyOn(Math, 'random').mockReturnValue(.99);
    const next = ambushAction(city, actor, { type: 'PLAYER_FLEE_ATTEMPT' }, state);
    expect(next.players[0]).toMatchObject({ score: 0, ambush: { status: 'active' } });
    expect(next.players[0].ambush!.battle.log.some(l => l.action === 'flee_fail')).toBe(true);
  });
  it('real combat victory unlocks the route for this round only', () => {
    const { state, city, actor } = started();
    const b = city.players[0].ambush!.battle;
    b.enemyPet.currentHP = 1; b.playerPet.strength = 10000;
    b.playerPet.moves = b.playerPet.moves.map(m => ({ ...m }));
    const move = b.playerPet.moves.find(m => m.type === 'attack')!;
    move.accuracy = 100; move.cost = 0;
    vi.spyOn(Math, 'random').mockReturnValue(.5);
    const won = ambushAction(city, actor, { type: 'PLAYER_MOVE', moveId: move.id }, state);
    expect(won.players[0].ambush!.status).toBe('won');
    expect(won.players[0].score).toBe(0);
    const next = resolve(submit(won, actor, order), 1, { [actor]: 2 });
    expect(next.round).toBe(2); expect(next.players[0].ambush).toBeUndefined();
    next.event = city.event;
    expect(() => submit(syncPractice(next, { [actor]: 4 }), actor, order)).toThrow(/Clear the ambush/);
  });
  it('real combat defeat charges the loss and closes the fight', () => {
    const { state, city, actor } = started();
    const b = city.players[0].ambush!.battle;
    b.playerPet.currentHP = 1; b.enemyPet.strength = 10000;
    vi.spyOn(Math, 'random').mockReturnValue(.5);
    const next = ambushAction(city, actor, { type: 'PLAYER_FOCUS' }, state);
    expect(next.players[0]).toMatchObject({ score: -3, ambush: { status: 'lost' } });
  });
  it('timed rounds close unfinished fights without charging a defeat', () => {
    const { city, actor } = started();
    city.deadline = 100;
    const next = resolve(city, 100, { [actor]: 2 });
    expect(next.round).toBe(2); expect(next.players[0].score).toBe(0);
    expect(next.players[0].ambush).toBeUndefined();
  });
  it('classic games refresh events and computer crews detour around ambushes', () => {
    const { city, actor } = fixture();
    city.rules.market = false; city.rules.events = true;
    const next = resolve(submit(city, actor, { ...order, route: 'scenic' }), 1, { [actor]: 2 });
    expect(next.round).toBe(2);
    expect(next.players[0].ambush).toBeUndefined();
    expect(next.event).toBeDefined();
  });
});
