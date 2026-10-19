# Iteration 1 claim — FEUP Connect

Group 10 · MESW / LES 2026–27 · 19 October 2026

This file is `docs/iterations/1/CLAIM.md` on tag `iter-1`.

- [This tag](../../..)
- [Compare with the last tag](https://github.com/MESW-LES-2627/les-project-group-10/compare/165beeb4e218d1f8dd8defd4554f93534421f333...0795a6986b0cf1c95b7cf5ea9c0a08040a186c70)
- [Production](#production)
- [Staging](#staging)
- [Pipeline](#pipeline)
- [MVP](#mvp)
- [Vision](#vision)
- [Stories in this increment](#stories-in-this-increment)
- [How to run the tests](#how-to-run-the-tests)
- [Retrospective](#retrospective)
- [AI log](#ai-log)
- [Team artefacts](#team-artefacts)

## This tag

[Repository tree](../../..) for the commit that contains this file. The tag name is `iter-1`.

The slice on that tree is the frontend at [router.tsx](../../../frontend/src/routes/router.tsx) and the health check in [app.ts](../../../backend/src/app.ts).

## Compare with the last tag

There is no `iter-0` tag. The baseline is the [first commit](https://github.com/MESW-LES-2627/les-project-group-10/commit/165beeb4e218d1f8dd8defd4554f93534421f333). The increment is [that commit compared with `0795a69`](https://github.com/MESW-LES-2627/les-project-group-10/compare/165beeb4e218d1f8dd8defd4554f93534421f333...0795a6986b0cf1c95b7cf5ea9c0a08040a186c70):

- [165beeb](https://github.com/MESW-LES-2627/les-project-group-10/commit/165beeb4e218d1f8dd8defd4554f93534421f333) first commit
- [fc614e2](https://github.com/MESW-LES-2627/les-project-group-10/commit/fc614e201f82753d90826c66765340c2c8493876) README title
- [1776d99](https://github.com/MESW-LES-2627/les-project-group-10/commit/1776d99a67ef002ace74260a017ab7784724caca) vertical prototype setup
- [4882048](https://github.com/MESW-LES-2627/les-project-group-10/commit/4882048003ea6652c3e73c536fd844897d494b30) `.env.example`
- [809a5a0](https://github.com/MESW-LES-2627/les-project-group-10/commit/809a5a089e806ae8b7aa9c9e92b6aa32277ef049) public site and authentication screens
- [ea13aad](https://github.com/MESW-LES-2627/les-project-group-10/commit/ea13aadef8c29f17223000899ff1c14ee609a72c) fast-refresh fix
- [31b44e8](https://github.com/MESW-LES-2627/les-project-group-10/commit/31b44e84cf5e1610f34e9859e681a11662cce263) favicon and reset-password screens
- [da4dfc8](https://github.com/MESW-LES-2627/les-project-group-10/commit/da4dfc8622f0f7fb22a003d8932847d069a0da4e) mentor onboarding
- [da31a9d](https://github.com/MESW-LES-2627/les-project-group-10/commit/da31a9df7c88e2a9a88e3cdfce62f3832442f1e1) student onboarding
- [0795a69](https://github.com/MESW-LES-2627/les-project-group-10/commit/0795a6986b0cf1c95b7cf5ea9c0a08040a186c70) student dashboard and mentor search

## Production

No host is deployed. The runnable slice is local, from [Run](../../../README.md#run):

```bash
cd backend && npm run dev    # http://localhost:3000  →  GET /api/health
cd frontend && npm run dev   # http://localhost:5173
```

Setup is [Setup](../../../README.md#setup). The frontend is the product surface. The API response is `{ "status": "ok" }` from [app.ts](../../../backend/src/app.ts).

## Staging

No staging host is deployed. The same local commands in [Run](../../../README.md#run) are the slice a reviewer can open.

## Pipeline

No workflow file is in the repository. The commands that are defined:

| Check          | Command                | Defined in                                              |
| -------------- | ---------------------- | ------------------------------------------------------- |
| Format         | `npm run format:check` | [package.json](../../../package.json)                   |
| Frontend lint  | `npm run lint`         | [frontend/package.json](../../../frontend/package.json) |
| Frontend build | `npm run build`        | [frontend/package.json](../../../frontend/package.json) |
| Backend lint   | `npm run lint`         | [backend/package.json](../../../backend/package.json)   |
| Backend types  | `npm run typecheck`    | [backend/package.json](../../../backend/package.json)   |
| Backend build  | `npm run build`        | [backend/package.json](../../../backend/package.json)   |

The pre-commit hook is [.husky/pre-commit](../../../.husky/pre-commit). It runs `npx lint-staged`, which formats staged `ts`, `tsx`, `js`, `json`, `md`, and `css` ([package.json](../../../package.json)).

[docker-compose.yml](../../../docker-compose.yml) starts PostgreSQL 17. The application code does not open a database connection.

## MVP

The product this increment belongs to:

- Public landing page, accounts, and profiles for students and mentors.
- Mentor discovery, services, fees, free posts, and availability.
- Booking a slot and a dummy payment before the session. No charge is made.
- A record of the booking, then access to the session details.
- Basic chat, reviews, and notifications for booking and payment.
- A simple admin list with the ability to ban a user. Mentor payouts are recorded and paid manually.

A feature is done when it does that job, its unit and integration tests pass, it is documented, lint and formatting pass, and the files sit in the layout linked under [Team artefacts](#team-artefacts).

This increment’s running slice is the stories below.

## Vision

A student at FEUP can be stuck on one idea after the lecture and the notes. Someone else already understands it: a classmate, a teaching assistant, a graduate, or an engineer who uses the idea at work. FEUP Connect is how the student finds that person, sees what they offer, and books an hour. It starts with students helping students, and it includes tutors from outside the university.

## Stories in this increment

1. As a visitor, I can read what FEUP Connect is, how a session is booked, and a FAQ. [LandingPage.tsx](../../../frontend/src/pages/landing/LandingPage.tsx)
2. As a new user, I can choose student or mentor and submit an account form. A student continues to onboarding and is signed in. [SignUpPage.tsx](../../../frontend/src/pages/auth/SignUpPage.tsx)
3. As a returning user, I can submit the login form. The app stores a student session and opens the dashboard, or the page I was trying to open. [LoginPage.tsx](../../../frontend/src/pages/auth/LoginPage.tsx) [auth.ts](../../../frontend/src/lib/auth.ts)
4. As a user who forgot a password, I can submit an email and see a confirmation, then set a new password and see a success screen. [ForgotPasswordPage.tsx](../../../frontend/src/pages/auth/ForgotPasswordPage.tsx) [ResetPasswordPage.tsx](../../../frontend/src/pages/auth/ResetPasswordPage.tsx)
5. As a new student, I can record interests, a budget, availability, and a study level, then reach an “all set” page. The answers stay in memory for the visit. [StudentInterestsStep.tsx](../../../frontend/src/pages/student-onboarding/StudentInterestsStep.tsx) [studentOnboardingContext.ts](../../../frontend/src/pages/student-onboarding/studentOnboardingContext.ts)
6. As a new mentor, I can enter a profile, expertise, services, and availability, then see a pending-verification preview. The answers stay in memory for the visit. [MentorProfileStep.tsx](../../../frontend/src/pages/mentor-onboarding/MentorProfileStep.tsx) [mentorOnboardingContext.ts](../../../frontend/src/pages/mentor-onboarding/mentorOnboardingContext.ts)
7. As a visitor, I can search four mentors by name, subject, and bio, and filter by subject, price, rating, and language. [MentorDirectory.tsx](../../../frontend/src/components/mentors/MentorDirectory.tsx) [mentors.ts](../../../frontend/src/api/mentors.ts)
8. As a signed-in student, I can open a mentor, read the profile, and choose a service, date, and time. Signed-out visitors are sent to login and brought back. [MentorProfilePage.tsx](../../../frontend/src/pages/mentors/MentorProfilePage.tsx) [RequireAuth.tsx](../../../frontend/src/layouts/RequireAuth.tsx)
9. As a signed-in student, I can submit checkout for that slot. The app adds a €1.50 platform fee, stores the booking in the browser, and shows a confirmation with a receipt and a calendar file. [CheckoutPage.tsx](../../../frontend/src/pages/mentors/CheckoutPage.tsx) [booking.ts](../../../frontend/src/lib/booking.ts) [BookingConfirmedPage.tsx](../../../frontend/src/pages/mentors/BookingConfirmedPage.tsx)
10. As a signed-in student, I can see those bookings on the dashboard, with the total under “spent on learning”. [StudentDashboardPage.tsx](../../../frontend/src/pages/dashboard/StudentDashboardPage.tsx)

The catalog is Mariana Silva, João Ferreira, Inês Costa, and Rui Almeida, in [mentors.ts](../../../frontend/src/api/mentors.ts). The session key is `feup-connect-session`. The bookings key is `feup-connect-bookings`.

## How to run the tests

[frontend/package.json](../../../frontend/package.json), [backend/package.json](../../../backend/package.json), and [package.json](../../../package.json) define no `test` script. The repository has no test files.

The checks that are defined:

```bash
npm run format:check
(cd frontend && npm run lint && npm run build)
(cd backend && npm run lint && npm run typecheck && npm run build)
```

## Retrospective

This increment is the ten commits in [Compare with the last tag](#compare-with-the-last-tag). A reviewer can land, create an account, search the four mentors, open a profile, check out, and see the booking on the dashboard. Session and bookings are stored in the browser. Mentor and student onboarding answers last for the visit. The server answers `GET /api/health`. PostgreSQL is described in [docker-compose.yml](../../../docker-compose.yml) and is not called by the app.

## AI log

Google Stitch was used to assist with generating the design for the project. Working from the Figma design, Stitch was used to regenerate that design, and then to regenerate the design icons and illustrations.

The landing illustration is [hero-mentor.jpg](../../../frontend/src/assets/illustrations/hero-mentor.jpg). The colors and type from the design are in [index.css](../../../frontend/src/index.css).

## Team artefacts

- [frontend/src/routes/router.tsx](../../../frontend/src/routes/router.tsx) — route table
- [frontend/src/api/mentors.ts](../../../frontend/src/api/mentors.ts) — mentor catalog
- [frontend/src/lib/auth.ts](../../../frontend/src/lib/auth.ts) — browser session
- [frontend/src/lib/booking.ts](../../../frontend/src/lib/booking.ts) — fee, reference, booking storage, calendar file
- [frontend/src/pages/mentors/CheckoutPage.tsx](../../../frontend/src/pages/mentors/CheckoutPage.tsx) — checkout form
- [frontend/src/pages/dashboard/StudentDashboardPage.tsx](../../../frontend/src/pages/dashboard/StudentDashboardPage.tsx) — bookings after checkout
- [backend/src/app.ts](../../../backend/src/app.ts) — `GET /api/health`
- [docker-compose.yml](../../../docker-compose.yml) — PostgreSQL 17 service
- [README.md](../../../README.md) — setup and run
- [.env.example](../../../.env.example) — environment variable names
