# Mentor service management

Mentors can add, edit and deactivate their own services (title, description, duration and fee)
from **Services & fees** in the dashboard (`/dashboard/services`, linked from the sidebar next to
**My profile**). Editing or deactivating a service never changes a booking already made against
it: each booking keeps the title, duration and agreed price that were true when the student booked
it, independently of whatever the service looks like now.

## Fields and behavior

| Field             | Validation                                                                                                                                                 |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`           | Required, 1–100 characters                                                                                                                                 |
| `description`     | Required, 1–500 characters                                                                                                                                 |
| `priceCents`      | Required whole number of cents, €0.50–€1000 (a fractional cent is rejected, which is the API's way of rejecting a price with more than two decimal places) |
| `durationMinutes` | Required whole number of minutes, 5–480 (so "not positive" is always rejected)                                                                             |

Saving is rejected, with a field-level reason, when a required field is empty or whitespace-only,
the fee is negative or below €0.50, the fee is not a whole number of cents (more than two decimal
places), or the duration is zero, negative, or not a whole number. The same rules that validate a
service during onboarding validate it here — adding and editing reuse one Zod schema.

Deactivating a service (`isActive: false`) immediately removes it from the mentor's public profile
and from new checkouts: `createPendingBooking` already filters on `service.is_active`, and the
public profile only lists active services, so a deactivated service simply disappears from both
without any extra flag to thread through. It can be reactivated the same way. Deactivating does
**not** touch any existing booking — a booking only ever references a service by id for the
mentor's identity, never for its own, currently-displayed details.

### Why edits don't change past bookings

Before this change, a booking's displayed title and duration came from a live join to `service`,
so editing a service would have silently rewritten what every past booking for it showed. Migration
`009_mentor_service_management.sql` adds `service_title`, `service_duration_minutes` and
`service_price_cents` to `booking`, filled in once at booking time and never touched again.
`createPendingBooking` writes them when the booking is created; `findBookingForStudent` and
`findUpcomingBookingsForStudent` read them from the booking row instead of from `service`. The
amount actually charged (`payment.amount_cents`) was already an immutable snapshot taken at
checkout time, so that part needed no change — only the service's own descriptive fields did.

Only the signed-in mentor can read, add, change or deactivate their own services. Routes never take
a mentor id from the client: they always use the account resolved from the session, so a service id
that belongs to someone else looks the same as one that does not exist (`404`).

## API

All endpoints require a mentor session; a student-only account receives `403 not_a_mentor`, and an
invalid/expired session receives `401`.

`GET /api/mentors/me/services` returns every service the mentor owns, active and inactive, sorted
by title:

```json
{
  "services": [
    {
      "id": "20000000-...-0001",
      "title": "OOD tutoring (1h)",
      "description": "Concepts, exercises and exam preparation.",
      "priceCents": 1500,
      "durationMinutes": 60,
      "isActive": true
    }
  ]
}
```

`POST /api/mentors/me/services` accepts `{ title, description, priceCents, durationMinutes }` and
returns `{ "service": { ... } }` with status `201`.

`PUT /api/mentors/me/services/:id` accepts the same body and replaces the service's title,
description, price and duration, returning `{ "service": { ... } }`. It never changes `isActive`.

`PATCH /api/mentors/me/services/:id/active` accepts `{ isActive }` and flips only that flag,
returning `{ "service": { ... } }`.

All three mutating routes return `404 service_not_found` for an id that does not exist or belongs
to another mentor. Invalid fields return `400 validation_error` with the standard error shape:

```json
{
  "error": {
    "code": "validation_error",
    "message": "Invalid input",
    "fields": { "priceCents": "Fee must be at least €0.50" }
  }
}
```

Existing booking/checkout and public-profile behavior is otherwise unchanged: a booking's `service_id`
still points at the live service row (for the mentor's identity and current bookability check), but
its displayed title, duration and agreed price come from the booking's own snapshot.

## Frontend

`/dashboard/services` (`frontend/src/pages/dashboard/MentorServicesPage.tsx`) follows the same guard
pattern as the profile editor and the availability-slots page: it shows a loading state, redirects a
signed-out mentor to log in, shows an inline message for a student-only account, and redirects an
incomplete mentor back into onboarding. The page lists existing services (title, duration, fee, an
**Active**/**Inactive** badge) and supports adding, inline-editing and toggling a service active —
mirroring the inline add/edit list used for services during onboarding (`ServiceList`/
`ServiceEditForm`), but writing straight to the API instead of local-only onboarding state.
Deactivating is a plain toggle, not a destructive action requiring confirmation, since it's
reversible (the mentor can reactivate the same way) and never touches existing bookings.

`frontend/src/api/mentorServices.ts` wraps the four endpoints above (the new `apiPatch` helper on
`frontend/src/api/client.ts` supports the activation toggle); `frontend/src/lib/mentorServices.ts`
catches empty fields, a negative or sub-cent fee, a fee with more than two decimal places, and a
non-positive duration client-side before any request is sent, and converts the euro/string form
draft into the cents/number API body.

## Migration and local checks

```bash
npm --prefix backend run db:migrate
```

Migration `009_mentor_service_management.sql` adds `service_title`, `service_duration_minutes` and
`service_price_cents` to `booking`, backfilling every existing booking from the service it still
points at before making the columns `NOT NULL`. Do not edit or reverse applied migrations, including
this one.

Unit and integration tests:

```bash
npm --prefix backend test
npm --prefix backend run test:integration
npm --prefix frontend test
```

The integration suite (`backend/tests/mentors/mentors.services.integration.test.ts`) runs against a
real PostgreSQL 17 database whose name ends in `_test` — see
[mentor-profile-editing.md](mentor-profile-editing.md#migration-and-local-checks) for the exact
Docker/`createdb` setup. It covers: adding a service and seeing it on the public profile, updating a
service and seeing the new details persist, a service with an existing booking keeping that
booking's title/duration/agreed price/payment amount unchanged after the service is edited,
deactivating a service (hidden from the public profile, existing booking unaffected), every
validation rejection reason (missing fields, negative fee, a fee with more than two decimal places,
non-positive duration), ownership isolation (another mentor cannot read, update or deactivate it),
and the auth/role matrix.

Remaining checks:

```bash
npm run format:check
npm --prefix backend run lint
npm --prefix backend run typecheck
npm --prefix backend run build
npm --prefix frontend run lint
npm --prefix frontend run build
```
