# Issue #23 acceptance evidence

Executed on 10 November 2026 on top of `main` (`05df2c4`), in two passes: a backend-only pass,
followed by a frontend pass adding `/dashboard/slots`. Environment: Node 22.5.1, a local
PostgreSQL 14.18 instance (the project's usual Docker-based PostgreSQL 17 was unavailable in this
environment; the schema and queries used here are version-agnostic standard SQL/`pg`), Vitest
4.1.12. No Stripe calls were made. No Chromium/Playwright browser automation was available in this
environment (`chromium-cli` and `playwright` are both absent, and installing a browser binary was
out of scope for this pass); the frontend is instead verified through component tests that render
the real router/React tree against jsdom with the API layer mocked, plus a live, non-mocked
end-to-end smoke test described below that exercises the real backend, a real PostgreSQL database,
and the Vite dev server's `/api` proxy together (curl-driven, not a rendered browser DOM).

## Acceptance criteria

| Criterion                                                                     | Verification                                                                                                                     | Expected                                                                                                                        | Actual / result                                                                                                                                                                                |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Future slot saved and visible after refresh                                   | `POST /me/slots` then `GET /me/slots` in an HTTP integration test                                                                | Created slot appears in the listing                                                                                             | Pass: "creates a future slot and lists it after refresh"                                                                                                                                       |
| Available slot can be changed/removed                                         | `PUT`/`DELETE /me/slots/:id` on a slot with no active booking                                                                    | Update/removal succeeds and is reflected on refresh                                                                             | Pass: "moves an available slot to a new time, visible after refresh"; delete path covered in the booked-slot test once the booking is cancelled                                                |
| Overlapping slot rejected, including across services; shared boundary allowed | Create a slot, then attempt an overlapping one for a different service; separately create a back-to-back slot                    | Overlap rejected with `409 slot_overlap`, no write; boundary-sharing slot accepted                                              | Pass: "rejects an overlapping slot, even for a different service, without writing it"; "allows a back-to-back slot sharing a boundary with another"                                            |
| Active booking blocks change/removal                                          | Insert a `pending_payment` booking against a slot, then attempt `PUT` and `DELETE`; cancel the booking and retry                 | Both rejected with `409 slot_booked` while active; both succeed once cancelled                                                  | Pass: "refuses to change or remove a slot with an active booking"                                                                                                                              |
| Past / inverted / too-short slot rejected with a reason                       | Submit a past date, an end time before the start, and a range shorter than the service's duration                                | Each rejected with `400 validation_error` and a field-level message, no write                                                   | Pass: `it.each` case "rejects a slot that %s, without writing it" (3 sub-cases)                                                                                                                |
| Timezone is consistent and clear                                              | Inspect stored (UTC) vs. returned (`date`/`startTime`/`endTime`, computed via `AT TIME ZONE 'Europe/Lisbon'`) values             | Same convention as existing booking/profile code; unambiguous to both participants                                              | Pass by construction: reuses the same `AT TIME ZONE 'Europe/Lisbon'` conversion already used for bookings and public availability; not a new scheme                                            |
| Other users cannot manage the mentor's slots                                  | As a second mentor account: list, `PUT`, `DELETE` the first mentor's slot id; unauthenticated/student/banned/deleted role matrix | Other mentor sees `404` for the specific slot id and cannot see it in their own listing; unauthorized roles receive `401`/`403` | Pass: "prevents another mentor from reading, changing or removing someone else's slots"; "rejects unauthorized slot management for %s" (`undefined`→401, student→403, banned→403, deleted→401) |

## Additional verification

- Backend unit suite: **56 tests passed**, including a new `mentorSlotSchema` suite (valid input,
  invalid `serviceId`/`date`/`startTime`, missing fields).
- Backend integration suite: **37 tests passed** against real PostgreSQL, including the existing
  mentor-profile suite (updated to insert its fixture slot with the now-required `service_id`/
  `ends_at` columns) and the new `mentors.slots.integration.test.ts` (14 tests, listed above).
