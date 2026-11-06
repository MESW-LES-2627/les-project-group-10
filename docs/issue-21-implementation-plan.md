# Issue #21 implementation plan: mentor profile editing

Issue: [Update a mentor's public profile](https://github.com/MESW-LES-2627/les-project-group-10/issues/21).

Status: implemented and verified locally on `feat/mentor-profile-editing`, based on `main`.
Updated on 6 November 2026. See [acceptance evidence](testing/issue-21-acceptance.md) for results.
Changes have not been pushed.

## 1. Current baseline and delivery workflow

Use `main` as the integration branch for this story. Start a feature branch such as
`feat/mentor-profile-editing` from the latest `main` and open the PR against `main`.
The current CI workflow already targets PRs to `main`.

The `develop` workflow and CD work on `feat/deployment` are pending work, not prerequisites for this
story. Do not introduce staging/production environments, Vercel/Neon configuration, deployment
secrets, or a CD workflow as part of profile editing. Validate locally using the existing Docker
PostgreSQL setup and through PR CI. If deployment work merges before implementation finishes,
reconcile the affected files then without expanding this story's scope.

## 2. Scope and proposed product decisions

Deliver an editor for a completed mentor's biography, professional background, subjects and skills.
Keep the existing professional headline editable alongside the background. Save these five fields
together, using PostgreSQL as the authority.

Professional background has no current persistence model. This plan proposes a separate plain-text
`professionalBackground` field describing work and education. Confirm this interpretation during
review before implementation. If structured employment/education entries are required, revise the
schema, API, UI and tests together.

| Field                    | Proposed validation                                                                                            |
| ------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `headline`               | Trimmed, required, 1–120 characters; existing onboarding server limit                                          |
| `bio`                    | Trimmed, required, 1–1000 characters; existing onboarding server limit                                         |
| `professionalBackground` | Trimmed, required when saving the editor, 1–2000 characters                                                    |
| `subjects`               | 1–4 distinct existing category names; reject unknown names                                                     |
| `skills`                 | 0–15 skills, each trimmed and 1–40 characters; collapse case-insensitive duplicates, preserving first spelling |

Older mentors start with an empty background and remain publicly readable. Load that value into the
editor and explain that completing it is required before saving. Keep existing onboarding valid
without the new field. Hide the public background section when empty.

Services, prices, availability, account name, location, languages, tagline, links, photos,
verification, payments, posts and reviews remain outside the edit contract.

## 3. Existing code and gaps

- `backend/src/modules/mentors/mentors.routes.ts` has onboarding completion and public reads, but no
  private editor read/update. The onboarding endpoint rejects completed profiles and inserts
  services; do not reuse it for editing.
- `mentors.queries.ts` persists biography, headline, skills and category associations. Add background
  persistence while preserving visibility: completed onboarding and an account neither banned nor
  deleted.
- `frontend/src/api/mentors.ts` maps public data into `Mentor` and sets `experience: []`. Do not
  fabricate structured experience entries from the proposed free-text field.
- `MentorProfilePage.tsx` detects the owner but has no edit action. Its early return when there are
  no services also prevents profile details from rendering.
- `/mentors/:mentorId` currently requires authentication despite the public API. Anonymous viewing
  needs to work to demonstrate the issue's public-visitor acceptance criterion.
- Subjects are hardcoded in `MentorExpertiseStep.tsx`; supply authoritative database options to the
  editor. Inspect shared controls and callers before changing their interfaces.
- Existing Vitest tests run in Node. There is no HTTP/database integration suite or DOM environment.
  CI migrates/seeds PostgreSQL but omits package unit tests.
- The issue's `CLAUDE.md` reference is stale: that file is absent. Follow local `AGENTS.md`, README
  and `docs/definition-of-done.md`, and note the stale reference in the PR.

## 4. Implementation sequence

### A. Add compatible persistence

1. Add `backend/db/migrations/008_mentor_professional_background.sql` if `008` remains available
   when implementation starts. Add `mentor.professional_background TEXT NOT NULL DEFAULT ''`.
2. Never edit merged migrations. Do not infer background from biographies or headlines. Optional
   demo values belong in the repeatable seed, not a fabricated migration backfill.
3. Verify both clean-database migration and upgrading existing data. Rerunning migrations must keep
   data intact. Existing signup and onboarding must work without the new field.

### B. Implement the editor API

Keep HTTP handlers, validation and SQL in the existing mentor module's routes, schemas and queries.

| Endpoint                         | Contract                                                                                             |
| -------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `GET /api/mentors/me/profile`    | `{ profile: { headline, bio, professionalBackground, subjects, skills }, subjectOptions: string[] }` |
| `PUT /api/mentors/me/profile`    | Full replacement of those five fields; returns `{ profile }` containing normalized committed values  |
| Existing public list/detail GETs | Add `professionalBackground`; preserve current fields and visibility rules                           |

1. Register private routes before `/:id`. Apply `requireAuth` and derive the sole target ID from
   `res.locals.user.id`; never accept a target account ID from the caller.
2. Check mentor membership, including dual-role accounts. Return `403 not_a_mentor` for students
   without that role, and `409 onboarding_required` for incomplete mentors. Preserve existing
   unauthenticated, banned and deleted-account checks.
3. Use a strict Zod update schema. Reject unexpected properties, including identity, services,
   onboarding flags and account status. Share scalar validators with onboarding where useful
   without changing its contract. Return consistent field errors through `parseBody`/`HttpError`.
4. Read editable fields and subjects consistently using one SQL statement or a transaction
   snapshot; return alphabetically ordered category options.
5. Save with `withTransaction`: lock the mentor row with `FOR UPDATE`, check eligibility, validate
   category membership, update only allowed columns, and replace only that mentor's category
   associations. Use parameterized SQL and preserve all unrelated data.
6. Build the normalized result inside the transaction and send success only after commit. Any
   validation or database failure rolls back both scalar fields and subject associations.
7. Serialize simultaneous saves through the row lock. Document last successful save wins; ensure
   concurrent requests never produce a mixture of submitted field sets. Version-based conflict
   detection is outside this story.
8. Set private editor responses to `Cache-Control: no-store`; ensure public reads show fresh saved
   values. Never return private account fields.

### C. Build the editor and navigation

1. Add `apiPut` to `frontend/src/api/client.ts` through the existing request/error helper. Add typed
   editor functions to `api/mentors.ts`; no page-level `fetch` calls.
2. Add `pages/mentors/EditMentorProfilePage.tsx` at `/dashboard/profile`. Protect it with auth and
   mentor/onboarding guards. Wait for auth resolution; redirect incomplete mentors to onboarding
   and show access denied to student-only users.
3. Add an owner-only “Edit profile” action to the profile and mentor-only “My profile” navigation.
   Support dual-role users. Another user must never see controls to edit the viewed profile.
4. Load saved values from the private API. Show loading, load error/retry, ready, saving, success
   and save error states. Prevent blank submission before loading completes.
5. Reuse existing text, subject and skill controls where appropriate. Match server limits, use
   database-backed category options, and provide labels, counts, keyboard operation and accessible
   field errors.
6. Separate the saved snapshot from the draft. Disable duplicate submissions and freeze submitted
   fields while saving. Cancel restores the saved snapshot. A failed save retains draft inputs and
   leaves the snapshot untouched. Success replaces both with the normalized server response.
7. Handle validation, session expiry, permission failure and network/server errors distinctly.
   Ignore stale load completions after unmount. Returning to the public page must fetch current data.
8. If a response is lost after a possible commit, say the save could not be confirmed and offer
   reload/retry. A transport failure alone cannot prove that the database was unchanged.

### D. Display saved public information

1. Extend the public response and `Mentor` adapter with `professionalBackground`, defaulting to
   empty when absent. Display biography and background separately as escaped plain text, preserving
   line breaks. Never render submitted HTML.
2. Show all saved subjects and skills on the profile; do not truncate them to the first subject or
   eight preview tags. Keep directory-card previews and ordering unchanged.
3. Remove `RequireAuth` only from the public profile route. Use existing public navigation/footer
   for anonymous visitors and the dashboard shell for signed-in users. Keep editing, checkout and
   booking confirmation protected. Verify login retains the intended checkout URL.
4. Render profile details even without services. Show an unavailable-session state for booking
   controls instead of returning an empty page.
5. Recheck directory search after editing subjects/skills. Preserve accent-insensitive multiword
   matching; do not expand search to biography or background.

## 5. Automated tests

### Backend unit tests

Extend mentor schema tests to cover valid payloads, trimming, Unicode, multiline text, exact limits,
missing/blank/wrong-type fields, oversized arrays/members, subject duplicates, skill normalization,
unknown properties and identity/role/service tampering. Preserve onboarding compatibility without
background. Validate category existence in database tests, not with schema-only assertions.

### Backend HTTP/database integration tests

Add `backend/tests/mentors/mentors.profile.integration.test.ts`, a separate Vitest integration config,
and `test:integration`. Exclude integration files from ordinary unit runs. Use PostgreSQL 17, the real
Express app on an ephemeral port, native HTTP/fetch and real session cookies; no live Stripe calls or
new production dependency is necessary.

Require an explicitly configured disposable test database and fail closed if it is absent. Never
target a developer database containing useful data. Apply migrations before the suite. Create
fixtures for two completed mentors, a student, an incomplete mentor, a dual-role user, banned/deleted
users and categories. Clean up fixtures and close server/pool resources. Serialize shared database
fixtures; an outer test transaction cannot isolate HTTP requests using separate pool connections.

Cover:

- GET loads exact saved values, legacy empty background and valid options.
- PUT persists normalized values across later private/public list/detail reads.
- Subject replacement removes old links and never affects another mentor.
- Invalid input and unknown categories return field errors and preserve every saved value.
- A controlled database failure after scalar writes rolls back fields and associations. Use a
  test-only failure fixture, such as a temporary trigger in the disposable database, with cleanup.
- Anonymous, expired/invalid-session, banned/deleted, student-only and incomplete users are rejected.
  Completed dual-role mentors can edit themselves.
- Mentor B cannot update A by submitting a target ID or trying an arbitrary-ID update URL; verify
  A's rows remain unchanged and B's valid self-update affects only B.
- Concurrent saves leave one complete submitted profile.
- Editing preserves services, availability, bookings, payments and onboarding status.
- Public visibility restrictions remain enforced and no email/password fields leak.
- Clean migrations, existing-data upgrades and migration reruns work.

### Frontend tests

Add API/normalization tests under `frontend/tests/mentor/` for DTO mapping, background compatibility,
all subjects/skills, PUT handling, field errors and allowed payload fields. Extend mentor-search
fixtures for updated subjects/skills.

Add the smallest component-testing setup needed: React Testing Library and a Vitest-compatible DOM
environment as development dependencies, with lockfiles updated. Keep pure tests in Node; apply the
DOM environment only to component tests. Assert behavior rather than markup snapshots:

- Saved values populate controls; failed/incomplete loading cannot overwrite the profile.
- Valid save sends allowed fields, blocks repeat submissions and displays normalized success.
- Failed save retains the draft, exposes accessible errors and supports retry; cancel resets it.
- Role/owner guards, incomplete onboarding, session expiry and stale-response handling work.
- Biography/background render as text; all subjects/skills and service-less profiles render.
- Anonymous profile viewing works while editing and checkout remain protected.

## 6. Acceptance evidence

Create `docs/testing/issue-21-acceptance.md` during implementation. Record commit, environment, steps,
expected result, actual result and pass/fail. Populate actual results only after execution.

| Issue criterion                  | Scenario and expected result                                                                               |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Saved details load               | Completed mentor opens the editor; all fields match persisted API values                                   |
| Changes persist                  | Edit every field, save, refresh and sign out/in; values remain identical                                   |
| Public details update            | Anonymous window and student session open the profile; all saved details appear                            |
| Invalid details preserve profile | Blank/oversized values and an unknown subject return clear errors; fresh reads retain the previous profile |
| Failed save preserves profile    | Controlled server rollback leaves persisted/public values unchanged and retains the draft                  |
| Other users cannot edit          | Student and mentor B lack A's controls; direct requests cannot change A; anonymous requests are rejected   |

Also check desktop/mobile layouts, keyboard access, error focus/announcements, a legacy background,
dual-role navigation, service-less profiles, edited search results and existing onboarding. Verify
anonymous checkout navigation requests login and retains the destination. No payment is needed for
this story's acceptance.

## 7. CI and verification

Keep `.github/workflows/ci.yml` targeting PRs to `main`. Add both package unit-test commands and the
backend integration command after migrations, using the existing PostgreSQL service and a dedicated
test database variable. Preserve existing TODO comments as required by the local guide; annotate
that the new steps cover tests. Do not add CD settings or deployment secrets.

Run on Node 22+ after defining the integration script and documenting its database configuration:

```bash
npm run format:check
npm --prefix backend run lint
npm --prefix backend run typecheck
npm --prefix backend run build
npm --prefix backend test
npm --prefix backend run test:integration
npm --prefix frontend run lint
npm --prefix frontend test
npm --prefix frontend run build
```

Use Docker PostgreSQL locally. Apply migrations to the disposable test database for integration
checks and to the local development database for browser acceptance. Record pre-existing failures
honestly and resolve failures introduced by the story before review.

## 8. Documentation and completion

1. Add `docs/mentor-profile-editing.md`: editor entry point, fields/limits, endpoint examples,
   authentication/errors, public visibility, legacy-background behavior, transactions/concurrent
   saves, migration instructions, test setup/commands and excluded capabilities.
2. Keep feature setup, integration/component test commands and test-only database configuration in
   `docs/mentor-profile-editing.md`. Leave the main README unchanged. No production secret is needed.
3. Update local `AGENTS.md` to reflect implemented editing/background boundaries. Keep it ignored
   and never commit it. Preserve historical iteration claims.
4. Keep implementation and commits local; do not push or open a PR. When separately authorized,
   target `main`, link #21 and include test/acceptance evidence for teammate review.
5. Merge only after required CI passes and all five issue criteria are demonstrated. Green CI is
   verification evidence, not evidence of deployment.
6. For anyone running the updated checkout, apply migrations before starting code that reads the
   new column. A code rollback can leave the additive column in place; do not reverse an applied
   migration. Follow whichever deployment process is actually adopted separately when release is
   requested.

Completion requires working code, passing unit/integration/component checks, recorded acceptance,
updated docs, green PR CI, teammate approval and merge into `main`. This plan alone completes none
of the implementation checkboxes.
