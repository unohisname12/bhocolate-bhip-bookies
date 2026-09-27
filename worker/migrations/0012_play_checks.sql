-- Preserve explicit teacher schedules; new classrooms use the API's play default.
CREATE TABLE quick_check_policies_next (
 classroom_id TEXT PRIMARY KEY REFERENCES classrooms(id) ON DELETE CASCADE,
 cadence TEXT NOT NULL DEFAULT 'play' CHECK(cadence IN ('play','weekly','daily','teacher'))
);
INSERT INTO quick_check_policies_next SELECT * FROM quick_check_policies;
DROP TABLE quick_check_policies;
ALTER TABLE quick_check_policies_next RENAME TO quick_check_policies;
