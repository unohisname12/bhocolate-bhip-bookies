import type { EngineState, MathProblem } from '../src/types';
import { generateLearningProblem, type LearningSettings } from '../src/services/game/curriculum';
import { challengeID } from '../src/features/pet-arena/mathPower';
import type { ArenaCommand } from '../src/features/pet-arena/model';
import { ApiError } from './security';

/** Private question storage: expected answers never enter the learner's battle snapshot. */
export async function arenaMathProblem(db: D1Database, studentId: string, state: EngineState, c: ArenaCommand, learning: LearningSettings): Promise<MathProblem | undefined> {
  if (!['math-open', 'math-answer', 'math-help'].includes(c.kind)) return undefined;
  const f = state.petArena?.fight;
  if (!('fightId' in c) || !f?.mathPower || f.phase !== 'active' || f.id !== c.fightId || f.round !== c.round
    || f.fighters[0].id !== state.pet?.id || f.mathPower.used >= 2 || f.mathPower.lastRound === f.round)
    throw new ApiError(409, 'This Math Power is no longer available.');
  const id = challengeID(f);
  if (c.kind === 'math-open') {
    const problem = { ...generateLearningProblem(learning), id, context: 'arena-math' };
    // Reopening or racing tabs keeps the first question; it cannot reroll the answer.
    await db.prepare('INSERT OR IGNORE INTO arena_math_questions(student_id,challenge_id,problem_json,created_at) VALUES(?,?,?,?)')
      .bind(studentId, id, JSON.stringify(problem), Date.now()).run();
  }
  const row = await db.prepare('SELECT problem_json FROM arena_math_questions WHERE student_id=? AND challenge_id=?').bind(studentId, id).first<{ problem_json: string }>();
  if (!row) throw new ApiError(409, 'Open your Math Power question first.');
  return JSON.parse(row.problem_json) as MathProblem;
}
