CREATE TABLE IF NOT EXISTS arena_rooms (
 id TEXT PRIMARY KEY,
 classroom_id TEXT NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
 state_json TEXT NOT NULL,
 revision INTEGER NOT NULL DEFAULT 0,
 created_at INTEGER NOT NULL,
 expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS arena_rooms_class ON arena_rooms(classroom_id,expires_at);

CREATE TABLE IF NOT EXISTS arena_seats (
 student_id TEXT PRIMARY KEY,
 room_id TEXT NOT NULL REFERENCES arena_rooms(id) ON DELETE CASCADE
);
