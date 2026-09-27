-- Typed pet names are teacher-moderated text, so they live here and never inside a student-writable save.
-- `approved` survives while a newer `proposed` name waits for review.
CREATE TABLE pet_names(student_id TEXT NOT NULL REFERENCES students(id),pet_id TEXT NOT NULL,approved TEXT,proposed TEXT,request_id TEXT,status TEXT CHECK(status IN ('pending','approved','declined')),updated_at INTEGER NOT NULL,PRIMARY KEY(student_id,pet_id));
-- Separate table: provisioning inserts into classrooms positionally, so adding a column there would break it.
CREATE TABLE classroom_pet_settings(classroom_id TEXT PRIMARY KEY REFERENCES classrooms(id),typed_pet_names INTEGER NOT NULL DEFAULT 1);
