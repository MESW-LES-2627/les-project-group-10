# Student profile page

Students can open their own read-only profile at `/dashboard/student`, from the **Student profile**
item in the dashboard sidebar or by clicking their avatar in the top-right corner.

## What it shows

| Field              | Source                                                      |
| ------------------ | ----------------------------------------------------------- |
| Name, email        | The authenticated user (`GET /api/me`)                      |
| Programme          | `student.programme`                                         |
| Enrollment year    | `student.enrollment_year`                                   |
| Study level        | `student.study_level`                                       |
| Budget per session | `student.budget_min_cents` / `budget_max_cents`, shown in € |
| Interests          | `student_category` joined with `category` (names)           |

Fields the student has not filled in show "Not set yet". The **Edit profile** button is design only
for now: the edit page is a separate feature.

## Behavior

- The route requires a session. An account without a student profile (a mentor-only account) is
  redirected to `/dashboard`, and the sidebar item is hidden. For such accounts the avatar links to
  the mentor editor at `/dashboard/profile` instead.
- The backend is the real guard: `GET /api/students/me` answers `401` without a session and `403`
  when the account has no `student` row. The id always comes from the session cookie.

## API

`GET /api/students/me` returns `userId`, `programme`, `enrollmentYear`, `studyLevel`,
`budgetMinCents`, `budgetMaxCents`, `categoryIds` and `categories` (`[{ id, name }]`, sorted by
name). `categoryIds` is kept for the future `PATCH /api/students/me` edit flow.

## Tests

`backend/tests/students/students.profile.integration.test.ts` covers a full profile, an empty
profile, a mentor-only account (403) and a missing session (401). Run it with
`npm run test:integration` and a disposable `TEST_DATABASE_URL` ending in `_test`.
