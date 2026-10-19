-- Persist bookable slots so checkout can reserve a real database-backed time.
CREATE TABLE mentor_availability_slot (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id  UUID        NOT NULL REFERENCES mentor (user_id) ON DELETE CASCADE,
  starts_at  TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (mentor_id, starts_at)
);

ALTER TABLE booking
  ADD COLUMN availability_slot_id UUID REFERENCES mentor_availability_slot (id);

-- A pending, confirmed, or completed booking consumes its slot; cancellation releases it.
CREATE UNIQUE INDEX idx_booking_active_availability_slot
  ON booking (availability_slot_id)
  WHERE availability_slot_id IS NOT NULL AND status <> 'cancelled';

-- Mock transaction metadata stays on the existing payment record. No card data is stored.
ALTER TABLE payment
  ADD COLUMN idempotency_key UUID UNIQUE,
  ADD COLUMN mock_method TEXT CHECK (mock_method IN ('card', 'mbway', 'apple')),
  ADD COLUMN mock_outcome TEXT CHECK (mock_outcome IN ('approved', 'declined')),
  ADD COLUMN mock_reference TEXT UNIQUE;
