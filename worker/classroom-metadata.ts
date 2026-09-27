import { ApiError, object } from './security';
import { studentPetNames } from './pet-names';
import { normalizeLearning, GRADE_TOPICS, type LearningSettings } from '../src/services/game/curriculum';
import { validateNickname, type ClassroomMetadata } from '../src/pilot/metadata';
export interface MetadataRow { id: string; classroom_id: string; alias: string; assignment: string; learning_json: string | null; settings_version: number; nickname_version: number; nickname_at: number }
export const learningOf = (row: MetadataRow) => normalizeLearning(row.learning_json ? JSON.parse(row.learning_json) : undefined);
export async function metadata(db: D1Database, id: string): Promise<ClassroomMetadata> {
  const row = await db.prepare('SELECT * FROM students WHERE id=?').bind(id).first<MetadataRow>();
  if (!row) throw new ApiError(404, 'Learner not found.');
  return { alias: row.alias, assignment: row.assignment, learning: learningOf(row), settingsVersion: row.settings_version, nicknameVersion: row.nickname_version, nicknameAt: row.nickname_at,
    nicknameRequest: await db.prepare('SELECT request_id,proposed,status FROM nickname_requests WHERE student_id=?').bind(id).first(), ...await studentPetNames(db, id) };
}
export function settingsPatch(current: LearningSettings, input: unknown): LearningSettings {
  const patch = object(input);
  if (Object.keys(patch).some(k => !['grade','topic','challenge','learningHelp','schoolSafe','timedWarmup','showAllGames'].includes(k))) throw new ApiError(400, 'Unknown learning setting.');
  const next = { ...current, ...patch };
  if (!Number.isInteger(next.grade) || next.grade < 0 || next.grade > 12 || !['support','standard','stretch'].includes(next.challenge)
    || (next.learningHelp !== undefined && typeof next.learningHelp !== 'boolean') || (next.showAllGames !== undefined && typeof next.showAllGames !== 'boolean')) throw new ApiError(400, 'Choose valid K–12 learning settings.');
  if (next.topic !== 'mixed' && !(GRADE_TOPICS[next.grade] as readonly string[]).includes(next.topic)) throw new ApiError(400, 'That topic is not available at the selected grade. Choose Mixed practice or a matching topic.');
  return normalizeLearning({ ...next, schoolSafe: true, timedWarmup: false });
}
function nickname(value: unknown) { try { return validateNickname(value); } catch (e) { throw new ApiError(400, (e as Error).message); } }
export async function requestNickname(db: D1Database, id: string, body: Record<string, unknown>) {
  if (Object.keys(body).some(k => !['nickname','cancel'].includes(k))) throw new ApiError(400, 'Only nickname requests are accepted.');
  if (body.cancel === true) { await db.prepare("DELETE FROM nickname_requests WHERE student_id=? AND status='pending'").bind(id).run(); return { ok: true }; }
  const name = nickname(body.nickname);
  await db.prepare("INSERT INTO nickname_requests VALUES(?,?,?,'pending',?) ON CONFLICT(student_id) DO UPDATE SET request_id=excluded.request_id,proposed=excluded.proposed,status='pending',updated_at=excluded.updated_at").bind(id,crypto.randomUUID(),name,Date.now()).run();
  return { ok: true };
}
export async function setSettings(db: D1Database, room: string, rows: { id: string; version: number; learning: LearningSettings; assignment: string }[], requestId: string, extra: D1PreparedStatement[] = []) {
  if (!/^[a-zA-Z0-9-]{20,80}$/.test(requestId) || !rows.length || rows.length > 35 || new Set(rows.map(r=>r.id)).size !== rows.length) throw new ApiError(400,'Choose 1–35 different learners.');
  const payload = JSON.stringify(rows);
  const replay = await db.prepare('SELECT payload,result FROM classroom_batches WHERE id=? AND classroom_id=?').bind(requestId,room).first<{payload:string;result:string}>();
  if(replay) { if(replay.payload!==payload) throw new ApiError(409,'That request already applied different settings.'); return JSON.parse(replay.result); }
  const response = { ok:true, count:rows.length, requestId };
  try {
    await db.batch([
      db.prepare(`INSERT INTO settings_guards SELECT ?, CASE WHEN COUNT(*)=? THEN 1 ELSE 0 END FROM students s JOIN json_each(?) w ON s.id=json_extract(w.value,'$.id') AND s.settings_version=json_extract(w.value,'$.version') WHERE s.classroom_id=?`).bind(requestId,rows.length,payload,room),
      ...rows.map(r=>db.prepare('UPDATE students SET learning_json=?,assignment=?,settings_version=settings_version+1 WHERE id=? AND classroom_id=?').bind(JSON.stringify(r.learning),r.assignment,r.id,room)),
      db.prepare('INSERT INTO classroom_batches VALUES(?,?,?,?,?)').bind(requestId,room,payload,JSON.stringify(response),Date.now()),
      ...extra,
      db.prepare('DELETE FROM settings_guards WHERE id=?').bind(requestId),
    ]);
  } catch (error) {
    const done=await db.prepare('SELECT payload,result FROM classroom_batches WHERE id=? AND classroom_id=?').bind(requestId,room).first<{payload:string;result:string}>();
    if(done?.payload===payload) return JSON.parse(done.result);
    if(String(error).includes('CHECK constraint') || String(error).includes('UNIQUE constraint')) throw new ApiError(409,'Settings changed in another teacher window. Refresh and review; no learners were changed.');
    throw error;
  }
  return response;
}
export async function approveNickname(db: D1Database, room: string, id: string, body: Record<string,unknown>) {
  if (Object.keys(body).some(k=>!['nickname','version','requestId','decision'].includes(k))) throw new ApiError(400,'Only nickname fields are accepted.');
  const row = await db.prepare('SELECT * FROM students WHERE id=? AND classroom_id=?').bind(id,room).first<MetadataRow>();
  if (!row) throw new ApiError(404,'Learner not found.');
  if (body.version!==row.nickname_version) throw new ApiError(409,'This nickname changed. Refresh before reviewing.');
  const pending = await db.prepare("SELECT request_id,proposed FROM nickname_requests WHERE student_id=? AND status='pending'").bind(id).first<{request_id:string;proposed:string}>();
  if (body.requestId && pending?.request_id!==body.requestId) throw new ApiError(409,'The student changed this request. Refresh before reviewing.');
  if (body.decision==='decline') {
    if(!body.requestId) throw new ApiError(400,'Choose a pending request.');
    const r=await db.prepare("UPDATE nickname_requests SET status='declined',updated_at=? WHERE student_id=? AND request_id=? AND status='pending' RETURNING student_id").bind(Date.now(),id,body.requestId).first();
    if(!r) throw new ApiError(409,'Request changed. Refresh.'); return {ok:true};
  }
  const name=nickname(body.nickname ?? pending?.proposed), now=Date.now();
  const duplicate=await db.prepare('SELECT id FROM students WHERE classroom_id=? AND alias=? COLLATE NOCASE AND id<>?').bind(room,name,id).first();
  if(duplicate) throw new ApiError(400,'That nickname is already used in this class. Add a number or choose another.');
  const results=await db.batch([
    db.prepare(`UPDATE students SET alias=?,nickname_version=nickname_version+1,nickname_at=? WHERE id=? AND classroom_id=? AND nickname_version=? AND (? IS NULL OR EXISTS(SELECT 1 FROM nickname_requests WHERE student_id=? AND request_id=? AND status='pending')) RETURNING id`).bind(name,now,id,room,body.version,body.requestId??null,id,body.requestId??null),
    db.prepare("UPDATE nickname_requests SET status='approved',updated_at=? WHERE student_id=? AND EXISTS(SELECT 1 FROM students WHERE id=? AND nickname_version=? AND nickname_at=?) AND (? IS NULL OR request_id=?)").bind(now,id,id,row.nickname_version+1,now,body.requestId??null,body.requestId??null),
    db.prepare('INSERT INTO nickname_changes(classroom_id,student_id,old_alias,new_alias,created_at) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM students WHERE id=? AND nickname_version=? AND nickname_at=?)').bind(room,id,row.alias,name,now,id,row.nickname_version+1,now),
  ]);
  if(!results[0].results.length) throw new ApiError(409,'Nickname or request changed. Refresh.');
  return {ok:true,alias:name};
}
