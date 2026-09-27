import { petHuntAPI } from './pet-hunt';
export { PetHuntRoom } from './pet-hunt';
import {petDuelsAPI} from './pet-duels';
import { rivalsAPI } from './rivals';
import { teacherBattleAPI, teacherBattlePublicAPI } from './teacher-battle';
import { skillChallengesAPI } from './skill-challenges';
import { quickChecksAPI } from './quick-checks';
import { playTimeAPI } from './play-time';
import { portalAPI, portalPublicAPI } from './portal';
import { insightsAPI, heartbeat } from './insights';
import { STYLE_KEYS } from '../src/config/discoveryConfig';
import type { AdventureStyle } from '../src/types/discovery';
import { deliveryAPI } from './delivery';
import { approvedPetNames, classPetNames, decidePetName, petNameInbox, requestPetName, setTypedPetNames } from './pet-names';
import { metadata, learningOf, settingsPatch, setSettings, approveNickname, requestNickname, type MetadataRow } from './classroom-metadata';
import { partiesAPI } from './parties';
import { clashAPI } from './clash';
import { importRoster } from './roster-import';
import { discoveryDays, matchCompanion } from '../src/services/game/eggDiscovery';
import { DISCOVERY_DAYS } from '../src/config/discoveryConfig';
import { ApiError, checkOrigin, cleanCode, digest, limit, object, randomCode, readBody, readCookie, sessionCookie } from './security';
import { freshGame, parseStored, privateGame, studentCheckpoint, validateGame, packGame } from './game-state';
import { CURRENT_SAVE_VERSION } from '../src/services/persistence/saveMigrations';
import { applyLearningSettings } from '../src/services/game/applyLearningSettings';
import { normalizeLearning } from '../src/services/game/curriculum';
import { reduceDiscovery } from '../src/engine/systems/DiscoverySystem';
import { COMPANIONS, isCompanion } from '../src/config/companionConfig';
import type { EngineState } from '../src/types/engine';

type Student = MetadataRow & { id: string; classroom_id: string; alias: string; credential_hash: string; active: number; revision: number; state_json: string; assignment: string; request_id: string; updated_at: number; created_at: number };
type Session = { role: 'teacher' | 'student'; actor_id: string };
type Classroom = { id: string; code: string; teacher_id: string };
const assignments = ['discovery', 'bridge', 'practice', 'care', 'free'] as const;
const json = (value: unknown, status = 200, headers?: HeadersInit) => Response.json(value, { status, headers });
const revision = (value: unknown) => { if (!Number.isSafeInteger(value) || (value as number) < 1) throw new ApiError(400, 'Missing save revision.'); return value as number; };
const requestID = (value: unknown) => { if (typeof value !== 'string' || !/^[a-zA-Z0-9-]{20,80}$/.test(value)) throw new ApiError(400, 'Missing save request ID.'); return value; };

