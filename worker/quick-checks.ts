import { answerCheck, checkDue, clearGap, emptyCheck, publicCheck, startCheck, DAY, CHECK_ACTIVITIES, type Cadence, type CheckState } from '../src/features/quick-check/model';
import { learningOf, type MetadataRow } from './classroom-metadata';
import { ApiError, readBody } from './security';

type Session = { role: 'teacher' | 'student'; actor_id: string };
type Row = { state_json: string; revision: number };
const rng = () => crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
const readState = (row: Row | null): CheckState => row ? JSON.parse(row.state_json) : emptyCheck();

export async function quickChecksAPI(request: Request, db: D1Database, session: Session): Promise<Response> {
  const teacher = session.role === 'teacher', url = new URL(request.url);
  const op = url.pathname.split('/quick-checks')[1].replace(/^\//, '');
  const room = await db.prepare(teacher ? 'SELECT id FROM classrooms WHERE teacher_id=?' : 'SELECT classroom_id AS id FROM students WHERE id=? AND active=1').bind(session.actor_id).first<{ id: string }>();
  if (!room) throw new ApiError(403, 'Classroom access required.');
  const policy = await db.prepare('SELECT cadence FROM quick_check_policies WHERE classroom_id=?').bind(room.id).first<{ cadence: Cadence }>();
  const cadence = policy?.cadence ?? 'weekly', now = Date.now();
  if (teacher && request.method === 'GET' && !op) {
    const students = await db.prepare('SELECT s.id,s.classroom_id,s.alias,s.assignment,s.learning_json,s.settings_version,s.nickname_version,s.nickname_at,s.active,q.state_json AS check_json,q.revision AS check_revision FROM students s LEFT JOIN quick_checks q ON q.student_id=s.id WHERE s.classroom_id=? ORDER BY s.alias').bind(room.id).all<MetadataRow & { active: number; check_json: string | null; check_revision: number | null }>();
    return Response.json({ cadence, students: students.results.map(s => ({ id: s.id, alias: s.alias, active: !!s.active,
      check: publicCheck(s.check_json ? JSON.parse(s.check_json) : emptyCheck(), learningOf(s), cadence, s.check_revision ?? 0, now) })) });
  }
  if (teacher && request.method === 'POST' && op === 'policy') {
    const body = await readBody(request);
    if (!['play', 'weekly', 'daily', 'teacher'].includes(String(body.cadence))) throw new ApiError(400, 'Choose a check schedule.');
    await db.prepare('INSERT INTO quick_check_policies(classroom_id,cadence) VALUES(?,?) ON CONFLICT(classroom_id) DO UPDATE SET cadence=excluded.cadence').bind(room.id, body.cadence).run();
    return Response.json({ ok: true });
  }
  const body = request.method === 'POST' ? await readBody(request) : {};
  const requestedActivity = body.activity ?? url.searchParams.get('activity');
  if (requestedActivity != null && !(CHECK_ACTIVITIES as readonly unknown[]).includes(requestedActivity)) throw new ApiError(400, 'Choose a supported activity.');
  const activity = typeof requestedActivity === 'string' ? requestedActivity : undefined;
  const studentId = teacher ? String(body.studentId ?? '') : session.actor_id;
  const student = await db.prepare('SELECT * FROM students WHERE id=? AND classroom_id=?').bind(studentId, room.id).first<MetadataRow & { active: number }>();
  if (!student || !student.active) throw new ApiError(404, 'Active learner not found in your class.');
  const learning = learningOf(student);
  let row = await db.prepare('SELECT state_json,revision FROM quick_checks WHERE student_id=?').bind(studentId).first<Row>();
  const state = readState(row), revision = row?.revision ?? 0;
  const view = (s: CheckState, rev: number) => Response.json(publicCheck(s, learning, cadence, rev, now, activity));
  if (!teacher && request.method === 'GET' && !op) return view(state, revision);
  if (request.method !== 'POST') throw new ApiError(405, 'Unsupported check request.');
  if (teacher ? !['waive', 'require', 'clear-gap'].includes(op) : !['start', 'answer'].includes(op)) throw new ApiError(403, 'That check action is not available to this account.');
  if (!teacher && op === 'answer' && state.round?.items.some(i => i.id === body.questionId && i.outcome)) return view(state, revision);
  if (body.revision !== revision) throw new ApiError(409, 'New check progress arrived. Refresh before continuing.');
  let next: CheckState;
  try {
    if (op === 'clear-gap') next = clearGap(state, String(body.skillId ?? ''));
    else if (op === 'waive') next = { ...state, waivedUntil: now + (cadence === 'daily' ? DAY : 7 * DAY) };
    else if (op === 'require') next = { ...state, required: true, waivedUntil: 0, round: state.round?.completedAt ? null : state.round,
      history: state.round?.completedAt ? [...state.history, state.round].slice(-59) : state.history };
    else if (op === 'start') {
      if (state.round?.completedAt && !checkDue(state, learning, cadence, now)) return view(state, revision);
      next = startCheck(state, learning, now, rng, () => crypto.randomUUID(), activity);
    } else {
      if (typeof body.answer !== 'string' || typeof body.notLearned !== 'boolean' || typeof body.questionId !== 'string') throw new ApiError(400, 'Send a valid answer.');
      next = answerCheck(state, body.questionId, body.answer, body.notLearned, now);
    }
  } catch (e) { if (e instanceof ApiError) throw e; throw new ApiError(400, e instanceof Error ? e.message : 'Could not save this response.'); }
  if (!row) {
    const inserted = await db.prepare('INSERT OR IGNORE INTO quick_checks(student_id,state_json,updated_at) SELECT id,?,? FROM students WHERE id=? AND active=1 AND settings_version=? RETURNING revision')
      .bind(JSON.stringify(next), now, studentId, student.settings_version).first<{ revision: number }>();
    if (!inserted) throw new ApiError(409, 'Check progress or settings changed. Refresh first.');
    row = { state_json: JSON.stringify(next), revision: inserted.revision };
  } else {
    const updated = await db.prepare('UPDATE quick_checks SET state_json=?,revision=revision+1,updated_at=? WHERE student_id=? AND revision=? AND EXISTS(SELECT 1 FROM students WHERE id=? AND active=1 AND settings_version=?) RETURNING revision')
      .bind(JSON.stringify(next), now, studentId, revision, studentId, student.settings_version).first<{ revision: number }>();
    if (!updated) throw new ApiError(409, 'Check progress or settings changed. Refresh first.');
    row = { state_json: JSON.stringify(next), revision: updated.revision };
  }
  return view(next, row.revision);
}
