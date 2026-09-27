import { timingSafeEqual } from 'node:crypto';
import { advanceClock, apply, createRoom, view, type Room, type Settings, type Command } from '../src/features/portal-party/model';
import { GRADE_TOPICS, normalizeLearning } from '../src/services/game/curriculum';
import { ApiError, digest, limit, randomCode, readBody } from './security';

type Row={id:string;classroom_id:string;code:string;projector_token:string;state_json:string;revision:number;expires_at:number};
type Session={role:'teacher'|'student';actor_id:string};
const rng=()=>crypto.getRandomValues(new Uint32Array(1))[0]/4294967296;
function settings(body:Record<string,unknown>):Settings {
  const grade=Number(body.grade),topic=String(body.topic),challenge=String(body.challenge);
  if(!Number.isInteger(grade)||grade<0||grade>12||!(topic==='mixed'||(GRADE_TOPICS[grade] as readonly string[]).includes(topic))||!['support','standard','stretch'].includes(challenge))throw new ApiError(400,'Choose a supported math level, topic, and difficulty.');
  const teams=Number(body.teams),rounds=Number(body.rounds),questions=Number(body.questions),seconds=Number(body.seconds);
  if(!Number.isInteger(teams)||teams<1||teams>8||!Number.isInteger(rounds)||rounds<1||rounds>5||!Number.isInteger(questions)||questions<1||questions>5||![0,30,60,90,120].includes(seconds)||typeof body.gentle!=='boolean')throw new ApiError(400,'Check the team, round, and timer settings.');
  return {learning:normalizeLearning({grade,topic,challenge:challenge as 'support'|'standard'|'stretch'}),teams,rounds,questions,seconds,gentle:body.gentle};
}
async function find(db:D1Database,id:string):Promise<Row>{const row=await db.prepare('SELECT * FROM portal_rooms WHERE id=? AND expires_at>?').bind(id,Date.now()).first<Row>();if(!row)throw new ApiError(404,'This festival has expired or could not be found. Ask your teacher for a new code.');return row;}
async function write(db:D1Database,row:Row,room:Room):Promise<boolean>{const result=await db.prepare('UPDATE portal_rooms SET state_json=?,revision=revision+1,finished_at=? WHERE id=? AND revision=? RETURNING id').bind(JSON.stringify(room),room.phase==='finished'?Date.now():null,row.id,row.revision).first();return !!result;}
function response(row:Row,room:Room,actor:string,teacher=false){return Response.json({room:{...view(room,actor),id:row.id,code:row.code,revision:row.revision,serverNow:Date.now()},...(teacher?{projectorToken:row.projector_token}:{})});}
async function clock(db:D1Database,row:Row):Promise<Row>{const room=JSON.parse(row.state_json) as Room;const next=advanceClock(room,Date.now(),rng);if(next!==room){await write(db,row,next);return find(db,row.id);}return row;}
async function act(db:D1Database,row:Row,body:Record<string,unknown>,actor:string){
  const action=String(body.action);
  // Answers can arrive simultaneously; retry CAS against the latest room, but never another question.
  for(let retry=0;retry<12;retry++){
    const room=JSON.parse(row.state_json) as Room;
    const sameQuestionAdvance=action==='next'&&['lobby','question','review','reveal'].includes(room.phase)&&body.phase===room.phase&&(body.questionId??null)===(room.question?.id??null);
    if(action!=='answer'&&!sameQuestionAdvance&&body.revision!==row.revision)throw new ApiError(409,'The board changed. Review it and try again.');
    let next:Room;
    const command:Command={action,questionId:typeof body.questionId==='string'?body.questionId:undefined,answer:typeof body.answer==='string'?body.answer:undefined,memberId:typeof body.memberId==='string'?body.memberId:undefined,correct:typeof body.correct==='boolean'?body.correct:undefined,team:typeof body.team==='number'?body.team:undefined,amount:typeof body.amount==='number'?body.amount:undefined};
    try{next=apply(room,command,actor,Date.now(),rng);}catch(e){throw new ApiError(409,e instanceof Error?e.message:'This action is unavailable.');}
    if(await write(db,row,next))return response({...row,revision:row.revision+1},next,actor,actor==='teacher');
    await new Promise(resolve=>setTimeout(resolve,10*(retry+1)+Math.floor(rng()*40)));
    row=await find(db,row.id);
  }
  throw new ApiError(409,'Another answer just arrived. Please try again.');
}
export async function portalAPI(request:Request,db:D1Database,session:Session):Promise<Response>{
  if(session.role!=='teacher')throw new ApiError(403,'Only teachers can host Portal Party.');
  const classroom=await db.prepare('SELECT id FROM classrooms WHERE teacher_id=?').bind(session.actor_id).first<{id:string}>();if(!classroom)throw new ApiError(403,'Teacher classroom required.');
  const operation=new URL(request.url).pathname.split('/').pop();
  if(request.method==='POST'&&operation==='create'){
    const config=settings(await readBody(request)),id=crypto.randomUUID(),now=Date.now();
    await db.prepare('UPDATE portal_rooms SET finished_at=? WHERE classroom_id=? AND expires_at<=? AND finished_at IS NULL').bind(now,classroom.id,now).run();
    const code=String(100000+Math.floor(rng()*900000)),token=randomCode(32),room=createRoom(config);
    try{await db.prepare('INSERT INTO portal_rooms(id,classroom_id,code,projector_token,state_json,created_at,expires_at) VALUES(?,?,?,?,?,?,?)').bind(id,classroom.id,code,token,JSON.stringify(room),now,now+43200000).run();}
    catch{throw new ApiError(409,'A festival is already open, or the code was just taken. Refresh and try again.');}
    return response(await find(db,id),room,'teacher',true);
  }
  const url=new URL(request.url);const requested=url.searchParams.get('id');
  let row=requested?await find(db,requested):await db.prepare('SELECT * FROM portal_rooms WHERE classroom_id=? AND expires_at>? ORDER BY created_at DESC LIMIT 1').bind(classroom.id,Date.now()).first<Row>();
  if(!row)return Response.json({room:null});
  if(row.classroom_id!==classroom.id)throw new ApiError(403,'This festival belongs to another classroom.');
  row=await clock(db,row);
  if(request.method==='GET')return response(row,JSON.parse(row.state_json),'teacher',true);
  if(request.method==='POST'&&operation==='act')return act(db,row,await readBody(request),'teacher');
  throw new ApiError(405,'Unknown festival action.');
}
export async function portalPublicAPI(request:Request,db:D1Database):Promise<Response>{
  const url=new URL(request.url),op=url.searchParams.get('op');
  if(op==='join'&&request.method==='POST'){
    const body=await readBody(request),code=String(body.code??'').trim();
    const network=request.headers.get('CF-Connecting-IP')??'local';
    await limit(db,`portal-join:${await digest(network)}`,180,600000);
    if(!/^\d{6}$/.test(code))throw new ApiError(400,'Enter the six-digit festival code.');
    const original=await db.prepare('SELECT * FROM portal_rooms WHERE code=? AND expires_at>? AND finished_at IS NULL').bind(code,Date.now()).first<Row>();
    if(!original)throw new ApiError(404,'That festival is not open. Check your teacher’s code.');
    const alias=String(body.alias??'').trim().replace(/\s+/g,' ');
    if(!/^[\p{L}\p{N} ._-]{2,20}$/u.test(alias))throw new ApiError(400,'Use a nickname of 2–20 letters or numbers.');
    const token=randomCode(40),tokenHash=await digest(token),id=crypto.randomUUID();let row=original;
    for(let retry=0;retry<12;retry++){
      const room=JSON.parse(row.state_json) as Room;
      if(room.phase!=='lobby')throw new ApiError(409,'Your teacher has started. Reopen your original game tab to rejoin.');
      if(room.members.length>=60)throw new ApiError(409,'This festival is full.');
      if(room.members.some(m=>m.alias.toLowerCase()===alias.toLowerCase()))throw new ApiError(409,'That nickname is in use. Choose another, or resume your saved seat.');
      const counts=room.teams.map((_,i)=>room.members.filter(m=>m.team===i).length),team=counts.indexOf(Math.min(...counts));
      room.members.push({id,alias,team,tokenHash});
      if(await write(db,row,room))return Response.json({id:row.id,token,code});
      await new Promise(resolve=>setTimeout(resolve,10*(retry+1)+Math.floor(rng()*40)));
    row=await find(db,row.id);
    }
    throw new ApiError(409,'The lobby is busy. Try joining again.');
  }
  let row=await find(db,url.searchParams.get('id')??'');
  const token=request.headers.get('X-Portal-Token')??'';
  const projector=op==='projector';
  let actor='projector';
  if(projector){if(token.length!==row.projector_token.length||!timingSafeEqual(new TextEncoder().encode(token),new TextEncoder().encode(row.projector_token)))throw new ApiError(403,'Invalid projector link. Open it from your teacher dashboard.');}
  else {const hash=await digest(token);const room=JSON.parse(row.state_json) as Room;const member=room.members.find(m=>m.tokenHash===hash);if(!member)throw new ApiError(403,'Your festival seat could not be found. Ask your teacher to rejoin.');actor=member.id;}
  row=await clock(db,row);
  if(request.method==='GET')return response(row,JSON.parse(row.state_json),actor);
  if(request.method==='POST'&&!projector&&op==='act'){
    await limit(db,`portal-member:${actor}`,100,60000);
    return act(db,row,await readBody(request),actor);
  }
  throw new ApiError(405,'This view cannot change the festival.');
}