async function authenticate(request: Request, db: D1Database): Promise<Session> {
  const token = readCookie(request);
  if (!/^[A-Z2-9]{48}$/.test(token)) throw new ApiError(401, 'Sign in with your card.', 'sign_in');
  const session = await db.prepare('SELECT role,actor_id FROM sessions WHERE token_hash=? AND expires_at>?').bind(await digest(token), Date.now()).first<Session>();
  if (!session) throw new ApiError(401, 'Your session ended. Sign in again; your pet is still saved.', 'sign_in');
  if (session.role === 'student') {
    const active = await db.prepare('SELECT active FROM students WHERE id=?').bind(session.actor_id).first<{ active: number }>();
    if (!active?.active) throw new ApiError(403, 'Your teacher has paused this login. Your pet has not been deleted.', 'paused');
  }
  return session;
}
async function classroom(db: D1Database, session: Session): Promise<Classroom> {
  if (session.role !== 'teacher') throw new ApiError(403, 'Teacher access required.');
  const room = await db.prepare('SELECT id,code,teacher_id FROM classrooms WHERE teacher_id=?').bind(session.actor_id).first<Classroom>();
  if (!room) throw new ApiError(404, 'No pilot classroom is assigned to this teacher.');
  return room;
}
async function student(db: D1Database, id: string, classID?: string): Promise<Student> {
  const row = await db.prepare(classID ? 'SELECT * FROM students WHERE id=? AND classroom_id=?' : 'SELECT * FROM students WHERE id=?')
    .bind(...(classID ? [id, classID] : [id])).first<Student>();
  if (!row) throw new ApiError(404, 'Learner not found.');
  return row;
}
function snapshot(row: Student, names: Record<string, string>) { return { studentId: row.id, alias: row.alias, revision: row.revision, assignment: row.assignment, state: applyLearningSettings(privateGame(parseStored(row.state_json), row.id, row.alias, names), learningOf(row)), updatedAt: row.updated_at, lastRequestId: row.request_id }; }
async function audit(db: D1Database, room: string, who: string | null, action: string) {
  await db.prepare('INSERT INTO audit_events(classroom_id,student_id,action,created_at) VALUES(?,?,?,?)').bind(room, who, action, Date.now()).run();
}
async function commit(db: D1Database, row: Student, state: EngineState, expected: number, id: string, assignment = row.assignment, studentWrite = false, names: Record<string, string> = {}) {
  validateGame(state);
  // RETURNING identifies the CAS row; meta.changes also counts recovery-trigger writes.
  const result = await db.prepare('UPDATE students SET state_json=?,revision=revision+1,request_id=?,updated_at=?,assignment=CASE WHEN ?=1 THEN assignment ELSE ? END WHERE id=? AND revision=? AND (?=0 OR (active=1 AND credential_hash=?)) RETURNING *')
    .bind(packGame(state), id, Date.now(), studentWrite ? 1 : 0, assignment, row.id, expected, studentWrite ? 1 : 0, row.credential_hash).first<Student>();
  if (!result) throw new ApiError(409, 'A newer save or teacher update exists. Your older copy has not overwritten it.', 'conflict');
  return snapshot(result, names);
}

async function login(request: Request, db: D1Database) {
  const body = await readBody(request);
  const code = cleanCode(body.code), roomCode = cleanCode(body.classCode);
  const teacher = body.role === 'teacher';
  if (!teacher && body.role !== 'student') throw new ApiError(400, 'Choose student or teacher.');
  const network = request.headers.get('CF-Connecting-IP') ?? 'local';
  const bucket = Math.floor(Date.now() / 600_000);
  await limit(db, `ip:${await digest(`${bucket}:${network}`)}`, 120);
  await limit(db, `code:${await digest(`${bucket}:${code}`)}`, 15);
  // Only hashes are stored. Codes have high entropy; no short shared PINs.
  const hash = await digest(`${teacher ? 'teacher' : 'student'}:${code}`);
  const actor = teacher
    ? await db.prepare('SELECT id FROM teachers WHERE credential_hash=?').bind(hash).first<{ id: string }>()
    : await db.prepare('SELECT s.id FROM students s JOIN classrooms c ON c.id=s.classroom_id WHERE c.code=? AND s.credential_hash=? AND s.active=1').bind(roomCode, hash).first<{ id: string }>();
  if (!actor) throw new ApiError(401, 'Those login details did not match. Check your card or ask your teacher.', 'sign_in');
  const token = randomCode(48), expires = Date.now() + 12 * 60 * 60 * 1000;
  await db.prepare('INSERT INTO sessions(token_hash,role,actor_id,expires_at) VALUES(?,?,?,?)').bind(await digest(token), teacher ? 'teacher' : 'student', actor.id, expires).run();
  const headers = new Headers({ 'Set-Cookie': sessionCookie(request, token) });
  if (request.headers.has('X-Pilot-Tab')) {
    // Retire the pre-tab shared login so omitting the selector cannot expose it.
    const legacy = new Request(request.url, { headers: { Cookie: request.headers.get('Cookie') ?? '' } });
    const oldToken = readCookie(legacy);
    if (/^[A-Z2-9]{48}$/.test(oldToken)) await db.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await digest(oldToken)).run();
    headers.append('Set-Cookie', sessionCookie(legacy, '', 0));
  }
  return json({ role: teacher ? 'teacher' : 'student' }, 200, headers);
}

