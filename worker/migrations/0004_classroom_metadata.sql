-- Teacher-owned metadata never increments the game checkpoint revision.
ALTER TABLE students ADD COLUMN learning_json TEXT;
ALTER TABLE students ADD COLUMN settings_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE students ADD COLUMN nickname_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE students ADD COLUMN nickname_at INTEGER NOT NULL DEFAULT 0;
UPDATE students SET learning_json=COALESCE(json_extract(state_json,'$.state.learning'),json_extract(state_json,'$.learning'));
CREATE TABLE learning_versions(student_id TEXT NOT NULL REFERENCES students(id),version INTEGER NOT NULL,learning_json TEXT NOT NULL,PRIMARY KEY(student_id,version));
INSERT INTO learning_versions SELECT id,settings_version,learning_json FROM students WHERE learning_json IS NOT NULL;
CREATE TRIGGER learning_created AFTER INSERT ON students BEGIN
 UPDATE students SET learning_json=COALESCE(NEW.learning_json,json_extract(NEW.state_json,'$.state.learning'),json_extract(NEW.state_json,'$.learning')) WHERE id=NEW.id;
END;
CREATE TRIGGER learning_updated AFTER UPDATE OF learning_json ON students WHEN NEW.learning_json IS NOT NULL BEGIN
 INSERT OR IGNORE INTO learning_versions VALUES(NEW.id,NEW.settings_version,NEW.learning_json);
END;
CREATE TABLE nickname_requests(student_id TEXT PRIMARY KEY REFERENCES students(id),request_id TEXT NOT NULL,proposed TEXT NOT NULL,status TEXT NOT NULL CHECK(status IN ('pending','approved','declined')),updated_at INTEGER NOT NULL);
CREATE TABLE classroom_batches(id TEXT PRIMARY KEY,classroom_id TEXT NOT NULL,payload TEXT NOT NULL,result TEXT NOT NULL,created_at INTEGER NOT NULL);
CREATE TABLE nickname_changes(id INTEGER PRIMARY KEY AUTOINCREMENT,classroom_id TEXT NOT NULL,student_id TEXT NOT NULL,old_alias TEXT NOT NULL,new_alias TEXT NOT NULL,created_at INTEGER NOT NULL);
-- Case-insensitive uniqueness for newly chosen aliases is checked transactionally.
CREATE UNIQUE INDEX student_alias_nocase ON students(classroom_id,alias COLLATE NOCASE);

CREATE TABLE settings_guards(id TEXT PRIMARY KEY,valid INTEGER NOT NULL CHECK(valid=1));
