import type { MathProblem } from '../../types';
import { GRADE_TOPICS, normalizeLearning, type LearningSettings } from '../../services/game/curriculum';
import { skillKey } from './review';
/** A real subtraction relationship; choose only an honest assigned strand. */
export function quantityDecision(settings: LearningSettings, id: string, context: string, total: number, used: number, unit: string, action: string): MathProblem | null {
  if (![total, used].every(Number.isSafeInteger) || used<0 || total<0) return null;
  const left = total-used;
  const candidates = [
    ...(left>=0 && total<=20 ? ['Subtraction within 20'] : []),
    ...(total>=10 && total<=99 && left>=0 ? ['Two-digit subtraction'] : []),
    'Signed integers', 'One-step equations',
  ];
  const allowed = GRADE_TOPICS[settings.grade] as readonly string[];
  const topic = candidates.find(t=>allowed.includes(t) && (settings.topic==='mixed'||settings.topic===t));
  if (!topic) return null;
  const equation = topic==='One-step equations';
  return {practiceSettings:normalizeLearning(settings), id, context, skillId:skillKey(settings.grade,topic), templateId:equation?'budget-missing-addend-v1':'budget-subtraction-v1',
    topic, grade:settings.grade, type:topic, difficulty:1, reward:0,
    question:equation ? `${action} You have ${total} ${unit}; ${used} will be used. Solve x + ${used} = ${total}: how many ${unit} remain?`
      : `${action} You have ${total} ${unit}; ${used} will be used. How many remain?`,
    answer:left, hint:equation?'Keep both sides equal. Undo the addition.':'Start with the amount available and subtract the amount used.',
    explanation:[`${total} available − ${used} used = ${left} ${unit} remaining.`, `Check: ${left} + ${used} = ${total}.`]};
}
export function hasQuantitySkill(settings: LearningSettings) {
  return (GRADE_TOPICS[settings.grade] as readonly string[]).some(t=>['Subtraction within 20','Two-digit subtraction','Signed integers','One-step equations'].includes(t) && (settings.topic==='mixed'||settings.topic===t));
}

export function additionDecision(settings:LearningSettings,id:string,a:number,b:number):MathProblem|null {
  const total=a+b, topics=GRADE_TOPICS[settings.grade] as readonly string[];
  const candidates=[...(total<=10?['Addition within 10']:[]),...(total<=20?['Addition within 20']:[]),...(a>=10&&b>=10&&a<=99&&b<=99?['Two-digit addition']:[])];
  const topic=candidates.find(t=>topics.includes(t)&&(settings.topic==='mixed'||settings.topic===t));
  if(!topic)return null;
  return {practiceSettings:normalizeLearning(settings), id,topic,grade:settings.grade,skillId:skillKey(settings.grade,topic),templateId:'merge-sum-v1',context:'number-merge',difficulty:1,reward:0,
    question:`You chose neighboring tiles ${a} and ${b}. What number will their merge create?`,answer:total,
    hint:'Combine the two tile values. Try making a ten or counting on.',explanation:[`${a} + ${b} = ${total}. The merged tile takes this value.`]};
}
