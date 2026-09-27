-- Practice snapshots are atomically captured with validated game checkpoints.
CREATE TABLE learning_history (
 student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
 question_id TEXT NOT NULL, skill_id TEXT NOT NULL, topic TEXT NOT NULL, grade INTEGER NOT NULL,
 challenge TEXT NOT NULL, source TEXT NOT NULL, settings_version INTEGER NOT NULL DEFAULT 0,
 evidence_json TEXT NOT NULL CHECK(json_valid(evidence_json)),
 event_at INTEGER NOT NULL, first_received INTEGER NOT NULL, received_at INTEGER NOT NULL,
 imported INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(student_id,question_id)
);
CREATE INDEX learning_history_time ON learning_history(student_id,event_at);
CREATE INDEX learning_history_settings ON learning_history(student_id,settings_version,event_at);
CREATE TABLE insight_resets(student_id TEXT PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,erased_before INTEGER NOT NULL);
CREATE TABLE learning_observations (
 student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
 question_id TEXT NOT NULL, save_revision INTEGER NOT NULL, evidence_json TEXT NOT NULL,
 received_at INTEGER NOT NULL, PRIMARY KEY(student_id,question_id,save_revision)
);
CREATE TABLE insight_settings_history (
 student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
 version INTEGER NOT NULL, learning_json TEXT NOT NULL, assignment TEXT NOT NULL,
 changed_at INTEGER NOT NULL, PRIMARY KEY(student_id,version)
);
INSERT INTO insight_settings_history SELECT id,settings_version,learning_json,assignment,CAST((julianday('now')-2440587.5)*86400000 AS INTEGER) FROM students WHERE learning_json IS NOT NULL;
CREATE TRIGGER insight_settings_updated AFTER UPDATE OF learning_json,assignment ON students WHEN NEW.learning_json IS NOT NULL AND (OLD.learning_json IS NOT NEW.learning_json OR OLD.assignment IS NOT NEW.assignment OR OLD.settings_version<>NEW.settings_version) BEGIN
 INSERT OR IGNORE INTO insight_settings_history VALUES(NEW.id,NEW.settings_version,NEW.learning_json,NEW.assignment,CAST((julianday('now')-2440587.5)*86400000 AS INTEGER));
