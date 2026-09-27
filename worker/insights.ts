import { ApiError, readBody, digest } from './security';
import { learningOf, setSettings, settingsPatch, type MetadataRow } from './classroom-metadata';
import { recommend, DAY, RULE_VERSION, type EvidenceRecord, type Recommendation, type InsightsData, type Alert, type SkillSummary, type InsightLearner, type Intervention } from '../src/features/teacher-insights/model';
import type { LearningEvidence } from '../src/types/woodland';
interface Student extends MetadataRow {active:number;revision:number;updated_at:number;created_at:number}
interface History {student_id:string;question_id:string;evidence_json:string;event_at:number;received_at:number;settings_version:number;imported:number}
interface AlertRow {id:string;student_id:string;classroom_id:string;rule:string;skill_id:string;settings_version:number;status:Alert['status'];active:number;snoozed_until:number;created_at:number;updated_at:number;evidence_json:string}
const json=(data:unknown)=>Response.json(data);
const record=(r:History):EvidenceRecord=>({...JSON.parse(r.evidence_json) as LearningEvidence,eventAt:r.event_at,receivedAt:r.received_at,settingsVersion:r.settings_version,imported:!!r.imported});
const independentSQL="json_extract(h.evidence_json,'$.attempts')=1 AND json_extract(h.evidence_json,'$.correct')=1 AND json_extract(h.evidence_json,'$.firstAttemptCorrect')=1 AND json_extract(h.evidence_json,'$.support')='none' AND COALESCE(json_extract(h.evidence_json,'$.answerRevealed'),0)=0";
const aggregateSQL=`COUNT(*) AS questions,SUM(json_extract(h.evidence_json,'$.attempts')>0) AS attempted,SUM(${independentSQL}) AS independent,SUM(json_extract(h.evidence_json,'$.support')<>'none' OR COALESCE(json_extract(h.evidence_json,'$.answerRevealed'),0)=1) AS supported,SUM(json_extract(h.evidence_json,'$.correct')=1) AS completed,SUM(json_extract(h.evidence_json,'$.attempts')>0 AND json_extract(h.evidence_json,'$.correct')=0) AS unfinished,SUM(MAX(0,json_extract(h.evidence_json,'$.attempts')-1)) AS retries,SUM(CASE WHEN json_extract(h.evidence_json,'$.context')='spaced-review' AND ${independentSQL} THEN 1 ELSE 0 END) AS laterChecks,MAX(h.event_at) AS lastAt,SUM(h.imported) AS imported`;
async function students(db:D1Database,room:string){return (await db.prepare('SELECT id,classroom_id,alias,active,revision,updated_at,created_at,assignment,learning_json,settings_version,nickname_version,nickname_at FROM students WHERE classroom_id=? ORDER BY alias').bind(room).all<Student>()).results;}
async function recent(db:D1Database,room:string,now:number){return (await db.prepare(`SELECT * FROM (SELECT h.*,ROW_NUMBER() OVER(PARTITION BY h.student_id,h.skill_id ORDER BY h.event_at DESC) AS rn FROM learning_history h JOIN students s ON s.id=h.student_id WHERE s.classroom_id=? AND h.event_at>=? AND h.settings_version=s.settings_version AND h.imported=0) WHERE rn<=20`).bind(room,now-7*DAY).all<History>()).results;}
async function refreshAlerts(db:D1Database,room:string,now:number,roster:Student[]){
 const policy=await db.prepare('SELECT enabled FROM insight_policy WHERE classroom_id=?').bind(room).first<{enabled:number}>();
 if(policy?.enabled===0)return;
 const history=await recent(db,room,now);
 const existing=(await db.prepare('SELECT * FROM insight_alerts WHERE classroom_id=?').bind(room).all<AlertRow>()).results;
 const presence=(await db.prepare('SELECT p.* FROM insight_presence p JOIN students s ON s.id=p.student_id WHERE s.classroom_id=?').bind(room).all<{student_id:string;last_seen:number;save_phase:string}>()).results;
 const writes:D1PreparedStatement[]=[],live=new Set<string>();
 for(const student of roster){if(!student.active)continue;
  const candidates=recommend(history.filter(r=>r.student_id===student.id).map(record),learningOf(student),student.settings_version,now);
  const p=presence.find(r=>r.student_id===student.id);
  if(p&&now-p.last_seen<90000&&['offline','conflict','signin'].includes(p.save_phase))candidates.push({rule:'save-help',skillId:'connection',topic:'Connection',title:'Help reconnect this student',explanation:'The student app reports a saving or sign-in problem. Learning results may be delayed.',suggestion:'Check their connection and saved-progress message. Do not replace their account.',patch:null,count:0,independent:0,support:0,settingsVersion:student.settings_version,lastEvidenceAt:p.last_seen,evidenceIds:[],ruleVersion:RULE_VERSION});
  for(const proposal of candidates){const id=await digest(`${RULE_VERSION}:${student.id}:${proposal.skillId}:${proposal.rule}:${student.settings_version}`);live.add(id);const old=existing.find(a=>a.id===id),raw=JSON.stringify(proposal);
   if(!old)writes.push(db.prepare("INSERT OR IGNORE INTO insight_alerts VALUES(?,?,?,?,?,?,'new',1,0,?,?,?,NULL)").bind(id,student.id,room,proposal.rule,proposal.skillId,student.settings_version,now,now,raw));
   else if(old.evidence_json!==raw||!old.active||old.status==='snoozed'&&old.snoozed_until<=now)writes.push(db.prepare("UPDATE insight_alerts SET active=1,evidence_json=?,updated_at=?,status=CASE WHEN status='snoozed' AND snoozed_until<=? THEN 'new' WHEN status='resolved' THEN 'reviewed' ELSE status END,resolved_at=NULL WHERE id=?").bind(raw,now,now,id));
  }
 }
 for(const old of existing)if(old.active&&!live.has(old.id))writes.push(db.prepare("UPDATE insight_alerts SET active=0,status=CASE WHEN status IN ('new','reviewed','snoozed') THEN 'resolved' ELSE status END,resolved_at=?,updated_at=? WHERE id=?").bind(now,now,old.id));
 for(let i=0;i<writes.length;i+=70)await db.batch(writes.slice(i,i+70));
}
export async function classroomInsights(db:D1Database,room:string,days:number,now=Date.now()):Promise<InsightsData>{
 const roster=await students(db,room);await refreshAlerts(db,room,now,roster);
 const [metrics,people,alerts,changes,trend,policy,settingsHistory]=await Promise.all([
  db.prepare(`SELECT h.student_id AS studentId,h.skill_id AS skillId,h.topic,h.grade,h.challenge,${aggregateSQL} FROM learning_history h JOIN students s ON s.id=h.student_id WHERE s.classroom_id=? AND h.event_at>=? GROUP BY h.student_id,h.skill_id,h.grade,h.challenge ORDER BY h.topic`).bind(room,now-days*DAY).all<SkillSummary>(),
  db.prepare(`SELECT s.id,p.last_seen AS lastSeen,p.activity,p.save_phase AS savePhase,MIN(h.event_at) AS historyStart,COALESCE(MAX(h.received_at),0) AS evidenceAt FROM students s LEFT JOIN insight_presence p ON p.student_id=s.id LEFT JOIN learning_history h ON h.student_id=s.id WHERE s.classroom_id=? GROUP BY s.id`).bind(room).all<Partial<InsightLearner>&{id:string}>(),
  db.prepare(`SELECT * FROM insight_alerts WHERE classroom_id=? ORDER BY CASE WHEN active=1 AND status='new' THEN 0 WHEN active=1 AND status='reviewed' THEN 1 ELSE 2 END,CASE rule WHEN 'save-help' THEN 0 WHEN 'check-in' THEN 1 WHEN 'support' THEN 2 ELSE 3 END,updated_at DESC LIMIT 250`).bind(room).all<AlertRow>(),
  db.prepare(`SELECT i.*,s.alias,COUNT(h.question_id) AS followAttempted,COALESCE(SUM(${independentSQL}),0) AS followIndependent,COALESCE(SUM(json_extract(h.evidence_json,'$.support')<>'none'),0) AS followSupported FROM insight_interventions i JOIN students s ON s.id=i.student_id LEFT JOIN learning_history h ON h.student_id=i.student_id AND h.settings_version=i.applied_version AND h.event_at>=i.created_at AND json_extract(h.evidence_json,'$.attempts')>0 AND (json_extract(i.evidence_json,'$.skillId') IS NULL OR h.skill_id=json_extract(i.evidence_json,'$.skillId')) WHERE i.classroom_id=? GROUP BY i.id ORDER BY i.created_at DESC LIMIT 100`).bind(room).all<{id:string;student_id:string;alias:string;kind:string;created_at:number;applied_version:number;before_json:string;after_json:string;evidence_json:string;reverted_by:string|null;followAttempted:number;followIndependent:number;followSupported:number}>(),
  db.prepare(`SELECT date(h.event_at/1000,'unixepoch') AS day,SUM(json_extract(h.evidence_json,'$.attempts')>0) AS attempted,SUM(${independentSQL}) AS independent,SUM(json_extract(h.evidence_json,'$.support')<>'none') AS supported FROM learning_history h JOIN students s ON s.id=h.student_id WHERE s.classroom_id=? AND h.event_at>=? GROUP BY day ORDER BY day`).bind(room,now-days*DAY).all<InsightsData['trend'][number]>(),
  db.prepare('SELECT * FROM insight_policy WHERE classroom_id=?').bind(room).first<{enabled:number;history_since:number}>(),
  db.prepare('SELECT h.*,s.alias FROM insight_settings_history h JOIN students s ON s.id=h.student_id WHERE s.classroom_id=? ORDER BY changed_at DESC LIMIT 200').bind(room).all<{student_id:string;alias:string;version:number;learning_json:string;assignment:string;changed_at:number}>(),
 ]);
 const alertTokens=new Map(await Promise.all(alerts.results.map(async a=>[a.id,await digest(a.evidence_json)] as const)));
 const interventions:Intervention[]=[];
 for(const c of changes.results){const proposal=JSON.parse(c.evidence_json) as Recommendation|null;const followup={attempted:c.followAttempted,independent:c.followIndependent,supported:c.followSupported};interventions.push({id:c.id,studentId:c.student_id,alias:c.alias,kind:c.kind,createdAt:c.created_at,appliedVersion:c.applied_version,before:JSON.parse(c.before_json),after:JSON.parse(c.after_json),recommendation:proposal,revertedBy:c.reverted_by,followup:followup??{attempted:0,independent:0,supported:0}});}
 return {settingsChanges:settingsHistory.results.map(h=>({studentId:h.student_id,alias:h.alias,version:h.version,learning:JSON.parse(h.learning_json),assignment:h.assignment,changedAt:h.changed_at})),serverTime:now,days,historySince:policy?.history_since??now,enabled:policy?.enabled!==0,students:roster.map(s=>({id:s.id,alias:s.alias,active:!!s.active,learning:learningOf(s),settingsVersion:s.settings_version,assignment:s.assignment,lastSaved:s.updated_at,lastSeen:null,activity:null,savePhase:null,historyStart:null,evidenceAt:0,...people.results.find(p=>p.id===s.id)})),skills:metrics.results,alerts:alerts.results.map(a=>({...JSON.parse(a.evidence_json) as Recommendation,id:a.id,evidenceToken:alertTokens.get(a.id)!,studentId:a.student_id,alias:roster.find(s=>s.id===a.student_id)?.alias??'Student',status:a.status,active:!!a.active,snoozedUntil:a.snoozed_until,createdAt:a.created_at,updatedAt:a.updated_at})),interventions,trend:trend.results,retentionDays:180,ruleVersion:RULE_VERSION};
}
const requestID=(v:unknown)=>{if(typeof v!=='string'||! /^[a-zA-Z0-9-]{20,80}$/.test(v))throw new ApiError(400,'Missing request identifier.');return v;};
export async function insightsAPI(request:Request,db:D1Database,room:string,teacherId:string){
 const url=new URL(request.url),path=url.pathname;
 if(request.method==='GET'){
  const days=Number(url.searchParams.get('days')??7);if(![1,7,30,90,180].includes(days))throw new ApiError(400,'Choose a supported date range.');
  if(path.endsWith('/evidence')){const id=url.searchParams.get('student');if(!(await db.prepare('SELECT id FROM students WHERE id=? AND classroom_id=?').bind(id,room).first()))throw new ApiError(404,'Student not found.');const rows=(await db.prepare('SELECT * FROM learning_history WHERE student_id=? AND event_at>=? ORDER BY event_at DESC LIMIT 500').bind(id,Date.now()-days*DAY).all<History>()).results;return json({rows:rows.map(record),limit:500});}
  return json(await classroomInsights(db,room,days));
 }
 if(request.method!=='POST')throw new ApiError(405,'Use GET or POST.');
 const body=await readBody(request),now=Date.now();
 if(path.endsWith('/policy')){if(typeof body.enabled!=='boolean')throw new ApiError(400,'Choose alerts on or off.');await db.prepare('INSERT INTO insight_policy VALUES(?,?,?) ON CONFLICT(classroom_id) DO UPDATE SET enabled=excluded.enabled').bind(room,body.enabled?1:0,now).run();return json({ok:true});}
 if(path.endsWith('/erase')){
  if(body.confirm!=='DELETE_PRACTICE_HISTORY')throw new ApiError(400,'Confirm deletion of the selected practice history.');
  const student=await db.prepare('SELECT id FROM students WHERE id=? AND classroom_id=?').bind(String(body.studentId),room).first<{id:string}>();if(!student)throw new ApiError(404,'Student not found.');
  await db.batch([db.prepare('INSERT INTO insight_resets VALUES(?,?) ON CONFLICT(student_id) DO UPDATE SET erased_before=excluded.erased_before').bind(student.id,now),...['learning_history','learning_observations','insight_alerts','insight_decisions','insight_interventions'].map(table=>db.prepare(`DELETE FROM ${table} WHERE student_id=?`).bind(student.id))]);return json({ok:true});
 }
 const id=requestID(body.requestId);
 if(path.endsWith('/revert')){
  const change=await db.prepare('SELECT * FROM insight_interventions WHERE id=? AND classroom_id=?').bind(String(body.id),room).first<{student_id:string;before_json:string;after_json:string;applied_version:number;reverted_by:string|null;followAttempted:number;followIndependent:number;followSupported:number}>();if(!change)throw new ApiError(404,'Change not found.');
  if(change.reverted_by===id)return json({ok:true});if(change.reverted_by)throw new ApiError(409,'This change was already reverted.');
  const s=(await students(db,room)).find(s=>s.id===change.student_id)!;if(s.settings_version!==change.applied_version)throw new ApiError(409,'Newer settings exist. Review them instead of overwriting them.');
  const before=learningOf(s),after=settingsPatch(before,JSON.parse(change.before_json));
  await setSettings(db,room,[{id:s.id,version:s.settings_version,learning:after,assignment:s.assignment}],id,[
   db.prepare("INSERT INTO insight_interventions VALUES(?,?,?,?,NULL,'revert',?,?,?,?,?,?,NULL)").bind(id,room,s.id,teacherId,JSON.stringify(body),JSON.stringify(before),JSON.stringify(after),s.settings_version+1,'null',now),
   db.prepare('UPDATE insight_interventions SET reverted_by=? WHERE id=? AND classroom_id=?').bind(id,String(body.id),room),
  ]);return json({ok:true});
 }
 const replay=await db.prepare('SELECT request_json FROM insight_interventions WHERE id=? AND classroom_id=?').bind(id,room).first<{request_json:string}>();if(replay){if(replay.request_json!==JSON.stringify(body))throw new ApiError(409,'This request already applied another change.');return json({ok:true});}
 const roster=await students(db,room);await refreshAlerts(db,room,now,roster);
 const alert=await db.prepare('SELECT * FROM insight_alerts WHERE id=? AND classroom_id=?').bind(String(body.alertId),room).first<AlertRow>();if(!alert)throw new ApiError(404,'Alert not found.');
 if(path.endsWith('/decision')){
  const done=await db.prepare('SELECT alert_id,decision FROM insight_decisions WHERE id=? AND classroom_id=?').bind(id,room).first<{alert_id:string;decision:string}>();if(done){if(done.alert_id!==alert.id||done.decision!==body.decision)throw new ApiError(409,'That request already recorded another decision.');return json({ok:true});}
  if(!alert.active||alert.status==='applied')throw new ApiError(409,'This alert has already resolved. Refresh insights.');
  if(!['reviewed','dismissed','snoozed'].includes(String(body.decision)))throw new ApiError(400,'Choose review, dismiss, or snooze.');
  await db.batch([db.prepare('INSERT OR IGNORE INTO insight_decisions VALUES(?,?,?,?,?,?,?)').bind(id,room,alert.student_id,alert.id,teacherId,body.decision,now),db.prepare("UPDATE insight_alerts SET status=?,snoozed_until=?,updated_at=? WHERE id=? AND active=1 AND status != 'applied'").bind(body.decision,body.decision==='snoozed'?now+DAY:0,now,alert.id)]);return json({ok:true});
 }
 if((await db.prepare('SELECT enabled FROM insight_policy WHERE classroom_id=?').bind(room).first<{enabled:number}>())?.enabled===0)throw new ApiError(409,'Learning alerts are paused. Resume them before applying a recommendation.');
 if(!path.endsWith('/apply'))throw new ApiError(404,'Not found.');
 const proposal=JSON.parse(alert.evidence_json) as Recommendation,s=roster.find(s=>s.id===alert.student_id)!;
 if(!alert.active||!proposal.patch||alert.status==='applied'||s.settings_version!==body.settingsVersion||proposal.lastEvidenceAt!==body.evidenceAt||alert.settings_version!==s.settings_version)throw new ApiError(409,'The evidence or settings changed. Refresh and review the recommendation again.');
 if(body.evidenceToken!==await digest(alert.evidence_json)) throw new ApiError(409,'New evidence arrived. Refresh and preview again.');
 const before=learningOf(s),after=settingsPatch(before,proposal.patch);
 const allAt=await db.prepare('SELECT COALESCE(MAX(received_at),0) AS stamp FROM learning_history WHERE student_id=?').bind(s.id).first<{stamp:number}>();
 await setSettings(db,room,[{id:s.id,version:s.settings_version,learning:after,assignment:s.assignment}],id,[
  db.prepare('INSERT INTO insight_guards SELECT ?,CASE WHEN (SELECT revision FROM students WHERE id=?)=? AND COALESCE(MAX(received_at),0)=? THEN 1 ELSE 0 END FROM learning_history WHERE student_id=?').bind(id,s.id,s.revision,allAt?.stamp??0,s.id),
  db.prepare("INSERT INTO insight_interventions VALUES(?,?,?,?,?,'apply',?,?,?,?,?,?,NULL)").bind(id,room,s.id,teacherId,alert.id,JSON.stringify(body),JSON.stringify(before),JSON.stringify(after),s.settings_version+1,JSON.stringify(proposal),now),
  db.prepare("UPDATE insight_alerts SET status='applied',active=0,resolved_at=?,updated_at=? WHERE id=?").bind(now,now,alert.id),db.prepare('DELETE FROM insight_guards WHERE id=?').bind(id),
 ]);return json({ok:true});
}
export async function heartbeat(db:D1Database,id:string,body:Record<string,unknown>){
 const phase=String(body.phase),activity=String(body.activity);
 if(!['saved','saving','offline','conflict','signin'].includes(phase)||! /^[a-z_]{1,40}$/.test(activity)||body.visible!==true)throw new ApiError(400,'Invalid presence update.');
 await db.prepare('INSERT INTO insight_presence VALUES(?,?,?,?) ON CONFLICT(student_id) DO UPDATE SET last_seen=excluded.last_seen,activity=excluded.activity,save_phase=excluded.save_phase').bind(id,Date.now(),activity,phase).run();return {ok:true};
}
