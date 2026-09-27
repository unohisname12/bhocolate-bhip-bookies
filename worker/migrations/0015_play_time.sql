-- Earned game minutes live server-side so reloads, other devices, and edited saves cannot mint time.
CREATE TABLE play_time(student_id TEXT PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,state_json TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 1,updated_at INTEGER NOT NULL);
CREATE TABLE play_time_policies(classroom_id TEXT PRIMARY KEY REFERENCES classrooms(id) ON DELETE CASCADE,policy_json TEXT NOT NULL);
