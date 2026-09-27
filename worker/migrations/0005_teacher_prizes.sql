CREATE TABLE teacher_prize_batches(id TEXT PRIMARY KEY,classroom_id TEXT NOT NULL REFERENCES classrooms(id),payload TEXT NOT NULL,result TEXT NOT NULL,created_at INTEGER NOT NULL);
CREATE TABLE teacher_prizes(id TEXT PRIMARY KEY,classroom_id TEXT NOT NULL REFERENCES classrooms(id),student_id TEXT NOT NULL REFERENCES students(id),prize_id TEXT NOT NULL,batch_id TEXT NOT NULL REFERENCES teacher_prize_batches(id),created_at INTEGER NOT NULL,claimed_at INTEGER,used_at INTEGER);
CREATE INDEX teacher_prizes_student ON teacher_prizes(student_id,claimed_at,used_at);
