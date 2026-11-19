# Mentor session history

Open **Mentor sessions** in the dashboard sidebar. **Upcoming sessions** starts with the nearest scheduled time. **Past sessions** starts with the most recent session. Both sections show the saved booking status and the latest saved Stripe test payment status. Cancelled and unpaid records stay visible with their own statuses.

Open a session to see the student's name, booked service and duration, scheduled start in Lisbon time, and both statuses. The service title and duration are saved with the booking and survive later service edits or deactivation. Reload the page to see the current grouping and saved statuses. A past session keeps its saved booking status.

The list and detail endpoints check the signed-in mentor's ownership. A session outside that mentor's account returns the same 404 response as a missing session.

## Local acceptance checks for issue #26

Verified in Chromium with the running app and a separate local PostgreSQL database. The fixtures cover saved Stripe test payment outcomes and a booking that has no payment attempt.

| Step                                                                                    | Expected result                                                                                          | Observed result                                                                                                                                                       |
| --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sign in as a mentor with future and past bookings. Open **Mentor sessions**.            | Upcoming and past bookings appear separately by scheduled start time.                                    | Future bookings appeared soonest first. Past bookings appeared most recent first.                                                                                     |
| Open the future confirmed session after changing and deactivating its service.          | The page shows the student, booked service, duration, date and time, booking status, and payment status. | The original title and 60-minute duration appeared with the student, Lisbon start time, **Confirmed**, and **Succeeded (test)**.                                      |
| Check future records with failed, expired, and missing payments. Open the failed one.   | Cancelled or unpaid records are distinguishable from confirmed sessions with a successful test payment.  | The rows showed **Cancelled** with **Failed** or **Expired**, or **Pending payment** with **Not attempted**. The failed session showed **Failed** on its detail page. |
| Open a confirmed session whose start time has passed.                                   | It appears in **Past sessions** and keeps its saved status.                                              | Its list row and detail page still showed **Confirmed**. A separately completed session showed **Completed**.                                                         |
| Sign in as a mentor with no bookings and open the list on a mobile viewport.            | Both sections show their empty states.                                                                   | **No upcoming sessions yet.** and **No past sessions yet.** appeared.                                                                                                 |
| While signed in as the second mentor, open a detail URL for the first mentor's booking. | Access is denied and private details are absent from the response.                                       | The API returned 404 with a generic error, and the page displayed **Session not found.**                                                                              |

Frontend tests cover navigation, payment labels, empty sections and failure states. PostgreSQL integration tests cover the time split, payment selection, booked snapshots, and access control.
