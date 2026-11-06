# Issue #21 acceptance evidence

Executed on 6 November 2026 on `feat/mentor-profile-editing`, based on `main`.
Verified feature commit: `28624b8` (`feat(mentors): add transactional public profile editing`).
Environment: Node 22.22.2, PostgreSQL 17 in a disposable local instance, Vitest 4.1.12, and the in-app
browser against Vite on port 5177 and Express on port 3000. Docker was unavailable, so the installed
PostgreSQL 17 binary was used with a separate temporary data directory and database. The normal
application database was not used. No Stripe calls or hosted deployments were part of acceptance.

## Acceptance criteria

| Criterion                            | Steps                                                                                                                               | Expected                                                                      | Actual / result                                                                                                                                                                                              |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Saved details load                   | Sign in as a completed fixture mentor; open `/dashboard/profile`                                                                    | Stored headline, biography, background, subjects and skills populate controls | Pass: original headline/biography, Physics, empty skills/background loaded in the browser; integration GET also checks exact values and options                                                              |
| Valid edits persist                  | Change all fields, add Mathematics and duplicate React skills, save; refresh; sign out and back in                                  | Saved values survive both reload and a new session                            | Pass: browser retained all text and both subjects; server normalized duplicate skills to TypeScript/React; real HTTP password sign-in also retains values                                                    |
| Public details update                | Log out and open the mentor URL directly                                                                                            | Anonymous visitor sees saved biography/background, all subjects and skills    | Pass: browser showed edited details, Mathematics/Physics and TypeScript/React without auth; component tests also verify fifteen skills and service-less rendering; HTTP tests verify public list/detail data |
| Invalid edits preserve saved profile | Deselect all subjects and submit; cancel; submit malformed and unknown-category HTTP payloads                                       | Clear error; database retains prior profile                                   | Pass: browser focused the error summary and displayed subject validation; cancel restored selection; HTTP tests verified no writes for invalid requests                                                      |
| Failed save preserves saved profile  | Force a category-link insert failure after scalar writes in the disposable database; simulate API/network errors in component tests | Transaction rolls back, draft remains available for correction/retry          | Pass: HTTP test confirmed fields and links unchanged; component tests retained draft, announced errors, and successfully retried                                                                             |
| Other users cannot edit              | Attempt anonymous/student/incomplete/banned/deleted access, mentor B targeting A, and an arbitrary-ID PUT                           | Unauthorized access rejected; A unchanged; no other-user edit control         | Pass: HTTP tests cover all cases and dual-role self-edit; component tests check owner controls, student denial and incomplete redirects                                                                      |

## Additional verification

- Backend unit suite: **46 tests passed**, including profile schema boundary/normalization tests and
  existing onboarding validation tests.
- Backend integration suite: **23 tests passed** against real PostgreSQL. Includes concurrent saves,
  category replacement, preservation of service/slot/booking/payment records, visibility rules,
  invalid/expired cookies, upgrade compatibility and rerunning migrations.
- Frontend suite: **58 tests passed**, including editor component tests, API mapping/errors, draft
  validation, updated search fields, plain-text rendering and checkout login return URLs.
- Browser: editor checked at the default narrow viewport and 1440px desktop; anonymous profile
  checked at 390px. The public profile header was adjusted only for this route, then verified with
  content width equal to the 390px viewport. No browser console errors were recorded during the
  completed flow. Error focus was observed; screen-reader announcement behavior was not manually
  tested with assistive technology.
- Production frontend build, backend build/typecheck, both linters and formatting checks are recorded
  in the final local verification run. These local checks do not establish hosted CI status.

## Delivery boundaries

Changes remain local. No push, PR, merge, hosted CI execution or teammate review has occurred.
The feature documentation and test evidence are ready for a future review against `main`.
