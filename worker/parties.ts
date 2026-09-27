import { teacherPrize } from '../src/features/clash/prizeCatalog';
import { applyPartyPrize } from '../src/features/clash/partyPrizes';
import { ApiError, limit, readBody } from './security';
import { parseStored } from './game-state';
import { advanceParty, commandParty, createParty, partyEvent, type PartyState, type PartyMember, type PartyCommand } from '../src/features/classroom-party/model';
import { practiceTarget, startRun, type ArcadeGame } from '../src/features/arcade/model';
type Row = { id: string; classroom_id: string; host_id: string; revision: number; state_json: string; created_at: number; updated_at: number; expires_at: number };
type Student = { id: string; alias: string; state_json: string; classroom_id: string };
const visible = (s: PartyState): PartyState => ({ ...s, receipts: [], members: s.members.map(m => ({ ...m, baseline: 0 })) });
const party = (r: Row) => JSON.parse(r.state_json) as PartyState;
const member = (s: Student, status: PartyMember['status'], now: number): PartyMember => {
  const state = parseStored(s.state_json);
  return { id: s.id, alias: s.alias, status, baseline: state.player.lifetimeMathCorrect, target: practiceTarget(state.learning.grade), practice: 0, lastSeen: now, station: { selected: 0, tray: [] }, racer: null };
};
function command(body: Record<string,unknown>): PartyCommand {
  const kind = body.kind;
  const int = (key: string, max: number) => { const n = body[key]; if (!Number.isInteger(n) || (n as number) < 0 || (n as number) > max) throw new ApiError(400, 'Choose a valid game move.'); return n as number; };
  if (kind === 'lane') return { kind, lane: int('lane',2) };
  if (kind === 'build' && ['rapid','frost','shield'].includes(String(body.tower))) return { kind, slot: int('slot',2), tower: body.tower as 'rapid'|'frost'|'shield' };
  if (kind === 'ingredient' || kind === 'restock') return { kind, ingredient: int('ingredient',2) };
  if (kind === 'order') return { kind, order: int('order',2) };
  if (kind === 'clear' || kind === 'serve' || kind === 'wave') return { kind };
  throw new ApiError(400,'Unknown game move.');
}
export async function partiesAPI(request: Request, db: D1Database, session: { role: 'student'|'teacher'; actor_id: string }) {
  if (session.role !== 'student') throw new ApiError(403,'Sign in as a student to join a game.');
  const me = await db.prepare('SELECT id,alias,state_json,classroom_id FROM students WHERE id=? AND active=1').bind(session.actor_id).first<Student>();
  if (!me) throw new ApiError(403,'Classroom access required.');
  const now = Date.now(), op = new URL(request.url).pathname.split('/').pop();
  const classmates = (await db.prepare('SELECT id,alias,state_json,classroom_id FROM students WHERE classroom_id=? AND active=1').bind(me.classroom_id).all<Student>()).results;
  let availableGifts: {id:string;student_id:string;prize_id:string}[]=[];
  let usedGiftIds:string[]=[];
  // D1 compare-and-swap prevents simultaneous clicks/polls from losing a teammate's move.
  async function mutate(id: string, change: (state: PartyState) => PartyState): Promise<Row> {
    for (let retry = 0; retry < 5; retry++) {
      const row = await db.prepare('SELECT * FROM arcade_parties WHERE id=? AND classroom_id=? AND expires_at>?').bind(id,me!.classroom_id,now).first<Row>();
      if (!row) throw new ApiError(404,'This room has ended or is not in your classroom.');
      let current = party(row);
      if (!current.members.some(m => m.id === me!.id && ['joined','invited'].includes(m.status))) throw new ApiError(403,'You are not invited to this room.');
      current = advanceParty(current,now);
      current = { ...current, members: current.members.map(m => {
        const student = classmates.find(c => c.id === m.id);
        if (!student) return { ...m, status: 'left' as const };
        const saved = parseStored(student.state_json);
        return { ...m, alias: student.alias, target: practiceTarget(saved.learning.grade), practice: Math.max(0,saved.player.lifetimeMathCorrect - m.baseline), lastSeen: m.id === me!.id ? now : m.lastSeen };
      }) };
      if (!current.members.some(m => m.id === current.host && m.status === 'joined')) {
        const next = current.members.find(m => m.status === 'joined');
        current = { ...current, host: next?.id ?? current.host, phase: next ? current.phase : 'closed' };
      }
      usedGiftIds=[];
      if(op==='start')availableGifts=(await db.prepare('SELECT id,student_id,prize_id FROM teacher_prizes WHERE classroom_id=? AND claimed_at IS NOT NULL AND used_at IS NULL AND prize_id LIKE ? ORDER BY created_at,id').bind(me!.classroom_id,'gift_party_%').all<{id:string;student_id:string;prize_id:string}>()).results;
      const next = change(current);
      if(usedGiftIds.length){
        const guard=crypto.randomUUID();
        try{const results=await db.batch([
          db.prepare('INSERT INTO settings_guards SELECT ?,CASE WHEN EXISTS(SELECT 1 FROM arcade_parties WHERE id=? AND revision=?) AND (SELECT COUNT(*) FROM teacher_prizes WHERE id IN (SELECT value FROM json_each(?)) AND used_at IS NULL AND claimed_at IS NOT NULL)=? THEN 1 ELSE 0 END').bind(guard,id,row.revision,JSON.stringify(usedGiftIds),usedGiftIds.length),
          db.prepare('UPDATE arcade_parties SET state_json=?,revision=revision+1,updated_at=? WHERE id=? RETURNING *').bind(JSON.stringify(next),now,id),
          db.prepare('UPDATE teacher_prizes SET used_at=? WHERE id IN (SELECT value FROM json_each(?))').bind(now,JSON.stringify(usedGiftIds)),
          db.prepare('DELETE FROM settings_guards WHERE id=?').bind(guard),
        ]);return results[1].results[0] as Row;}catch(error){if(String(error).includes('CHECK constraint'))continue;throw error;}
      }
      const updated = await db.prepare('UPDATE arcade_parties SET state_json=?,revision=revision+1,updated_at=? WHERE id=? AND revision=? RETURNING *').bind(JSON.stringify(next),now,id,row.revision).first<Row>();
      if (updated) return updated;
    }
    throw new ApiError(409,'A teammate just moved. Refresh and try again.');
  }
  if (request.method === 'GET' && op === 'parties') {
    const rows = (await db.prepare(`SELECT * FROM arcade_parties WHERE classroom_id=? AND expires_at>? AND json_extract(state_json,'$.phase')!='closed' AND EXISTS (SELECT 1 FROM json_each(state_json,'$.members') m WHERE json_extract(m.value,'$.id')=? AND json_extract(m.value,'$.status') IN ('joined','invited')) ORDER BY created_at DESC LIMIT 12`).bind(me.classroom_id,now,me.id).all<Row>()).results;
    const rooms = [];
    for (const row of rows) {
      try { const next = await mutate(row.id,s=>s); rooms.push({id:next.id,revision:next.revision,expiresAt:next.expires_at,state:visible(party(next))}); }
      catch (e) { if (!(e instanceof ApiError && [403,404,409].includes(e.status))) throw e; }
    }
    return Response.json({ me:me.id, serverNow:now, classmates:classmates.filter(c=>c.id!==me.id).map(c=>({id:c.id,alias:c.alias})), rooms });
  }
  if (request.method !== 'POST') throw new ApiError(405,'That party action is unavailable.');
  const body = await readBody(request);
  if (op === 'create') {
    if (!['dash','guard','cafe'].includes(String(body.game))) throw new ApiError(400,'Choose a game mode.');
    await limit(db,`party-create:${me.id}`,6,600_000);
    const existing = await db.prepare(`SELECT id FROM arcade_parties WHERE classroom_id=? AND expires_at>? AND json_extract(state_json,'$.phase') IN ('lobby','playing') AND EXISTS (SELECT 1 FROM json_each(state_json,'$.members') m WHERE json_extract(m.value,'$.id')=? AND json_extract(m.value,'$.status')='joined')`).bind(me.classroom_id,now,me.id).first();
    if (existing) throw new ApiError(409,'Finish or leave your current room before hosting another.');
    const id=crypto.randomUUID(),seed=crypto.getRandomValues(new Uint32Array(1))[0]%100000;
    const state=createParty(body.game as ArcadeGame,member(me,'joined',now),seed);
    await db.prepare('INSERT INTO arcade_parties(id,classroom_id,host_id,state_json,created_at,updated_at,expires_at) VALUES(?,?,?,?,?,?,?)').bind(id,me.classroom_id,me.id,JSON.stringify(state),now,now,now+30*60000).run();
    return Response.json({id});
  }
  if (typeof body.roomId !== 'string') throw new ApiError(400,'Choose a room.');
  if (typeof body.requestId !== 'string' || !/^[\w-]{20,80}$/.test(body.requestId)) throw new ApiError(400,'Missing move receipt.');
  if(op==='respond'&&body.accept===true){
    const joined=await db.prepare(`SELECT id FROM arcade_parties WHERE classroom_id=? AND id!=? AND expires_at>? AND json_extract(state_json,'$.phase') IN ('lobby','playing') AND EXISTS (SELECT 1 FROM json_each(state_json,'$.members') m WHERE json_extract(m.value,'$.id')=? AND json_extract(m.value,'$.status')='joined')`).bind(me.classroom_id,body.roomId,now,me.id).first();
    if(joined)throw new ApiError(409,'Leave your current room before joining another crew.');
  }
  const receipt = `${me.id}:${body.requestId}`;
  const updated = await mutate(body.roomId,s=>{
    if (s.receipts.includes(receipt)) return s;
    if (s.receipts.length >= 2048 && op !== 'leave') throw new ApiError(409,'This room has reached its move limit. Leave and start a new room.');
    const mine=s.members.find(m=>m.id===me.id)!;
    let next=s;
    if (op==='respond') {
      if (mine.status!=='invited' || s.phase!=='lobby') throw new ApiError(409,'This invitation is no longer open.');
      if (typeof body.accept!=='boolean') throw new ApiError(400,'Accept or decline the invitation.');
      next=partyEvent({...s,members:s.members.map(m=>m.id===me.id?{...m,status:body.accept?'joined':'declined'}:m)},`${me.alias} ${body.accept?'joined':'declined'}.`);
    } else {
      if (mine.status!=='joined') throw new ApiError(403,'Accept the invitation before playing.');
      if (op==='invite') {
        if (s.host!==me.id || s.phase!=='lobby') throw new ApiError(403,'Only the host can invite before the game starts.');
        const target=classmates.find(c=>c.id===body.studentId);
        if (!target || target.id===me.id) throw new ApiError(400,'Choose someone in your class.');
        if (s.members.some(m=>m.id===target.id)) throw new ApiError(409,'That classmate already received this invitation.');
        if (s.members.filter(m=>['joined','invited'].includes(m.status)).length>=4) throw new ApiError(409,'This room has four places.');
        next=partyEvent({...s,members:[...s.members,member(target,'invited',now)]},`${me.alias} invited ${target.alias}.`);
      } else if (op==='leave') {
        const members=s.members.map(m=>m.id===me.id?{...m,status:'left' as const}:m);
        const host=s.host===me.id?members.find(m=>m.status==='joined')?.id:s.host;
        next=partyEvent({...s,members,host:host??s.host,phase:host?s.phase:'closed'},`${me.alias} left the room.`);
      } else if (op==='start') {
        const joined=s.members.filter(m=>m.status==='joined');
        if (s.host!==me.id || s.phase!=='lobby') throw new ApiError(403,'Only the host starts the room.');
        if (joined.length<2 || joined.some(m=>m.practice<m.target)) throw new ApiError(409,'Invite a friend and let everyone finish their practice first.');
        next=partyEvent({...s,phase:'playing',startAt:now+3000,members:s.members.map(m=>m.status==='joined'?{...m,racer:s.game==='dash'?startRun('dash',1,s.seed):null}:m)},'Everyone is ready. Let’s play together!');
        for(const player of joined){const gift=availableGifts.find(g=>g.student_id===player.id&&teacherPrize(g.prize_id)?.target===s.game);if(gift){next=applyPartyPrize(next,player.id,gift.prize_id);usedGiftIds.push(gift.id);}}
      } else if (op==='rematch') {
        if (s.host!==me.id || s.phase!=='done' || !['cafe','guard','dash'].includes(String(body.game))) throw new ApiError(409,'Only the host can choose the next mode after finishing.');
        const joined=s.members.filter(m=>m.status==='joined').map(m=>member(classmates.find(c=>c.id===m.id)!,'joined',now));
        next={...createParty(body.game as ArcadeGame,joined.find(m=>m.id===me.id)!,crypto.getRandomValues(new Uint32Array(1))[0]%100000),members:joined};
        next={...next,receipts:s.receipts};
        next=partyEvent(next,'Same crew, new adventure! A short practice gets everyone ready again.');
      } else if (op==='move') {
        const cmd=command(body);
        if (cmd.kind==='wave') {
          if(s.game!=='guard'||s.phase!=='playing'||s.waveAt) throw new ApiError(409,'Wait for the build break.');
          if(!s.run.towers.some(Boolean)) throw new ApiError(409,'Build at least one defense first.');
          next=partyEvent({...s,waveAt:now},`${me.alias} started the wave!`);
        } else next=commandParty(s,me.id,cmd);
      } else throw new ApiError(404,'Unknown party action.');
    }
    return {...next,receipts:[...next.receipts,receipt]};
  });
  return Response.json({id:updated.id,revision:updated.revision,expiresAt:updated.expires_at,state:visible(party(updated))});
}
