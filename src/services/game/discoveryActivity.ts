import type { EngineState } from '../../types/engine';
import type { AdventureStyle } from '../../types/discovery';
import type { GameEngineAction } from '../../engine/core/ActionTypes';
import { COMPANIONS, type CompanionId } from '../../config/companionConfig';
import { careDate } from './petGrowth';

export function activityStyle(source: string): AdventureStyle {
  if (/merge|momentum|guard|build|bridge/.test(source)) return 'build';
  if (/care|cafe|help|delivery/.test(source)) return 'help';
  if (/catch|dash|battle|trace/.test(source)) return 'explore';
  return 'wonder';
}
export function creditDiscoveryActivity(state: EngineState, style: AdventureStyle, now = Date.now(), announce = true): EngineState {
  const d = state.eggDiscovery, day = careDate(now);
  if (!d || d.status !== 'collecting' || d.stamps.length + (d.bonusDays ?? 0) >= 5 || d.stamps.some(s => s.day === day)) return state;
  return { ...state, notifications: announce ? [...state.notifications, { id: `discovery-day-${day}`, message: `Egg progress: ${d.stamps.length + 1 + (d.bonusDays ?? 0)} / 5 days! Today’s activity counts.`, icon: '✦', timestamp: now }].slice(-30) : state.notifications, eggDiscovery: { ...d, mission: null, stamps: [...d.stamps, { day, style, source: 'activity' }] } };
}
/** Only accepted participation changes count; opening a screen or loading a save never does. */
export function observeDiscoveryActivity(before: EngineState, next: EngineState, action: GameEngineAction): EngineState {
  if (before === next || before.mode !== 'normal' || next.mode !== 'normal' || next.devPreview || next.test.active) return next;
  let style: AdventureStyle | undefined;
  if (['SOLVE_MATH', 'RECORD_LEARNING_ATTEMPT', 'ANSWER_BRIDGE_QUESTION', 'ANSWER_GROWTH_TRIAL'].includes(action.type)) {
    const row = next.learningEvidence?.find(r => r.attempts > (before.learningEvidence?.find(p => p.questionId === r.questionId)?.attempts ?? 0));
    if (row) style = activityStyle(row.source);
    else if (next.player.lifetimeMathCorrect > before.player.lifetimeMathCorrect) style = activityStyle(before.screen);
  }
  if (['FEED_PET','CLEAN_PET','PLAY_PET'].includes(action.type) && before.pet !== next.pet) style = 'help';
  if (!['LOAD_LEARNER_PROFILE','DEV_PREVIEW_STATE','EXIT_DEV_PREVIEW','EXIT_TEST_MODE','SET_SESSION'].includes(action.type) && before.battle.active && next.battle.active && before.battle.phase !== next.battle.phase && ['victory','defeat'].includes(next.battle.phase)) style = 'explore';
  if (action.type.startsWith('ARCADE_') && next.arcade?.run?.done && !before.arcade?.run?.done && next.arcade.run.step > 0) style = activityStyle(next.arcade.run.game);
  if (action.type.startsWith('MOMENTUM_') && before.momentum.active && next.momentum.active && before.momentum.phase !== next.momentum.phase && ['victory','defeat'].includes(next.momentum.phase)) style = 'build';
  if (['CARE_GAME_COMPLETE','FREE_SCHOOL_CARE','BRIDGE_CARE_COMPLETE','BRIDGE_MERGE_COMPLETE'].includes(action.type)) style = action.type === 'BRIDGE_MERGE_COMPLETE' ? 'build' : 'help';
  return style ? creditDiscoveryActivity(next, style) : next;
}
/** One-time v17 upgrade: only dated, recorded participation can recover old credit. */
export function upgradeDiscoveryActivities(state: EngineState): EngineState {
  const d = state.eggDiscovery;
  if (!d || d.status !== 'collecting') return state; // Never reroll issued eggs.
  const owned = new Set([state.pet, ...(state.companionRoster ?? [])].filter(Boolean).map(p => p!.speciesId));
  const candidates = (Object.keys(COMPANIONS) as CompanionId[]).filter(id => !owned.has(id));
  let next = { ...state, eggDiscovery: { ...d, matchingVersion: 2 as const, candidates, ...(d.teacherChoice && !candidates.includes(d.teacherChoice) ? { teacherChoice: null } : {}) } };
  const history = (state.learningEvidence ?? []).filter(r => r.attempts > 0 && r.source !== 'discovery' && Number.isFinite(r.updatedAt) && r.updatedAt >= d.startedAt && r.updatedAt <= Date.now()).sort((a,b) => a.updatedAt-b.updatedAt);
  for (const row of history) next = creditDiscoveryActivity(next, activityStyle(row.source), row.updatedAt, false) as typeof next;
  return next;
}
