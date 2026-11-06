-- Existing profiles remain readable until mentors add their background.
ALTER TABLE mentor ADD COLUMN professional_background TEXT NOT NULL DEFAULT '';
