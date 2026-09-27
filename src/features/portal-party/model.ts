import { generateLearningProblem, normalizeLearning, parseMathAnswer, answerMatches, type LearningSettings } from '../../services/game/curriculum';

export const CREWS = ['Pip', 'Ember', 'Moss', 'Luna', 'Clover', 'Ripple', 'Nova', 'Bramble'];
export const MASCOTS = ['koala_sprite', 'ember_fox', 'moss_turtle', 'luna_owl', 'clover_rabbit', 'ripple_otter', 'nova_axolotl', 'bramble_hedgehog'];
export const TILES = [100, 200, 0, 300, 150, 400, 0, 200, 500, 100, 250, 0, 300, 150, 400, 200];
export interface Settings { learning: LearningSettings; teams: number; rounds: number; questions: number; seconds: number; gentle: boolean }
export interface Member { id: string; alias: string; team: number; tokenHash: string }
export interface Team { name: string; score: number; earned: number; passed: number; turns: number }
export interface Answer { text: string; correct: boolean; overridden?: boolean }
export interface Question { id: string; text: string; answer: number; explanation: string[]; hint: string; eligible: string[]; answers: Record<string, Answer>; deadline: number | null; topic: string }
export interface Evidence { question: string; topic: string; member: string; alias: string; answer: string; correct: boolean; overridden: boolean }
export interface Room {
  settings: Settings; members: Member[]; teams: Team[];
  phase: 'lobby' | 'question' | 'review' | 'reveal' | 'board' | 'spinning' | 'result' | 'finished';
  round: number; questionNumber: number; question: Question | null; active: number;
  pausedAt: number | null; spinAt: number | null;
  result: { tile: number; team: number; delta: number; at: number } | null; history: Evidence[];
}
export interface Command { action: string; questionId?: string; answer?: string; memberId?: string; correct?: boolean; team?: number; amount?: number }
export const DEFAULT_SETTINGS: Settings = { learning: normalizeLearning({grade:7, topic:'One-step equations'}), teams:3, rounds:3, questions:3, seconds:0, gentle:true };
export function createRoom(settings: Settings): Room {
  return { settings, members:[], teams:CREWS.slice(0, settings.teams).map(name=>({name:`Team ${name}`,score:0,earned:0,passed:0,turns:0})), phase:'lobby',round:1,questionNumber:0,question:null,active:0,pausedAt:null,spinAt:null,result:null,history:[] };
}
export function captain(room: Room): string | undefined {
  const members=room.members.filter(m=>m.team===room.active);
  return members[room.teams[room.active].turns % Math.max(1,members.length)]?.id;
}
function need(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
function startQuestion(room:Room, now:number, random:()=>number) {
  const p=generateLearningProblem(room.settings.learning,random);
  room.questionNumber++;
  room.question={id:`${room.round}-${room.questionNumber}`,text:p.question,answer:p.answer,explanation:p.explanation??[],hint:p.hint??'',eligible:room.members.map(m=>m.id),answers:{},deadline:room.settings.seconds?now+room.settings.seconds*1000:null,topic:p.topic??p.type??room.settings.learning.topic};
  room.phase='question';room.result=null;
}
function nextTeam(room:Room, start=room.active) {
  for(let i=0;i<room.teams.length;i++){const index=(start+i)%room.teams.length;if(room.teams[index].earned+room.teams[index].passed>0){room.active=index;return;}}
}
export function apply(room:Room, cmd:Command, actor:'teacher'|string, now=Date.now(), random:()=>number=Math.random): Room {
  const r=structuredClone(room), host=actor==='teacher';
  if(cmd.action==='pause'){need(host&&r.phase!=='finished','Only the teacher can pause.');if(r.pausedAt!==null){const elapsed=now-r.pausedAt;if(r.question?.deadline)r.question.deadline+=elapsed;if(r.spinAt!==null)r.spinAt+=elapsed;r.pausedAt=null;}else r.pausedAt=now;return r;}
  if(cmd.action==='finish'){need(host,'Only the teacher can finish.');r.phase='finished';r.pausedAt=null;return r;}
  need(r.pausedAt===null,'Pip is taking a break. Wait for your teacher to resume.');
  need(r.phase!=='finished','This festival has finished.');
  if(cmd.action==='answer'){
    need(!host&&r.phase==='question'&&r.question&&r.question.id===cmd.questionId,'This question has closed.');
    need(r.question.eligible.includes(actor),'You can answer the next question.');
    need(!r.question.deadline||now<r.question.deadline,'Time is up.');
    need(!r.question.answers[actor],'Your answer is already saved.');
    const text=String(cmd.answer??'').trim();need(text.length>0&&text.length<=100,'Enter an answer of up to 100 characters.');
    const value=parseMathAnswer(text);need(Number.isFinite(value),'Enter a number, decimal, or fraction.');
    r.question.answers[actor]={text,correct:answerMatches(text,r.question.answer,r.question.text)};return r;
  }
  if(cmd.action==='move'){
    need(host&&r.phase==='lobby','Set teams before the first question.');
    const member=r.members.find(m=>m.id===cmd.memberId);need(member&&Number.isInteger(cmd.team)&&r.teams[cmd.team!],'Choose a learner and team.');member.team=cmd.team!;return r;
  }
  if(cmd.action==='remove'){
    need(host&&r.phase==='lobby','Manage the lobby before starting.');r.members=r.members.filter(m=>m.id!==cmd.memberId);return r;
  }
  if(cmd.action==='score'){
    need(host&&Number.isInteger(cmd.team)&&r.teams[cmd.team!]&&Number.isInteger(cmd.amount)&&Math.abs(cmd.amount!)<=10000,'Choose a valid score adjustment.');
    r.teams[cmd.team!].score=Math.max(0,r.teams[cmd.team!].score+cmd.amount!);return r;
  }
  if(cmd.action==='override'){
    need(host&&r.phase==='review'&&r.question,'Review answers first.');
    need(typeof cmd.correct==='boolean'&&r.question.eligible.includes(cmd.memberId??''),'Choose a valid answer.');
    const id=cmd.memberId!;r.question.answers[id]={text:r.question.answers[id]?.text??'(verbal answer)',correct:cmd.correct,overridden:true};return r;
  }
  if(cmd.action==='spin'||cmd.action==='stop'||cmd.action==='pass'){
    need(host||captain(r)===actor,'Only the current captain or teacher can control the portal.');
    const team=r.teams[r.active];
    if(cmd.action==='spin'){need(r.phase==='board'&&team.earned+team.passed>0,'No charges ready.');r.phase='spinning';r.spinAt=now;r.result=null;return r;}
    if(cmd.action==='stop'){
      need(r.phase==='spinning','The portal is not spinning.');
      if(team.passed>0)team.passed--;else team.earned--;
      const tile=Math.min(TILES.length-1,Math.floor(random()*TILES.length)),points=TILES[tile];
      const delta=points===0?-(r.settings.gentle?Math.min(team.score,200):team.score):points;
      team.score+=delta;team.turns++;
      // A rift releases remaining passed charges so the team can choose what to do next.
      if(!points){team.earned+=team.passed;team.passed=0;}
      r.result={tile,team:r.active,delta,at:now};r.phase='result';r.spinAt=null;return r;
    }
    need(r.phase==='board'&&team.earned>0&&team.passed===0,'Play received charges before passing.');
    need(Number.isInteger(cmd.team)&&r.teams[cmd.team!]&&cmd.team!==r.active&&r.members.some(m=>m.team===cmd.team),'Choose another occupied team.');
    r.teams[cmd.team!].passed+=team.earned;team.earned=0;r.active=cmd.team!;return r;
  }
  need(host&&cmd.action==='next','Only the teacher can advance.');
  if(r.phase==='lobby'){need(r.members.length>0,'Let students join first.');startQuestion(r,now,random);}
  else if(r.phase==='question'){r.phase='review';}
  else if(r.phase==='review'){
    const q=r.question!;
    r.teams.forEach((team,i)=>{const members=r.members.filter(m=>m.team===i&&q.eligible.includes(m.id));const correct=members.filter(m=>q.answers[m.id]?.correct).length;if(members.length&&correct>=Math.ceil(members.length/2))team.earned++;});
    for(const id of q.eligible){const member=r.members.find(m=>m.id===id)!;const a=q.answers[id];r.history.push({question:q.text,topic:q.topic,member:id,alias:member.alias,answer:a?.text??'',correct:a?.correct??false,overridden:a?.overridden??false});}
    r.phase='reveal';
  }else if(r.phase==='reveal'){
    if(r.questionNumber<r.settings.questions)startQuestion(r,now,random);
    else {r.phase='board';r.active=(r.round-1)%r.teams.length;nextTeam(r);}
  }else if(r.phase==='result'){r.phase='board';nextTeam(r);}
  else if(r.phase==='board'){
    need(!r.teams.some(t=>t.earned+t.passed>0),'Use or pass the remaining portal charges.');
    if(r.round>=r.settings.rounds)r.phase='finished';else{r.round++;r.questionNumber=0;startQuestion(r,now,random);}
  }else throw new Error('Stop the portal before continuing.');
  return r;
}
export function advanceClock(room:Room,now:number,random:()=>number):Room {
  if(room.pausedAt!==null)return room;
  if(room.phase==='question'&&room.question?.deadline&&now>=room.question.deadline)return apply(room,{action:'next'},'teacher',now,random);
  if(room.phase==='spinning'&&room.spinAt!==null&&now-room.spinAt>=15000)return apply(room,{action:'stop'},'teacher',now,random);
  return room;
}
export interface View extends Omit<Room,'members'|'question'|'history'> {
  members:Omit<Member,'tokenHash'>[];
  question:(Omit<Question,'answer'|'explanation'|'hint'|'answers'> & {answer?:number;explanation?:string[];answers?:Record<string,Answer>;submitted:number;mine?:Answer})|null;
  history:Evidence[]; id:string;code:string;revision:number;you:string|null;serverNow:number;
}
export function view(room:Room,actor:'teacher'|'projector'|string):Omit<View,'id'|'code'|'revision'|'serverNow'> {
  const {question:q,members,history,...rest}=room;
  const reveal=['reveal','board','spinning','result','finished'].includes(room.phase);
  return {...rest,members:members.map(({id,alias,team})=>({id,alias,team})),history:actor==='teacher'?history:[],you:actor==='teacher'||actor==='projector'?null:actor,
    question:q?{id:q.id,text:q.text,topic:q.topic,eligible:[],deadline:q.deadline,submitted:Object.keys(q.answers).length,
      ...(actor==='teacher'||reveal?{answer:q.answer,explanation:q.explanation}:{}),
      ...(actor==='teacher'?{answers:q.answers,eligible:q.eligible}:{}),
      ...(q.answers[actor]?{mine:{text:q.answers[actor].text,correct:reveal?q.answers[actor].correct:false}}:{})}:null};
}
