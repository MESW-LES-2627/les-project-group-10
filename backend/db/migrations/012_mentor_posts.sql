--- 012_mentor_posts.sql
--- Free educational posts published by mentors on their public profiles.

CREATE TABLE mentor_post (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id    UUID        NOT NULL REFERENCES mentor (user_id) ON DELETE CASCADE,
  title        TEXT        NOT NULL CHECK (btrim(title) <> ''),
  body         TEXT        NOT NULL CHECK (btrim(body) <> ''),
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mentor_post_mentor_id_published_at
  ON mentor_post (mentor_id, published_at DESC, id DESC);
