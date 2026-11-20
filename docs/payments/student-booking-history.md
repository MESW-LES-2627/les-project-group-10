# Student booking and payment history

On the student dashboard, **Past sessions** lists bookings whose scheduled time has passed. A past booking keeps its saved status until that status changes. **Payment history** groups recorded test payment attempts by booking and includes attempts for future sessions.

Open a booking from either section to see its mentor, booked service, session time, saved status, and payment attempts. Each attempt shows its saved amount, currency, creation time, and outcome. The booking's service title, duration, and price come from the booking record, so edits and service deactivation leave the history intact. Reload the page to see the latest saved statuses. Dates and times are shown in Lisbon time.

The history endpoints serve only the signed-in student's records. An attempt marked **Failed** or **Expired** records an unsuccessful checkout in Stripe test mode.
