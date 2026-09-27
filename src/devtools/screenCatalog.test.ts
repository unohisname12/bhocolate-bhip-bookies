import { describe, expect, it } from 'vitest';
import { SCREEN_CATALOG, createScreenPreview } from './screenCatalog';
import { DEFAULT_LEARNING } from '../services/game/curriculum';
import type { ScreenName } from '../types/session';
import { GameEngine } from '../engine/core/GameEngine';

describe('developer screen browser', () => {
  for (const screen of Object.keys(SCREEN_CATALOG) as ScreenName[]) {
    it(`prepares ${screen} without routing away`, () => {
      const state = createScreenPreview(screen, DEFAULT_LEARNING);
      expect(state.screen).toBe(screen);
      expect(state.devPreview).toBe(true);
      expect(state.learning).toEqual(DEFAULT_LEARNING);
      if (screen === 'incubation') expect(state.egg).not.toBeNull();
      else if (screen !== 'discovery') expect(state.pet).not.toBeNull();
      if (screen === 'battle') expect(state.battle.active).toBe(true);
      if (screen === 'momentum') expect(state.momentum.active).toBe(true);
      if (screen.startsWith('run_') && screen !== 'run_start') expect(state.run.active).toBe(true);
      if (screen === 'challenger_preview') expect(state.classroom.selectedOpponentId).toBeTruthy();
      if (screen === 'match_result') expect(state.matchHistory.length).toBeGreaterThan(0);
      if (screen === 'run_event' && state.run.active) {
        const run = state.run;
        expect(run.map.nodes.find(n => n.id === run.currentNodeId)?.eventId).toBe('equation_cache');
      }
    });
  }
  it('restores the player after hopping through previews and nested test mode', () => {
    const engine = new GameEngine();
    engine.dispatch({ type: 'TAP_EGG' });
    const original = engine.getState();
    engine.dispatch({ type: 'DEV_PREVIEW_STATE', state: createScreenPreview('home', DEFAULT_LEARNING) });
    engine.dispatch({ type: 'AWARD_TOKENS', amount: 50000 });
    engine.dispatch({ type: 'DEV_PREVIEW_STATE', state: createScreenPreview('test', DEFAULT_LEARNING) });
    engine.dispatch({ type: 'EXIT_TEST_MODE' });
    expect(engine.getState().devPreview).toBe(true);
    expect(engine.getState().screen).toBe('home');
    engine.dispatch({ type: 'EXIT_DEV_PREVIEW' });
    expect(engine.getState().player).toEqual(original.player);
    expect(engine.getState().egg).toEqual(original.egg);
    expect(engine.getState().devPreview).toBe(false);
  });
});

describe('legacy developer navigation', () => {
  it('prepares all destinations from the animation playground and preserves the original game', () => {
    const engine = new GameEngine();
    const original = engine.getState();
    engine.dispatch({type:'ENTER_TEST_MODE'});
    for (const screen of Object.keys(SCREEN_CATALOG) as ScreenName[]) {
      engine.dispatch({type:'DEV_JUMP_SCREEN',payload:screen});
      const preview=engine.getState();
      expect(preview.screen).toBe(screen);
      expect(preview.mode).toBe(screen==='test'?'test':'normal');
      expect(preview.devPreview).toBe(true);
      if(screen==='battle')expect(preview.battle.active).toBe(true);
      if(screen.startsWith('run_') && screen!=='run_start')expect(preview.run.active).toBe(true);
    }
    engine.dispatch({type:'EXIT_DEV_PREVIEW'});
    expect(engine.getState().player).toEqual(original.player);
    expect(engine.getState().pet).toEqual(original.pet);
  });
  it('unlocks the full home collection and every room in preview', () => {
    const state=createScreenPreview('home_builder',DEFAULT_LEARNING);
    expect(Object.keys(state.homeBase!.rooms)).toHaveLength(8);
    expect(state.homeBase!.owned.length+state.player.unlockedRoomItems.length).toBeGreaterThan(200);
    expect(state.prizes!.medals).toBe(1000);
  });
});
