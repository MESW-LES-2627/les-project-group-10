--- 003_mentor_location_languages.sql
--- Location and spoken languages from the mentor onboarding "Your profile" step.
--- Subjects need no change: they are the existing category / mentor_category tables.

-- optional: a mentor row exists from signup, before onboarding collects these
ALTER TABLE mentor ADD COLUMN location  TEXT;
ALTER TABLE mentor ADD COLUMN languages TEXT[] NOT NULL DEFAULT '{}';
