import { describe, it, expect, vi } from 'vitest';
import { engineReducer as reduce } from '../../../engine/state/engineReducer';
import { createTestEngineState } from '../../../engine/state/createTestEngineState';
import { initBattle } from '../../../engine/systems/BattleSystem';
import { computeChecksum, validateSave } from '../../../services/persistence/saveValidation';
import { CURRENT_SAVE_VERSION, migrate } from '../../../services/persistence/saveMigrations';
import { prizeProgress } from '../../clash/rewards';
import { observeFirstAdventure, validFirstAdventure } from '../model';
import type { EngineState } from '../../../types/engine';
import type { MathProblem } from '../../../types';
const fixture = (): EngineState => ({ ...createTestEngineState(), mode: 'normal', devPreview: false, screen: 'home', test: { active: false, label: '' } });
const problem = (id: string): MathProblem => ({ id, question: '2 + 3 = ?', answer: 5, difficulty: 1, reward: 5 });
function solve(s: EngineState, id: string, correct = true) { return reduce(s, { type: 'SOLVE_MATH', problem: problem(id), source: 'practice', difficulty: 1, correct, reward: correct ? 5 : 0 }); }
const readyReward = () => ['a', 'b', 'c'].reduce((s, id) => solve(s, id), reduce(fixture(), { type: 'START_FIRST_ADVENTURE' }));
describe('First Adventure', () => {
  it('starts at zero for existing players and preserves progress on resume', () => {
    const old = fixture(); old.player.lifetimeMathCorrect = 200;
    let s = reduce(old, { type: 'START_FIRST_ADVENTURE' });
    expect(s.firstAdventure).toEqual({ phase: 'learn', solved: 0 });
    s = solve(s, 'a');
    expect(reduce(s, { type: 'START_FIRST_ADVENTURE' }).firstAdventure).toEqual({ phase: 'learn', solved: 1 });
  });
  it('counts successful retries once; duplicate and wrong answers cannot earn the shelf', () => {
    let s = reduce(fixture(), { type: 'START_FIRST_ADVENTURE' });
    s = solve(s, 'a', false); expect(s.firstAdventure?.solved).toBe(0);
    s = solve(s, 'a'); s = solve(s, 'a'); expect(s.firstAdventure?.solved).toBe(1);
    s = solve(s, 'b'); s = solve(s, 'c'); s = solve(s, 'd');
    expect(s.firstAdventure).toEqual({ phase: 'reward', solved: 3 });
    expect(s.player.unlockedRoomItems).not.toContain('clash_books');
  });
  it('claims the permanent shelf and one optional boost only once, including after reload', () => {
    const s = readyReward(), start = prizeProgress(s).boosts.defense;
    const claimed = reduce(s, { type: 'CLAIM_FIRST_ADVENTURE' });
    expect(claimed.player.unlockedRoomItems.filter(i => i === 'clash_books')).toHaveLength(1);
    expect(prizeProgress(claimed).boosts.defense).toBe(start + 1);
    const save = { version: CURRENT_SAVE_VERSION, state: claimed, checksum: computeChecksum(claimed), timestamp: Date.now() };
    expect(validateSave(save).valid).toBe(true);
    expect(reduce(migrate(JSON.parse(JSON.stringify(save))), { type: 'CLAIM_FIRST_ADVENTURE' }).prizes).toEqual(claimed.prizes);
    expect(reduce(fixture(), { type: 'CLAIM_FIRST_ADVENTURE' }).firstAdventure).toBeUndefined();
  });
  it('requires a valid shelf placement and actual accepted time together before battle', () => {
    let s = reduce(readyReward(), { type: 'CLAIM_FIRST_ADVENTURE' });
    s = reduce(s, { type: 'HOME_OPEN' });
    s = reduce(s, { type: 'HOME_PLACE', furnitureId: 'clash_books', x: -1, y: 0 });
    expect(s.firstAdventure?.phase).toBe('place');
    s = reduce(s, { type: 'HOME_PLACE', furnitureId: 'clash_books', x: 0, y: 4 });
    expect(s.firstAdventure?.phase).toBe('bond');
    s = reduce(s, { type: 'PET_HOME_MEMORY', kind: 'cuddle' });
    expect(s.firstAdventure?.phase).toBe('battle');
  });
  it('awards battle completion on a real winning move; dismissal cannot replay the medal reward', () => {
    const base = fixture(), battle = initBattle(base.pet!);
    const s: EngineState = { ...base, firstAdventure: { phase: 'battle', solved: 3 }, battle: { ...battle, phase: 'player_turn', enemyPet: { ...battle.enemyPet, currentHP: 1 } } };
    const random = vi.spyOn(Math, 'random').mockReturnValue(.1);
    try {
      const won = reduce(s, { type: 'PLAYER_MOVE', moveId: battle.playerPet.moves[0].id });
      expect(won.firstAdventure?.phase).toBe('complete');
      expect(won.player.currencies.tokens).toBe(s.player.currencies.tokens + 20); // victory 10 + adventure 10
      const closed = reduce(won, { type: 'END_BATTLE' });
      expect(reduce(closed, { type: 'END_BATTLE' }).player.currencies.tokens).toBe(closed.player.currencies.tokens);
    } finally { random.mockRestore(); }
  });
  it('credits a defeat but not abandoning a fight or loading a completed fight', () => {
    const base = fixture(), battle = initBattle(base.pet!);
    const s: EngineState = { ...base, firstAdventure: { phase: 'battle', solved: 3 }, battle };
    expect(reduce(s, { type: 'FLEE_BATTLE' }).firstAdventure?.phase).toBe('battle');
    expect(observeFirstAdventure(s, { ...s, battle: { ...battle, phase: 'defeat' } }, { type: 'LOAD_LEARNER_PROFILE', state: s }).firstAdventure?.phase).toBe('battle');
    const lost = observeFirstAdventure(s, { ...s, battle: { ...battle, phase: 'defeat' } }, { type: 'PLAYER_FOCUS' });
    expect(lost.firstAdventure?.phase).toBe('complete'); expect(lost.player.currencies.tokens).toBe(s.player.currencies.tokens + 10);
    expect(observeFirstAdventure(lost, { ...lost }, { type: 'TICK', deltaMs: 1000 }).prizes).toEqual(lost.prizes);
  });
  it('does not start while busy, in a preview, or without a living pet', () => {
    for (const s of [{ ...fixture(), devPreview: true }, { ...fixture(), pet: null }, { ...fixture(), mode: 'test' as const }, { ...fixture(), pendingBattleWarmup: { kind: 'wild' as const } }])
      expect(reduce(s, { type: 'START_FIRST_ADVENTURE' })).toBe(s);
  });
  it('validates phase/progress pairs while allowing older saves with no adventure', () => {
    expect(validFirstAdventure({ phase: 'learn', solved: 3 })).toBe(false);
    expect(validFirstAdventure({ phase: 'complete', solved: 0 })).toBe(false);
    expect(validFirstAdventure({ phase: 'reward', solved: 3 })).toBe(true);
    expect(validFirstAdventure({ phase: 'learn', solved: NaN })).toBe(false);
    const s = fixture();
    expect(validateSave({ version: CURRENT_SAVE_VERSION, state: s, checksum: computeChecksum(s), timestamp: Date.now() }).valid).toBe(true);
  });
});
