--- 009_student_profile.sql
--- Student onboarding answers and profile fields. Subjects reuse category via student_category.
--- Availability is not stored for students: the mentor's slots are what a student books from.

-- optional: a student row exists from signup, before onboarding collects these
ALTER TABLE student
  ADD COLUMN study_level      TEXT,
  ADD COLUMN budget_min_cents INTEGER CHECK (budget_min_cents >= 0),
  ADD COLUMN budget_max_cents INTEGER CHECK (budget_max_cents >= budget_min_cents);

-- Subjects the student wants help with (same category table as mentor_category)
CREATE TABLE student_category (
  student_id  UUID NOT NULL REFERENCES student (user_id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES category (id)     ON DELETE CASCADE,
  PRIMARY KEY (student_id, category_id)
);

CREATE INDEX idx_student_category_category_id ON student_category (category_id);
