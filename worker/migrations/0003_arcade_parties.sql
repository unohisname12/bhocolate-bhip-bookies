-- Classroom-only invitation rooms; game state is separate from personal pet saves.
CREATE TABLE arcade_parties (
 id TEXT PRIMARY KEY,
 classroom_id TEXT NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
 host_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
 revision INTEGER NOT NULL DEFAULT 1,
 state_json TEXT NOT NULL CHECK(json_valid(state_json)),
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL,
 expires_at INTEGER NOT NULL
);
CREATE INDEX arcade_parties_class_expiry ON arcade_parties(classroom_id,expires_at);
