import { DEFAULT_POLICY, claimFloor, earn, emptyWallet, grant, normalizePolicy, reportStuck, spend, walletView, modeAt, type Attempt, type PlayPolicy, type Wallet } from '../src/features/play-time/model';
import { ApiError, readBody } from './security';

type Session = { role: 'teacher' | 'student'; actor_id: string };
type Row = { state_json: string; revision: number };
const HOURS = 3600000;

async function loadPolicy(db: D1Database, classroomId: string): Promise<PlayPolicy> {
  const row = await db.prepare('SELECT policy_json FROM play_time_policies WHERE classroom_id=?').bind(classroomId).first<{ policy_json: string }>();
  return row ? normalizePolicy(JSON.parse(row.policy_json)) : DEFAULT_POLICY;
}
const savePolicy = (db: D1Database, classroomId: string, policy: PlayPolicy) =>
  db.prepare('INSERT INTO play_time_policies(classroom_id,policy_json) VALUES(?,?) ON CONFLICT(classroom_id) DO UPDATE SET policy_json=excluded.policy_json').bind(classroomId, JSON.stringify(policy)).run();

/** Read-modify-write with a revision guard; concurrent tabs retry instead of surfacing a conflict to the student. */
async function updateWallet(db: D1Database, studentId: string, change: (w: Wallet) => Wallet): Promise<{ wallet: Wallet; revision: number }> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const row = await db.prepare('SELECT state_json,revision FROM play_time WHERE student_id=?').bind(studentId).first<Row>();
    const next = change(row ? { ...emptyWallet(), ...JSON.parse(row.state_json) } : emptyWallet()), now = Date.now();
    const saved = row
      ? await db.prepare('UPDATE play_time SET state_json=?,revision=revision+1,updated_at=? WHERE student_id=? AND revision=? RETURNING revision').bind(JSON.stringify(next), now, studentId, row.revision).first<{ revision: number }>()
      : await db.prepare('INSERT OR IGNORE INTO play_time(student_id,state_json,updated_at) VALUES(?,?,?) RETURNING revision').bind(studentId, JSON.stringify(next), now).first<{ revision: number }>();
    if (saved) return { wallet: next, revision: saved.revision };
  }
  throw new ApiError(409, 'Your game time is busy saving. Try again in a moment.');
}

export async function playTimeAPI(request: Request, db: D1Database, session: Session): Promise<Response> {
  const teacher = session.role === 'teacher', op = new URL(request.url).pathname.split('/play-time')[1].replace(/^\//, '');
  const room = await db.prepare(teacher ? 'SELECT id FROM classrooms WHERE teacher_id=?' : 'SELECT classroom_id AS id FROM students WHERE id=? AND active=1').bind(session.actor_id).first<{ id: string }>();
  if (!room) throw new ApiError(403, 'Classroom access required.');
  const policy = await loadPolicy(db, room.id), now = Date.now();
  if (!teacher) {
    if (request.method === 'GET' && !op) {
      const row = await db.prepare('SELECT state_json,revision FROM play_time WHERE student_id=?').bind(session.actor_id).first<Row>();
      return Response.json(walletView(row ? { ...emptyWallet(), ...JSON.parse(row.state_json) } : emptyWallet(), policy, now, row?.revision ?? 0));
    }
    if (request.method !== 'POST' || op !== 'sync') throw new ApiError(405, 'Unsupported game-time request.');
    const body = await readBody(request);
    const attempts = Array.isArray(body.attempts) ? (body.attempts as Attempt[]).slice(0, 100) : [];
    const playedMs = typeof body.playedMs === 'number' ? body.playedMs : 0;
    const stuck = Array.isArray(body.stuck) ? body.stuck as { skillId: string; topic: string }[] : [];
    const { wallet, revision } = await updateWallet(db, session.actor_id, w => {
      let next = spend(earn(w, policy, attempts, now), policy, playedMs, now);
      if (body.floor === true) next = claimFloor(next, policy, now);
      return stuck.length ? reportStuck(next, stuck, now) : next;
    });
    return Response.json(walletView(wallet, policy, now, revision));
  }
  if (request.method === 'GET' && !op) {
    const rows = await db.prepare('SELECT s.id,s.alias,s.active,p.state_json,p.revision FROM students s LEFT JOIN play_time p ON p.student_id=s.id WHERE s.classroom_id=? ORDER BY s.alias').bind(room.id)
      .all<{ id: string; alias: string; active: number; state_json: string | null; revision: number | null }>();
    return Response.json({ policy, mode: modeAt(policy, now), serverNow: now, students: rows.results.map(s => {
      const wallet: Wallet = s.state_json ? { ...emptyWallet(), ...JSON.parse(s.state_json) } : emptyWallet();
      return { id: s.id, alias: s.alias, active: !!s.active, view: walletView(wallet, policy, now, s.revision ?? 0), mathOnlyUntil: wallet.mathOnlyUntil, stuck: wallet.stuck ?? [] };
    }) });
  }
  if (request.method !== 'POST') throw new ApiError(405, 'Unsupported game-time request.');
  const body = await readBody(request);
  if (op === 'policy') {
    const allowed = ['enabled', 'questionsPerRound', 'minutesPerRound', 'classCapMinutes', 'homeCapMinutes', 'schoolDays', 'schoolStart', 'schoolEnd', 'timeZone', 'floorMinutes'];
    if (Object.keys(body).some(k => !allowed.includes(k))) throw new ApiError(400, 'Unknown game-time setting.');
    await savePolicy(db, room.id, normalizePolicy({ ...policy, ...body }));
  } else if (op === 'class') {
    // Manual class on/off lasts until the end of the school day window (12h) so a forgotten toggle expires.
    if (!['auto', 'on', 'off'].includes(String(body.state))) throw new ApiError(400, 'Choose class on, off, or automatic.');
    await savePolicy(db, room.id, { ...policy, classOverride: body.state as PlayPolicy['classOverride'], overrideUntil: body.state === 'auto' ? 0 : now + 12 * HOURS });
  } else if (op === 'math-only') {
    const until = body.on === true ? now + 3 * HOURS : 0;
    if (body.studentId === undefined) await savePolicy(db, room.id, { ...policy, mathOnlyUntil: until });
    else {
      const student = await db.prepare('SELECT id FROM students WHERE id=? AND classroom_id=?').bind(String(body.studentId), room.id).first<{ id: string }>();
      if (!student) throw new ApiError(404, 'Learner not found in your class.');
      await updateWallet(db, student.id, w => ({ ...w, mathOnlyUntil: until }));
    }
  } else if (op === 'grant' || op === 'dismiss-stuck') {
    const student = await db.prepare('SELECT id FROM students WHERE id=? AND classroom_id=? AND active=1').bind(String(body.studentId ?? ''), room.id).first<{ id: string }>();
    if (!student) throw new ApiError(404, 'Active learner not found in your class.');
    try { await updateWallet(db, student.id, w => op === 'grant' ? grant(w, policy, Number(body.minutes), now) : { ...w, stuck: [] }); }
    catch (e) { if (e instanceof ApiError) throw e; throw new ApiError(400, e instanceof Error ? e.message : 'Could not grant time.'); }
  } else throw new ApiError(404, 'Unknown game-time action.');
  return Response.json({ ok: true });
}
