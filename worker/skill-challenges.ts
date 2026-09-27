import { ApiError,readBody } from './security';
import { learningOf,type MetadataRow } from './classroom-metadata';
import { skillsForGrade } from '../src/features/skill-challenge/catalog';
import { autoConfirm, triage, undoConfirm, type OutsideEvidence } from '../src/features/skill-challenge/triage';
import type { CheckState } from '../src/features/quick-check/model';
import { answer,begin,candidates,confirm,hint,initial,readLesson,reflect,focus,takeBreak,metrics,publicProgress,replace,status,type Policy,type Progress,type Stage } from '../src/features/skill-challenge/model';
interface ChallengeRow {id:string;classroom_id:string;teacher_id:string;policy_json:string;created_at:number;closed_at:number|null;winner_id:string|null;winner_reason:string}
interface Assignment {challenge_id:string;student_id:string;progress_json:string;revision:number;updated_at:number}
interface Learner extends MetadataRow {active:number}
const rng=()=>crypto.getRandomValues(new Uint32Array(1))[0]/4294967296;
function fail(message:string):never{throw new ApiError(409,message);}
const roster=async(db:D1Database,room:string)=>(await db.prepare('SELECT id,classroom_id,alias,assignment,learning_json,settings_version,nickname_version,nickname_at,active FROM students WHERE classroom_id=? ORDER BY alias').bind(room).all<Learner>()).results;
async function plans(db:D1Database,room:string){
 const people=await roster(db,room);
 const rows=(await db.prepare(`SELECT h.student_id,h.topic,COUNT(*) AS questions,SUM(CASE WHEN json_extract(h.evidence_json,'$.attempts')=1 AND json_extract(h.evidence_json,'$.correct')=1 AND json_extract(h.evidence_json,'$.firstAttemptCorrect')=1 AND json_extract(h.evidence_json,'$.support')='none' AND COALESCE(json_extract(h.evidence_json,'$.answerRevealed'),0)=0 THEN 1 ELSE 0 END) AS independent FROM learning_history h JOIN students s ON s.id=h.student_id WHERE s.classroom_id=? AND h.imported=0 AND h.settings_version=s.settings_version AND h.grade=CAST(json_extract(s.learning_json,'$.grade') AS INTEGER) AND h.event_at>=? AND json_extract(h.evidence_json,'$.attempts')>0 GROUP BY h.student_id,h.topic`).bind(room,Date.now()-30*86400000).all<{student_id:string;topic:string;questions:number;independent:number}>()).results;
 const past=(await db.prepare('SELECT a.student_id,a.progress_json FROM skill_challenge_learners a JOIN skill_challenges c ON c.id=a.challenge_id WHERE c.classroom_id=? ORDER BY a.updated_at DESC').bind(room).all<{student_id:string;progress_json:string}>()).results;
 return people.filter(s=>s.active).map(s=>{const learning=learningOf(s);const known=past.filter(a=>a.student_id===s.id).flatMap(a=>{const p=JSON.parse(a.progress_json) as Progress;return [...p.targets,...p.archived].filter(t=>t.confirmedAt).map(t=>t.id);});const options=candidates(learning.grade,skillsForGrade(learning.grade),rows.filter(r=>r.student_id===s.id),known);for(const option of options){const previous=past.filter(a=>a.student_id===s.id).map(a=>JSON.parse(a.progress_json) as Progress).flatMap(p=>[...p.targets,...p.archived]).find(t=>t.id===option.id&&t.baseline!==null);if(previous&&!previous.confirmedAt&&previous.baseline!==null&&previous.baseline<3){option.priority=-1;option.reason=`Previous subskill starting check: ${previous.baseline}/3; mastery not yet teacher-confirmed. Recommended for more work.`;}}return {id:s.id,alias:s.alias,learning,settingsVersion:s.settings_version,candidates:options.sort((a,b)=>a.priority-b.priority||a.variant-b.variant)};});
}
const pack=(c:ChallengeRow)=>({id:c.id,policy:JSON.parse(c.policy_json) as Policy,createdAt:c.created_at,closedAt:c.closed_at,winnerId:c.winner_id,winnerReason:c.winner_reason});
async function challenge(db:D1Database,room:string,id?:string):Promise<ChallengeRow|null>{return id?db.prepare('SELECT * FROM skill_challenges WHERE id=? AND classroom_id=?').bind(id,room).first<ChallengeRow>():db.prepare('SELECT * FROM skill_challenges WHERE classroom_id=? ORDER BY created_at DESC LIMIT 1').bind(room).first<ChallengeRow>();}
/** Weekly skill-check answers and "I don't know this yet" gaps, used to flag contradictions in challenge records. */
function outsideOf(json:string|null|undefined):OutsideEvidence[]{if(!json)return [];const q=JSON.parse(json) as CheckState;
 return [...q.history,...(q.round?[q.round]:[])].flatMap(r=>r.items).filter(i=>i.outcome&&i.answeredAt).map(i=>({skillId:i.skillId,outcome:i.outcome!,at:i.answeredAt!}));}
