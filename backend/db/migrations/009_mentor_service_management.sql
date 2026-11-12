--- 009_mentor_service_management.sql
--- A booking must keep showing the title, duration and fee that were true when the
--- student booked it, even after the mentor later edits or deactivates that service.

ALTER TABLE booking
  ADD COLUMN service_title TEXT,
  ADD COLUMN service_duration_minutes INTEGER,
  ADD COLUMN service_price_cents INTEGER;

-- Backfill from the service each existing booking still points at.
UPDATE booking b
   SET service_title = s.title,
       service_duration_minutes = s.duration_minutes,
       service_price_cents = s.price_cents
  FROM service s
 WHERE s.id = b.service_id AND b.service_title IS NULL;

ALTER TABLE booking
  ALTER COLUMN service_title SET NOT NULL,
  ALTER COLUMN service_duration_minutes SET NOT NULL,
  ALTER COLUMN service_price_cents SET NOT NULL;
