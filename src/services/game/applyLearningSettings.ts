import type { EngineState } from '../../types/engine';
import { generateLearningProblem, normalizeLearning, type LearningSettings } from './curriculum';

/** One profile-wide setting, never attached to an individual companion. */
export function applyLearningSettings(state: EngineState, settings: LearningSettings): EngineState {
  const learning = normalizeLearning(settings);
  const current = normalizeLearning(state.learning);
  // Display/timer preferences must not replace a question a learner is working on.
  if (learning.grade === current.grade && learning.topic === current.topic && learning.challenge === current.challenge) return { ...state, learning };
  const trial = state.growthTrial, discovery = state.eggDiscovery, mission = discovery?.mission;
  // Keep completed work and rewards. Preserve the current question; replace only future, unissued questions.
  return { ...state, learning,
    woodland: state.woodland?.phase === 'learn' ? { ...state.woodland, problems: state.woodland.problems.map((p, i) => i <= state.woodland!.index ? p : generateLearningProblem(learning)) } : state.woodland,
    growthTrial: trial && !trial.complete ? { ...trial, 
      problems: trial.problems.map((p, i) => i <= trial.index ? p : generateLearningProblem(learning)) } : trial,
    eggDiscovery: discovery && mission ? { ...discovery, mission: { ...mission, 
      problems: mission.problems.map((p, i) => i <= mission.index ? p : generateLearningProblem(learning)) } } : discovery,
  };
}
