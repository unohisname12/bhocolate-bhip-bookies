import { execFileSync } from 'node:child_process';
import { randomBytes, createHash, randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync, unlinkSync } from 'node:fs';

export default function setup() {
  // Only this explicitly isolated local test database is reset. Never --remote.
  const flags = ['--local', '--persist-to', '.wrangler/pilot-test-state'];
  execFileSync('npx', ['wrangler', 'd1', 'migrations', 'apply', 'auralith-classroom-pilot', ...flags], { stdio: 'pipe' });
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const key = () => [...randomBytes(40)].map(b => alphabet[b & 31]).join('');
  const teachers = [0, 1, 2].map(() => ({ id: randomUUID(), classroomId: randomUUID(), code: key(), classCode: key().slice(0, 8) }));
  const sql = ['DELETE FROM class_rivals; DELETE FROM classroom_rival_settings; DELETE FROM play_time; DELETE FROM play_time_policies; DELETE FROM pet_names; DELETE FROM classroom_pet_settings; DELETE FROM delivery_rooms; DELETE FROM teacher_prizes; DELETE FROM teacher_prize_batches; DELETE FROM arcade_parties; DELETE FROM clash_answers; DELETE FROM clash_rounds; DELETE FROM sessions; DELETE FROM save_versions; DELETE FROM daily_recovery; DELETE FROM learning_versions; DELETE FROM nickname_requests; DELETE FROM nickname_changes; DELETE FROM classroom_batches; DELETE FROM settings_guards; DELETE FROM students; DELETE FROM classrooms; DELETE FROM teachers; DELETE FROM rate_limits; DELETE FROM audit_events;',
    ...teachers.map(t => `INSERT INTO teachers VALUES('${t.id}','${createHash('sha256').update(`teacher:${t.code}`).digest('hex')}',${Date.now()}); INSERT INTO classrooms VALUES('${t.classroomId}','${t.id}','${t.classCode}',${Date.now()});`)].join('\n');
  mkdirSync('.pilot-private', { recursive: true, mode: 0o700 });
  const path = '.pilot-private/test-seed.sql';
  writeFileSync(path, sql, { mode: 0o600 });
  try { execFileSync('npx', ['wrangler', 'd1', 'execute', 'auralith-classroom-pilot', ...flags, '--file', path], { stdio: 'pipe' }); }
  finally { unlinkSync(path); }
  writeFileSync('.pilot-private/test-teachers.json', JSON.stringify(teachers), { mode: 0o600 });
}
