CREATE TABLE IF NOT EXISTS teacher_battle_rooms (
 id TEXT PRIMARY KEY, classroom_id TEXT NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
 code TEXT NOT NULL UNIQUE, invite TEXT NOT NULL UNIQUE, projector_token TEXT NOT NULL, state_json TEXT NOT NULL,
 revision INTEGER NOT NULL DEFAULT 0, expires_at INTEGER NOT NULL, finished_at INTEGER
);
CREATE UNIQUE INDEX IF NOT EXISTS teacher_battle_active ON teacher_battle_rooms(classroom_id) WHERE finished_at IS NULL;
CREATE TABLE IF NOT EXISTS teacher_guardians (
 teacher_id TEXT PRIMARY KEY REFERENCES teachers(id) ON DELETE CASCADE,
 name TEXT NOT NULL, color TEXT NOT NULL CHECK(color IN ('midnight','emerald','amethyst'))
);
