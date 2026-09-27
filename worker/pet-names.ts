import { ApiError } from './security';
import { validatePetName, type PetNameRow } from '../src/pilot/metadata';
import { parseStored } from './game-state';

const petName = (value: unknown) => { try { return validatePetName(value); } catch (e) { throw new ApiError(400, (e as Error).message); } };
const petId = (value: unknown) => { if (typeof value !== 'string' || !/^[\w-]{1,80}$/.test(value)) throw new ApiError(400, 'Choose one of your pets.'); return value; };

export async function approvedPetNames(db: D1Database, studentId: string): Promise<Record<string, string>> {
  const rows = (await db.prepare('SELECT pet_id,approved FROM pet_names WHERE student_id=? AND approved IS NOT NULL').bind(studentId).all<{ pet_id: string; approved: string }>()).results;
  return Object.fromEntries(rows.map(r => [r.pet_id, r.approved]));
}
export async function classPetNames(db: D1Database, classId: string): Promise<Map<string, Record<string, string>>> {
  const rows = (await db.prepare('SELECT n.student_id,n.pet_id,n.approved FROM pet_names n JOIN students s ON s.id=n.student_id WHERE s.classroom_id=? AND n.approved IS NOT NULL').bind(classId).all<{ student_id: string; pet_id: string; approved: string }>()).results;
  const names = new Map<string, Record<string, string>>();
  for (const r of rows) names.set(r.student_id, { ...names.get(r.student_id), [r.pet_id]: r.approved });
  return names;
}
export async function studentPetNames(db: D1Database, studentId: string) {
  const rows = (await db.prepare('SELECT pet_id,approved,proposed,request_id,status FROM pet_names WHERE student_id=?').bind(studentId).all<PetNameRow>()).results;
  const typed = await db.prepare('SELECT c.typed_pet_names FROM classroom_pet_settings c JOIN students s ON s.classroom_id=c.classroom_id WHERE s.id=?').bind(studentId).first<{ typed_pet_names: number }>();
  return { petNames: rows, typedPetNames: typed?.typed_pet_names !== 0 };
}

async function ownsPet(db: D1Database, studentId: string, id: string) {
  const row = await db.prepare('SELECT state_json FROM students WHERE id=?').bind(studentId).first<{ state_json: string }>();
  const state = row && parseStored(row.state_json);
  return !!state && [state.pet, ...(state.companionRoster ?? [])].some(p => p?.id === id);
}

export async function requestPetName(db: D1Database, studentId: string, body: Record<string, unknown>) {
  if (Object.keys(body).some(k => !['petId', 'name', 'cancel'].includes(k))) throw new ApiError(400, 'Only pet name requests are accepted.');
  const pet = petId(body.petId);
  if (body.cancel === true) { await db.prepare("UPDATE pet_names SET proposed=NULL,request_id=NULL,status=CASE WHEN approved IS NULL THEN NULL ELSE 'approved' END,updated_at=? WHERE student_id=? AND pet_id=? AND status='pending'").bind(Date.now(), studentId, pet).run(); return { ok: true }; }
  if (!(await studentPetNames(db, studentId)).typedPetNames) throw new ApiError(403, 'Your teacher turned on name chips only. Build a name from the chips instead.');
  if (!await ownsPet(db, studentId, pet)) throw new ApiError(400, 'Choose one of your pets.');
  const name = petName(body.name);
  await db.prepare("INSERT INTO pet_names(student_id,pet_id,proposed,request_id,status,updated_at) VALUES(?,?,?,?,'pending',?) ON CONFLICT(student_id,pet_id) DO UPDATE SET proposed=excluded.proposed,request_id=excluded.request_id,status='pending',updated_at=excluded.updated_at")
    .bind(studentId, pet, name, crypto.randomUUID(), Date.now()).run();
  return { ok: true };
}

export async function petNameInbox(db: D1Database, room: string) {
  const requests = (await db.prepare("SELECT n.student_id,n.pet_id,n.proposed,n.request_id,n.approved,s.alias FROM pet_names n JOIN students s ON s.id=n.student_id WHERE s.classroom_id=? AND n.status='pending' ORDER BY n.updated_at").bind(room).all()).results;
  const named = (await db.prepare('SELECT n.student_id,n.pet_id,n.approved,s.alias FROM pet_names n JOIN students s ON s.id=n.student_id WHERE s.classroom_id=? AND n.approved IS NOT NULL ORDER BY s.alias').bind(room).all()).results;
  const typed = await db.prepare('SELECT typed_pet_names FROM classroom_pet_settings WHERE classroom_id=?').bind(room).first<{ typed_pet_names: number }>();
  return { requests, named, typedPetNames: typed?.typed_pet_names !== 0 };
}

export async function decidePetName(db: D1Database, room: string, studentId: string, body: Record<string, unknown>) {
  if (Object.keys(body).some(k => !['petId', 'decision', 'requestId', 'name'].includes(k))) throw new ApiError(400, 'Only pet name fields are accepted.');
  const pet = petId(body.petId), now = Date.now();
  if (!await db.prepare('SELECT 1 FROM students WHERE id=? AND classroom_id=?').bind(studentId, room).first()) throw new ApiError(404, 'Learner not found.');
  if (body.decision === 'reset') {
    await db.prepare('DELETE FROM pet_names WHERE student_id=? AND pet_id=?').bind(studentId, pet).run();
    return { ok: true };
  }
  if (body.decision === 'decline') {
    const r = await db.prepare("UPDATE pet_names SET status=CASE WHEN approved IS NULL THEN 'declined' ELSE 'approved' END,proposed=NULL,request_id=NULL,updated_at=? WHERE student_id=? AND pet_id=? AND request_id=? AND status='pending' RETURNING pet_id").bind(now, studentId, pet, String(body.requestId ?? '')).first();
    if (!r) throw new ApiError(409, 'The student changed this request. Refresh.');
    return { ok: true };
  }
  if (body.decision !== 'approve') throw new ApiError(400, 'Choose approve, decline, or reset.');
  const name = petName(body.name);
  // Without a requestId the teacher is naming the pet directly; with one, the approval must match what the student asked for.
  const r = body.requestId
    ? await db.prepare("UPDATE pet_names SET approved=?,proposed=NULL,request_id=NULL,status='approved',updated_at=? WHERE student_id=? AND pet_id=? AND request_id=? AND status='pending' RETURNING pet_id").bind(name, now, studentId, pet, String(body.requestId)).first()
    : await db.prepare("INSERT INTO pet_names(student_id,pet_id,approved,status,updated_at) VALUES(?,?,?,'approved',?) ON CONFLICT(student_id,pet_id) DO UPDATE SET approved=excluded.approved,updated_at=excluded.updated_at RETURNING pet_id").bind(studentId, pet, name, now).first();
  if (!r) throw new ApiError(409, 'The student changed this request. Refresh.');
  return { ok: true, name };
}

export async function setTypedPetNames(db: D1Database, room: string, body: Record<string, unknown>) {
  if (typeof body.enabled !== 'boolean' || Object.keys(body).length !== 1) throw new ApiError(400, 'Choose on or off.');
  await db.prepare('INSERT INTO classroom_pet_settings VALUES(?,?) ON CONFLICT(classroom_id) DO UPDATE SET typed_pet_names=excluded.typed_pet_names').bind(room, body.enabled ? 1 : 0).run();
  return { ok: true, typedPetNames: body.enabled };
}
