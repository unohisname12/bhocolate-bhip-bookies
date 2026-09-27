-- Class rivals are shared by the whole class and outlive any single match, so they live beside the classroom.
CREATE TABLE class_rivals(classroom_id TEXT NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,rival_id TEXT NOT NULL,state_json TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 1,updated_at INTEGER NOT NULL,PRIMARY KEY(classroom_id,rival_id));
CREATE TABLE classroom_rival_settings(classroom_id TEXT PRIMARY KEY REFERENCES classrooms(id) ON DELETE CASCADE,taunts INTEGER NOT NULL DEFAULT 1);
