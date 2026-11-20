-- Admin role (issue #36).
-- Admin: shares the user's id. A user is an admin if this row exists.
-- Like student and mentor, it is a subclass of "user", so one account may hold several roles.

CREATE TABLE admin (
  user_id UUID PRIMARY KEY REFERENCES "user" (id) ON DELETE CASCADE
);
