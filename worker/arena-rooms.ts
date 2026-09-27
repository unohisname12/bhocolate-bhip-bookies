import {ApiError,readBody} from './security';
import {parseStored,privateGame} from './game-state';
import {classPetNames} from './pet-names';
import {fighter,preset,type Build} from '../src/features/pet-arena/combat';
import {roomAction,roomView,validLoan,type ArenaRoom,type RoomCommand} from '../src/features/pet-arena/multiplayer';
import type {EngineState} from '../src/types/engine';
type Session={role:'teacher'|'student';actor_id:string};
type Row={id:string;state_json:string;revision:number};
export async function arenaRoomsAPI(request:Request,db:D1Database,session:Session){
 const teacher=session.role==='teacher',actor=session.actor_id;
 const cls=await db.prepare(teacher?'SELECT id FROM classrooms WHERE teacher_id=?':'SELECT classroom_id AS id FROM students WHERE id=? AND active=1').bind(actor).first<{id:string}>();if(!cls)throw new ApiError(403,'Classroom access required.');
 await db.prepare("DELETE FROM arena_seats WHERE room_id IN (SELECT id FROM arena_rooms WHERE expires_at<=? OR json_extract(state_json,'$.phase')='finished')").bind(Date.now()).run();
 const rows=(await db.prepare('SELECT id,alias,state_json FROM students WHERE classroom_id=? AND active=1').bind(cls.id).all<{id:string;alias:string;state_json:string}>()).results;
 const names=await classPetNames(db,cls.id),states=new Map<string,EngineState>();for(const row of rows){try{states.set(row.id,privateGame(parseStored(row.state_json),row.id,row.alias,names.get(row.id)));}catch{/* Other learners can still play if one save needs recovery. */}}
 const member=(id:string)=>{const s=states.get(id);if(!s?.pet||s.pet.state==='dead')throw new ApiError(409,'An earned pet is required.');return {id,alias:s.player.displayName,fighter:fighter(s.pet,preset('guardian'),{fair:true}),ready:false};};
 if(request.method==='GET'){
  const rooms=(await db.prepare('SELECT id,state_json,revision FROM arena_rooms WHERE classroom_id=? AND expires_at>? ORDER BY created_at DESC LIMIT 30').bind(cls.id,Date.now()).all<Row>()).results.map(row=>({...JSON.parse(row.state_json) as ArenaRoom,revision:row.revision})).filter(r=>teacher||r.mode==='raid'||r.members.some(m=>m.id===actor));
  return Response.json({you:actor,teacher,rooms:rooms.map(r=>roomView(r,actor)),learners:rows.filter(r=>states.get(r.id)?.pet).map(r=>({id:r.id,alias:r.alias,pet:states.get(r.id)!.pet!.name}))});
 }
 if(request.method!=='POST')throw new ApiError(405,'Use a battle command.');const body=await readBody(request);
 if(body.kind==='create'){
  const mode=body.mode==='raid'?'raid':'duel';if(mode==='raid'&&!teacher||mode==='duel'&&teacher)throw new ApiError(403,'Students invite classmates; teachers start team challenges.');
  const pending=await db.prepare("SELECT id FROM arena_rooms WHERE classroom_id=? AND expires_at>? AND json_extract(state_json,'$.phase')!='finished' AND (json_extract(state_json,'$.host')=? OR EXISTS(SELECT 1 FROM json_each(json_extract(state_json,'$.members')) WHERE json_extract(value,'$.id')=?))").bind(cls.id,Date.now(),actor,actor).first();if(pending)throw new ApiError(409,'Finish your current match first.');
  const id=crypto.randomUUID(),members=mode==='duel'?[member(actor),member(String(body.opponent))]:[];
  if(mode==='duel'&&members[0].id===members[1].id)throw new ApiError(400,'Choose a classmate.');
  const pet=states.values().next().value?.pet;if(mode==='raid'&&!pet)throw new ApiError(409,'At least one learner needs a pet.');
  const boss=mode==='raid'?fighter({...pet!,id:'teacher-guardian',name:'The Classroom Guardian',speciesId:'mech_bot'},preset('tactician'),{fair:true}):null;
  if(boss){boss.maxHP=260;boss.hp=260;boss.attack=22;}
  const room:ArenaRoom={id,mode,host:actor,members,boss,phase:'lobby',round:0,paused:false,choices:{},events:[],winner:null,revision:0,message:'Choose any loan build. Everyone plays at level 10 with six talent points.'};
  try{await db.batch([db.prepare('INSERT INTO arena_rooms(id,classroom_id,state_json,revision,created_at,expires_at) VALUES(?,?,?,0,?,?)').bind(id,cls.id,JSON.stringify(room),Date.now(),Date.now()+43200000),...members.map(m=>db.prepare('INSERT INTO arena_seats(student_id,room_id) VALUES(?,?)').bind(m.id,id))]);}catch{throw new ApiError(409,'One player already has an open match. Finish that match first.');}return Response.json({ok:true});
 }
 const row=await db.prepare('SELECT id,state_json,revision FROM arena_rooms WHERE id=? AND classroom_id=? AND expires_at>?').bind(String(body.id),cls.id,Date.now()).first<Row>();if(!row)throw new ApiError(404,'Match unavailable.');
 if(row.revision!==body.revision)throw new ApiError(409,'The board changed. Refresh and try again.');const old=JSON.parse(row.state_json) as ArenaRoom;let next:ArenaRoom;
 if(body.kind==='join'){
  if(teacher||old.mode!=='raid'||old.phase!=='lobby'||old.members.length>=35)throw new ApiError(409,'Join the team before it starts.');
  next=structuredClone(old);if(!next.members.some(m=>m.id===actor))next.members.push(member(actor));
 }else{
  const kind=String(body.kind);let c:RoomCommand;
  if(kind==='ready'){
   const b=body.build as Build;if(!validLoan(b))throw new ApiError(400,'Choose a valid loan build.');c={kind,build:b};
   // Rebuild stats and charges from the actual pet when a loadout locks in.
   const s=states.get(actor);if(!s?.pet)throw new ApiError(409,'Your pet is unavailable.');const m=old.members.find(m=>m.id===actor);if(m)m.fighter=fighter(s.pet,b,{fair:true});
  }else if(kind==='move')c={kind,move:body.move as 'strike',round:Number(body.round)};
  else if(['start','resolve','pause','end'].includes(kind))c={kind:kind as 'start'|'resolve'|'pause'|'end'};
  else throw new ApiError(400,'Unknown battle command.');
  try{next=roomAction(old,c,actor,teacher);}catch(e){throw new ApiError(409,(e as Error).message);}
 }
 next.revision=row.revision+1;
 const seat=body.kind==='join'&&!old.members.some(m=>m.id===actor);
 let updated;try{const result=await db.batch([db.prepare('UPDATE arena_rooms SET state_json=?,revision=revision+1 WHERE id=? AND revision=? RETURNING id').bind(JSON.stringify(next),row.id,row.revision),...(seat?[db.prepare("INSERT INTO arena_seats(student_id,room_id) SELECT ?,id FROM arena_rooms WHERE id=? AND revision=? AND EXISTS(SELECT 1 FROM json_each(json_extract(state_json,'$.members')) WHERE json_extract(value,'$.id')=?)").bind(actor,row.id,row.revision+1,actor)]:[])]);updated=result[0].results.length;}catch{throw new ApiError(409,'Finish your other match before joining this one.');}if(!updated)throw new ApiError(409,'Another player just moved. Refresh and retry.');
 if(next.phase==='finished')await db.prepare('DELETE FROM arena_seats WHERE room_id=?').bind(row.id).run();
 return Response.json({ok:true});
}
