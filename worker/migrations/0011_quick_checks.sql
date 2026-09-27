CREATE TABLE quick_check_policies (
 classroom_id TEXT PRIMARY KEY REFERENCES classrooms(id) ON DELETE CASCADE,
 cadence TEXT NOT NULL DEFAULT 'weekly' CHECK(cadence IN ('weekly','daily','teacher'))
);
CREATE TABLE quick_checks (
 student_id TEXT PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
 state_json TEXT NOT NULL,
 revision INTEGER NOT NULL DEFAULT 1,
 updated_at INTEGER NOT NULL
);