async function outsideFor(db:D1Database,studentId:string){return outsideOf((await db.prepare('SELECT state_json FROM quick_checks WHERE student_id=?').bind(studentId).first<{state_json:string}>())?.state_json);}
async function teacherView(db:D1Database,c:ChallengeRow){
 const people=await roster(db,c.classroom_id);const assignments=(await db.prepare('SELECT * FROM skill_challenge_learners WHERE challenge_id=?').bind(c.id).all<Assignment>()).results;
 const checks=new Map((await db.prepare('SELECT q.student_id,q.state_json FROM quick_checks q JOIN skill_challenge_learners a ON a.student_id=q.student_id WHERE a.challenge_id=?').bind(c.id).all<{student_id:string;state_json:string}>()).results.map(r=>[r.student_id,outsideOf(r.state_json)]));
 const policy=JSON.parse(c.policy_json) as Policy;
 return {challenge:pack(c),learners:assignments.map(a=>{const p=JSON.parse(a.progress_json) as Progress,s=people.find(s=>s.id===a.student_id);return {id:a.student_id,alias:s?.alias??'Former learner',active:!!s?.active,gradeChanged:!s||learningOf(s).grade!==p.learning.grade,revision:a.revision,updatedAt:a.updated_at,progress:publicProgress(p),summary:p.targets.map(t=>({id:t.id,status:status(t),autoConfirmed:!!t.autoConfirmed,triage:triage(p,t,policy,checks.get(a.student_id)),...metrics(p,t)})),confirmed:p.targets.filter(t=>t.confirmedAt).length};}).sort((a,b)=>a.alias.localeCompare(b.alias))};
}
export async function skillChallengesAPI(request:Request,db:D1Database,session:{role:'teacher'|'student';actor_id:string}){
 const url=new URL(request.url),op=url.pathname.split('/').pop(),host=session.role==='teacher';
 if(!host&&['preview','issue','close','winner','confirm','unconfirm','replace','focus','reflection'].includes(op??''))throw new ApiError(403,'Only teachers can manage challenges.');
 const classroom=host?await db.prepare('SELECT id FROM classrooms WHERE teacher_id=?').bind(session.actor_id).first<{id:string}>():await db.prepare('SELECT classroom_id AS id FROM students WHERE id=? AND active=1').bind(session.actor_id).first<{id:string}>();
 if(!classroom)throw new ApiError(403,'Classroom access required.');
 if(op==='preview'){
  if(!host||request.method!=='GET')throw new ApiError(403,'Only teachers can plan a challenge.');return Response.json({learners:await plans(db,classroom.id)});
 }
 if(op==='issue'){
  if(!host||request.method!=='POST')throw new ApiError(403,'Only teachers can issue challenges.');
  const body=await readBody(request),target=Number(body.target),delayHours=Number(body.delayHours),name=String(body.name??'').trim();
  if(!Number.isInteger(target)||target<1||target>6||![24,1/6].includes(delayHours)||name.length<3||name.length>80||!Array.isArray(body.assignments)||body.assignments.length<1||body.assignments.length>100)throw new ApiError(400,'Choose 1–6 skills, a follow-up schedule, and at least one learner.');
  const options=await plans(db,classroom.id),policy:Policy={target,delayHours,name,...(body.version===2?{version:2 as const}:{})},id=crypto.randomUUID(),now=Date.now();const writes:D1PreparedStatement[]=[db.prepare('INSERT INTO skill_challenges(id,classroom_id,teacher_id,policy_json,created_at) VALUES(?,?,?,?,?)').bind(id,classroom.id,session.actor_id,JSON.stringify(policy),now)];const seen=new Set<string>();
  for(const raw of body.assignments){if(!raw||typeof raw!=='object')throw new ApiError(400,'Invalid learner selection.');const item=raw as Record<string,unknown>,s=options.find(s=>s.id===item.studentId);if(!s||seen.has(s.id)||item.settingsVersion!==s.settingsVersion||!Array.isArray(item.skills)||item.skills.length!==target||new Set(item.skills).size!==target)throw new ApiError(409,'Review each learner’s current level and choose the exact number of distinct skills.');seen.add(s.id);
   const targets=item.skills.map((skill:unknown)=>{const option=s.candidates.find(c=>c.id===skill);if(!option)throw new ApiError(400,'Choose a supported skill at this learner’s grade.');return {id:option.id,reason:`Teacher selected. ${option.reason}`};});
   writes.push(db.prepare('INSERT INTO skill_challenge_learners(challenge_id,student_id,progress_json,updated_at) SELECT ?,id,?,? FROM students WHERE id=? AND classroom_id=? AND active=1 AND settings_version=?').bind(id,JSON.stringify(initial(s.learning,targets,policy)),now,s.id,classroom.id,s.settingsVersion));
  }
  // Each selected profile must still match the preview; a guard failure rolls back the batch.
  writes.push(db.prepare('INSERT INTO insight_guards SELECT ?,CASE WHEN COUNT(*)=? THEN 1 ELSE 0 END FROM skill_challenge_learners WHERE challenge_id=?').bind(id,seen.size,id));writes.push(db.prepare('DELETE FROM insight_guards WHERE id=?').bind(id));
  try{await db.batch(writes);}catch{throw new ApiError(409,'A challenge is already open, or learner settings changed. Refresh the preview before issuing.');}
  return Response.json(await teacherView(db,(await challenge(db,classroom.id,id))!));
 }
 let c=await challenge(db,classroom.id,url.searchParams.get('id')??undefined);if(!c)return Response.json({challenge:null,...(host?{learners:[]}:{assignment:null})});
 if(host&&request.method==='GET')return Response.json(await teacherView(db,c));
 if(host&&['close','winner'].includes(op??'')&&request.method==='POST'){
  const body=await readBody(request);if(body.challengeId!==c.id)fail('Refresh the current challenge.');
  if(op==='close'){await db.batch([db.prepare('UPDATE skill_challenges SET closed_at=? WHERE id=? AND closed_at IS NULL').bind(Date.now(),c.id),db.prepare("UPDATE skill_challenge_learners SET progress_json=json_set(progress_json,'$.focus',NULL),revision=revision+1 WHERE challenge_id=?").bind(c.id)]);return Response.json(await teacherView(db,(await challenge(db,classroom.id,c.id))!));}
  if(!c.closed_at)fail('Close the challenge before choosing a winner, so this is not a race.');
  const data=await teacherView(db,c),winner=data.learners.find(s=>s.id===body.studentId);if(!winner||winner.confirmed<JSON.parse(c.policy_json).target)fail('Choose a learner whose exact target skills are all teacher-confirmed.');
  const reason=String(body.reason??'').trim();if(reason.length<10||reason.length>1000)throw new ApiError(400,'Describe the growth, practice, or follow-through you are recognizing.');
  const success=await db.prepare('UPDATE skill_challenges SET winner_id=?,winner_reason=? WHERE id=? AND winner_id IS NULL RETURNING id').bind(winner.id,reason,c.id).first();if(!success)fail('A winner is already recorded.');
  return Response.json(await teacherView(db,(await challenge(db,classroom.id,c.id))!));
 }
 let body:Record<string,unknown>={};if(request.method==='POST')body=await readBody(request);
 const studentId=host?String(body.studentId??''):session.actor_id;
 const s=await db.prepare('SELECT id,classroom_id,alias,assignment,learning_json,settings_version,nickname_version,nickname_at,active FROM students WHERE id=? AND classroom_id=?').bind(studentId,classroom.id).first<Learner>();
 const a=s?await db.prepare('SELECT * FROM skill_challenge_learners WHERE challenge_id=? AND student_id=?').bind(c.id,s.id).first<Assignment>():null;
 if(!s||!a){if(!host&&request.method==='GET')return Response.json({challenge:null,assignment:null});throw new ApiError(404,'This learner is not in your challenge.');}
 const p=JSON.parse(a.progress_json) as Progress,gradeChanged=learningOf(s).grade!==p.learning.grade;
 const studentView=(progress:Progress,revision=a.revision)=>({challenge:{...pack(c!),winnerId:c!.winner_id===s.id?c!.winner_id:null,winnerReason:c!.winner_id===s.id?c!.winner_reason:''},assignment:{studentId:s.id,revision,gradeChanged,progress:publicProgress(progress)},serverNow:Date.now()});
 if(request.method==='GET')return Response.json(studentView(p));
 if(request.method!=='POST')throw new ApiError(405,'Unsupported challenge request.');
 if(c.closed_at&&!(host&&['confirm','unconfirm','reflection'].includes(op??'')&&!c.winner_id)&&!(host&&op==='focus'&&!body.skillId)&&!(!host&&(op==='begin'&&body.stage==='retention'||op==='answer'&&p.current?.stage==='retention')))fail('This challenge is closed.');if(gradeChanged||!s.active)fail('The learner’s grade or access changed. Ask the teacher to review this challenge.');
 if(body.revision!==a.revision){if(op==='answer'&&p.events.some(e=>e.id===body.questionId)&&!host)return Response.json(studentView(p));fail('New progress arrived. Refresh and try again.');}
 if(!host){const focused=await db.prepare("SELECT a.challenge_id FROM skill_challenge_learners a JOIN skill_challenges c ON c.id=a.challenge_id WHERE a.student_id=? AND c.closed_at IS NULL AND json_extract(a.progress_json,'$.focus.skillId') IS NOT NULL LIMIT 1").bind(s.id).first<{challenge_id:string}>();if(focused&&focused.challenge_id!==c.id)fail('Return to the challenge your teacher has focused for this session.');}
 let next:Progress;const now=Date.now();
 try{
  if(host&&op==='focus')next=focus(p,String(body.skillId??''),String(body.activity??'lesson'),body.breakAllowed===true,now);
  else if(host&&op==='reflection')next=reflect(p,String(body.skillId),String(body.reflection??''));
  else if(host&&op==='confirm')next=confirm(p,String(body.skillId),String(body.note??''),now);
  else if(host&&op==='unconfirm')next=undoConfirm(p,String(body.skillId));
  else if(host&&op==='replace'){
   const option=(await plans(db,classroom.id)).find(x=>x.id===s.id)?.candidates.find(x=>x.id===body.newSkillId);if(!option)throw Error('Choose a skill at this learner’s current grade.');next=replace(p,String(body.skillId),String(body.newSkillId),String(body.note??''));
  }else if(!host&&op==='begin')next=begin(p,String(body.skillId),String(body.stage) as Stage,JSON.parse(c.policy_json),now,rng,crypto.randomUUID());
  else if(!host&&op==='answer')next=autoConfirm(answer(p,String(body.questionId),String(body.answer??''),now,String(body.reasoning??'')),JSON.parse(c.policy_json),now,await outsideFor(db,s.id));
  else if(!host&&op==='lesson')next=readLesson(p,String(body.skillId),now);
  else if(!host&&op==='reflect')next=autoConfirm(reflect(p,String(body.skillId),String(body.reflection??'')),JSON.parse(c.policy_json),now,await outsideFor(db,s.id));
  else if(!host&&op==='break')next=takeBreak(p,body.onBreak===true);
  else if(!host&&op==='hint')next=hint(p,String(body.questionId));
  else throw new ApiError(403,'This challenge action is not available to this account.');
 }catch(e){if(e instanceof ApiError)throw e;throw new ApiError(409,e instanceof Error?e.message:'The action could not be completed.');}
 const auditId=crypto.randomUUID();
 const update=db.prepare('UPDATE skill_challenge_learners SET progress_json=?,revision=revision+1,updated_at=? WHERE challenge_id=? AND student_id=? AND revision=? AND EXISTS(SELECT 1 FROM skill_challenges WHERE id=? AND (closed_at IS NULL OR (?=1 AND winner_id IS NULL) OR ?=1)) AND EXISTS(SELECT 1 FROM students WHERE id=? AND active=1 AND settings_version=?) RETURNING revision').bind(JSON.stringify(next),now,c.id,s.id,a.revision,c.id,host&&['confirm','unconfirm','reflection'].includes(op??'')?1:0,(host&&op==='focus'&&!body.skillId||!host&&(op==='begin'&&body.stage==='retention'||op==='answer'&&p.current?.stage==='retention'))?1:0,s.id,s.settings_version);
 if(host){const result=await db.batch([update,db.prepare('INSERT INTO skill_challenge_audit SELECT ?,?,?,?, ?,?,? WHERE EXISTS(SELECT 1 FROM skill_challenge_learners WHERE challenge_id=? AND student_id=? AND revision=? AND updated_at=?)').bind(auditId,c.id,s.id,session.actor_id,op,JSON.stringify({skillId:body.skillId,newSkillId:body.newSkillId,note:body.note}),now,c.id,s.id,a.revision+1,now)]);if(!result[0].results.length)fail('The challenge or learner changed. Refresh first.');}
 else if(!await update.first())fail('The challenge or learner changed. Refresh first.');
 if(host)return Response.json(await teacherView(db,c));
 c=(await challenge(db,classroom.id,c.id))!;return Response.json(studentView(next,a.revision+1));
}
