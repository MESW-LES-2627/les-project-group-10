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

-- Older app versions omit the snapshot during deployment and rollback.
CREATE FUNCTION fill_booking_service_snapshot() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  SELECT COALESCE(NEW.service_title, s.title),
         COALESCE(NEW.service_duration_minutes, s.duration_minutes),
         COALESCE(NEW.service_price_cents, s.price_cents)
    INTO NEW.service_title, NEW.service_duration_minutes, NEW.service_price_cents
    FROM service s
   WHERE s.id = NEW.service_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER booking_fill_service_snapshot
BEFORE INSERT ON booking
FOR EACH ROW
WHEN (NEW.service_title IS NULL OR NEW.service_duration_minutes IS NULL OR NEW.service_price_cents IS NULL)
EXECUTE FUNCTION fill_booking_service_snapshot();
