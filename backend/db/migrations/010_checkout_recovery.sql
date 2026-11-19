ALTER TABLE payment
  DROP CONSTRAINT payment_status_check,
  ADD CONSTRAINT payment_status_check CHECK (status IN ('pending', 'succeeded', 'failed', 'expired')),
  ADD COLUMN stripe_creation_started_at TIMESTAMPTZ,
  ADD COLUMN stripe_receipt_email TEXT;
