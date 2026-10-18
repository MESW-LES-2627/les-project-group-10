--- 004_mentor_tagline_linkedin.sql
--- One-line intro and LinkedIn/portfolio link from the mentor onboarding "Your profile" step.

-- optional: a mentor row exists from signup, before onboarding collects these
ALTER TABLE mentor ADD COLUMN tagline      TEXT;
ALTER TABLE mentor ADD COLUMN linkedin_url TEXT;
