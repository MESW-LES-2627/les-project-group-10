ALTER TABLE payment
  ALTER COLUMN reservation_expires_at SET DEFAULT (now() + interval '10 minutes');
