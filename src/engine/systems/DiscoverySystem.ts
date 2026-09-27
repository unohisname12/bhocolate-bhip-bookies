import { creditDiscoveryActivity, activityStyle } from '../../services/game/discoveryActivity';
import { rewardMath } from '../../services/game/economy';
import type { EngineState } from '../../types/engine';
import type { GameEngineAction } from '../core/ActionTypes';
import type { AdventureStyle } from '../../types/discovery';
import { COMPANIONS, isCompanion, type CompanionId } from '../../config/companionConfig';
import { DISCOVERY_DAYS, STYLE_KEYS } from '../../config/discoveryConfig';
import { createEggDiscovery, discoveryDays, discoveryReady, matchCompanion } from '../../services/game/eggDiscovery';
import { careDate } from '../../services/game/petGrowth';
import { answerMatches, generateLearningProblem } from '../../services/game/curriculum';

export function reduceDiscovery(state: EngineState, action: GameEngineAction, now = Date.now()): EngineState | null {
  const d = state.eggDiscovery, day = careDate(now);
  const busy = state.battle.active || state.run.active || state.momentum.active;
  switch (action.type) {
    case 'COMPLETE_CLASSROOM_ACTIVITY':
      return state.mode === 'normal' && !state.devPreview && !state.test.active ? creditDiscoveryActivity(state, activityStyle(action.game), now) : state;
    case 'SET_TEACHER_EGG_CHOICE': {
      if (busy || state.egg || (action.speciesId !== null && !isCompanion(action.speciesId))) return state;
      const owned = [...(state.companionRoster ?? []), ...(state.pet ? [state.pet] : [])];
      const candidates = (Object.keys(COMPANIONS) as CompanionId[]).filter(id => !owned.some(p => p.speciesId === id));
      if (!candidates.length || (action.speciesId && !candidates.includes(action.speciesId as CompanionId))) return state;
      const discovery = d && d.status !== 'claimed' ? d : createEggDiscovery(candidates, now);
      const next = { ...discovery, teacherChoice: action.speciesId as CompanionId | null };
      return { ...state, eggDiscovery: next.status === 'matched' ? { ...next, companion: matchCompanion(next) } : next };
    }
    case 'START_EGG_DISCOVERY': {
      if (state.egg || busy) return state;
      if (d && d.status !== 'claimed') return { ...state, screen: 'discovery' };
      const owned = [...(state.companionRoster ?? []), ...(state.pet ? [state.pet] : [])];
      const candidates = (Object.keys(COMPANIONS) as CompanionId[]).filter(id => !owned.some(p => p.speciesId === id));
      if (!candidates.length) return state;
      return { ...state, screen: 'discovery', eggDiscovery: createEggDiscovery(candidates, now) };
    }
    case 'ANSWER_DISCOVERY_QUIZ':
      if (!d || d.status !== 'collecting' || !Number.isInteger(action.question) || action.question < 0 || action.question >= d.answers.length
        || !Number.isInteger(action.choice) || action.choice < 0 || action.choice > 4) return state;
      return { ...state, eggDiscovery: { ...d, answers: d.answers.map((a, i) => i === action.question ? action.choice : a) } };
    case 'START_DISCOVERY_MISSION': {
      if (!d || d.status !== 'collecting' || busy || !STYLE_KEYS.includes(action.style)) return state;
      if (d.stamps.some(s => s.day === day) || discoveryDays(d, now) >= DISCOVERY_DAYS) return state;
      // Resume today's challenge rather than rerolling questions or style.
      if (d.mission?.day === day) return { ...state, screen: 'discovery' };
      return { ...state, screen: 'discovery', eggDiscovery: { ...d, mission: { day, style: action.style,
        problems: Array.from({ length: 3 }, () => generateLearningProblem(state.learning)), index: 0, feedback: '' } } };
    }
    case 'ANSWER_DISCOVERY_MISSION': {
      const mission = d?.mission;
      if (!d || d.status !== 'collecting' || !mission || mission.day !== day || busy || d.stamps.some(s => s.day === day)) return state;
      const problem = mission.problems[mission.index];
      if (!problem || problem.id !== action.questionId) return state;
      state = rewardMath(state, problem, answerMatches(action.answer, problem.answer, problem.question), 'discovery');
      if (!answerMatches(action.answer, problem.answer, problem.question)) return { ...state, eggDiscovery: { ...d, mission: { ...mission, feedback: 'Try again! Your pieces are safe. Take your time.' } } };
      const index = mission.index + 1, complete = index === mission.problems.length;
      return { ...state, eggDiscovery: { ...d, mission: complete ? null : { ...mission, index, feedback: 'One more piece of the adventure!' },
        stamps: complete ? [...d.stamps, { day, style: mission.style, source: 'mission' }] : d.stamps } };
    }
    case 'CREDIT_DISCOVERY_CLASSROOM_DAY': {
      if (!d || d.status !== 'collecting' || !STYLE_KEYS.includes(action.style) || busy
        || d.stamps.some(s => s.day === day) || discoveryDays(d, now) >= DISCOVERY_DAYS) return state;
      // Teacher-guided paper/oral alternative: no student names or notes stored.
      return { ...state, eggDiscovery: { ...d, mission: null, stamps: [...d.stamps, { day, style: action.style as AdventureStyle, source: 'classroom' }] } };
    }
    case 'REVEAL_DISCOVERY_EGG': {
      if (!d || !discoveryReady(d, now) || busy || state.egg) return state;
      const companion = matchCompanion(d);
      if (!companion) return state;
      return { ...state, screen: 'discovery', eggDiscovery: { ...d, status: 'matched', companion, mission: null } };
    }
    case 'CLAIM_DISCOVERY_EGG': {
      if (!d || d.status !== 'matched' || !d.companion || busy || state.egg) return state;
      const owned = [...(state.companionRoster ?? []), ...(state.pet ? [state.pet] : [])];
      if (owned.some(p => p.speciesId === d.companion)) return state;
      return { ...state, screen: 'incubation', pet: null, companionRoster: owned, growthTrial: null,
        player: { ...state.player, activePetId: null }, eggDiscovery: { ...d, status: 'claimed' },
        egg: { id: `discovery_egg_${now}`, type: COMPANIONS[d.companion].egg, progress: 0, state: 'incubating', createdAt: new Date(now).toISOString() } };
    }
    default: return null;
  }
}
