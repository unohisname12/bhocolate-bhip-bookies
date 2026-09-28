CREATE TABLE IF NOT EXISTS arena_math_questions (
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  challenge_id TEXT NOT NULL,
  problem_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (student_id, challenge_id)
);
