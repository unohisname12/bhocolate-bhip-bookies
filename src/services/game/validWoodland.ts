import type { LearningEvidence, WoodlandChapter } from '../../types/woodland';

export function validWoodland(value: WoodlandChapter): boolean {
  if (!value || !['learn', 'route', 'care', 'reward', 'complete'].includes(value.phase) || !Array.isArray(value.problems) || value.problems.length !== 3) return false;
  if (value.problems.some(p => !p || typeof p.id !== 'string' || typeof p.question !== 'string' || !Number.isFinite(p.answer))) return false;
  if (!Number.isInteger(value.index) || value.index < 0 || value.index > 3 || (value.phase === 'learn' ? value.index >= 3 : value.index !== 3)) return false;
  if (![null, 'catch', 'merge'].includes(value.route) || typeof value.feedback !== 'string' || !Number.isFinite(value.startedAt)) return false;
  if (!Array.isArray(value.deliveries) || value.deliveries.length > 3 || value.deliveries.some(id => typeof id !== 'string') || new Set(value.deliveries).size !== value.deliveries.length) return false;
  if (value.summary && (['questions', 'independent', 'supported'] as const).some(key => !Number.isInteger(value.summary![key]) || value.summary![key] < 0 || value.summary![key] > 6)) return false;
  if (value.phase === 'complete') return ['flowers', 'lanterns'].includes(value.decoration ?? '') && Number.isFinite(value.completedAt);
  return value.decoration === null;
}

export function validEvidence(rows: LearningEvidence[]): boolean {
  return Array.isArray(rows) && rows.length <= 200 && rows.every(row => row && typeof row.questionId === 'string' && typeof row.topic === 'string'
    && Number.isInteger(row.grade) && row.grade >= 0 && row.grade <= 12 && typeof row.source === 'string'
    && Number.isInteger(row.attempts) && row.attempts >= 0 && ['none', 'hint', 'explanation'].includes(row.support)
    && (row.answerRevealed === undefined || typeof row.answerRevealed === 'boolean')
    && [row.skillId,row.templateId,row.context].every(v=>v===undefined || typeof v==='string' && v.length<200)
    && typeof row.correct === 'boolean' && typeof row.firstAttemptCorrect === 'boolean' && Number.isFinite(row.updatedAt));
}
