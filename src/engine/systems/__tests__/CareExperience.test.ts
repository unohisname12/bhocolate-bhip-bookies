import { describe, expect, it } from 'vitest';
import { createScreenPreview } from '../../../devtools/screenCatalog';
import { DEFAULT_LEARNING } from '../../../services/game/curriculum';
import { engineReducer } from '../../state/engineReducer';
import { CARE_PRESENTATION } from '../../../components/care/carePresentation';
import { CARE_GAME_DEFAULTS } from '../../../components/care-games/types';
import { checkAchievements } from '../AchievementSystem';

const fixture = () => checkAchievements(createScreenPreview('home', DEFAULT_LEARNING, { species: 'ember_fox', stage: 'juvenile', ready: true })).state;

describe('focused care sessions', () => {
  it('covers every existing care mode with a theme and a playable activity', () => {
    expect(Object.keys(CARE_PRESENTATION).sort()).toEqual(Object.keys(CARE_GAME_DEFAULTS).sort());
    for (const theme of Object.values(CARE_PRESENTATION)) {
      expect(theme.instruction.length).toBeGreaterThan(20);
      expect(theme.animation).toBeTruthy();
      expect(theme.benefit).toBeTruthy();
    }
  });
  it('canceling resets the session without charging or awarding care', () => {
    const initial = fixture();
    const started = engineReducer(initial, { type: 'START_PET_INTERACTION', mode: 'wash' });
    expect(started.interaction.careGameActive).toBe(true);
    const cancelled = engineReducer(started, { type: 'SET_HAND_MODE', mode: 'idle' });
    expect(cancelled.interaction).toMatchObject({ activeMode: 'idle', careGameActive: false, isInteracting: false, currentInteractionStart: null });
    expect(cancelled.pet).toEqual(initial.pet);
    expect(cancelled.player.currencies).toEqual(initial.player.currencies);
    expect(engineReducer(cancelled, { type: 'CARE_GAME_COMPLETE', mode: 'wash', quality: 1 })).toBe(cancelled);
  });
  it('ignores duplicate starts, invalid scores, wrong modes and replayed completions', () => {
    const started = engineReducer(fixture(), { type: 'START_PET_INTERACTION', mode: 'wash' });
    expect(engineReducer(started, { type: 'START_PET_INTERACTION', mode: 'pet' })).toBe(started);
    expect(engineReducer(started, { type: 'CARE_GAME_COMPLETE', mode: 'wash', quality: NaN })).toBe(started);
    expect(engineReducer(started, { type: 'CARE_GAME_COMPLETE', mode: 'brush', quality: 1 })).toBe(started);
    const completed = engineReducer(started, { type: 'CARE_GAME_COMPLETE', mode: 'wash', quality: 1 });
    expect(completed.interaction.careGameActive).toBe(false);
    expect(completed.interaction.usageCounts.wash).toBe(started.interaction.usageCounts.wash + 1);
    expect(completed.player.currencies.tokens).toBe(started.player.currencies.tokens - 5);
    expect(engineReducer(completed, { type: 'CARE_GAME_COMPLETE', mode: 'wash', quality: 1 })).toBe(completed);
  });
  it('finishes an untouched timed session without charging or awarding care', () => {
    const initial = fixture();
    const started = engineReducer(initial, { type: 'START_PET_INTERACTION', mode: 'wash' });
    const completed = engineReducer(started, { type: 'CARE_GAME_COMPLETE', mode: 'wash', quality: 0 });
    expect(completed.interaction.careGameActive).toBe(false);
    expect(completed.pet).toEqual(initial.pet);
    expect(completed.player.currencies).toEqual(initial.player.currencies);
    expect(completed.interaction.usageCounts).toEqual(initial.interaction.usageCounts);
    expect(completed.pet?.growth).toEqual(initial.pet?.growth);
  });
  it('does not start locked or unaffordable care', () => {
    const initial = fixture();
    initial.interaction.unlockedTools = ['pet', 'comfort', 'play'];
    expect(engineReducer(initial, { type: 'START_PET_INTERACTION', mode: 'wash' })).toBe(initial);
    initial.interaction.unlockedTools.push('wash');
    initial.player.currencies.tokens = 0;
    expect(engineReducer(initial, { type: 'START_PET_INTERACTION', mode: 'wash' })).toBe(initial);
  });
});
