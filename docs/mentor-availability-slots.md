# Mentor availability slot management

Completed mentors can create, change and remove their own bookable time slots from
**Availability slots** in the dashboard (`/dashboard/slots`, linked from the sidebar next to
**My profile**). Each slot is tied to one of the mentor's own services, has a start and end time,
and the database rejects any slot that overlaps another slot belonging to the same mentor, even
one for a different service.

## Fields and behavior

| Field       | Validation                                                                            |
| ----------- | ------------------------------------------------------------------------------------- |
| `serviceId` | Required; must be one of the signed-in mentor's own services                          |
| `date`      | Required; must describe a time in the future                                          |
| `startTime` | Required, `HH:MM`                                                                     |
| `endTime`   | Required, `HH:MM`; must be after `startTime` and cover the service's minimum duration |

A slot's `date`/`startTime`/`endTime` are interpreted in Europe/Lisbon, matching every other
scheduling field in the app (bookings, public availability). The stored instant is UTC; the API
always converts it back to Europe/Lisbon before returning it, so the same slot reads the same way
for the mentor and for the student viewing the mentor's public profile.

Saving is rejected, with a field-level reason, when:

- the slot starts in the past;
- the end time is before or at the start time;
- the slot is shorter than the selected service's duration;
- `serviceId` does not belong to the signed-in mentor;
- the proposed time range overlaps another slot of the same mentor — including a slot for a
  different service. Ranges are half-open (`[start, end)`), so two slots may share a boundary
  (one ending exactly when the next starts) without conflicting.

A slot that has an active booking — `pending_payment`, `confirmed`, or `completed` — cannot be
changed or removed; the mentor must wait for the reservation to expire or the booking to be
cancelled first. Once a booking is `cancelled`, the slot it used is free to edit or delete again,
and removing the slot does not delete the historical booking record (its `scheduled_at` stays the
source of truth; it simply stops pointing at a slot).

Only the signed-in mentor can read, change or delete their own slots. Routes never take a mentor
id from the client: they always use the account resolved from the session, so a slot id that
belongs to someone else looks the same as one that does not exist (`404`).

## API

All endpoints require a mentor session; a student-only account receives `403 not_a_mentor`, and
an invalid/expired session receives `401`.

`GET /api/mentors/me/slots` returns every slot the mentor owns, oldest first:

```json
{
  "slots": [
    {
      "id": "5a0f...",
      "serviceId": "20000000-...-0003",
      "serviceTitle": "Quick code review",
      "date": "2026-12-01",
      "startTime": "09:00",
      "endTime": "09:30",
      "booked": false
    }
  ]
}
```

`POST /api/mentors/me/slots` accepts `{ serviceId, date, startTime, endTime }` and returns
`{ "slot": { ... } }` with status `201` on success.

`PUT /api/mentors/me/slots/:id` accepts the same body and replaces the slot's service and time,
returning `{ "slot": { ... } }`. Rejected with `409 slot_booked` if the slot has an active
reservation or booking.

`DELETE /api/mentors/me/slots/:id` removes the slot and returns `204`. Rejected with
`409 slot_booked` under the same condition as above.

Both mutating routes return `404 slot_not_found` for an id that does not exist or belongs to
another mentor, and `409 slot_overlap` when the proposed time range overlaps one of the mentor's
other slots. Invalid fields return `400 validation_error` with the standard error shape:

```json
{
  "error": {
    "code": "validation_error",
    "message": "Invalid input",
    "fields": { "endTime": "This service needs at least 60 minutes" }
  }
}
```

Existing booking/checkout and public-profile availability behavior is unchanged other than
matching a requested booking time against the slot created for that specific service, instead of
any slot at that instant.

## Frontend

`/dashboard/slots` (`frontend/src/pages/dashboard/MentorSlotsPage.tsx`) follows the same
guard pattern as the profile editor: it shows a loading state, redirects a signed-out mentor to
log in, shows an inline message for a student-only account, and redirects an incomplete mentor
back into onboarding. The page lists existing slots (service, date, time range, a **Booked** badge
for slots with an active reservation), and supports adding, inline-editing and removing a slot —
mirroring the inline add/edit list used for services during onboarding
(`ServiceList`/`ServiceEditForm`). Editing and removing a booked slot are disabled client-side, in
addition to the server returning `409 slot_booked` if attempted. Removing a slot requires a second,
confirming click (there is no confirmation-dialog primitive in the UI kit to reuse, so this uses a
simple inline "Delete this slot? Confirm / Cancel" swap instead). A heading note states that times
are shown and saved in Europe/Lisbon.

`frontend/src/api/mentorSlots.ts` wraps the four endpoints above; `frontend/src/lib/mentorSlots.ts`
catches empty fields and an inverted time range client-side before any request is sent. The service
picker reuses `getMentorById` (there is no separate "my services" endpoint) rather than adding one
for this change.

## Migration and local checks

```bash
npm --prefix backend run db:migrate
```

Migration `009_mentor_slot_management.sql`:

- adds `service_id` and `ends_at` to `mentor_availability_slot` (backfilling existing dev/seed
  rows before making both columns `NOT NULL`), so a slot now has a duration instead of being a
  bare instant;
- adds a `CHECK (ends_at > starts_at)` constraint;
- adds a Postgres exclusion constraint (`EXCLUDE USING gist`, requiring `btree_gist`) so the
  database itself rejects two overlapping slots for the same mentor, as defense in depth beyond
  the application-level check;
- changes `booking.availability_slot_id`'s foreign key to `ON DELETE SET NULL`, so a slot that
  only has cancelled bookings against it can still be deleted.

Do not edit or reverse applied migrations, including this one.

Unit and integration tests:

```bash
npm --prefix backend test
npm --prefix backend run test:integration
npm --prefix frontend test
```

The integration suite (`backend/tests/mentors/mentors.slots.integration.test.ts`) runs against a
real PostgreSQL 17 database whose name ends in `_test` — see
[mentor-profile-editing.md](mentor-profile-editing.md#migration-and-local-checks) for the exact
Docker/`createdb` setup. It covers: creating and listing a future slot, rejecting an overlapping
slot (including across services), allowing a back-to-back boundary slot, every rejection reason
(past, inverted/short range, foreign service), moving an available slot, refusing to change or
remove a slot with an active booking (and allowing it again once the booking is cancelled),
ownership isolation, and the auth/role matrix.

Remaining checks:

```bash
npm run format:check
npm --prefix backend run lint
npm --prefix backend run typecheck
npm --prefix backend run build
```

See [acceptance evidence](testing/issue-23-acceptance.md) for executed scenarios and results.
