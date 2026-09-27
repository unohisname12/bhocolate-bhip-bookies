CREATE TABLE pet_duels (
 id TEXT PRIMARY KEY, classroom_id TEXT NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
 state_json TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0,
 created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, finished_at INTEGER
);
CREATE INDEX pet_duels_class ON pet_duels(classroom_id,created_at);
CREATE TABLE pet_duel_seats (
 student_id TEXT PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
 duel_id TEXT NOT NULL REFERENCES pet_duels(id) ON DELETE CASCADE
);
CREATE TABLE pet_duel_entries (
 duel_id TEXT NOT NULL REFERENCES pet_duels(id) ON DELETE CASCADE,
 student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
 PRIMARY KEY(duel_id,student_id)
);
