CREATE TABLE IF NOT EXISTS delivery_rooms (
  id TEXT PRIMARY KEY,
  classroom_id TEXT NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  revision INTEGER NOT NULL DEFAULT 1,
  state_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS delivery_classroom ON delivery_rooms(classroom_id, updated_at);