- Verified the migration (`009_mentor_slot_management.sql`) applies cleanly to a fresh database,
  that re-running the migration runner is a no-op, and that `db/seed.sql` (updated so its
  generated slots carry a service and duration) inserts 440 slots with no constraint violations.
- Frontend suite: **100 tests passed**, including the new `mentorSlots.test.tsx` (10 tests: listing
  with a booked badge, add, client-side range validation, server `409 slot_overlap`, edit, two-click
  delete confirm and cancel, server `409 slot_booked` on delete, the mentor/student/incomplete-
  onboarding guard matrix, and ignoring a late load after unmount) and `mentorSlotsEdit.test.ts`
  (validator unit tests).
- `npm run lint`, `npm run typecheck` and `npm run build` pass in both `backend/` and `frontend/`;
  root `npm run format:check` passes.
- **Live end-to-end smoke test** (not part of the automated suites): started the real backend
  (`tsx src/server.ts`) against a fresh PostgreSQL database (migrated + seeded) and the real Vite
  dev server, then drove the actual HTTP API — not mocks — through both origins: registered a
  mentor, completed onboarding, and through `/dashboard/slots`'s exact request shape (confirmed by
  reading the built/served module) created a slot (`201`), attempted an overlapping one (`409
slot_overlap`), updated the slot's time (`200`), deleted it (`204`), confirmed the listing emptied
  afterward, confirmed an unauthenticated request is rejected (`401`), and confirmed the Vite dev
  server's `/api` proxy forwards these calls to the backend exactly as the browser would issue them.
  Also confirmed the built frontend bundle and dev-served sidebar module include the new page and
  nav link. This caught one **pre-existing, unrelated bug**: `db/seed.sql`'s comment says seeded
  accounts use bcrypt hashes "so the backend must verify them with bcrypt," but
  `backend/src/modules/auth/password.ts` actually verifies with scrypt — so none of the seeded
  demo accounts (e.g. `rui.costa@example.com`) can log in through `POST /api/auth/login` as
  currently seeded. This is unrelated to slot management (it blocks all login, not just this
  feature) and was not fixed here; the live smoke test instead registered a fresh account through
  the real registration endpoint. Flagging it as a separate, pre-existing issue to file.
- **Full browser walkthrough with screenshots** (follow-up pass, same day): with Playwright
  (`playwright-core`, driving the system-installed Google Chrome) available after all, re-ran the
  smoke test as a real headless-browser session against the real backend/frontend/Postgres,
  capturing one screenshot per acceptance criterion: creating a slot and seeing it persist after a
  real page reload; editing and removing an available slot (two-click delete confirmation) with the
  change surviving a reload; an overlapping slot (different service) rejected with
  `409 slot_overlap` and a back-to-back boundary slot accepted; past-date, inverted-range and
  too-short-for-service submissions each rejected with a field-level reason; the mentor's own
  dashboard note on the Europe/Lisbon timezone alongside the anonymous/student-facing public
  profile view showing the identical date and times ("Times shown in Lisbon time (WEST)"); a
  booked slot shown with a disabled "Booked" badge in the UI, backed by the server returning
  `409 slot_booked` on direct `PUT`/`DELETE` attempts; and a second mentor's own, empty slot list,
  backed by the server returning `404 slot_not_found` when that second mentor's session is used to
  target the first mentor's slot id directly. Screenshots saved to
  `~/Desktop/availability-slots-screenshots/` for manual review. All demo accounts/bookings created
  for this pass were deleted afterward.

## Delivery boundaries

This change spans both backend and frontend: the migration, `mentors.slots.schemas.ts`/
`mentors.slots.queries.ts`, the four `/api/mentors/me/slots` routes, the `bookings.queries.ts`
lookup narrowed to the booked service's own slot, and a new `/dashboard/slots` page (plus its API
wrapper, validator, router entry and sidebar link) replacing the gap left by the onboarding
"availability grid" (which remains a non-persisted placeholder, unchanged by this work). Changes
remain local: no push, PR, merge, hosted CI execution or teammate review has occurred.
