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

## Onboarding

Student onboarding (`/student-onboarding`, behind sign-in) saves to the database:

1. **Interests** loads the subject areas from `GET /api/categories`, so each chip is a real
   `category` row. If the request fails the step shows an error with **Try again** and the student
   can still continue.
2. **Preferences** (budget and study level) ends with **Finish setup**, which sends everything in a
   single `PATCH /api/students/me` (budget converted from euros to cents). The backend applies it
   in one transaction.

Nothing is saved before **Finish setup**, so **Skip for now**, going back or closing the tab leaves
the profile untouched and the profile page shows "Not set yet". If the save fails, the student stays
on the step, sees the error and can try again; they only reach "all set" after a successful save.
A study level that was not chosen, or an empty interest list, is left out of the request instead of
clearing saved values.

## API

`GET /api/categories` is public and returns `{ categories: [{ id, name }] }` sorted by name.

`GET /api/students/me` returns `userId`, `programme`, `enrollmentYear`, `studyLevel`,
`budgetMinCents`, `budgetMaxCents`, `categoryIds` and `categories` (`[{ id, name }]`, sorted by
name). `categoryIds` is kept for the `PATCH` below.

`PATCH /api/students/me` takes a partial body: `studyLevel`, `budgetMinCents`, `budgetMaxCents`,
`categoryIds` (omitted = untouched, `null` = cleared, `categoryIds` replaces the whole set) and
returns the updated profile. Errors use the shared shape `{ error: { code, message, fields? } }`:
`400 validation_error` with one message per field, and `403 not_a_student`.

## Tests

`backend/tests/students/students.profile.integration.test.ts` covers reading a full and an empty
profile, saving through `PATCH`, a bad budget, an unknown interest, a mentor-only account (403) and
a missing session (401). `backend/tests/categories/categories.integration.test.ts` covers the
categories list. Run it with
`npm run test:integration` and a disposable `TEST_DATABASE_URL` ending in `_test`.