END;
CREATE TABLE insight_presence (
 student_id TEXT PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
 last_seen INTEGER NOT NULL, activity TEXT NOT NULL, save_phase TEXT NOT NULL
);
CREATE TABLE insight_alerts (
 id TEXT PRIMARY KEY, student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
 classroom_id TEXT NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
 rule TEXT NOT NULL, skill_id TEXT NOT NULL, settings_version INTEGER NOT NULL,
 status TEXT NOT NULL DEFAULT 'new', active INTEGER NOT NULL DEFAULT 1,
 snoozed_until INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
 evidence_json TEXT NOT NULL, resolved_at INTEGER
);
CREATE INDEX insight_alerts_room ON insight_alerts(classroom_id,active,status);
CREATE TABLE insight_interventions (
 id TEXT PRIMARY KEY, classroom_id TEXT NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
 student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE, teacher_id TEXT NOT NULL,
 alert_id TEXT, kind TEXT NOT NULL, request_json TEXT NOT NULL, before_json TEXT NOT NULL,
 after_json TEXT NOT NULL, applied_version INTEGER NOT NULL, evidence_json TEXT NOT NULL,
 created_at INTEGER NOT NULL, reverted_by TEXT
);
CREATE TABLE insight_guards(id TEXT PRIMARY KEY,valid INTEGER NOT NULL CHECK(valid=1));
CREATE TABLE insight_decisions (
 id TEXT PRIMARY KEY, classroom_id TEXT NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
 student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE, alert_id TEXT NOT NULL,
 teacher_id TEXT NOT NULL, decision TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE TABLE insight_policy (
 classroom_id TEXT PRIMARY KEY REFERENCES classrooms(id) ON DELETE CASCADE,
 enabled INTEGER NOT NULL DEFAULT 1, history_since INTEGER NOT NULL
);
INSERT INTO insight_policy SELECT id,1,CAST((julianday('now')-2440587.5)*86400000 AS INTEGER) FROM classrooms;
-- Only existing records can be backfilled. Their setting/session provenance is unknown.
INSERT OR IGNORE INTO learning_history
 SELECT s.id,json_extract(e.value,'$.questionId'),COALESCE(json_extract(e.value,'$.skillId'),json_extract(e.value,'$.grade')||':'||json_extract(e.value,'$.topic')),
 json_extract(e.value,'$.topic'),json_extract(e.value,'$.grade'),'unknown',json_extract(e.value,'$.source'),0,e.value,
 MIN(COALESCE(json_extract(e.value,'$.updatedAt'),s.updated_at),s.updated_at),CAST((julianday('now')-2440587.5)*86400000 AS INTEGER),CAST((julianday('now')-2440587.5)*86400000 AS INTEGER),1
 FROM students s,json_each(COALESCE(json_extract(s.state_json,'$.state.learningEvidence'),json_extract(s.state_json,'$.learningEvidence'),'[]')) e
 WHERE json_extract(e.value,'$.questionId') IS NOT NULL;
CREATE TRIGGER insight_save AFTER UPDATE OF state_json ON students WHEN COALESCE(json_extract(OLD.state_json,'$.state.learningEvidence'),json_extract(OLD.state_json,'$.learningEvidence'),'[]') IS NOT COALESCE(json_extract(NEW.state_json,'$.state.learningEvidence'),json_extract(NEW.state_json,'$.learningEvidence'),'[]') BEGIN
 INSERT OR IGNORE INTO insight_policy VALUES(NEW.classroom_id,1,CAST((julianday('now')-2440587.5)*86400000 AS INTEGER));
 INSERT OR IGNORE INTO learning_observations
 SELECT NEW.id,json_extract(e.value,'$.questionId'),NEW.revision,e.value,CAST((julianday('now')-2440587.5)*86400000 AS INTEGER)
 FROM json_each(COALESCE(json_extract(NEW.state_json,'$.state.learningEvidence'),json_extract(NEW.state_json,'$.learningEvidence'),'[]')) e
 WHERE json_extract(e.value,'$.updatedAt')>COALESCE((SELECT erased_before FROM insight_resets WHERE student_id=NEW.id),0) AND json_extract(e.value,'$.updatedAt')>=CAST((julianday('now')-2440587.5)*86400000 AS INTEGER)-15552000000 AND NOT EXISTS(SELECT 1 FROM learning_history h WHERE h.student_id=NEW.id AND h.question_id=json_extract(e.value,'$.questionId') AND (h.evidence_json=e.value OR json_extract(h.evidence_json,'$.updatedAt')>=json_extract(e.value,'$.updatedAt')));
 INSERT INTO learning_history
 SELECT NEW.id,json_extract(e.value,'$.questionId'),COALESCE(json_extract(e.value,'$.skillId'),json_extract(e.value,'$.grade')||':'||json_extract(e.value,'$.topic')),
 json_extract(e.value,'$.topic'),json_extract(e.value,'$.grade'),COALESCE(json_extract(e.value,'$.practiceSettings.challenge'),'unknown'),json_extract(e.value,'$.source'),
 CASE WHEN json_extract(e.value,'$.practiceSettings')=NEW.learning_json AND json_extract(e.value,'$.updatedAt')>=COALESCE((SELECT changed_at FROM insight_settings_history WHERE student_id=NEW.id AND version=NEW.settings_version),NEW.created_at) THEN NEW.settings_version ELSE 0 END,
 e.value,MIN(json_extract(e.value,'$.updatedAt'),CAST((julianday('now')-2440587.5)*86400000 AS INTEGER)),CAST((julianday('now')-2440587.5)*86400000 AS INTEGER),CAST((julianday('now')-2440587.5)*86400000 AS INTEGER),0
 FROM json_each(COALESCE(json_extract(NEW.state_json,'$.state.learningEvidence'),json_extract(NEW.state_json,'$.learningEvidence'),'[]')) e
 WHERE json_extract(e.value,'$.questionId') IS NOT NULL AND json_extract(e.value,'$.updatedAt')>COALESCE((SELECT erased_before FROM insight_resets WHERE student_id=NEW.id),0) AND json_extract(e.value,'$.updatedAt')>=CAST((julianday('now')-2440587.5)*86400000 AS INTEGER)-15552000000
 ON CONFLICT(student_id,question_id) DO UPDATE SET evidence_json=excluded.evidence_json,source=excluded.source,event_at=excluded.event_at,received_at=excluded.received_at
 WHERE json_extract(excluded.evidence_json,'$.updatedAt')>json_extract(learning_history.evidence_json,'$.updatedAt')
 AND json_extract(excluded.evidence_json,'$.attempts')>=json_extract(learning_history.evidence_json,'$.attempts')
 AND json_extract(excluded.evidence_json,'$.correct')>=json_extract(learning_history.evidence_json,'$.correct');
END;
