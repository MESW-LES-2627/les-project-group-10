-- Mentors manage their own availability slots. A slot now has a duration (tied to the
-- service it is offered for) instead of being a bare instant, and the database rejects
-- any new or changed slot that overlaps another slot of the same mentor.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE mentor_availability_slot
  ADD COLUMN service_id UUID REFERENCES service (id) ON DELETE CASCADE,
  ADD COLUMN ends_at TIMESTAMPTZ;

-- Backfill pre-existing (dev/seed) slots so the NOT NULL constraints below can apply.
UPDATE mentor_availability_slot slot
   SET service_id = (
         SELECT id FROM service
          WHERE mentor_id = slot.mentor_id ORDER BY price_cents, title LIMIT 1
       ),
       ends_at = slot.starts_at + (
         (SELECT duration_minutes FROM service
           WHERE mentor_id = slot.mentor_id ORDER BY price_cents, title LIMIT 1) || ' minutes'
       )::interval
 WHERE slot.service_id IS NULL;

ALTER TABLE mentor_availability_slot
  ALTER COLUMN service_id SET NOT NULL,
  ALTER COLUMN ends_at SET NOT NULL,
  ADD CONSTRAINT mentor_availability_slot_ends_after_starts CHECK (ends_at > starts_at);

-- Ranges are half-open ([start, end)), so back-to-back slots sharing a boundary are fine;
-- any true overlap, including between slots for different services, is rejected.
ALTER TABLE mentor_availability_slot
  ADD CONSTRAINT mentor_availability_slot_no_overlap
  EXCLUDE USING gist (mentor_id WITH =, tstzrange(starts_at, ends_at) WITH &&);

-- A cancelled booking no longer protects its slot, so the mentor must still be able to
-- delete that slot; the booking keeps its own scheduled_at as the historical record.
ALTER TABLE booking
  DROP CONSTRAINT booking_availability_slot_id_fkey,
  ADD CONSTRAINT booking_availability_slot_id_fkey
    FOREIGN KEY (availability_slot_id) REFERENCES mentor_availability_slot (id) ON DELETE SET NULL;
