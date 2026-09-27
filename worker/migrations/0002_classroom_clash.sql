CREATE TABLE clash_rounds (
 id TEXT PRIMARY KEY, classroom_id TEXT NOT NULL REFERENCES classrooms(id),
 started_at INTEGER NOT NULL, ends_at INTEGER NOT NULL, finished_at INTEGER
);
CREATE UNIQUE INDEX clash_one_active ON clash_rounds(classroom_id) WHERE finished_at IS NULL;
CREATE TABLE clash_answers (
 round_id TEXT NOT NULL REFERENCES clash_rounds(id), student_id TEXT NOT NULL REFERENCES students(id),
 question_id TEXT NOT NULL, points INTEGER NOT NULL, PRIMARY KEY(round_id,student_id,question_id)
);
-- Scoring and the acknowledged checkpoint commit atomically. Retries cannot score twice.
CREATE TRIGGER clash_score_save AFTER UPDATE OF state_json ON students
WHEN NEW.active=1 AND NEW.request_id NOT LIKE 'clash-%'
BEGIN
 INSERT OR IGNORE INTO clash_answers(round_id,student_id,question_id,points)
 SELECT r.id, NEW.id, json_extract(q.value,'$.questionId'), 10
 FROM clash_rounds r, json_each(NEW.state_json,'$.state.learningEvidence') q
 WHERE r.classroom_id=NEW.classroom_id AND r.finished_at IS NULL
 AND NEW.updated_at>=r.started_at AND NEW.updated_at<r.ends_at
 AND json_extract(q.value,'$.correct')=1
 AND json_extract(q.value,'$.source') IN ('practice','catch','battle','warmup','trace','discovery','growth','evolution','expedition','bridge')
 AND json_extract(q.value,'$.updatedAt')>=r.started_at
 AND NOT EXISTS (SELECT 1 FROM json_each(OLD.state_json,'$.state.learningEvidence') old
   WHERE json_extract(old.value,'$.questionId')=json_extract(q.value,'$.questionId') AND json_extract(old.value,'$.correct')=1);
END;
