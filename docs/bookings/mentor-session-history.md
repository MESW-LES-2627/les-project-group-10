# Mentor session history

## Dashboard

Signed-in mentors can open **Mentor sessions** in the dashboard sidebar at `/dashboard/mentor-sessions`. **Upcoming sessions** shows the next start time first. **Past sessions** shows the most recent start time first. Each section has its own empty state.

A row links to `/dashboard/mentor-sessions/:bookingId`. The detail page shows the student name, booked service, duration, scheduled start in Lisbon time, booking status, and payment status. Cancelled and unpaid records stay visible with their saved statuses.

## API

The dashboard calls the [booking history client](../../frontend/src/api/bookingHistory.ts). The [Express routes](../../backend/src/modules/bookings/bookingHistory.routes.ts) provide two read-only endpoints.

| Endpoint                                       | Response                                                        |
| ---------------------------------------------- | --------------------------------------------------------------- |
| `GET /api/bookings/mentor-sessions`            | `{ upcoming, past }`, with an array of sessions in each section |
| `GET /api/bookings/mentor-sessions/:bookingId` | `{ session }` for the requested booking                         |

Both routes require a signed-in mentor and return `Cache-Control: no-store` after authentication. The queries scope the results to the signed-in mentor through the booked service's `mentor_id`. A missing, invalid, or unowned booking ID returns the same 404 response.

## Data and status

The [PostgreSQL queries](../../backend/src/modules/bookings/bookingHistory.queries.ts) group sessions using `booking.scheduled_at` and the database clock at request time. Passing the scheduled start moves the session into **Past sessions** while keeping its saved booking status.

The service title and duration come from the booking snapshot, so they survive service edits and deactivation. The student name comes from the student's current account. The payment status comes from the latest saved Stripe test payment attempt, ordered by creation time with the payment ID as a tiebreaker. With no attempt, the API returns `null` and the dashboard shows **Not attempted**.
