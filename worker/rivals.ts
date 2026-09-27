import { ApiError, readBody } from './security';
import { createRival, recordMatch, rankName, rivalEdge, rivalTitle, validRival, type MatchResult, type Rival } from '../src/features/rivals/model';
import { GRADE_TOPICS, normalizeLearning } from '../src/services/game/curriculum';

type Session = { role: 'teacher' | 'student'; actor_id: string };
type Row = { rival_id: string; state_json: string; revision: number };
export const RIVALS_PER_CLASS = 3;

/** Weakness skills come from what the class is actually studying, so beating a rival means practicing real work. */
async function classTopics(db: D1Database, classId: string): Promise<string[]> {
  const rows = (await db.prepare('SELECT learning_json FROM students WHERE classroom_id=? AND active=1').bind(classId).all<{ learning_json: string | null }>()).results;
  const learning = rows.map(r => normalizeLearning(r.learning_json ? JSON.parse(r.learning_json) : undefined));
  const counts = new Map<string, number>();
  for (const l of learning) for (const t of l.topic === 'mixed' ? GRADE_TOPICS[l.grade] : [l.topic]) counts.set(t, (counts.get(t) ?? 0) + 1);
  const ranked = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).map(([t]) => t);
  // Each rival needs its own weakness: top up from the class's grade, then the next grade up.
  const grades = learning.length ? Array.from(new Set(learning.map(l => l.grade))) : [4];
  const fill = grades.flatMap(g => [...GRADE_TOPICS[g], ...(GRADE_TOPICS[Math.min(12, g + 1)] ?? [])]);
  return Array.from(new Set([...ranked, ...fill]));
}

export async function classRivals(db: D1Database, classId: string): Promise<{ rival: Rival; revision: number }[]> {
  let rows = (await db.prepare('SELECT rival_id,state_json,revision FROM class_rivals WHERE classroom_id=? ORDER BY rival_id').bind(classId).all<Row>()).results;
  if (rows.length < RIVALS_PER_CLASS) {
    const topics = await classTopics(db, classId), now = Date.now();
    await db.batch(Array.from({ length: RIVALS_PER_CLASS }, (_, i) => db.prepare('INSERT OR IGNORE INTO class_rivals(classroom_id,rival_id,state_json,updated_at) VALUES(?,?,?,?)')
      .bind(classId, `rival-${i}`, JSON.stringify(createRival(i, topics[i % topics.length])), now)));
    rows = (await db.prepare('SELECT rival_id,state_json,revision FROM class_rivals WHERE classroom_id=? ORDER BY rival_id').bind(classId).all<Row>()).results;
  }
  return rows.flatMap(r => { const rival = JSON.parse(r.state_json); return validRival(rival) ? [{ rival, revision: r.revision }] : []; });
}

export async function rivalTaunts(db: D1Database, classId: string) {
  return (await db.prepare('SELECT taunts FROM classroom_rival_settings WHERE classroom_id=?').bind(classId).first<{ taunts: number }>())?.taunts !== 0;
}

/** Called by a match host (the pet hunt) when a match against a rival ends. Compare-and-swap so two rooms finishing together both count. */
export async function recordRivalMatch(db: D1Database, classId: string, rivalId: string, match: MatchResult, now = Date.now()): Promise<Rival> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const row = await db.prepare('SELECT state_json,revision FROM class_rivals WHERE classroom_id=? AND rival_id=?').bind(classId, rivalId).first<{ state_json: string; revision: number }>();
    if (!row) throw new ApiError(404, 'Rival not found.');
    const next = recordMatch(JSON.parse(row.state_json), match, now);
    const done = await db.prepare('UPDATE class_rivals SET state_json=?,revision=revision+1,updated_at=? WHERE classroom_id=? AND rival_id=? AND revision=? RETURNING rival_id')
      .bind(JSON.stringify(next), now, classId, rivalId, row.revision).first();
    if (done) return next;
  }
  throw new ApiError(409, 'The rival was busy. Try again.');
}

// Students see rivals and their own history only: never another student's record or anyone's hiding spots.
const publicRival = (r: Rival, mastered: string[]) => ({
  id: r.id, title: rivalTitle(r), species: r.species, rank: r.rank, rankName: rankName(r), wins: r.wins, losses: r.losses, weakness: r.weakness,
  edge: rivalEdge(r, mastered), scars: r.scars.map(s => ({ kind: s.kind, by: s.by, at: s.at })),
});

export async function rivalsAPI(request: Request, db: D1Database, session: Session) {
  const teacher = session.role === 'teacher';
  const classroom = await db.prepare(teacher ? 'SELECT id FROM classrooms WHERE teacher_id=?' : 'SELECT classroom_id AS id FROM students WHERE id=? AND active=1').bind(session.actor_id).first<{ id: string }>();
  if (!classroom) throw new ApiError(403, 'Your classroom is unavailable.');
  const op = new URL(request.url).pathname.split('/').pop();
  if (request.method === 'GET') {
    const rivals = await classRivals(db, classroom.id);
    const mastered = teacher ? [] : await masteredTopics(db, session.actor_id);
    return Response.json({
      taunts: await rivalTaunts(db, classroom.id),
      rivals: rivals.map(({ rival }) => ({ ...publicRival(rival, mastered),
        ...(teacher ? { students: rival.grudges.map(g => ({ petName: g.petName, encounters: g.encounters, caught: g.caught, escaped: g.escaped })) }
          : { you: (({ encounters, caught, escaped, lastOutcome }) => ({ encounters, caught, escaped, lastOutcome }))(rival.grudges.find(g => g.studentId === session.actor_id) ?? { encounters: 0, caught: 0, escaped: 0, lastOutcome: null }) }) })),
    });
  }
  if (request.method !== 'POST' || !teacher) throw new ApiError(403, 'Only your teacher can change class rivals.');
  const body = await readBody(request);
  if (op === 'settings') {
    if (typeof body.taunts !== 'boolean' || Object.keys(body).length !== 1) throw new ApiError(400, 'Choose taunts on or off.');
    await db.prepare('INSERT INTO classroom_rival_settings VALUES(?,?) ON CONFLICT(classroom_id) DO UPDATE SET taunts=excluded.taunts').bind(classroom.id, body.taunts ? 1 : 0).run();
    return Response.json({ ok: true, taunts: body.taunts });
  }
  if (op === 'reset') {
    const id = String(body.rivalId ?? ''), rivals = await classRivals(db, classroom.id), found = rivals.find(r => r.rival.id === id);
    if (!found) throw new ApiError(404, 'Rival not found.');
    const index = Number(id.split('-')[1]), fresh = createRival(index, found.rival.weakness);
    await db.prepare('UPDATE class_rivals SET state_json=?,revision=revision+1,updated_at=? WHERE classroom_id=? AND rival_id=?').bind(JSON.stringify(fresh), Date.now(), classroom.id, id).run();
    return Response.json({ ok: true });
  }
  throw new ApiError(404, 'Unknown rival action.');
}

export async function masteredTopics(db: D1Database, studentId: string): Promise<string[]> {
  const row = await db.prepare("SELECT json_extract(state_json,'$.state.skillReviews') AS reviews FROM students WHERE id=?").bind(studentId).first<{ reviews: string | null }>();
  const reviews = row?.reviews ? JSON.parse(row.reviews) as { topic: string; independentChecks: number }[] : [];
  return reviews.filter(r => r.independentChecks >= 2).map(r => r.topic);
}
