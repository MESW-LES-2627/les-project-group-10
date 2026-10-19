-- seed.sql
-- Development data for FEUP Connect. Safe to run more than once: every row has a fixed id
-- (or a unique slug) and is inserted with ON CONFLICT DO NOTHING.
-- Dates are relative to the moment the seed first runs ("5 days ago", "in 2 days").
--
-- DEV ONLY. Every account uses the password:  Password123!
-- Passwords are bcrypt hashes generated with pgcrypto, so the backend must verify them with bcrypt.
--
-- Accounts
--   Students only : Beatriz Santos, Tiago Ferreira, Marta Oliveira, Carlos Mendes (banned)
--   Mentors only  : Rui Costa, Inês Marques, Sofia Almeida, Miguel Pinto (soft-deleted)
--   Both          : Ana Silva, Diogo Ramos
--
-- Id ranges: users 1000..., services 2000..., bookings 3000..., payments 4000...

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Categories
-- ---------------------------------------------------------------------------

INSERT INTO category (name, slug) VALUES
  ('Software Engineering',            'software-engineering'),
  ('Algorithms and Data Structures',  'algorithms-data-structures'),
  ('Databases',                       'databases'),
  ('Web Development',                 'web-development'),
  ('Data Science and AI',             'data-science-ai'),
  ('Computer Networks',               'computer-networks'),
  ('Mathematics',                     'mathematics'),
  ('Physics',                         'physics'),
  ('Electronics',                     'electronics'),
  ('Career Guidance',                 'career-guidance'),
  ('Electrical Engineering',          'electrical-engineering'),
  ('Mechanical Engineering',          'mechanical-engineering'),
  ('Civil Engineering',               'civil-engineering')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Users (superclass)
-- ---------------------------------------------------------------------------

INSERT INTO "user" (id, username, email, password_hash, is_banned, is_deleted)
SELECT v.id::uuid, v.username, v.email, crypt('Password123!', gen_salt('bf', 10)), v.is_banned, v.is_deleted
FROM (VALUES
  ('10000000-0000-0000-0000-000000000001', 'Ana Silva',       'ana.silva@example.com',       false, false),
  ('10000000-0000-0000-0000-000000000002', 'Rui Costa',       'rui.costa@example.com',       false, false),
  ('10000000-0000-0000-0000-000000000003', 'Inês Marques',    'ines.marques@example.com',    false, false),
  ('10000000-0000-0000-0000-000000000004', 'Diogo Ramos',     'diogo.ramos@example.com',     false, false),
  ('10000000-0000-0000-0000-000000000005', 'Sofia Almeida',   'sofia.almeida@example.com',   false, false),
  ('10000000-0000-0000-0000-000000000006', 'Miguel Pinto',    'miguel.pinto@example.com',    false, true),   -- soft-deleted mentor
  ('10000000-0000-0000-0000-000000000007', 'Beatriz Santos',  'beatriz.santos@example.com',  false, false),
  ('10000000-0000-0000-0000-000000000008', 'Tiago Ferreira',  'tiago.ferreira@example.com',  false, false),
  ('10000000-0000-0000-0000-000000000009', 'Marta Oliveira',  'marta.oliveira@example.com',  false, false),
  ('10000000-0000-0000-0000-000000000010', 'Carlos Mendes',   'carlos.mendes@example.com',   true,  false)   -- banned student
) AS v(id, username, email, is_banned, is_deleted)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Students (subclass)
-- ---------------------------------------------------------------------------

INSERT INTO student (user_id, programme, enrollment_year)
SELECT v.user_id::uuid, v.programme, v.enrollment_year
FROM (VALUES
  ('10000000-0000-0000-0000-000000000001', 'L.EIC', 2022),  -- Ana (also a mentor)
  ('10000000-0000-0000-0000-000000000004', 'MEIC',  2025),  -- Diogo (also a mentor)
  ('10000000-0000-0000-0000-000000000007', 'L.EIC', 2023),  -- Beatriz
  ('10000000-0000-0000-0000-000000000008', 'MESW',  2025),  -- Tiago
  ('10000000-0000-0000-0000-000000000009', NULL,    NULL),  -- Marta (optional fields left empty)
  ('10000000-0000-0000-0000-000000000010', 'L.EIC', 2021)   -- Carlos (banned)
) AS v(user_id, programme, enrollment_year)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Mentors (subclass)
-- ---------------------------------------------------------------------------

