import { describe, expect, it } from 'vitest';
import { middleProblem } from './content';
import { middleSkills } from './catalog';
import { getSkill, skillsForGrade } from '../skill-challenge/catalog';
import { GRADE_TOPICS, normalizeLearning, generateLearningProblem, parseMathAnswer } from '../../services/game/curriculum';
import { answerCheck, emptyCheck, startCheck } from '../quick-check/model';
import { createInitialEngineState } from '../../engine/state/createInitialEngineState';
import { engineReducer } from '../../engine/state/engineReducer';
import { nextPractice, dueReviews } from '../learning/review';

const answers = {
  6: [4, 1, 2, .22, .04, 2, 6, 4, 2, 4, 4, 6, 2, 8, 24, 4.4, 4, 6],
  7: [0, -1, 2, 2, 4, 2, 2, 4, 2, 4, 3.14, 160, .5, .25, .5, 4, 2, 8/3],
  8: [4, .25, 2, -2, 6, 2, 2, 2, 2, 0, 2, -4, 25.12, 25.12, 4.19, 6, -2, .5],
};
describe('middle-school release content', () => {
  for (const grade of [6,7,8] as const) {
    for (const [i, skill] of middleSkills(grade).entries()) it(`${skill.id}: ${skill.name} has the independently checked small-number answer`, () => {
      expect(middleProblem(skill.id, 'support', 'check', 0, () => 0).answer).toBeCloseTo(answers[grade][i], 9);
      expect(getSkill(skill.id)?.topic).toBe(skill.topic);
    });
    it(`grade ${grade} reaches every objective without silently normalizing a new topic away`, () => {
      let state=emptyCheck(),sequence=0;
      const settings=normalizeLearning({grade});
      expect(skillsForGrade(grade)).toHaveLength(24);expect(GRADE_TOPICS[grade]).toHaveLength(8);
      for(let round=0;round<8;round++){
        const now=2_000_000_000_000+round*100;
        state=startCheck(state,settings,now,()=>.2,()=>`rotation-${sequence++}`,'dash');
        for(const item of state.round!.items)state=answerCheck(state,item.id,'',true,now+1);
      }
      expect(new Set([...state.history,state.round!].flatMap(r=>r.items.map(i=>i.skillId))).size).toBe(24);
      for(const topic of GRADE_TOPICS[grade]){
        const assigned=normalizeLearning({grade,topic});expect(assigned.topic).toBe(topic);
        const check=startCheck(emptyCheck(),assigned,1,()=>.3,()=>`topic-${sequence++}`);
        expect(check.round!.items.every(i=>getSkill(i.skillId)?.topic===topic)).toBe(true);
        expect(generateLearningProblem(assigned,()=>.3).topic).toBe(topic);
      }
    });
  }
  it('provides enough support-level variety for repeated checks and avoids tiny answers that round to zero',()=>{
    let seed=72491;const random=()=>{seed=seed*16807%2147483647;return seed/2147483647;};
    for(const skill of [6,7,8].flatMap(middleSkills)){
      const texts=new Set<string>(),values=new Set<number>();
      for(let n=0;n<300;n++){
        const q=middleProblem(skill.id,'support','check',0,random);texts.add(q.text);values.add(q.answer);
        expect(Number.isFinite(q.answer),skill.id).toBe(true);
        expect(q.answer===0||Math.abs(q.answer)>1e-7,skill.id).toBe(true);
        expect(q.text+q.explanation).not.toMatch(/undefined|NaN|Infinity/);
        expect(parseMathAnswer(String(q.answer))).toBeCloseTo(q.answer,9);
      }
      expect(texts.size,`${skill.id} distinct questions`).toBeGreaterThan(10);
      expect(values.size,`${skill.id} distinct solutions`).toBeGreaterThan(3);
    }
  });
  it('wrong-only practice enters review and returns the same exact objective with new quantities',()=>{
    let state=createInitialEngineState();state.learning=normalizeLearning({grade:8,topic:'Volume'});
    const p=generateLearningProblem(state.learning,()=>.01);
    state=engineReducer(state,{type:'SOLVE_MATH',problem:p,source:'practice',correct:false,difficulty:2,reward:0});
    expect(dueReviews(state.skillReviews??[],state.learning)).toHaveLength(1);
    expect(state.skillReviews?.[0].needsFreshCheck).toBe(true);
    const next=nextPractice(state.learning,state.skillReviews,p,()=>.8);
    expect(next.skillId).toBe(p.skillId);expect(next.question).not.toBe(p.question);
    expect(next.context).toBe('fresh-check');
  });
  it('keeps legacy ids and rejects malformed or out-of-range objectives',()=>{
    expect(getSkill('g6-s0')?.name).toBe('Find a unit rate');
    expect(getSkill('g7-s2')?.name).toBe('Find the percent represented by a part');
    expect(getSkill('g8-s0')?.name).toBe('Solve a two-step linear equation');
    for(const id of ['g6-s24','g9-s6','g6-s06','g99-s0','anything'])expect(getSkill(id)).toBeUndefined();
  });
});
