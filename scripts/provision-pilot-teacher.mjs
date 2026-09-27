import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { mkdirSync, writeFileSync, readFileSync, mkdtempSync, unlinkSync, rmdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
if (args.includes('--local') === args.includes('--remote')) throw new Error('Choose exactly one: --local or --remote.');
const remote = args.includes('--remote'), scope = remote ? 'remote' : 'local';
const privateDir = resolve('.pilot-private');
mkdirSync(privateDir, { recursive: true, mode: 0o700 });
const credentialPath = join(privateDir, `${scope}-teacher.json`);
const rotate = args.includes('--rotate');
if (existsSync(credentialPath) && !rotate) throw new Error(`A ${scope} teacher key already exists. Reuse the private file or use --rotate to replace access without replacing the classroom.`);
if (rotate && !existsSync(credentialPath)) throw new Error('Rotation needs the existing private teacher file to identify the classroom.');
const previous = rotate ? JSON.parse(readFileSync(credentialPath, 'utf8')) : null;
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const code = length => [...randomBytes(length)].map(byte => alphabet[byte & 31]).join('');
const teacherKey = code(40), teacherId = previous?.teacherId ?? randomUUID(), classroomId = previous?.classroomId ?? randomUUID(), classCode = previous?.classCode ?? code(8);
if (!/^[a-f0-9-]{36}$/.test(teacherId) || !/^[a-f0-9-]{36}$/.test(classroomId)) throw new Error('Invalid existing teacher identity.');
const hash = createHash('sha256').update(`teacher:${teacherKey}`).digest('hex');
const urlIndex = args.indexOf('--url');
const url = urlIndex >= 0 ? args[urlIndex + 1] : previous?.url ?? (remote ? 'Set the deployed HTTPS address here' : 'http://localhost:8787');
const now = Date.now();
const sql = rotate
  ? `UPDATE teachers SET credential_hash='${hash}' WHERE id='${teacherId}'; DELETE FROM sessions WHERE actor_id='${teacherId}';`
  : `INSERT INTO teachers VALUES('${teacherId}','${hash}',${now}); INSERT INTO classrooms VALUES('${classroomId}','${teacherId}','${classCode}',${now});`;
const temporary = mkdtempSync(join(tmpdir(), 'auralith-provision-'));
const sqlPath = join(temporary, 'provision.sql');
// Persist the replacement key first in a separate recoverable file; never print it.
const pendingPath = join(privateDir, `${scope}-teacher-pending-${now}.json`);
const credential = { url, teacherId, classroomId, classCode, teacherKey, createdAt: new Date(now).toISOString(), private: 'Give this file only to the pilot teacher. Students get separate cards. No student names belong in the app.' };
writeFileSync(pendingPath, JSON.stringify(credential, null, 2), { mode: 0o600, flag: 'wx' });
try {
  writeFileSync(sqlPath, sql, { mode: 0o600 });
  execFileSync('npx', ['wrangler', 'd1', 'execute', 'auralith-classroom-pilot', remote ? '--remote' : '--local', '--file', sqlPath], { stdio: 'pipe' });
  if (previous) writeFileSync(join(privateDir, `${scope}-teacher-retired-${now}.json`), JSON.stringify(previous, null, 2), { mode: 0o600, flag: 'wx' });
  writeFileSync(credentialPath, JSON.stringify(credential, null, 2), { mode: 0o600 });
  const handoffPath = join(privateDir, `${scope}-TEACHER-START-HERE.md`);
  writeFileSync(handoffPath, `# Your Auralith classroom pilot\n\nPRIVATE: give this document only to the teacher. Never give it to students or post it publicly.\n\nGame: ${url}\n\nTeacher sign-in key: ${teacherKey}\n\n## Set up your class\n\n1. Have your school approve this supervised pilot and its data retention before children use it.\n2. Open the game, choose Teacher sign in, and paste the private key above.\n3. Create the number of learner cards you need (up to 35). Print or save the cards immediately. Give each child ONLY their own card.\n4. Keep a private school record mapping each child to Learner 01, Learner 02, etc. Do not put real names in the game.\n5. Choose each learner, set their grade/topic and activity, and press Save learner settings.\n6. For a first-session pet, open Quick start for the pilot and Give starter egg now. Otherwise, keep the normal five-day discovery activities and fun quiz. Quick start does not skip the baby-care week.\n7. Students visit the same game link and enter the two codes on their own card. The same card opens the same pet on another device.\n8. At the end, each child waits for Saved online and chooses Save & sign out. Download a private class backup after the session.\n\n## If something goes wrong\n\n- Lost card: select the EXISTING learner and Replace lost login card. Never create a new learner to recover an old pet.\n- Connection lost: keep the tab open, reconnect, and Retry connection. Do not clear browser data while there is unsent progress.\n- Another device/teacher changed the save: download the unsent copy if needed, then Use latest saved pet.\n- Missing or wrong progress: select the existing learner, Saved history & recovery, and restore a recent/daily copy or a downloaded backup. Restoration intentionally rolls progress back; choose carefully.\n- Pause this login blocks access without deleting the pet.\n- Lost teacher key: contact Dre. Teacher access can be replaced without replacing the classroom.\n\n## Pilot boundaries\n\nInternet is required. Use one device per learner at a time. Cards are passwords, not just usernames. No real names, emails, photos or birthdays are requested, but pseudonymous progress still needs your school's approval. This is learning practice, not a secure exam or a complete standards-validated K–12 curriculum. Pet loss cannot be made impossible; online saves, recovery history and private backups reduce the risk.\n`, { mode: 0o600 });
  unlinkSync(pendingPath);
  console.log(`Teacher access ${rotate ? 'rotated' : 'created'}. Private handoff file: ${handoffPath}. Codes were not printed.`);
} catch {
  console.error(`Provisioning failed. No learner was deleted. The generated key remains recoverable at ${pendingPath}; inspect the database before retrying.`);
  process.exitCode = 1;
} finally { if (existsSync(sqlPath)) unlinkSync(sqlPath); rmdirSync(temporary); }
