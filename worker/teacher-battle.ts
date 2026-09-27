import { apply, createRoom, joinRoom, roomView, COLORS, type Room, type Guardian, type Command, type Member } from '../src/features/teacher-battle/model';
import { GRADE_TOPICS, normalizeLearning } from '../src/services/game/curriculum';
import { isGrowingPet } from '../src/config/companionConfig';
import { ApiError, digest, limit, randomCode, readBody } from './security';
type Session={role:'teacher'|'student';actor_id:string};
type Row={id:string;classroom_id:string;code:string;invite:string;projector_token:string;state_json:string;revision:number;expires_at:number};
const rng=()=>crypto.getRandomValues(new Uint32Array(1))[0]/4294967296;
function name(value:unknown){const text=String(value??'').trim();if(!/^[\p{L}\p{N} ._'’-]{2,24}$/u.test(text))throw new ApiError(400,'Use a nickname of 2–24 letters or numbers.');return text;}
function guardian(body:Record<string,unknown>):Guardian {const color=String(body.color);if(!(COLORS as readonly string[]).includes(color))throw new ApiError(400,'Choose a guardian color.');return {name:name(body.name),color:color as Guardian['color']};}
function learning(body:Record<string,unknown>){const grade=Number(body.grade),topic=String(body.topic),challenge=String(body.challenge);if(!Number.isInteger(grade)||grade<0||grade>12||!(topic==='mixed'||(GRADE_TOPICS[grade] as readonly string[]).includes(topic))||!['support','standard','stretch'].includes(challenge))throw new ApiError(400,'Choose a valid math level, topic and difficulty.');return normalizeLearning({grade,topic,challenge:challenge as 'support'|'standard'|'stretch'});}
async function find(db:D1Database,id:string){const row=await db.prepare('SELECT * FROM teacher_battle_rooms WHERE id=? AND expires_at>?').bind(id,Date.now()).first<Row>();if(!row)throw new ApiError(404,'This match has expired or could not be found.');return row;}
function reply(row:Row,actor:string,extra:Record<string,unknown>={}){const room=JSON.parse(row.state_json) as Room;return Response.json({room:{...roomView(room,actor),id:row.id,code:row.code,revision:row.revision,...(actor===room.host?{invite:row.invite}:{})},...(actor===room.host?{projectorToken:row.projector_token}:{}),...extra});}
async function write(db:D1Database,row:Row,room:Room){return db.prepare('UPDATE teacher_battle_rooms SET state_json=?,revision=revision+1,finished_at=? WHERE id=? AND revision=? RETURNING id').bind(JSON.stringify(room),room.phase==='finished'?Date.now():null,row.id,row.revision).first();}
async function change(db:D1Database,row:Row,body:Record<string,unknown>,actor:string){
  const action=String(body.action);if(action==='learning')learning(body);
  for(let retry=0;retry<20;retry++){
    // Reactions are independent of the board, so a stale revision never blocks one.
    if(action!=='answer'&&action!=='emote'&&body.revision!==row.revision){
      const current=JSON.parse(row.state_json) as Room;
      // Answers and lobby joins may advance the revision without changing the host's intended transition.
      const sameTransition=['next','pause','finish'].includes(action)&&body.phase===current.phase&&body.round===current.round&&body.paused===current.paused;
      if(!sameTransition)throw new ApiError(409,'The match changed. Review the board and try again.');
    }
    let next:Room;try{next=apply(JSON.parse(row.state_json),{...body,action} as Command,actor,rng);}catch(e){throw new ApiError(409,e instanceof Error?e.message:'Action unavailable.');}
    if(await write(db,row,next))return reply({...row,state_json:JSON.stringify(next),revision:row.revision+1},actor);
    row=await find(db,row.id);
  }throw new ApiError(409,'Several players answered together. Please retry your answer.');
}
export async function teacherBattleAPI(request:Request,db:D1Database,session:Session){
  if(session.role!=='teacher')throw new ApiError(403,'Teacher sign-in required.');
  const url=new URL(request.url),op=url.pathname.split('/').pop(),actor=`teacher:${session.actor_id}`;
  if(op==='guardian'){
    if(request.method==='GET')return Response.json({guardian:await db.prepare('SELECT name,color FROM teacher_guardians WHERE teacher_id=?').bind(session.actor_id).first()??{name:'Chalkstone',color:'midnight'}});
    if(request.method==='POST'){const g=guardian(await readBody(request));await db.prepare('INSERT INTO teacher_guardians(teacher_id,name,color) VALUES(?,?,?) ON CONFLICT(teacher_id) DO UPDATE SET name=excluded.name,color=excluded.color').bind(session.actor_id,g.name,g.color).run();return Response.json({guardian:g});}
  }
  if(op==='create'&&request.method==='POST'){
    const body=await readBody(request),config=learning(body),rounds=Number(body.rounds);
    if(!Number.isInteger(rounds)||rounds<1||rounds>10)throw new ApiError(400,'Choose 1–10 rounds.');
    const classroom=await db.prepare('SELECT id FROM classrooms WHERE teacher_id=?').bind(session.actor_id).first<{id:string}>();if(!classroom)throw new ApiError(403,'Teacher classroom required.');
    const g=guardian(body),host:Member={id:actor,alias:name(body.alias),side:'teachers',pet:'chalkstone_griffin',guardian:g,learning:config};
    const now=Date.now(),row:Row={id:crypto.randomUUID(),classroom_id:classroom.id,code:randomCode(6),invite:randomCode(16),projector_token:randomCode(40),state_json:JSON.stringify(createRoom(host,rounds,config)),revision:0,expires_at:now+43200000};
    await db.prepare('UPDATE teacher_battle_rooms SET finished_at=? WHERE classroom_id=? AND expires_at<=? AND finished_at IS NULL').bind(now,classroom.id,now).run();
    try{await db.prepare('INSERT INTO teacher_battle_rooms(id,classroom_id,code,invite,projector_token,state_json,expires_at) VALUES(?,?,?,?,?,?,?)').bind(row.id,row.classroom_id,row.code,row.invite,row.projector_token,row.state_json,row.expires_at).run();}catch{throw new ApiError(409,'A match is already open for this classroom. Resume or finish it first.');}
    return reply(row,actor);
  }
  if(op==='join'&&request.method==='POST'){
    const body=await readBody(request);await limit(db,`battle-invite:${session.actor_id}`,30);
    let row=await db.prepare('SELECT * FROM teacher_battle_rooms WHERE invite=? AND expires_at>? AND finished_at IS NULL').bind(String(body.invite??'').trim().toUpperCase(),Date.now()).first<Row>();if(!row)throw new ApiError(404,'Check the private co-teacher invitation.');
    const g=guardian(body);
    for(let retry=0;retry<12;retry++){const room=JSON.parse(row.state_json) as Room;if(room.members.some(m=>m.id===actor))return reply(row,actor);
      let next:Room;try{next=joinRoom(room,{id:actor,alias:name(body.alias),side:'teachers',pet:'chalkstone_griffin',guardian:g,learning:room.learning});}catch(e){throw new ApiError(409,(e as Error).message);}
      if(await write(db,row,next))return reply({...row,state_json:JSON.stringify(next),revision:row.revision+1},actor);row=await find(db,row.id);
    }throw new ApiError(409,'The lobby changed. Try joining again.');
  }
  const id=url.searchParams.get('id');
  const row=id?await find(db,id):await db.prepare('SELECT r.* FROM teacher_battle_rooms r JOIN classrooms c ON c.id=r.classroom_id WHERE c.teacher_id=? AND r.expires_at>? ORDER BY r.expires_at DESC LIMIT 1').bind(session.actor_id,Date.now()).first<Row>();
  if(!row)return Response.json({room:null});
  if(!(JSON.parse(row.state_json) as Room).members.some(m=>m.id===actor&&m.side==='teachers'))throw new ApiError(403,'You are not a teacher in this match.');
  if(request.method==='GET')return reply(row,actor);
  if(op==='act'&&request.method==='POST')return change(db,row,await readBody(request),actor);
  throw new ApiError(405,'Unknown match operation.');
}
export async function teacherBattlePublicAPI(request:Request,db:D1Database){
  const url=new URL(request.url),op=url.searchParams.get('op');
  if(op==='join'&&request.method==='POST'){
    await limit(db,`battle-join:${await digest(request.headers.get('CF-Connecting-IP')??'local')}`,180);
    const body=await readBody(request),alias=name(body.alias),pet=String(body.pet);
    if(!isGrowingPet(pet))throw new ApiError(400,'Choose a student companion.');
    let row=await db.prepare('SELECT * FROM teacher_battle_rooms WHERE code=? AND expires_at>? AND finished_at IS NULL').bind(String(body.code??'').trim().toUpperCase(),Date.now()).first<Row>();if(!row)throw new ApiError(404,'That match is not open. Check your teacher’s code.');
    const token=randomCode(40),tokenHash=await digest(token),id=crypto.randomUUID();
    for(let retry=0;retry<20;retry++){
      const room=JSON.parse(row.state_json) as Room;let next:Room;
      try{next=joinRoom(room,{id,alias,side:'students',pet,tokenHash,learning:room.learning});}catch(e){throw new ApiError(409,(e as Error).message);}
      if(await write(db,row,next))return reply({...row,state_json:JSON.stringify(next),revision:row.revision+1},id,{token});row=await find(db,row.id);
    }throw new ApiError(409,'The lobby is busy. Try again.');
  }
  const row=await find(db,url.searchParams.get('id')??''),token=request.headers.get('X-Battle-Token')??'';
  if(op==='projector'&&request.method==='GET'&&token.length===40&&await digest(token)===await digest(row.projector_token))return reply(row,'projector');
  if(token.length!==40)throw new ApiError(403,'Rejoin from your original game tab.');
  const hash=await digest(token),member=(JSON.parse(row.state_json) as Room).members.find(m=>m.side==='students'&&m.tokenHash===hash);if(!member)throw new ApiError(403,'This seat is no longer available.');
  if(request.method==='GET'&&op==='state')return reply(row,member.id);
  if(request.method==='POST'&&op==='act'){await limit(db,`battle-answer:${member.id}`,120,60000);return change(db,row,await readBody(request),member.id);}
  throw new ApiError(405,'Unknown match operation.');
}
