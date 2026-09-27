import { learningProblem } from '../skill-challenge/lessons';
import type { MathProblem } from '../../types';
import type { LearningEvidence, SkillReview } from '../../types/woodland';
import { generateLearningProblem, GRADE_TOPICS, type LearningSettings } from '../../services/game/curriculum';
import {getSkill,skillsForGrade} from '../skill-challenge/catalog';
import {deepTransfer} from '../skill-challenge/transfer';
export const DAY = 86400000;
export const skillKey = (grade: number, topic: string) => `${grade}:${topic}`;
export function updateReviews(reviews: SkillReview[], row: LearningEvidence, now: number): SkillReview[] {
  const key = row.skillId ?? skillKey(row.grade, row.topic);
  const old = reviews.find(r => r.skillId === key);
  if (row.attempts === 0 || old?.lastQuestionId === row.questionId || old && old.lastPracticed > now) return reviews;
  const independent = row.correct && row.firstAttemptCorrect && !row.answerRevealed;
  const delayed = !!old && !old.needsFreshCheck && now >= old.dueAt;
  const streak = !independent ? 0 : !old || old.needsFreshCheck ? 1 : delayed ? Math.min(3,old.independentChecks+1) : old.independentChecks;
  const dueAt = independent && old && !old.needsFreshCheck && !delayed ? old.dueAt : now + (independent ? streak >= 2 ? 7 * DAY : DAY : 0);
  const next: SkillReview = { skillId:key, topic:row.topic, grade:row.grade, lastQuestionId:row.questionId,
    lastPracticed:now, dueAt,
    independentChecks:streak, needsFreshCheck:!independent };
  return [...reviews.filter(r => r.skillId !== key), next].slice(-64);
}
export function dueReviews(reviews: SkillReview[], settings: LearningSettings, now = Date.now()) {
  return reviews.filter(r => r.grade === settings.grade && (GRADE_TOPICS[settings.grade] as readonly string[]).includes(r.topic)
    && (settings.topic === 'mixed' || settings.topic === r.topic) && r.dueAt <= now).sort((a,b)=>a.dueAt-b.dueAt);
}
export function nextPractice(settings: LearningSettings, reviews: SkillReview[] = [], previous?: MathProblem, random = Math.random, now = Date.now()): MathProblem {
  const due = dueReviews(reviews, settings, now)[0];
  const chosen = due ? {...settings, topic:due.topic} : settings;
  const generate=()=>{
    const base=generateLearningProblem(chosen,random);
    const exact=due?getSkill(due.skillId):undefined;
    if(exact){
      const q=learningProblem(exact.id,chosen.challenge,'check',Math.floor(random()*2),random);
      return {...base,skillId:exact.id,question:q.text,answer:q.answer,hint:q.hint,explanation:[q.explanation],templateId:q.templateId};
    }
    const skill=skillsForGrade(chosen.grade).find(s=>s.topic===base.topic);
    const transfer=due&&skill?deepTransfer(skill.id,chosen.challenge,Math.floor(random()*2),random):null;
    return transfer?{...base,question:transfer.text,answer:transfer.answer,hint:transfer.hint,explanation:[transfer.explanation],templateId:transfer.templateId}:base;
  };
  let problem = generate();
  for (let i=0; i<12 && previous?.question === problem.question; i++) problem = generate();
  return {...problem, context:due ? due.needsFreshCheck ? 'fresh-check' : 'spaced-review' : 'practice'};
}
export function validReviews(value: unknown): boolean {
  if (!Array.isArray(value) || value.length > 64) return false;
  return new Set(value.map(r=>r?.skillId)).size === value.length && value.every(r=>r && typeof r.skillId==='string' && r.skillId.length<160
    && typeof r.topic==='string' && r.topic.length<100 && Number.isInteger(r.grade) && r.grade>=0 && r.grade<=12
    && typeof r.lastQuestionId==='string' && Number.isFinite(r.lastPracticed) && r.lastPracticed>=0 && Number.isFinite(r.dueAt) && r.dueAt>=0
    && Number.isInteger(r.independentChecks) && r.independentChecks>=0 && r.independentChecks<=3 && typeof r.needsFreshCheck==='boolean');
}
