import {actDuel,createDuel,duelView,fighter,type Duel,type DuelCommand} from '../src/features/pet-duel/model';
import {parseStored,privateGame} from './game-state';
import {classPetNames} from './pet-names';
import {normalizeLearning} from '../src/services/game/curriculum';
import {ApiError,readBody} from './security';
type Session={role:'teacher'|'student';actor_id:string};
type Row={id:string;classroom_id:string;state_json:string;revision:number;created_at:number;expires_at:number;finished_at:number|null};
type Student={id:string;alias:string;active:number;state_json:string;learning_json:string};
const rng=()=>crypto.getRandomValues(new Uint32Array(1))[0]/4294967296;
export async function petDuelsAPI(request:Request,db:D1Database,session:Session){
 const teacher=session.role==='teacher',actor=session.actor_id;
 const classroom=await db.prepare(teacher?'SELECT id FROM classrooms WHERE teacher_id=?':'SELECT classroom_id AS id FROM students WHERE id=? AND active=1').bind(actor).first<{id:string}>();if(!classroom)throw new ApiError(403,'Your classroom is unavailable.');
 const classId=classroom.id,now=Date.now();
 await db.batch([db.prepare('UPDATE pet_duels SET finished_at=? WHERE classroom_id=? AND expires_at<=? AND finished_at IS NULL').bind(now,classId,now),db.prepare('DELETE FROM pet_duel_seats WHERE duel_id IN (SELECT id FROM pet_duels WHERE classroom_id=? AND finished_at IS NOT NULL)').bind(classId)]);
 const students=(await db.prepare('SELECT id,alias,active,state_json,learning_json FROM students WHERE classroom_id=?').bind(classId).all<Student>()).results;
 const used=(await db.prepare('SELECT e.student_id,COUNT(*) AS n FROM pet_duel_entries e JOIN students s ON s.id=e.student_id WHERE s.classroom_id=? GROUP BY e.student_id').bind(classId).all<{student_id:string;n:number}>()).results;
 // A damaged classmate save must not take down everyone else's arena.
 const names=await classPetNames(db,classId);
 const saved=new Map(students.map(s=>{try{return [s.id,privateGame(parseStored(s.state_json),s.id,s.alias,names.get(s.id))] as const;}catch{return [s.id,null] as const;}}));
 const entries=(s:Student)=>Math.max(0,Math.floor((saved.get(s.id)?.player.lifetimeMathCorrect??0)/3)-(used.find(e=>e.student_id===s.id)?.n??0));
 const profile=(s:Student)=>{const state=saved.get(s.id);if(!state)return null;state.learning=normalizeLearning(JSON.parse(s.learning_json));return fighter(s.id,s.alias,state);};
 const rows=(await db.prepare(teacher?'SELECT * FROM pet_duels WHERE classroom_id=? AND finished_at IS NULL ORDER BY created_at DESC':"SELECT * FROM pet_duels WHERE classroom_id=? AND (json_extract(state_json,'$.fighters[0].id')=? OR json_extract(state_json,'$.fighters[1].id')=?) ORDER BY created_at DESC LIMIT 1").bind(...(teacher?[classId]:[classId,actor,actor])).all<Row>()).results;
 const view=(row:Row)=>{let r=JSON.parse(row.state_json) as Duel;if(row.finished_at&&r.phase!=='finished')r={...r,phase:'finished',winner:null,cancelled:'This duel expired. Choose a classmate to invite again.'};return {...duelView(r,actor),id:row.id,revision:row.revision};};
 if(request.method==='GET'){
  const seats=(await db.prepare('SELECT student_id FROM pet_duel_seats WHERE duel_id IN (SELECT id FROM pet_duels WHERE classroom_id=?)').bind(classId).all<{student_id:string}>()).results;
  const learners=students.filter(s=>s.active).map(s=>{const f=profile(s);const publicPet=f?(({learning:_,...rest})=>rest)(f):null;return {id:s.id,alias:s.alias,fighter:publicPet,busy:seats.some(seat=>seat.student_id===s.id),entries:entries(s)};});
  return Response.json({rooms:rows.map(view),learners,you:actor,...(!teacher?{entries:entries(students.find(s=>s.id===actor)!)}:{})});
 }
 if(request.method!=='POST')throw new ApiError(405,'Use GET or POST.');
 const body=await readBody(request),op=new URL(request.url).pathname.split('/').pop();
 if(op==='create'){
  if(teacher)throw new ApiError(403,'Students choose and accept their own opponents.');
  const ids=[actor,String(body.second??'')];if(ids[0]===ids[1])throw new ApiError(400,'Choose two different students.');
  const profiles=ids.map(id=>{const s=students.find(s=>s.id===id&&s.active);if(!s)throw new ApiError(400,'Choose active students from this class.');if(entries(s)<1)throw new ApiError(400,'Both players need an entry earned from three correct math answers.');const f=profile(s);if(!f)throw new ApiError(400,'Both students need a healthy, hatched pet.');return f;});
  let room:Duel;try{room=createDuel(profiles[0],profiles[1]);room.ready=[actor];}catch(e){throw new ApiError(400,(e as Error).message);}
  const id=crypto.randomUUID();
  try{await db.batch([db.prepare('INSERT INTO pet_duels(id,classroom_id,state_json,created_at,expires_at) VALUES(?,?,?,?,?)').bind(id,classId,JSON.stringify(room),now,now+15*60000),...ids.map(student=>db.prepare('INSERT INTO pet_duel_seats(student_id,duel_id) VALUES(?,?)').bind(student,id))]);}catch{throw new ApiError(409,'One of these students already has a duel. Refresh the list.');}
  return Response.json({ok:true});
 }
 if(op!=='act')throw new ApiError(404,'Unknown duel action.');
 const found=await db.prepare('SELECT * FROM pet_duels WHERE id=? AND classroom_id=?').bind(String(body.id??''),classId).first<Row>();if(!found)throw new ApiError(404,'Duel not found in this class.');
 let row:Row=found;
 for(let attempt=0;attempt<15;attempt++){
  const old=JSON.parse(row.state_json) as Duel;
  if(!teacher&&!old.fighters.some(f=>f.id===actor))throw new ApiError(403,'This is not your duel.');
  if(row.finished_at)return Response.json({ok:true});
  let next:Duel;
  // A settings/access change stops the old question set; it cannot silently change either player's strength mid-match.
  const changed=old.fighters.some(f=>{const s=students.find(s=>s.id===f.id);return !s?.active||JSON.stringify(normalizeLearning(JSON.parse(s.learning_json)))!==JSON.stringify(f.learning);});
  try{next=changed?{...old,phase:'finished',winner:null,cancelled:'Learning settings or access changed. Choose a new duel after checking with your teacher.'}:actDuel(old,{action:String(body.action),round:typeof body.round==='number'?body.round:undefined,phase:typeof body.phase==='string'?body.phase:undefined,questionId:typeof body.questionId==='string'?body.questionId:undefined,answer:typeof body.answer==='string'?body.answer:undefined,move:typeof body.move==='string'?body.move as DuelCommand['move']:undefined,paused:typeof body.paused==='boolean'?body.paused:undefined,emote:typeof body.emote==='string'?body.emote:undefined},actor,teacher,rng);}catch(e){throw new ApiError(409,(e as Error).message);}
  const starting=old.phase==='lobby'&&next.phase==='question';
  if(starting&&old.fighters.some(f=>{const s=students.find(s=>s.id===f.id);return !s||entries(s)<1;}))throw new ApiError(409,'A player no longer has an earned entry. Cancel this invitation and practice first.');
  const updates=[db.prepare('UPDATE pet_duels SET state_json=?,revision=revision+1,finished_at=?,expires_at=? WHERE id=? AND revision=? AND finished_at IS NULL RETURNING id').bind(JSON.stringify(next),next.phase==='finished'?now:null,starting?now+12*3600000:row.expires_at,row.id,row.revision)];
  if(starting)for(const f of old.fighters)updates.push(db.prepare("INSERT OR IGNORE INTO pet_duel_entries(duel_id,student_id) SELECT id,? FROM pet_duels WHERE id=? AND revision=? AND json_extract(state_json,'$.phase')='question' AND json_extract(state_json,'$.round')=1").bind(f.id,row.id,row.revision+1));
  const result=await db.batch(updates);
  if(result[0].results.length){if(next.phase==='finished')await db.prepare('DELETE FROM pet_duel_seats WHERE duel_id=?').bind(row.id).run();return Response.json({ok:true});}
  const fresh:Row|null=await db.prepare('SELECT * FROM pet_duels WHERE id=? AND classroom_id=?').bind(row.id,classId).first<Row>();if(!fresh)throw new ApiError(404,'Duel unavailable.');row=fresh;
 }
 throw new ApiError(409,'Both players updated together. Please retry.');
}