async function api(request: Request, env: Env): Promise<Response> {
  // Browser WebSockets carry the non-secret tab selector in the URL.
  if (new URL(request.url).pathname.startsWith('/api/pilot/pet-hunt/') && request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
    const headers = new Headers(request.headers);
    const tab = new URL(request.url).searchParams.get('tab');
    if (tab) headers.set('X-Pilot-Tab', tab);
    request = new Request(request, { headers });
  }
  checkOrigin(request);
  const url = new URL(request.url), path = url.pathname, db = env.DB;
  if (path === '/api/pilot/health' && request.method === 'GET') { await db.prepare('SELECT id FROM classrooms LIMIT 1').first(); return json({ ok: true, pilot: true }); }
  if (path === '/api/pilot/login' && request.method === 'POST') return login(request, db);
  if (path === '/api/pilot/teacher-battle-access') return teacherBattlePublicAPI(request, db);
  if (path === '/api/pilot/portal-access') return portalPublicAPI(request, db);
  const session = await authenticate(request, db);
  if (request.method !== 'GET') await limit(db, `actor:${session.actor_id}`, 200, 60_000);
  if (path === '/api/pilot/session' && request.method === 'GET') return json({ role: session.role });
  if (path === '/api/pilot/logout' && request.method === 'POST') {
    await db.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await digest(readCookie(request))).run();
    return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie(request, '', 0) });
  }
  if (path === '/api/pilot/pet-hunt' || path.startsWith('/api/pilot/pet-hunt/')) return petHuntAPI(request,env,session);
  if (path === '/api/pilot/pet-duels' || path.startsWith('/api/pilot/pet-duels/')) return petDuelsAPI(request,db,session);
  if (path === '/api/pilot/rivals' || path.startsWith('/api/pilot/rivals/')) return rivalsAPI(request, db, session);
  if (path === '/api/pilot/skill-challenges' || path.startsWith('/api/pilot/skill-challenges/')) return skillChallengesAPI(request, db, session);
  if (path === '/api/pilot/quick-checks' || path.startsWith('/api/pilot/quick-checks/')) return quickChecksAPI(request, db, session);
  if (path === '/api/pilot/play-time' || path.startsWith('/api/pilot/play-time/')) return playTimeAPI(request, db, session);
  if (path === '/api/pilot/teacher-battle' || path.startsWith('/api/pilot/teacher-battle/')) return teacherBattleAPI(request, db, session);
  if (path === '/api/pilot/portal' || path.startsWith('/api/pilot/portal/')) return portalAPI(request, db, session);
  if (path === '/api/pilot/delivery' || path.startsWith('/api/pilot/delivery/')) return deliveryAPI(request, db, session);
  if (path === '/api/pilot/parties' || path.startsWith('/api/pilot/parties/')) return partiesAPI(request, db, session);
  if (path === '/api/pilot/clash' || path.startsWith('/api/pilot/clash/')) return clashAPI(request, db, session);
  if (path === '/api/pilot/presence' && request.method === 'POST') {
    if(session.role!=='student') throw new ApiError(403,'Student access required.');
    return json(await heartbeat(db,session.actor_id,await readBody(request)));
  }
  if (path === '/api/pilot/metadata' && request.method === 'GET') {
    if (session.role !== 'student') throw new ApiError(403, 'Student access required.');
    return json(await metadata(db, session.actor_id));
  }
  if (path === '/api/pilot/pet-name' && request.method === 'POST') {
    if (session.role !== 'student') throw new ApiError(403, 'Student access required.');
    return json(await requestPetName(db, session.actor_id, await readBody(request)));
  }
  if (path === '/api/pilot/nickname' && request.method === 'POST') {
    if (session.role !== 'student') throw new ApiError(403, 'Student access required.');
    return json(await requestNickname(db, session.actor_id, await readBody(request)));
  }
  if (path === '/api/pilot/save') {
    if (session.role !== 'student') throw new ApiError(403, 'Student access required.');
    const row = await student(db, session.actor_id);
    if (request.method === 'GET') return json(snapshot(row, await approvedPetNames(db, row.id)));
    if (request.method === 'PUT') {
      const body = await readBody(request), expected = revision(body.revision), id = requestID(body.requestId);
      const names = await approvedPetNames(db, row.id);
      const replay = await db.prepare('SELECT revision,state_json FROM save_versions WHERE student_id=? AND request_id=?').bind(row.id, id).first<{ revision: number; state_json: string }>();
      if (replay) {
        const submitted = validateGame(body.state);
        if (submitted.player.id !== row.id || submitted.learnerProfileId !== row.id || replay.revision !== expected + 1
          || packGame(privateGame(submitted, row.id, parseStored(replay.state_json).player.displayName, names)) !== packGame(parseStored(replay.state_json))) throw new ApiError(409, 'That save request was already used for different progress.', 'conflict');
        return json({ revision: replay.revision, requestId: id, updatedAt: row.updated_at });
      }
      if (row.revision !== expected) throw new ApiError(409, 'A newer save or teacher update exists. Reload to continue safely.', 'conflict');
      const submitted = validateGame(body.state);
      const known = await db.prepare('SELECT 1 FROM learning_versions WHERE student_id=? AND learning_json=?').bind(row.id, JSON.stringify(normalizeLearning(submitted.learning))).first();
      const previous = parseStored(row.state_json);
      const state = studentCheckpoint(body.state, known ? { ...previous, learning: submitted.learning } : previous, row.id, row.alias, names);
      const result = await commit(db, row, state, expected, id, row.assignment, true, names);
      return json({ revision: result.revision, requestId: id, updatedAt: result.updatedAt, metadata: await metadata(db, row.id) });
    }
  }
  if (!path.startsWith('/api/pilot/teacher/')) throw new ApiError(404, 'Not found.');
  const room = await classroom(db, session);
  if (path === '/api/pilot/teacher/insights' || path.startsWith('/api/pilot/teacher/insights/')) return insightsAPI(request,db,room.id,session.actor_id);
  if (path === '/api/pilot/teacher/settings-batch' && request.method === 'POST') {
    const body = await readBody(request);
    if (Object.keys(body).some(k => !['rows','requestId'].includes(k)) || !Array.isArray(body.rows) || body.rows.length < 1 || body.rows.length > 35) throw new ApiError(400,'Choose 1–35 learners.');
    const rows = await Promise.all(body.rows.map(async value => {
      const item=object(value);
      if(Object.keys(item).some(k=>!['id','version','learning','assignment'].includes(k))) throw new ApiError(400,'Unknown setting field.');
      const row=await student(db,String(item.id),room.id);
      const assignment=item.assignment===undefined?row.assignment:String(item.assignment);
      if(!assignments.includes(assignment as typeof assignments[number])) throw new ApiError(400,'Choose a valid activity.');
      return {id:row.id,version:revision(item.version),learning:settingsPatch(learningOf(row),item.learning),assignment};
    }));
    return json(await setSettings(db,room.id,rows,requestID(body.requestId)));
  }
  if (path === '/api/pilot/teacher/pet-names' && request.method === 'GET') return json(await petNameInbox(db, room.id));
  if (path === '/api/pilot/teacher/pet-names/settings' && request.method === 'POST') return json(await setTypedPetNames(db, room.id, await readBody(request)));
  if (path === '/api/pilot/teacher/nicknames' && request.method === 'GET') {
    return json({requests:(await db.prepare("SELECT n.*,s.alias,s.nickname_version FROM nickname_requests n JOIN students s ON s.id=n.student_id WHERE s.classroom_id=? AND n.status='pending' ORDER BY n.updated_at").bind(room.id).all()).results,
      changes:(await db.prepare('SELECT * FROM nickname_changes WHERE classroom_id=? ORDER BY id DESC LIMIT 100').bind(room.id).all()).results});
  }
  if (path === '/api/pilot/teacher/roster-import' && request.method === 'POST') {
    return json(await importRoster(db, room, await readBody(request)));
  }
  if (path === '/api/pilot/teacher/classroom' && request.method === 'GET') {
    const rows = await db.prepare('SELECT * FROM students WHERE classroom_id=? ORDER BY alias').bind(room.id).all<Student>();
    return json({ classCode: room.code, maxStudents: 35, students: rows.results.map(row => {
      let state: EngineState | null = null;
      try { state = parseStored(row.state_json); } catch { /* Teacher retains recovery access to damaged saves. */ }
      return { id: row.id, alias: row.alias, active: !!row.active, revision: row.revision, updatedAt: row.updated_at, assignment: row.assignment,
        learning: learningOf(row), settingsVersion: row.settings_version, nicknameVersion: row.nickname_version, nicknameAt: row.nickname_at, pet: state?.pet ? { name: state.pet.name, species: state.pet.speciesId, stage: state.pet.stage } : null,
        discovery: state?.eggDiscovery ? { days: discoveryDays(state.eggDiscovery), status: state.eggDiscovery.status, quizAnswered: state.eggDiscovery.answers.filter(a => a >= 0 && a < 4).length, creditedToday: state.eggDiscovery.stamps.some(s => s.day === new Date().toISOString().slice(0,10)) } : null,
        correct: state?.player.lifetimeMathCorrect ?? 0, evidence: state?.learningEvidence ?? [], needsRecovery: !state };
    }) });
  }
  if (path === '/api/pilot/teacher/students' && request.method === 'POST') {
    const body = await readBody(request);
    if (!Number.isInteger(body.count) || Number(body.count) < 1 || Number(body.count) > 35) throw new ApiError(400, 'Create between 1 and 35 login cards.');
    const count = await db.prepare('SELECT COUNT(*) AS n FROM students WHERE classroom_id=?').bind(room.id).first<{ n: number }>();
    if ((count?.n ?? 0) + Number(body.count) > 35) throw new ApiError(400, 'This pilot supports 35 learners, including paused logins.');
    const cards = await Promise.all(Array.from({ length: Number(body.count) }, async (_, i) => {
      const id = crypto.randomUUID(), alias = `Learner ${String((count?.n ?? 0) + i + 1).padStart(2, '0')}`, code = randomCode(16);
      return { id, alias, code, hash: await digest(`student:${code}`) };
    }));
    await db.batch(cards.map(card => db.prepare('INSERT INTO students(id,classroom_id,alias,credential_hash,state_json,request_id,updated_at,created_at) VALUES(?,?,?,?,?,?,?,?)')
      .bind(card.id, room.id, card.alias, card.hash, packGame(freshGame(card.id, card.alias)), crypto.randomUUID(), Date.now(), Date.now())));
    await audit(db, room.id, null, 'create-login-cards');
    return json({ classCode: room.code, cards: cards.map(({ id, alias, code }) => ({ id, alias, code })) }, 201);
  }
  if (path === '/api/pilot/teacher/export' && request.method === 'GET') {
    const rows = await db.prepare('SELECT * FROM students WHERE classroom_id=?').bind(room.id).all<Student>(), petNames = await classPetNames(db, room.id);
    return json({ format: 'auralith-class-backup-v1', exportedAt: Date.now(), students: rows.results.map(row => ({ studentId: row.id, alias: row.alias, revision: row.revision, saveVersion: CURRENT_SAVE_VERSION, state: applyLearningSettings(privateGame(parseStored(row.state_json), row.id, row.alias, petNames.get(row.id)), learningOf(row)), settingsVersion: row.settings_version, nicknameVersion: row.nickname_version, assignment: row.assignment, updatedAt: row.updated_at })) });
  }
  const match = path.match(/^\/api\/pilot\/teacher\/students\/([a-f0-9-]{36})\/(settings|grade-recovery|nickname|pet-name|companion|activity|code|pause|egg|history|restore)$/);
  if (!match) throw new ApiError(404, 'Not found.');
  const row = await student(db, match[1], room.id), operation = match[2];
  if (operation === 'history' && request.method === 'GET') {
    const recent = await db.prepare('SELECT revision,created_at FROM save_versions WHERE student_id=? ORDER BY revision DESC').bind(row.id).all();
    const daily = await db.prepare('SELECT revision,created_at,day FROM daily_recovery WHERE student_id=? ORDER BY day DESC').bind(row.id).all();
    return json({ revision: row.revision, recent: recent.results, daily: daily.results });
  }
  if (request.method !== 'POST') throw new ApiError(405, 'Use POST.');
  const body = await readBody(request);
  if (operation === 'nickname') return json(await approveNickname(db,room.id,row.id,body));
  if (operation === 'pet-name') return json(await decidePetName(db,room.id,row.id,body));
  if (operation === 'grade-recovery') {
    if (Object.keys(body).some(k => !['grade', 'topic', 'settingsVersion'].includes(k))) throw new ApiError(400, 'Only grade recovery fields are accepted.');
    const expected = revision(body.settingsVersion);
    if (expected !== row.settings_version) throw new ApiError(409, 'Settings changed since the recovery preview. Preview again before applying.');
    const learning = settingsPatch(learningOf(row), { grade: body.grade, topic: body.topic ?? 'mixed' });
    // Independent of the normal batch path. The existing trigger retains learning history.
    const changed = await db.prepare('UPDATE students SET learning_json=?,settings_version=settings_version+1 WHERE id=? AND classroom_id=? AND settings_version=? RETURNING settings_version')
      .bind(JSON.stringify(learning), row.id, room.id, expected).first<{ settings_version: number }>();
    if (!changed) throw new ApiError(409, 'Settings changed since the recovery preview. Preview again before applying.');
    return json({ ok: true, settingsVersion: changed.settings_version, learning });
  }
  if (operation === 'settings') {
    if(Object.keys(body).some(k=>!['learning','assignment','settingsVersion','requestId','revision','companion'].includes(k))) throw new ApiError(400,'Only learning settings are accepted.');
    const assignment=String(body.assignment ?? row.assignment);
    if(!assignments.includes(assignment as typeof assignments[number])) throw new ApiError(400,'Choose a valid activity.');
    return json(await setSettings(db,room.id,[{id:row.id,version:revision(body.settingsVersion ?? row.settings_version),learning:settingsPatch(learningOf(row),body.learning),assignment}],typeof body.requestId==='string'?requestID(body.requestId):crypto.randomUUID()));
  }
  if (operation === 'code') {
    const code = randomCode(16);
    await db.batch([db.prepare('UPDATE students SET credential_hash=? WHERE id=?').bind(await digest(`student:${code}`), row.id), db.prepare('DELETE FROM sessions WHERE actor_id=?').bind(row.id)]);
    await audit(db, room.id, row.id, 'replace-login-card');
    return json({ code, alias: row.alias, classCode: room.code });
  }
  if (operation === 'pause') {
    if (typeof body.active !== 'boolean') throw new ApiError(400, 'Choose active or paused.');
    await db.batch([db.prepare('UPDATE students SET active=? WHERE id=?').bind(body.active ? 1 : 0, row.id), db.prepare('DELETE FROM sessions WHERE actor_id=?').bind(row.id)]);
    await audit(db, room.id, row.id, body.active ? 'resume-login' : 'pause-login');
    return json({ ok: true });
  }
  const expected = revision(body.revision);
  if (row.revision !== expected) throw new ApiError(409, 'The learner has newer progress. Refresh the roster and try again.', 'conflict');
  let state = operation === 'restore' ? freshGame(row.id, row.alias) : parseStored(row.state_json), assignment = row.assignment;
  if (operation === 'activity') {
    if (body.confirmed !== true || !STYLE_KEYS.includes(body.style as AdventureStyle)) throw new ApiError(400, 'Confirm a completed classroom activity and choose its theme.');
    const credited = reduceDiscovery(state, { type: 'CREDIT_DISCOVERY_CLASSROOM_DAY', style: body.style as AdventureStyle });
    if (!credited || credited === state) throw new ApiError(409, 'Today is already credited, the journey is complete, or a game is in progress.');
    state = credited;
  } else if (operation === 'companion') {
    if (body.companion !== undefined) {
      if (body.companion !== null && (typeof body.companion !== 'string' || !isCompanion(body.companion))) throw new ApiError(400, 'Choose a companion.');
      const chosen = reduceDiscovery(state, { type: 'SET_TEACHER_EGG_CHOICE', speciesId: body.companion as string | null });
      if (!chosen || chosen === state) throw new ApiError(409, 'That companion choice is unavailable: an egg already exists, the companion is already owned, or a game is in progress. Keep the existing choice to save other settings.');
      state = chosen;
    }
  } else if (operation === 'egg') {
    const discovery = state.eggDiscovery;
    if (!discovery || discoveryDays(discovery) < DISCOVERY_DAYS || discovery.stamps.some(stamp => stamp.day > new Date().toISOString().slice(0, 10))) {
      throw new ApiError(409, 'Quick-start hatching is disabled. Complete five separate activity days with the mystery egg first.');
    }
    if (body.companion !== matchCompanion(discovery)) throw new ApiError(409, 'Use the companion matched by this egg’s saved activities.');
    if (state.pet || state.egg) throw new ApiError(409, 'This learner already has a companion or an egg. Nothing was replaced.');
    if (state.battle.active || state.run.active || state.momentum.active) throw new ApiError(409, 'Ask the learner to finish their current game before issuing an egg.');
    if (typeof body.companion !== 'string' || !isCompanion(body.companion)) throw new ApiError(400, 'Choose a starter companion.');
    state = { ...state, eggDiscovery: { ...discovery, status: 'claimed', companion: body.companion as typeof discovery.companion, mission: null }, screen: 'incubation', egg: { id: crypto.randomUUID(), type: COMPANIONS[body.companion].egg, state: 'incubating', progress: 0, createdAt: new Date().toISOString() } };
    assignment = 'free';
  } else if (operation === 'restore') {
    if (body.confirm !== 'RESTORE') throw new ApiError(400, 'Confirm the recovery first.');
    let restored: EngineState;
    if (body.backup !== undefined) {
      const backup = object(body.backup);
      if (backup.studentId !== row.id) throw new ApiError(403, 'This backup belongs to another learner.');
      restored = parseStored(JSON.stringify({ version: backup.saveVersion ?? 16, state: backup.state }));
    } else {
      const target = revision(body.targetRevision);
      const record = await db.prepare('SELECT state_json FROM save_versions WHERE student_id=? AND revision=? UNION ALL SELECT state_json FROM daily_recovery WHERE student_id=? AND revision=? LIMIT 1')
        .bind(row.id, target, row.id, target).first<{ state_json: string }>();
      if (!record) throw new ApiError(404, 'That recovery copy was not found.');
      restored = parseStored(record.state_json);
    }
    state = privateGame(restored, row.id, row.alias, await approvedPetNames(db, row.id));
  }
  const result = await commit(db, row, state, expected, crypto.randomUUID(), assignment, false, await approvedPetNames(db, row.id));
  await audit(db, room.id, row.id, operation);
  return json(result);
}

