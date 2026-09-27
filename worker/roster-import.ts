import { ApiError, cleanCode, digest, object } from './security';
import { freshGame, packGame } from './game-state';

// Names and spreadsheet contents stay in the browser. Only opaque identifiers
// and credentials cross this boundary. Deterministic IDs make retries safe.
export async function importRoster(db: D1Database, room: { id: string; code: string }, body: Record<string, unknown>) {
  if (Object.keys(body).some(key=>!['classCode','rows'].includes(key))) throw new ApiError(400,'Only roster account fields are accepted.');
  if (cleanCode(body.classCode) !== room.code || !Array.isArray(body.rows) || !body.rows.length || body.rows.length > 35) {
    throw new ApiError(400, 'Choose this classroom and between 1 and 35 roster rows.');
  }
  const current = await db.prepare('SELECT id,alias,credential_hash,active FROM students WHERE classroom_id=?').bind(room.id)
    .all<{ id: string; alias: string; credential_hash: string; active: number }>();
  const seen = new Set<string>();
  let added = 0;
  const statements: D1PreparedStatement[] = [];
  const cards = [];
  for (const value of body.rows) {
    const row = object(value);
    if (Object.keys(row).some(key => !['sourceKey', 'accountId', 'code'].includes(key)) ||
      typeof row.sourceKey !== 'string' || !/^[a-f0-9]{64}$/.test(row.sourceKey) ||
      (row.accountId !== undefined && (typeof row.accountId !== 'string' || !/^[a-f0-9-]{36}$/.test(row.accountId)))) {
      throw new ApiError(400, 'Invalid roster identifier. Names must remain in the private spreadsheet.');
    }
    const hash = await digest(`roster:${room.id}:${row.sourceKey}`);
    const id = typeof row.accountId === 'string' ? row.accountId : `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
    if (seen.has(id)) throw new ApiError(400, 'The spreadsheet contains duplicate accounts.');
    seen.add(id);
    const code = cleanCode(row.code);
    if (!/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{16}$/.test(code)) throw new ApiError(400, 'Each row needs a generated 16-character pet code.');
    const credentialHash = await digest(`student:${code}`);
    const existing = current.results.find(student => student.id === id);
    if (existing) {
      if (!existing.active) throw new ApiError(409, `Resume ${existing.alias}'s login before importing it.`);
      if (existing.credential_hash !== credentialHash) throw new ApiError(409, `Use the completed spreadsheet with ${existing.alias}'s current pet code, or replace its lost login card. No accounts were changed.`);
      cards.push({ id, alias: existing.alias, code, created: false });
      continue;
    }
    if (row.accountId) throw new ApiError(400, 'An account is not in this classroom. Check the class code and account IDs.');
    const alias = `Learner ${String(current.results.length + ++added).padStart(2, '0')}`;
    statements.push(db.prepare('INSERT INTO students(id,classroom_id,alias,credential_hash,state_json,request_id,updated_at,created_at) VALUES(?,?,?,?,?,?,?,?)')
      .bind(id, room.id, alias, credentialHash, packGame(freshGame(id, alias)), crypto.randomUUID(), Date.now(), Date.now()));
    cards.push({ id, alias, code, created: true });
  }
  if (current.results.length + added > 35) throw new ApiError(400, 'This import exceeds the classroom limit of 35 learners, including paused accounts.');
  if (statements.length) {
    statements.push(db.prepare('INSERT INTO audit_events(classroom_id,action,created_at) VALUES(?,?,?)').bind(room.id, 'import-roster', Date.now()));
    // D1 batch rolls back all rows on a conflict, including concurrent imports.
    await db.batch(statements);
  }
  return { classCode: room.code, cards };
}
