--- 001_init.sql
--- Initial Schema, for vertical prototype

-- ---------------------------------------------------------------------------
-- User superclass and its subclasses (overlapping: one account may be both)
-- ---------------------------------------------------------------------------

CREATE TABLE "user" (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  username        TEXT        NOT NULL,
  email           TEXT        NOT NULL UNIQUE,
  password_hash   TEXT        NOT NULL,
  profile_pic_url TEXT,
  is_banned       BOOLEAN     NOT NULL DEFAULT false,
  is_deleted      BOOLEAN     NOT NULL DEFAULT false,  -- soft delete: the row (and its email) stays
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Student: shares the user's id. A user is a student if this row exists.
CREATE TABLE student(
    user_id         UUID PRIMARY KEY REFERENCES "user" (id) ON DELETE CASCADE,
    programme       TEXT,     -- optional, e.g. 'L.EIC', 'MESW'
    enrollment_year INTEGER   -- optional
);

-- Mentor: shares the user's id. A user is a mentor if this row exists.
CREATE TABLE mentor (
  user_id  UUID   PRIMARY KEY REFERENCES "user" (id) ON DELETE CASCADE,
  headline TEXT   NOT NULL,
  bio      TEXT   NOT NULL,
  skills   TEXT[] NOT NULL DEFAULT '{}' -- a list of text (strings)
);

CREATE INDEX idx_mentor_skills ON mentor USING GIN (skills);


-- ---------------------------------------------------------------------------
-- Categories (curated subject areas) and the mentor <-> category association
-- ---------------------------------------------------------------------------

CREATE TABLE category (
  id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE
);


-- came from the UML to relational schema transition
CREATE TABLE mentor_category (
  mentor_id   UUID NOT NULL REFERENCES mentor (user_id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES category (id)    ON DELETE CASCADE,
  PRIMARY KEY (mentor_id, category_id)
);

CREATE INDEX idx_mentor_category_category_id ON mentor_category (category_id);


-- ---------------------------------------------------------------------------
-- Services: what a mentor sells (a session type with a fixed fee)
-- ---------------------------------------------------------------------------

CREATE TABLE service (
  id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id        UUID    NOT NULL REFERENCES mentor (user_id) ON DELETE CASCADE,
  title            TEXT    NOT NULL,
  description      TEXT    NOT NULL,
  price_cents      INTEGER NOT NULL CHECK (price_cents >= 0),
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  is_active        BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX idx_service_mentor_id ON service (mentor_id);


-- ---------------------------------------------------------------------------
-- Bookings and payments
-- ---------------------------------------------------------------------------

-- BookingStatus: pending_payment | confirmed | completed | cancelled
CREATE TABLE booking (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   UUID        NOT NULL REFERENCES student (user_id),
  service_id   UUID        NOT NULL REFERENCES service (id),
  scheduled_at TIMESTAMPTZ NOT NULL,
  status       TEXT        NOT NULL DEFAULT 'pending_payment'
               CHECK (status IN ('pending_payment', 'confirmed', 'completed', 'cancelled')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_booking_student_id ON booking (student_id);
CREATE INDEX idx_booking_service_id ON booking (service_id);

-- PaymentStatus: pending | succeeded | failed        (student -> platform, via Stripe)
-- PayoutStatus:  pending | paid                      (platform -> mentor, manual)
CREATE TABLE payment (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id        UUID        NOT NULL REFERENCES booking (id),
  stripe_session_id TEXT        UNIQUE,
  amount_cents      INTEGER     NOT NULL CHECK (amount_cents >= 0),  -- price actually charged
  currency          TEXT        NOT NULL DEFAULT 'eur',
  status            TEXT        NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'succeeded', 'failed')),
  payout_status     TEXT        NOT NULL DEFAULT 'pending'
                    CHECK (payout_status IN ('pending', 'paid')),
  paid_out_at       TIMESTAMPTZ,
  payout_reference  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- A payout marked as paid must record when it was paid.
  CONSTRAINT payment_paid_has_date CHECK (payout_status <> 'paid' OR paid_out_at IS NOT NULL)
);

CREATE INDEX idx_payment_booking_id ON payment (booking_id);