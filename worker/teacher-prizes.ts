import { ApiError, readBody } from './security';
import { OFFERED_PRIZES, teacherPrize } from '../src/features/clash/prizeCatalog';
import { grantTeacherGift } from '../src/features/clash/teacherGifts';
import { ownsFurniture } from '../src/features/home-base/model';
import { parseStored, packGame, validateGame } from './game-state';
type Grant={id:string;student_id:string;prize_id:string;claimed_at:number|null;used_at:number|null;alias?:string};
export async function teacherPrizesAPI(request:Request,db:D1Database,session:{role:'teacher'|'student';actor_id:string},room:string){
 const op=new URL(request.url).pathname.split('/').pop(),now=Date.now();
 if(op==='gifts'&&request.method==='GET'){
  if(session.role==='teacher')return Response.json({learners:(await db.prepare('SELECT id,alias,active FROM students WHERE classroom_id=? ORDER BY alias').bind(room).all()).results,grants:(await db.prepare('SELECT g.*,s.alias FROM teacher_prizes g JOIN students s ON s.id=g.student_id WHERE g.classroom_id=? ORDER BY g.created_at DESC LIMIT 200').bind(room).all()).results});
  return Response.json({grants:(await db.prepare('SELECT id,prize_id,claimed_at,used_at FROM teacher_prizes WHERE student_id=? AND classroom_id=? AND (claimed_at IS NULL OR (prize_id LIKE ? AND used_at IS NULL)) ORDER BY created_at DESC').bind(session.actor_id,room,'gift_party_%').all()).results});
 }
 if(request.method!=='POST')throw new ApiError(405,'Use POST.');
 const body=await readBody(request);
 if(op==='award'){
  if(session.role!=='teacher')throw new ApiError(403,'Only the teacher can award prizes.');
  if(Object.keys(body).some(k=>!['requestId','students','prizeId','category'].includes(k))||typeof body.requestId!=='string'||! /^[\w-]{20,80}$/.test(body.requestId)||!Array.isArray(body.students)||!body.students.length||body.students.length>35||new Set(body.students).size!==body.students.length||body.students.some(id=>typeof id!=='string'))throw new ApiError(400,'Choose 1–35 different learners and a valid award receipt.');
  const payload=JSON.stringify({students:body.students,prizeId:body.prizeId,category:body.category??''});
  const prior=await db.prepare('SELECT payload,result FROM teacher_prize_batches WHERE id=? AND classroom_id=?').bind(body.requestId,room).first<{payload:string;result:string}>();
  if(prior){if(prior.payload!==payload)throw new ApiError(409,'This award receipt belongs to another selection.');return Response.json(JSON.parse(prior.result));}
  const selected=teacherPrize(String(body.prizeId));
  if(body.prizeId!=='random'&&!selected)throw new ApiError(400,'Choose a prize from the catalog.');
  const pool=OFFERED_PRIZES.filter(p=>!body.category||p.category===body.category);
  if(!pool.length)throw new ApiError(400,'Choose an available prize category.');
  const grants=[];
  for(const id of body.students){
   const row=await db.prepare('SELECT id,alias,state_json FROM students WHERE id=? AND classroom_id=?').bind(id,room).first<{id:string;alias:string;state_json:string}>();
   if(!row)throw new ApiError(404,'A selected learner is not in your classroom. Nobody was awarded.');
   const state=parseStored(row.state_json);
   const pending=(await db.prepare('SELECT prize_id FROM teacher_prizes WHERE student_id=? AND claimed_at IS NULL').bind(id).all<{prize_id:string}>()).results.map(r=>r.prize_id);
   const fresh=pool.filter(p=>!pending.includes(p.id)&&(p.effect!=='furniture'||!ownsFurniture(state,p.target!))&&(p.effect!=='cosmetic'||!state.cosmetics.owned.some(c=>c.cosmeticId===p.target)));
   const options=fresh.length?fresh:pool;
   const prize=selected??options[crypto.getRandomValues(new Uint32Array(1))[0]%options.length];
   grants.push({id:crypto.randomUUID(),studentId:id,alias:row.alias,prizeId:prize.id,name:prize.name});
  }
  const result={ok:true,grants};
  try{await db.batch([db.prepare('INSERT INTO teacher_prize_batches VALUES(?,?,?,?,?)').bind(body.requestId,room,payload,JSON.stringify(result),now),...grants.map(g=>db.prepare('INSERT INTO teacher_prizes(id,classroom_id,student_id,prize_id,batch_id,created_at) VALUES(?,?,?,?,?,?)').bind(g.id,room,g.studentId,g.prizeId,body.requestId,now))]);}
  catch(error){const done=await db.prepare('SELECT payload,result FROM teacher_prize_batches WHERE id=? AND classroom_id=?').bind(body.requestId,room).first<{payload:string;result:string}>();if(done?.payload===payload)return Response.json(JSON.parse(done.result));throw error;}
  return Response.json(result);
 }
 if(op==='gift-claim'){
  if(session.role!=='student')throw new ApiError(403,'Student access required.');
  const gift=await db.prepare('SELECT * FROM teacher_prizes WHERE id=? AND student_id=? AND classroom_id=?').bind(String(body.grantId),session.actor_id,room).first<Grant>();
  if(!gift)throw new ApiError(404,'That prize is not yours.');
  if(gift.claimed_at)return Response.json({ok:true});
  const row=await db.prepare('SELECT state_json,revision FROM students WHERE id=?').bind(session.actor_id).first<{state_json:string;revision:number}>();
  if(!row)throw new ApiError(404,'Learner not found.');
  const next=grantTeacherGift(parseStored(row.state_json),gift.id,gift.prize_id);validateGame(next);
  const guard=crypto.randomUUID();
  try{await db.batch([
   db.prepare('INSERT INTO settings_guards SELECT ?,CASE WHEN EXISTS(SELECT 1 FROM students WHERE id=? AND revision=?) AND EXISTS(SELECT 1 FROM teacher_prizes WHERE id=? AND claimed_at IS NULL) THEN 1 ELSE 0 END').bind(guard,session.actor_id,row.revision,gift.id),
   db.prepare('UPDATE students SET state_json=?,revision=revision+1,request_id=?,updated_at=? WHERE id=?').bind(packGame(next),`gift-${gift.id}`,now,session.actor_id),
   db.prepare('UPDATE teacher_prizes SET claimed_at=? WHERE id=?').bind(now,gift.id),db.prepare('DELETE FROM settings_guards WHERE id=?').bind(guard)
  ]);}catch(error){const done=await db.prepare('SELECT claimed_at FROM teacher_prizes WHERE id=?').bind(gift.id).first<{claimed_at:number|null}>();if(done?.claimed_at)return Response.json({ok:true});if(String(error).includes('CHECK constraint'))throw new ApiError(409,'Your progress changed while collecting. Wait for Saved online and retry.');throw error;}
  return Response.json({ok:true});
 }
 throw new ApiError(404,'Unknown prize action.');
}
