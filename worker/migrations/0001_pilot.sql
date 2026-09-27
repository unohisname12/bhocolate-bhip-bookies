PRAGMA foreign_keys = ON;
CREATE TABLE teachers (
  id TEXT PRIMARY KEY,
  credential_hash TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL
);
CREATE TABLE classrooms (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL UNIQUE REFERENCES teachers(id),
  code TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL
);
CREATE TABLE students (
  id TEXT PRIMARY KEY,
  classroom_id TEXT NOT NULL REFERENCES classrooms(id),
  alias TEXT NOT NULL,
  credential_hash TEXT NOT NULL UNIQUE,
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  revision INTEGER NOT NULL DEFAULT 1,
  state_json TEXT NOT NULL CHECK(json_valid(state_json)),
  assignment TEXT NOT NULL DEFAULT 'discovery',
  request_id TEXT NOT NULL UNIQUE,
  updated_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(classroom_id, alias)
);
CREATE INDEX students_classroom ON students(classroom_id);
CREATE TRIGGER class_size_limit BEFORE INSERT ON students WHEN (SELECT COUNT(*) FROM students WHERE classroom_id=NEW.classroom_id)>=35 BEGIN
  SELECT RAISE(ABORT, 'pilot_class_full');
END;
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK(role IN ('teacher','student')),
  actor_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX sessions_actor ON sessions(actor_id);
CREATE INDEX sessions_expiry ON sessions(expires_at);
CREATE TABLE save_versions (
  student_id TEXT NOT NULL REFERENCES students(id),
  revision INTEGER NOT NULL,
  state_json TEXT NOT NULL,
  request_id TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  PRIMARY KEY(student_id, revision)
);
CREATE TABLE daily_recovery (
  student_id TEXT NOT NULL REFERENCES students(id),
  day TEXT NOT NULL,
  state_json TEXT NOT NULL,
  revision INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY(student_id, day)
);
CREATE TABLE rate_limits (
  key TEXT PRIMARY KEY,
  hits INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE TABLE audit_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  classroom_id TEXT NOT NULL,
  student_id TEXT,
  action TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX audit_classroom ON audit_events(classroom_id, created_at);
-- Atomic with the save UPDATE: never acknowledge a save without its recovery version.
CREATE TRIGGER save_created AFTER INSERT ON students BEGIN
  INSERT INTO save_versions VALUES(NEW.id, NEW.revision, NEW.state_json, NEW.request_id, NEW.updated_at);
  INSERT OR IGNORE INTO daily_recovery VALUES(NEW.id, date(NEW.updated_at/1000, 'unixepoch'), NEW.state_json, NEW.revision, NEW.updated_at);
END;
CREATE TRIGGER save_updated AFTER UPDATE OF state_json ON students BEGIN
  INSERT INTO save_versions VALUES(NEW.id, NEW.revision, NEW.state_json, NEW.request_id, NEW.updated_at);
  INSERT OR IGNORE INTO daily_recovery VALUES(NEW.id, date(NEW.updated_at/1000, 'unixepoch'), NEW.state_json, NEW.revision, NEW.updated_at);
  DELETE FROM save_versions WHERE student_id=NEW.id AND revision < NEW.revision-19;
  DELETE FROM daily_recovery WHERE student_id=NEW.id AND day < date(NEW.updated_at/1000, 'unixepoch', '-30 days');
END;