INSERT INTO mentor (user_id, headline, bio, skills)
SELECT v.user_id::uuid, v.headline, v.bio, v.skills
FROM (VALUES
  ('10000000-0000-0000-0000-000000000001',
   'Object-Oriented Design tutor',
   'Final-year L.EIC student with top marks in Object-Oriented Design. I explain design patterns with small, concrete examples.',
   ARRAY['OOD', 'Java', 'UML', 'Design Patterns']),
  ('10000000-0000-0000-0000-000000000002',
   'Software engineer: backend and databases',
   'Five years building backend systems in industry. I show how university concepts apply in practice and review your projects.',
   ARRAY['PostgreSQL', 'Node.js', 'System Design', 'Code Review']),
  ('10000000-0000-0000-0000-000000000003',
   'Data scientist: machine learning and statistics',
   'Graduate working on machine learning products. I help students with models, evaluation and statistics.',
   ARRAY['Python', 'scikit-learn', 'Statistics', 'Machine Learning']),
  ('10000000-0000-0000-0000-000000000004',
   'Algorithms and competitive programming coach',
   'Regular at programming contests. I teach problem-solving patterns, from graphs to dynamic programming.',
   ARRAY['C++', 'Algorithms', 'Dynamic Programming', 'Graphs']),
  ('10000000-0000-0000-0000-000000000005',
   'Frontend engineer: React and TypeScript',
   'Frontend developer at a product company. Happy to help with React projects, TypeScript and accessible UIs.',
   ARRAY['React', 'TypeScript', 'Tailwind CSS', 'Accessibility']),
  ('10000000-0000-0000-0000-000000000006',
   'Mathematics tutor',
   'Calculus and linear algebra for first-year students. (Seeded as a deleted account, to test that search hides it.)',
   ARRAY['Calculus', 'Linear Algebra'])
) AS v(user_id, headline, bio, skills)
ON CONFLICT DO NOTHING;

-- Location and languages. An UPDATE (not part of the INSERT above) so that re-running
-- the seed also fills them in for mentors that already exist.
UPDATE mentor m
SET location = v.location, languages = v.languages
FROM (VALUES
  ('10000000-0000-0000-0000-000000000001', 'Porto, Portugal',  ARRAY['Portuguese', 'English']),
  ('10000000-0000-0000-0000-000000000002', 'Lisbon, Portugal', ARRAY['Portuguese', 'English', 'Spanish']),
  ('10000000-0000-0000-0000-000000000003', 'Porto, Portugal',  ARRAY['Portuguese', 'English', 'French']),
  ('10000000-0000-0000-0000-000000000004', 'Braga, Portugal',  ARRAY['Portuguese', 'English']),
  ('10000000-0000-0000-0000-000000000005', 'Porto, Portugal',  ARRAY['Portuguese', 'English', 'German']),
  ('10000000-0000-0000-0000-000000000006', 'Coimbra, Portugal', ARRAY['Portuguese'])
) AS v(user_id, location, languages)
WHERE m.user_id = v.user_id::uuid;

-- Seeded mentors are complete profiles, so the mentor search can list them.
UPDATE mentor SET onboarding_finished = true
WHERE user_id::text LIKE '10000000-0000-0000-0000-%';

-- Seed bookable times separately so rerunning the seed adds only new future slots.
INSERT INTO mentor_availability_slot (mentor_id, starts_at)
SELECT m.user_id,
       (slot_day::date + start_time) AT TIME ZONE 'Europe/Lisbon'
FROM mentor m
JOIN "user" u ON u.id = m.user_id
CROSS JOIN LATERAL generate_series(
  current_date + 1,
  current_date + 30,
  interval '1 day'
) AS days(slot_day)
CROSS JOIN (VALUES (TIME '09:00'), (TIME '11:00'), (TIME '14:00'), (TIME '16:00')) AS times(start_time)
WHERE m.onboarding_finished AND NOT u.is_banned AND NOT u.is_deleted
  AND EXTRACT(ISODOW FROM slot_day) BETWEEN 1 AND 5
ON CONFLICT (mentor_id, starts_at) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Mentor <-> category
-- ---------------------------------------------------------------------------

INSERT INTO mentor_category (mentor_id, category_id)
SELECT v.mentor_id::uuid, c.id
FROM (VALUES
  ('10000000-0000-0000-0000-000000000001', 'software-engineering'),
  ('10000000-0000-0000-0000-000000000002', 'databases'),
  ('10000000-0000-0000-0000-000000000002', 'software-engineering'),
  ('10000000-0000-0000-0000-000000000002', 'career-guidance'),
  ('10000000-0000-0000-0000-000000000003', 'data-science-ai'),
  ('10000000-0000-0000-0000-000000000003', 'mathematics'),
  ('10000000-0000-0000-0000-000000000004', 'algorithms-data-structures'),
  ('10000000-0000-0000-0000-000000000005', 'web-development'),
  ('10000000-0000-0000-0000-000000000006', 'mathematics')
) AS v(mentor_id, slug)
JOIN category c ON c.slug = v.slug
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Services (price in cents)
-- ---------------------------------------------------------------------------

