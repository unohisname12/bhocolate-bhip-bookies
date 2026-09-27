CREATE TABLE skill_challenges (
 id TEXT PRIMARY KEY,
 classroom_id TEXT NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
 teacher_id TEXT NOT NULL,
 policy_json TEXT NOT NULL,
 created_at INTEGER NOT NULL,
 closed_at INTEGER,
 winner_id TEXT,
 winner_reason TEXT NOT NULL DEFAULT ''
);
CREATE UNIQUE INDEX skill_challenge_active ON skill_challenges(classroom_id) WHERE closed_at IS NULL;
CREATE TABLE skill_challenge_learners (
 challenge_id TEXT NOT NULL REFERENCES skill_challenges(id) ON DELETE CASCADE,
 student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
 progress_json TEXT NOT NULL,
 revision INTEGER NOT NULL DEFAULT 1,
 updated_at INTEGER NOT NULL,
 PRIMARY KEY(challenge_id,student_id)
);
CREATE INDEX skill_challenge_student ON skill_challenge_learners(student_id);
CREATE TABLE skill_challenge_audit (
 id TEXT PRIMARY KEY,
 challenge_id TEXT NOT NULL REFERENCES skill_challenges(id) ON DELETE CASCADE,
 student_id TEXT,
 teacher_id TEXT NOT NULL,
 action TEXT NOT NULL,
 detail_json TEXT NOT NULL,
 created_at INTEGER NOT NULL
);
