import { startDeliveryPlan, deliveryPlanAction } from '../src/features/delivery/planning';
import { normalizeLearning } from '../src/services/game/curriculum';
import { ambushAction } from '../src/features/delivery/ambush';
import { ApiError, limit, readBody } from './security';
import { parseStored } from './game-state';
import { openCrate, buyTool, tradeAction, radioMessage, startRisk, finishRisk, offerDeal, award, createCity, driver, publicCity, resolve, startCity, submit, syncPractice, validRules, PERKS, type City, type Order, type Perk, type Rules } from '../src/features/delivery/model';
type Student = { id: string; alias: string; classroom_id: string; state_json: string; learning_json: string | null };
type Row = { id: string; revision: number; state_json: string };
export async function deliveryAPI(request: Request, db: D1Database, session: { role: 'student' | 'teacher'; actor_id: string }) {
  const teacher = session.role === 'teacher';
  const room = teacher
    ? await db.prepare('SELECT id FROM classrooms WHERE teacher_id=?').bind(session.actor_id).first<{ id: string }>()
    : await db.prepare('SELECT classroom_id AS id FROM students WHERE id=? AND active=1').bind(session.actor_id).first<{ id: string }>();
  if (!room) throw new ApiError(403, 'Classroom access required.');
  const students = (await db.prepare('SELECT id,alias,classroom_id,state_json,learning_json FROM students WHERE classroom_id=? AND active=1').bind(room.id).all<Student>()).results;
  const saves = students.flatMap(s => {
    try { return [{ ...s, game: parseStored(s.state_json) }]; }
    catch (error) { if (error instanceof ApiError && error.status === 503) return []; throw error; }
  });
  const totals = Object.fromEntries(saves.map(s => [s.id, s.game.player.lifetimeMathCorrect]));
  const makeDriver = (id: string) => { const s = saves.find(s => s.id === id); if (!s) throw new ApiError(400, 'Choose a learner in this classroom.'); return driver(s.id, s.alias, s.game.pet ? { name: s.game.pet.name, speciesId: s.game.pet.speciesId, stage: s.game.pet.stage } : null, totals[id]); };
  const now = Date.now(), op = new URL(request.url).pathname.split('/').pop();
  async function mutate(id: string, change: (city: City) => City, receipt = ''): Promise<Row> {
    for (let retry = 0; retry < 5; retry++) {
      const row = await db.prepare('SELECT id,revision,state_json FROM delivery_rooms WHERE id=? AND classroom_id=?').bind(id, room!.id).first<Row>();
      if (!row) throw new ApiError(404, 'City not found in this classroom.');
      const stored = JSON.parse(row.state_json) as City;
      if (receipt && stored.receipts.includes(receipt)) return row;
      let current = syncPractice(stored, totals);
      for (const p of current.players) if(p.challenge?.status==='active' && now>p.challenge.deadline) current=finishRisk(current,p.id,p.challenge.id,NaN,now);
      current = { ...current, players: current.players.map(p => ({ ...p, alias: students.find(s => s.id === p.id)?.alias ?? p.alias })) };
      current = resolve(current, now, totals);
      let next: City;
      try { next = change(current); } catch (e) { if (e instanceof ApiError) throw e; throw new ApiError(400, e instanceof Error ? e.message : 'Invalid delivery action.'); }
      next = resolve(next, now, totals);
      if (receipt) {
        if (next.receipts.length >= 4096) throw new ApiError(409, 'This city has reached its action limit. Start a new city.');
        next = { ...next, receipts: [...next.receipts, receipt] };
      }
      if (JSON.stringify(next) === row.state_json) return row;
      const updated = await db.prepare('UPDATE delivery_rooms SET state_json=?,revision=revision+1,updated_at=? WHERE id=? AND revision=? RETURNING id,revision,state_json').bind(JSON.stringify(next),now,id,row.revision).first<Row>();
      if (updated) return updated;
    }
    throw new ApiError(409, 'Another crew just moved. Refresh and try again.');
  }
  if (request.method === 'GET' && op === 'delivery') {
    const rows = (await db.prepare("SELECT id,revision,state_json FROM delivery_rooms WHERE classroom_id=? ORDER BY CASE WHEN json_extract(state_json,'$.phase')='done' THEN 1 ELSE 0 END,updated_at DESC LIMIT 100").bind(room.id).all<Row>()).results;
    const rooms = [];
    for (const row of rows) {
      const city = JSON.parse(row.state_json) as City;
      if (!teacher && city.phase !== 'lobby' && !city.players.some(p => p.id === session.actor_id)) continue;
      const updated = await mutate(row.id, s => s);
      rooms.push({ id: row.id, revision: updated.revision, state: publicCity(JSON.parse(updated.state_json), session.actor_id, teacher) });
    }
    return Response.json({ me: session.actor_id, teacher, serverNow: now, classmates: students.map(s => ({ id: s.id, alias: s.alias })), rooms });
  }
  if (request.method !== 'POST') throw new ApiError(405, 'Use a delivery action.');
  const body = await readBody(request);
  if (typeof body.requestId !== 'string' || !/^[\w-]{20,80}$/.test(body.requestId)) throw new ApiError(400, 'Missing action receipt.');
  const receipt = `${session.actor_id}:${body.requestId}`;
  if (op === 'create') {
    await limit(db, `delivery-create:${session.actor_id}`, 10, 600_000);
    let rules: Rules;
    try { rules = validRules((body.rules ?? {}) as Partial<Rules>); } catch { throw new ApiError(400, 'Choose valid city rules.'); }
    const id = `${session.actor_id}-${body.requestId}`;
    const host = teacher ? String(body.studentId) : session.actor_id;
    const city = createCity(id, makeDriver(host), rules);
    // Deterministic ID makes create retries safe as well as ordinary moves.
    await db.prepare('INSERT OR IGNORE INTO delivery_rooms(id,classroom_id,state_json,created_at,updated_at) VALUES(?,?,?,?,?)').bind(id,room.id,JSON.stringify(city),now,now).run();
    return Response.json({ id });
  }
  if (typeof body.roomId !== 'string') throw new ApiError(400, 'Choose a city.');
  const updated = await mutate(body.roomId, s => {
    const mine = s.players.find(p => p.id === session.actor_id && p.joined);
    const control = teacher || s.host === session.actor_id;
    if (op === 'join') {
      if (teacher || s.phase !== 'lobby' || s.rules.format === 'solo') throw new ApiError(403, 'This city is not open for joining.');
      if (mine) return s;
      const cap = s.rules.format === 'duel' ? 2 : 10 - s.rules.computers;
      if (s.players.length >= cap) throw new ApiError(409, 'This city is full.');
      return { ...s, players: [...s.players, makeDriver(session.actor_id)] };
    }
    if (!teacher && !mine) throw new ApiError(403, 'Join this city before playing.');
    if (op === 'rules') {
      if (!control || s.phase !== 'lobby') throw new ApiError(403, 'Only the host or teacher can remix before starting.');
      return { ...s, rules: validRules(body.rules as Partial<Rules>) };
    }
    if (op === 'start') {
      if (!control) throw new ApiError(403, 'Only the host or teacher can start.');
      return startCity({ ...s, players: s.players.map(p => ({ ...p, baseline: totals[p.id] ?? 0, practice: 0 })) }, now);
    }
    if (['crate','buy','trade','radio','risk-start','risk-answer','ambush'].includes(op!)) {
      if(teacher || !mine)throw new ApiError(403,'Students choose their own tools and negotiations.');
      if(op!=='risk-answer' && body.round!==s.round)throw new ApiError(409,'A new round started. Review the current city.');
      if(op==='ambush'){
        const save=saves.find(p=>p.id===session.actor_id);
        if(!save)throw new ApiError(409,'Your pet save is unavailable. Reload before fighting.');
        return ambushAction(s,session.actor_id,body.action,save.game);
      }
      if(op==='crate')return openCrate(s,session.actor_id);
      if(op==='buy')return buyTool(s,session.actor_id,String(body.tool));
      if(op==='radio')return radioMessage(s,session.actor_id,String(body.target),body.claim as never);
      if(op==='trade')return tradeAction(s,session.actor_id,String(body.action),{id:body.id as string,destination:body.destination as number,pay:body.pay as number,target:body.target as string,claim:body.claim as never});
      if(op==='risk-start'){const save=saves.find(p=>p.id===session.actor_id);if(!save)throw new ApiError(409,'Your learner save is unavailable. Reload before starting a challenge.');return startRisk(s,session.actor_id,String(body.stake),normalizeLearning(save.learning_json ? JSON.parse(save.learning_json) : save.game.learning),now);}
      return finishRisk(s,session.actor_id,String(body.id),typeof body.answer==='number'?body.answer:NaN,now);
    }
    if(op==='plan-start' || op==='plan-action') {
      if(teacher || !mine)throw new ApiError(403,'Students plan their own deliveries.');
      if(body.round!==s.round)throw new ApiError(409,'A new round started. Choose a current route.');
      if(op==='plan-start') {
        const save=saves.find(p=>p.id===session.actor_id);
        if(!save)throw new ApiError(409,'Your learner settings are unavailable.');
        return startDeliveryPlan(s,session.actor_id,body.order as Order,normalizeLearning(save.learning_json?JSON.parse(save.learning_json):save.game.learning),now);
      }
      if(!['hint','explanation','answer','cancel'].includes(String(body.kind)))throw new ApiError(400,'Choose a planning action.');
      return deliveryPlanAction(s,session.actor_id,body.kind as 'hint'|'explanation'|'answer'|'cancel',typeof body.answer==='number'?body.answer:NaN,now);
    }
    if (op === 'offer') {
      if (teacher || body.round !== s.round || typeof body.target !== 'string') throw new ApiError(400, 'Choose a warehouse offer for the current round.');
      return offerDeal(s, session.actor_id, body.target);
    }
    if (op === 'submit') {
      if (teacher) throw new ApiError(403, 'Students choose their own orders.');
      if (body.round !== s.round) throw new ApiError(409, 'A new round started. Review your next delivery.');
      return submit(s, session.actor_id, body.order as Order);
    }
    if (op === 'finish') {
      if (!control) throw new ApiError(403, 'Only the host or teacher can finish.');
      return { ...s, phase: 'done', deadline: 0, log: [...s.log, 'The host or teacher ended this city. Current scores are final.'].slice(-30) };
    }
    if (op === 'award' || op === 'mission') {
      if (!teacher) throw new ApiError(403, 'Only the teacher can award rewards or set math goals.');
      if (s.phase === 'done') throw new ApiError(409, 'Choose an active city.');
      const reward = body.reward as Perk | 'bridge' | 'festival' | 'supply';
      if (!(Object.hasOwn(PERKS, reward)) && reward !== 'bridge' && reward !== 'festival' && reward !== 'supply') throw new ApiError(400, 'Choose a reward.');
      if (!Array.isArray(body.targets) || !body.targets.length || body.targets.some(id => typeof id !== 'string' || !s.players.some(p => p.id === id && !p.bot && p.joined))) throw new ApiError(400, 'Choose students playing in this city.');
      const targets = [...new Set(body.targets)] as string[];
      if (op === 'award') return award(s, targets, reward, body.amount === undefined ? 1 : Number(body.amount));
      if (!Number.isInteger(body.goal) || Number(body.goal) < 1 || Number(body.goal) > 50) throw new ApiError(400, 'Choose a goal of 1–50 new correct answers.');
      const amount=body.amount===undefined?1:Number(body.amount);if(!Number.isInteger(amount)||amount<1||amount>5)throw new ApiError(400,'Choose a bundle of one to five.');
      return { ...s, mission: { amount, id: String(body.requestId), targets, baseline: Object.fromEntries(targets.map(id => [id, totals[id]])), goal: Number(body.goal), reward, completed: [] }, log: [...s.log, `New math mission: ${body.goal} new correct answers per selected learner. Hints and corrections count.`].slice(-30) };
    }
    throw new ApiError(404, 'Unknown delivery action.');
  }, receipt);
  return Response.json({ id: updated.id, revision: updated.revision });
}