export default {
  async fetch(request, env): Promise<Response> {
    const path = new URL(request.url).pathname;
    let response: Response;
    try { response = path.startsWith('/api/') ? await api(request, env) : await env.ASSETS.fetch(request); }
    catch (error) {
      if (error instanceof ApiError) response = json({ error: error.message, code: error.code }, error.status);
      else {
        // Deliberately no URL, payload, cookie, login code, or exception contents in logs.
        const requestId = crypto.randomUUID();
        console.error(JSON.stringify({ event: 'pilot-request-failed', requestId }));
        response = json({ error: 'The server could not confirm that request. Retry shortly; do not start a replacement pet.', requestId }, 503);
      }
    }
    // Preserve the upgraded socket; rebuilding an ordinary Response drops it.
    if (response.status === 101) return response;
    const headers = new Headers(response.headers);
    headers.set('X-Content-Type-Options', 'nosniff'); headers.set('Referrer-Policy', 'no-referrer'); headers.set('X-Frame-Options', 'DENY');
    headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; media-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
    if (new URL(request.url).protocol === 'https:') headers.set('Strict-Transport-Security', 'max-age=31536000');
    if (path.startsWith('/api/') || response.headers.get('content-type')?.includes('text/html')) headers.set('Cache-Control', 'no-store');
    return new Response(response.body, { status: response.status, headers });
  },
  async scheduled(_controller, env) {
    await env.DB.batch([
      env.DB.prepare('DELETE FROM skill_challenges WHERE closed_at<?').bind(Date.now()-180*86400000),
      env.DB.prepare('DELETE FROM teacher_battle_rooms WHERE expires_at<?').bind(Date.now() - 86400000),
      env.DB.prepare('DELETE FROM portal_rooms WHERE expires_at<?').bind(Date.now() - 86400000),
      env.DB.prepare('DELETE FROM arcade_parties WHERE expires_at<?').bind(Date.now() - 86400000),
      env.DB.prepare('DELETE FROM learning_history WHERE event_at<?').bind(Date.now()-180*86400000),
      env.DB.prepare('DELETE FROM learning_observations WHERE received_at<?').bind(Date.now()-180*86400000),
      env.DB.prepare('DELETE FROM insight_alerts WHERE updated_at<?').bind(Date.now()-180*86400000),
      env.DB.prepare('DELETE FROM insight_decisions WHERE created_at<?').bind(Date.now()-365*86400000),
      env.DB.prepare('DELETE FROM insight_interventions WHERE created_at<?').bind(Date.now()-365*86400000),
      env.DB.prepare('DELETE FROM insight_settings_history WHERE changed_at<? AND version < (SELECT settings_version FROM students WHERE id=student_id)').bind(Date.now()-365*86400000),
      env.DB.prepare('DELETE FROM insight_presence WHERE last_seen<?').bind(Date.now()-86400000),
      env.DB.prepare('DELETE FROM sessions WHERE expires_at<?').bind(Date.now()),
      env.DB.prepare('DELETE FROM rate_limits WHERE expires_at<?').bind(Date.now()),
      env.DB.prepare('DELETE FROM audit_events WHERE created_at<?').bind(Date.now() - 90 * 86400000),
      env.DB.prepare("DELETE FROM daily_recovery WHERE day < date('now','-30 days')"),
    ]);
  },
} satisfies ExportedHandler<Env>;
