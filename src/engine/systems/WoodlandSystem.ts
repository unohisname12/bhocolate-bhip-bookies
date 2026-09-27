import type { EngineState } from '../../types';
import type { GameEngineAction } from '../core/ActionTypes';
import { answerMatches, generateLearningProblem } from '../../services/game/curriculum';
import { rewardMath } from '../../services/game/economy';
import { addXP } from '../../services/game/evolutionEngine';

export function reduceWoodland(state: EngineState, action: GameEngineAction): EngineState | null {
  const chapter = state.woodland;
  const busy = state.battle.active || state.run.active || state.momentum.active;
  switch (action.type) {
    case 'OPEN_WOODLAND': return busy ? state : { ...state, screen: 'woodland' };
    case 'START_BRIDGE_CHAPTER':
      if (busy) return state;
      return { ...state, screen: 'woodland', woodland: chapter ?? {
        phase: 'learn', problems: Array.from({ length: 3 }, () => generateLearningProblem(state.learning)),
        index: 0, feedback: '', route: null, deliveries: [], decoration: null, startedAt: Date.now(),
      } };
    case 'ANSWER_BRIDGE_QUESTION': {
      if (busy || !chapter || chapter.phase !== 'learn') return state;
      const problem = chapter.problems[chapter.index];
      if (!problem || problem.id !== action.questionId) return state;
      const correct = answerMatches(action.answer, problem.answer, problem.question);
      const recorded = rewardMath(state, problem, correct, 'bridge');
      if (!correct) return { ...recorded, woodland: { ...chapter, feedback: 'Try again. Your bridge pieces are safe.' } };
      const index = chapter.index + 1;
      return { ...recorded, woodland: { ...chapter, index, phase: index === 3 ? 'route' : 'learn', feedback: 'Another piece of the plan is ready!' } };
    }
    case 'CHOOSE_BRIDGE_ROUTE':
      if (busy || !chapter || chapter.phase !== 'route') return state;
      return { ...state, screen: action.route === 'catch' ? 'catch_math' : 'number_merge', woodland: { ...chapter, route: action.route } };
    case 'BRIDGE_MERGE_COMPLETE':
      if (!chapter || chapter.phase !== 'route' || chapter.route !== 'merge' || state.screen !== 'number_merge' || busy) return state;
      return { ...state, screen: 'woodland', woodland: { ...chapter, phase: 'care', feedback: 'The bridge is repaired! Time to celebrate together.' } };
    case 'BRIDGE_CARE_COMPLETE':
      // Only the pre-pet guide path uses this action. Real companions use care events.
      if (state.pet || busy || !chapter || chapter.phase !== 'care') return state;
      return { ...state, woodland: { ...chapter, phase: 'reward', feedback: 'Your club guide loved that little celebration.' } };
    case 'CLAIM_BRIDGE_REWARD': {
      if (busy || !chapter || chapter.phase !== 'reward' || !['flowers', 'lanterns'].includes(action.decoration)) return state;
      const evidence = (state.learningEvidence ?? []).filter(row => chapter.problems.some(p => p.id === row.questionId) || chapter.deliveries.includes(row.questionId));
      const summary = { questions: evidence.filter(row => row.correct).length, independent: evidence.filter(row => row.firstAttemptCorrect).length, supported: evidence.filter(row => row.support !== 'none').length };
      return { ...state, woodland: { ...chapter, phase: 'complete', decoration: action.decoration, completedAt: Date.now(), summary },
        player: { ...state.player, currencies: { ...state.player.currencies, tokens: state.player.currencies.tokens + 30 } },
        pet: state.pet ? addXP(state.pet, 60) : null };
    }
    default: return null;
  }
}

export function bridgeDelivery(state: EngineState, questionId: string): EngineState {
  const chapter = state.woodland;
  if (!chapter || chapter.phase !== 'route' || chapter.route !== 'catch' || state.screen !== 'catch_math' || chapter.deliveries.includes(questionId)) return state;
  const deliveries = [...chapter.deliveries, questionId];
  return { ...state, screen: deliveries.length >= 3 ? 'woodland' : state.screen,
    woodland: { ...chapter, deliveries, phase: deliveries.length >= 3 ? 'care' : 'route', feedback: 'Supplies delivered! The bridge is ready.' } };
}
