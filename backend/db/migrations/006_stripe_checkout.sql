ALTER TABLE payment
  ADD COLUMN stripe_payment_intent_id TEXT UNIQUE,
  ADD COLUMN reservation_expires_at TIMESTAMPTZ;

UPDATE payment p SET reservation_expires_at = p.created_at + interval '10 minutes'
  WHERE reservation_expires_at IS NULL;

ALTER TABLE payment
  ALTER COLUMN reservation_expires_at SET NOT NULL,
  DROP COLUMN mock_method,
  DROP COLUMN mock_outcome,
  DROP COLUMN mock_reference;
