CREATE TABLE IF NOT EXISTS portal_rooms (
 id TEXT PRIMARY KEY,
 classroom_id TEXT NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
 code TEXT NOT NULL UNIQUE,
 projector_token TEXT NOT NULL,
 state_json TEXT NOT NULL,
 revision INTEGER NOT NULL DEFAULT 1,
 created_at INTEGER NOT NULL,
 expires_at INTEGER NOT NULL,
 finished_at INTEGER
);
CREATE UNIQUE INDEX IF NOT EXISTS portal_active_class ON portal_rooms(classroom_id) WHERE finished_at IS NULL;
CREATE INDEX IF NOT EXISTS portal_expiry ON portal_rooms(expires_at);