INSERT INTO service (id, mentor_id, title, description, price_cents, duration_minutes, is_active)
SELECT v.id::uuid, v.mentor_id::uuid, v.title, v.description, v.price_cents, v.duration_minutes, v.is_active
FROM (VALUES
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
   'OOD tutoring (1h)', 'Concepts, exercises and exam preparation for Object-Oriented Design.', 1500, 60, true),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001',
   'Design patterns exam prep', 'Intensive review of the most common design patterns, with practice questions.', 2200, 90, true),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002',
   'Quick code review', 'Review one pull request or script and get actionable feedback.', 1500, 30, true),
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002',
   'Database design session', 'Model your schema together and review queries and indexes.', 4000, 60, true),
  ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000002',
   'Career and CV review', 'Mock interview questions and feedback on your CV.', 3000, 45, true),
  ('20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000002',
   'System design deep dive', 'Design a full system end to end. Not offered at the moment.', 6000, 120, false),
  ('20000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000003',
   'Intro to machine learning', 'From data preparation to model evaluation, using your own dataset.', 3500, 60, true),
  ('20000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000003',
   'Statistics for your project', 'Choose and interpret the right statistical tests.', 2500, 45, true),
  ('20000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000004',
   'Dynamic programming workshop', 'Learn to spot and solve DP problems step by step.', 1800, 60, true),
  ('20000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000004',
   'Contest problem practice', 'Solve and discuss contest-style problems together.', 2000, 60, true),
  ('20000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000005',
   'React project help', 'Debug and improve your React and TypeScript project.', 2800, 60, true),
  ('20000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000006',
   'Calculus tutoring', 'Limits, derivatives and integrals.', 1200, 60, true)
) AS v(id, mentor_id, title, description, price_cents, duration_minutes, is_active)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Bookings: all four statuses; Ana and Diogo book as students with other mentors
-- day_offset is relative to today (negative = past), hour is the start hour
-- ---------------------------------------------------------------------------

INSERT INTO booking (id, student_id, service_id, scheduled_at, status, created_at)
SELECT v.id::uuid, v.student_id::uuid, v.service_id::uuid,
       date_trunc('day', now()) + make_interval(days => v.day_offset, hours => v.hour),
       v.status,
       now() - make_interval(days => v.created_days_ago)
FROM (VALUES
  -- id, student, service, day_offset, hour, status, created_days_ago
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000001', -10, 15, 'completed',       14),  -- Beatriz -> Ana, OOD tutoring
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000004',  -5, 10, 'completed',        9),  -- Tiago -> Rui, database design
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000005',   2, 17, 'confirmed',        3),  -- Beatriz -> Rui, CV review
  ('30000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000007',   4, 14, 'confirmed',        2),  -- Marta -> Inês, intro to ML
  ('30000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000009',   6, 16, 'pending_payment',  0),  -- Tiago -> Diogo, DP workshop
  ('30000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000011',  -3, 11, 'cancelled',        6),  -- Marta -> Sofia, payment failed
  ('30000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003',  -2, 18, 'completed',        5),  -- Ana (as student) -> Rui, code review
  ('30000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000008',   1, 13, 'confirmed',        1)   -- Diogo (as student) -> Inês, statistics
) AS v(id, student_id, service_id, day_offset, hour, status, created_days_ago)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Payments: amount_cents is the price charged at the time (copied from the service)
-- Covers succeeded, failed and pending payments, a retry on one booking,
-- and payouts that are both pending and paid.
-- ---------------------------------------------------------------------------

INSERT INTO payment (id, booking_id, amount_cents, status, payout_status,
                     paid_out_at, payout_reference, created_at)
SELECT v.id::uuid, v.booking_id::uuid, v.amount_cents, v.status, v.payout_status,
       now() - make_interval(days => v.paid_out_days_ago),   -- NULL when paid_out_days_ago is NULL
       v.payout_reference,
       now() - make_interval(days => v.created_days_ago)
FROM (VALUES
  -- id, booking, amount, status, payout_status, paid_out_days_ago, payout_reference, created_days_ago
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 1500, 'succeeded', 'paid',    8,    'SEED-TRANSFER-0001', 14),
  ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', 4000, 'succeeded', 'pending', NULL, NULL,                9),
  ('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003', 3000, 'succeeded', 'pending', NULL, NULL,                3),
  ('40000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000004', 3500, 'succeeded', 'pending', NULL, NULL,                2),
  ('40000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000005', 1800, 'failed',    'pending', NULL, NULL,                1),  -- first attempt declined
  ('40000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000005', 1800, 'pending',   'pending', NULL, NULL,                0),  -- retry in progress
  ('40000000-0000-0000-0000-000000000007', '30000000-0000-0000-0000-000000000006', 2800, 'failed',    'pending', NULL, NULL,                6),
  ('40000000-0000-0000-0000-000000000008', '30000000-0000-0000-0000-000000000007', 1500, 'succeeded', 'pending', NULL, NULL,                5),
  ('40000000-0000-0000-0000-000000000009', '30000000-0000-0000-0000-000000000008', 2500, 'succeeded', 'pending', NULL, NULL,                1)
) AS v(id, booking_id, amount_cents, status, payout_status, paid_out_days_ago, payout_reference, created_days_ago)
ON CONFLICT DO NOTHING;
