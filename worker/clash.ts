import { teacherPrizesAPI } from './teacher-prizes';
import { ApiError, readBody } from './security';
import { grantClassPrize } from '../src/features/clash/rewards';
import { packGame, parseStored, validateGame } from './game-state';

type Round = { id: string; classroom_id: string; started_at: number; ends_at: number; finished_at: number | null };
type Row = { studentId: string; alias: string; score: number };
async function standings(db: D1Database, round: Round) {
  const rows = await db.prepare(`SELECT s.id AS studentId,s.alias,COALESCE(SUM(a.points),0) AS score
    FROM students s LEFT JOIN clash_answers a ON a.student_id=s.id AND a.round_id=?
    WHERE s.classroom_id=? GROUP BY s.id ORDER BY score DESC,s.alias`).bind(round.id, round.classroom_id).all<Row>();
  return rows.results.map(row => ({ ...row, rank: 1 + rows.results.filter(other => other.score > row.score).length }));
}
export async function clashAPI(request: Request, db: D1Database, session: { role: 'student' | 'teacher'; actor_id: string }): Promise<Response> {
  const classroom = session.role === 'teacher'
    ? await db.prepare('SELECT id FROM classrooms WHERE teacher_id=?').bind(session.actor_id).first<{ id: string }>()
    : await db.prepare('SELECT classroom_id AS id FROM students WHERE id=? AND active=1').bind(session.actor_id).first<{ id: string }>();
  if (!classroom) throw new ApiError(403, 'Classroom access required.');
  const operation = new URL(request.url).pathname.split('/').pop();
  if (['gifts','award','gift-claim'].includes(operation??''))return teacherPrizesAPI(request,db,session,classroom.id);
  const now = Date.now();
  if (operation === 'start' && request.method === 'POST') {
    if (session.role !== 'teacher') throw new ApiError(403, 'Only the teacher can start Classroom Clash.');
    const body = await readBody(request);
    if (![5,10,15,20,30].includes(Number(body.minutes))) throw new ApiError(400, 'Choose a 5–30 minute round.');
    const current = await db.prepare('SELECT id FROM clash_rounds WHERE classroom_id=? AND finished_at IS NULL').bind(classroom.id).first();
    if (current) throw new ApiError(409, 'Finish the current round before starting another.');
    try { await db.prepare('INSERT INTO clash_rounds(id,classroom_id,started_at,ends_at) VALUES(?,?,?,?)').bind(crypto.randomUUID(), classroom.id, now, now + Number(body.minutes) * 60000).run(); }
    catch { throw new ApiError(409, 'A round was already started. Refresh the standings.'); }
    return Response.json({ ok: true });
  }
  const round = await db.prepare('SELECT * FROM clash_rounds WHERE classroom_id=? ORDER BY started_at DESC LIMIT 1').bind(classroom.id).first<Round>();
  if (operation === 'clash' && request.method === 'GET') {
    const board = round ? await standings(db, round) : [];
    const unclaimed = session.role === 'student' ? await db.prepare(`SELECT r.id,COALESCE(SUM(a.points),0) AS score FROM clash_rounds r JOIN clash_answers a ON a.round_id=r.id AND a.student_id=? WHERE r.classroom_id=? AND (r.finished_at IS NOT NULL OR r.ends_at<=?) GROUP BY r.id ORDER BY r.started_at DESC`).bind(session.actor_id, classroom.id, now).all<{ id: string; score: number }>() : null;
    let claimed: string[] = [];
    if (session.role === 'student') { const saved = await db.prepare('SELECT state_json FROM students WHERE id=?').bind(session.actor_id).first<{ state_json: string }>(); claimed = saved ? parseStored(saved.state_json).prizes?.classClaims ?? [] : []; }
    return Response.json({ round, serverNow: now, standings: board, myId: session.role === 'student' ? session.actor_id : null, rewards: unclaimed?.results.filter(r => !claimed.includes(r.id)) ?? [] });
  }
  if (operation === 'finish' && request.method === 'POST') {
    if (session.role !== 'teacher') throw new ApiError(403, 'Only the teacher can finish Classroom Clash.');
    const body = await readBody(request);
    if (!round || body.roundId !== round.id) throw new ApiError(409, 'Refresh the current round.');
    await db.prepare('UPDATE clash_rounds SET finished_at=? WHERE id=? AND finished_at IS NULL').bind(now, round.id).run();
    return Response.json({ ok: true });
  }
  if (operation === 'claim' && request.method === 'POST') {
    if (session.role !== 'student') throw new ApiError(403, 'Student access required.');
    const body = await readBody(request);
    const target = await db.prepare('SELECT * FROM clash_rounds WHERE id=? AND classroom_id=?').bind(String(body.roundId), classroom.id).first<Round>();
    if (!target || (!target.finished_at && target.ends_at > now)) throw new ApiError(409, 'Prizes open when the round ends.');
    const me = (await standings(db, target)).find(s => s.studentId === session.actor_id);
    if (!me || me.score <= 0) throw new ApiError(409, 'Solve at least one math question during the round to earn a prize.');
    const saved = await db.prepare('SELECT state_json,revision FROM students WHERE id=?').bind(session.actor_id).first<{ state_json: string; revision: number }>();
    if (!saved) throw new ApiError(404, 'Learner not found.');
    const previous = parseStored(saved.state_json);
    const next = grantClassPrize(previous, target.id, me.score, me.rank);
    if (next === previous) return Response.json({ ok: true });
    validateGame(next);
    const updated = await db.prepare('UPDATE students SET state_json=?,revision=revision+1,request_id=?,updated_at=? WHERE id=? AND revision=? RETURNING revision').bind(packGame(next), `clash-${crypto.randomUUID()}`, now, session.actor_id, saved.revision).first();
    if (!updated) throw new ApiError(409, 'Your pet is still saving. Try claiming again.');
    return Response.json({ ok: true });
  }
  throw new ApiError(405, 'That classroom action is unavailable.');
}
