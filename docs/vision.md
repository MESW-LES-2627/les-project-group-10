# FEUP Connect vision

When a FEUP student is still stuck after the lecture and the notes, they should be able to find someone who understands the topic and book time to work through it together.

## Target group

We start with FEUP students who want one-to-one help with coursework. Other students are the first mentors we want to reach. Teaching assistants, graduates and tutors outside FEUP can also offer sessions. Platform admins handle basic account moderation.

## Needs

- Students need to know who can help with their topic, what a session costs and when they can book it.
- Mentors need a place to show what they teach, set their own rates and offer times they can commit to.
- Admins need to find accounts and block access when users abuse the platform.

## Product

FEUP Connect is a tutoring marketplace focused on FEUP coursework. In the [MVP](mvp.md), a mentor lists a service with a price and available slots. A student finds that service, books a slot, completes a Stripe test payment and gets a booking record with the session details.

## Business goals and horizon

By the end of the course, we want to see a mentor publish a bookable slot and a student find and book it without help from the team. A later FEUP pilot could test whether students book again and mentors keep offering slots. A fee per booking is a possible way to fund the platform if there is repeat use.

## Non-goals for the MVP

- Hosting lessons, grading coursework or replacing FEUP’s learning platforms.
- Recruiting students beyond FEUP or rolling out to other universities.
- Taking real payments or automating mentor payouts. Checkout stays in Stripe test mode, and the MVP leaves payout handling manual.
