--- 002_mentor_onboarding.sql
--- A mentor row is now created at signup, before onboarding collects the headline.

ALTER TABLE mentor ALTER COLUMN headline DROP NOT NULL;

-- false until the mentor finishes onboarding; the mentor search lists only finished mentors.
ALTER TABLE mentor ADD COLUMN onboarding_finished BOOLEAN NOT NULL DEFAULT false;
