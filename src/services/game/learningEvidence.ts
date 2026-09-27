import { skillKey, updateReviews } from '../../features/learning/review';
import type { EngineState, MathProblem } from '../../types';
import type { LearningEvidence } from '../../types/woodland';

/** Bounded, local evidence. This is practice history, not a mastery score. */
export function recordLearning(state: EngineState, problem: MathProblem, source: string, correct?: boolean, support?: 'hint' | 'explanation'): EngineState {
  const history = state.learningEvidence ?? [];
  const previous = history.find(row => row.questionId === problem.id);
  if (previous?.correct) return state;
  const attempts = previous?.attempts ?? 0;
  const row: LearningEvidence = {
    practiceSettings: previous?.practiceSettings ?? problem.practiceSettings,
    skillId: problem.skillId ?? skillKey(problem.grade ?? state.learning.grade, problem.topic ?? problem.type ?? state.learning.topic),
    templateId: problem.templateId, context: problem.context,
    answerRevealed: previous?.answerRevealed === true || support === 'explanation',
    questionId: problem.id, topic: problem.topic ?? problem.type ?? state.learning.topic,
    grade: problem.grade ?? state.learning.grade,
    source: source === 'help' ? previous?.source ?? 'help' : source,
    attempts: attempts + (correct === undefined ? 0 : 1),
    support: previous?.support === 'explanation' ? 'explanation' : support ?? previous?.support ?? 'none',
    correct: correct === true,
    firstAttemptCorrect: correct === true && attempts === 0 && (!previous || previous.support === 'none'),
    updatedAt: Date.now(),
  };
  return { ...state, skillReviews: updateReviews(state.skillReviews ?? [], row, row.updatedAt), learningEvidence: [...history.filter(item => item.questionId !== problem.id), row].slice(-200) };
}
