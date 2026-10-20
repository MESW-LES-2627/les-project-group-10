# Iteration 0 claim — FEUP Connect

Group 10 · MESW / LES 2026–27 · 19 October 2026

This file is `docs/iterations/0/CLAIM.md` on tag `iter-0`.

- [This tag](../../..)
- [Compare with the last tag](https://github.com/MESW-LES-2627/les-project-group-10/compare/165beeb4e218d1f8dd8defd4554f93534421f333...4241d7929e10748a4e999a4cdc72e0011cbff74c)
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

[Project tree](../../../README.md#project-tree) for the commit that contains this file. The tag name is `iter-0`.

The slice on that tree runs from the React app ([router.tsx](../../../frontend/src/routes/router.tsx)) through the Express API ([app.ts](../../../backend/src/app.ts)) to PostgreSQL: accounts, mentor onboarding, mentor search and profiles, and a paid booking through Stripe in test mode.

## Compare with the last tag

There is no earlier tag. The baseline is the [first commit](https://github.com/MESW-LES-2627/les-project-group-10/commit/165beeb4e218d1f8dd8defd4554f93534421f333). The increment is [that commit compared with `4241d79`](https://github.com/MESW-LES-2627/les-project-group-10/compare/165beeb4e218d1f8dd8defd4554f93534421f333...4241d7929e10748a4e999a4cdc72e0011cbff74c), the latest commit when this file was written. It is 28 commits, plus the merges of pull requests #1, #4 and #9:

- [165beeb](https://github.com/MESW-LES-2627/les-project-group-10/commit/165beeb4e218d1f8dd8defd4554f93534421f333) first commit (baseline)
- [fc614e2](https://github.com/MESW-LES-2627/les-project-group-10/commit/fc614e201f82753d90826c66765340c2c8493876) README title
- [1776d99](https://github.com/MESW-LES-2627/les-project-group-10/commit/1776d99a67ef002ace74260a017ab7784724caca) vertical prototype setup
- [4882048](https://github.com/MESW-LES-2627/les-project-group-10/commit/4882048003ea6652c3e73c536fd844897d494b30) `.env.example`
- [809a5a0](https://github.com/MESW-LES-2627/les-project-group-10/commit/809a5a089e806ae8b7aa9c9e92b6aa32277ef049) public site and authentication screens
- [ea13aad](https://github.com/MESW-LES-2627/les-project-group-10/commit/ea13aadef8c29f17223000899ff1c14ee609a72c) fast-refresh fix
- [31b44e8](https://github.com/MESW-LES-2627/les-project-group-10/commit/31b44e84cf5e1610f34e9859e681a11662cce263) favicon and reset-password screens
- [da4dfc8](https://github.com/MESW-LES-2627/les-project-group-10/commit/da4dfc8622f0f7fb22a003d8932847d069a0da4e) mentor onboarding
- [da31a9d](https://github.com/MESW-LES-2627/les-project-group-10/commit/da31a9df7c88e2a9a88e3cdfce62f3832442f1e1) student onboarding
- [ab28c36](https://github.com/MESW-LES-2627/les-project-group-10/commit/ab28c36b61646d92506e9e1a1d14d9833d84f203) database setup
- [02bdc95](https://github.com/MESW-LES-2627/les-project-group-10/commit/02bdc95d4d94d382ef98cb83060bc2fc43e7c5b5) `.gitignore`
- [242bd3e](https://github.com/MESW-LES-2627/les-project-group-10/commit/242bd3e1ba24654ce3e0872d290760b404713a82) pgAdmin container
- [a1c8b7e](https://github.com/MESW-LES-2627/les-project-group-10/commit/a1c8b7e6788b449b9eda5ebee858896195c54b65) initial backend authentication
- [0795a69](https://github.com/MESW-LES-2627/les-project-group-10/commit/0795a6986b0cf1c95b7cf5ea9c0a08040a186c70) student dashboard and mentor search
- [cd245db](https://github.com/MESW-LES-2627/les-project-group-10/commit/cd245db9b96126dd7f65db8398b71e43b8891251) authentication system
- [ba0f6da](https://github.com/MESW-LES-2627/les-project-group-10/commit/ba0f6da6fe91eeb2c0aa90e2deb325641c419354) remove a stray file
- [6ec4a79](https://github.com/MESW-LES-2627/les-project-group-10/commit/6ec4a79e1059c41ddfb7a9d7169b9a6727f09242) protect `/dashboard`
- [c82af49](https://github.com/MESW-LES-2627/les-project-group-10/commit/c82af491894cd05b39ca7b66bca379fe71fdaf3d) persisted booking and mock payment workflow
- [9ce1784](https://github.com/MESW-LES-2627/les-project-group-10/commit/9ce1784bf5cb5c2d9af0f60bee6a9c4781ff6c61) checkout connected to persisted bookings
- [870c5c9](https://github.com/MESW-LES-2627/les-project-group-10/commit/870c5c90cfd42f4e8072ec3c48b9f27833246932) Stripe checkout backend
- [6508f4b](https://github.com/MESW-LES-2627/les-project-group-10/commit/6508f4bfc1ff5ecf5be29365245d80cbf1478830) Stripe Elements in checkout
- [6567304](https://github.com/MESW-LES-2627/les-project-group-10/commit/65673048623b34808769ec94c0c9a5d128775981) Stripe keys in `.env.example`
- [6bcd3c5](https://github.com/MESW-LES-2627/les-project-group-10/commit/6bcd3c52e76be5f1b339ee3ad9ff9ff85b7486f3) disable the Stripe developer assistant
- [6314cd9](https://github.com/MESW-LES-2627/les-project-group-10/commit/6314cd997387b75e274cb105e1ba46ec67d07a77) first `CLAIM.md`
- [27048ae](https://github.com/MESW-LES-2627/les-project-group-10/commit/27048ae249dbd69e5c08f25a4738927ccf1a17e0) backend polling of Stripe payments
- [5418707](https://github.com/MESW-LES-2627/les-project-group-10/commit/5418707e739a059d3efe8ed5daa7c5499b5863eb) dashboard layout for mentor, booking and checkout pages
- [833bd05](https://github.com/MESW-LES-2627/les-project-group-10/commit/833bd05c362a87dcddb7244bca9c7b99540e114e) mentors page on mobile
- [0487d86](https://github.com/MESW-LES-2627/les-project-group-10/commit/0487d866db8128e4e3a6dafbda1941099450f55f) smarter search
- [4241d79](https://github.com/MESW-LES-2627/les-project-group-10/commit/4241d7929e10748a4e999a4cdc72e0011cbff74c) `CLAIM.md` fixes and project tree

## Production

No host is deployed. The runnable slice is local, from [Setup](../../../README.md#setup) and [Run](../../../README.md#run):

```bash
docker compose up -d db                                # PostgreSQL
(cd backend && npm run db:migrate && npm run db:seed)  # tables and sample mentors
cd backend && npm run dev                              # http://localhost:3000
cd frontend && npm run dev                             # http://localhost:5173
```

The backend needs a `.env` with `JWT_SECRET` and Stripe test keys ([.env.example](../../../.env.example)). `GET /api/health` answers `{ "status": "ok" }`. The product surface is the frontend, which calls `/api/auth`, `/api/mentors` and `/api/bookings` ([app.ts](../../../backend/src/app.ts)).

## Staging

No staging host is deployed. The same local commands are the slice a reviewer can open.

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

[docker-compose.yml](../../../docker-compose.yml) starts PostgreSQL 17 and pgAdmin 4. The backend connects to PostgreSQL through [pool.ts](../../../backend/src/db/pool.ts). The schema is the numbered files in [backend/db/migrations](../../../backend/db/migrations), applied by `npm run db:migrate`, and the sample mentors are in [seed.sql](../../../backend/db/seed.sql).

## MVP

The product this increment belongs to:

- Public landing page, accounts, and profiles for students and mentors.
- Mentor discovery, services, fees, free posts, and availability.
- Booking a slot and a payment before the session. Payments use Stripe in test mode, so no real money moves.
- A record of the booking, then access to the session details.
- Basic chat, reviews, and notifications for booking and payment.
- A simple admin list with the ability to ban a user. Mentor payouts are recorded and paid manually.

A feature is done when it does that job, its unit and integration tests pass, it is documented, lint and formatting pass, and the files sit in the layout shown in the [Project tree](../../../README.md#project-tree).

This increment’s running slice is the stories below.

## Vision

A student at FEUP can be stuck on one idea after the lecture and the notes. Someone else already understands it: a classmate, a teaching assistant, a graduate, or an engineer who uses the idea at work. FEUP Connect is how the student finds that person, sees what they offer, and books an hour. It starts with students helping students, and it includes tutors from outside the university.

## Stories in this increment

1. As a visitor, I can read what FEUP Connect is, how a session is booked, and a FAQ. The featured mentors on this page are static examples. [LandingPage.tsx](../../../frontend/src/pages/landing/LandingPage.tsx)
2. As a new user, I can choose student or mentor and create an account. The account is saved in PostgreSQL and I am signed in. A student continues to student onboarding and a mentor to mentor onboarding. [SignUpPage.tsx](../../../frontend/src/pages/auth/SignUpPage.tsx) [auth.routes.ts](../../../backend/src/modules/auth/auth.routes.ts)
3. As a returning user, I can log in. The server checks the password, rejects banned accounts (to be fully implemented in a future iteration), and sets an HttpOnly session cookie. The app opens the dashboard. Pages behind login redirect signed-out visitors. [LoginPage.tsx](../../../frontend/src/pages/auth/LoginPage.tsx) [AuthProvider.tsx](../../../frontend/src/auth/AuthProvider.tsx) [session.ts](../../../backend/src/modules/auth/session.ts) [RequireAuth.tsx](../../../frontend/src/layouts/RequireAuth.tsx)
4. As a user who forgot a password, I can see the forgot-password and reset-password screens and their confirmation states. These are screens only: the backend has no endpoint for them and sends no email. [ForgotPasswordPage.tsx](../../../frontend/src/pages/auth/ForgotPasswordPage.tsx) [ResetPasswordPage.tsx](../../../frontend/src/pages/auth/ResetPasswordPage.tsx)
5. As a new student, I can record interests, a budget, availability, and a study level, then reach an “all set” page. The answers stay in memory for the visit and are not saved. The recommended mentors on that page are static examples. [StudentInterestsStep.tsx](../../../frontend/src/pages/student-onboarding/StudentInterestsStep.tsx) [studentOnboardingContext.ts](../../../frontend/src/pages/student-onboarding/studentOnboardingContext.ts)
6. As a new mentor, I can enter a profile, expertise, and services, then submit. The profile, subjects, skills, and services are saved to PostgreSQL. The availability grid is on the screen but is not saved yet. [MentorProfileStep.tsx](../../../frontend/src/pages/mentor-onboarding/MentorProfileStep.tsx) [MentorAvailabilityStep.tsx](../../../frontend/src/pages/mentor-onboarding/MentorAvailabilityStep.tsx) [mentors.routes.ts](../../../backend/src/modules/mentors/mentors.routes.ts)
7. As a visitor, I can search the mentors in the database by name, skill, subject, and service, and filter by subject, price, rating, and language. The server returns the public mentors and the browser filters them. Ratings are not stored yet, so the rating filter has no data to use. [MentorDirectory.tsx](../../../frontend/src/components/mentors/MentorDirectory.tsx) [mentorSearch.ts](../../../frontend/src/lib/mentorSearch.ts) [mentors.queries.ts](../../../backend/src/modules/mentors/mentors.queries.ts)
8. As a signed-in student, I can open a mentor, read the profile with real services, fees, and free time slots, and choose a service, date, and time. Signed-out visitors are sent to login and brought back. [MentorProfilePage.tsx](../../../frontend/src/pages/mentors/MentorProfilePage.tsx) [mentors.ts](../../../frontend/src/api/mentors.ts)
9. As a signed-in student, I can pay for that slot. The server adds a €1.50 platform fee, saves the booking and payment as pending, and holds the slot for 10 minutes. I pay with Stripe Elements in test mode. The backend asks Stripe for the result every 5 seconds, then confirms the booking. The confirmation page shows a receipt and a calendar file. [CheckoutPage.tsx](../../../frontend/src/pages/mentors/CheckoutPage.tsx) [bookings.routes.ts](../../../backend/src/modules/bookings/bookings.routes.ts) [bookings.queries.ts](../../../backend/src/modules/bookings/bookings.queries.ts) [BookingConfirmedPage.tsx](../../../frontend/src/pages/mentors/BookingConfirmedPage.tsx)
10. As a signed-in student, I can see my confirmed upcoming bookings on the dashboard, with their total. Saved mentors is an empty placeholder. [StudentDashboardPage.tsx](../../../frontend/src/pages/dashboard/StudentDashboardPage.tsx) [bookings.ts](../../../frontend/src/api/bookings.ts)

Six sample mentors are loaded by `npm run db:seed`. They cannot log in ([README.md](../../../README.md#run)), so create your own account to try the flow. Mentors who finish onboarding also appear in the search. Test payments use the Stripe test card `4242 4242 4242 4242`.

## How to run the tests

[frontend/package.json](../../../frontend/package.json), [backend/package.json](../../../backend/package.json), and [package.json](../../../package.json) define no `test` script. The repository has no test files. These will be added in future iterations.

The checks that are defined:

```bash
npm run format:check
(cd frontend && npm run lint && npm run build)
(cd backend && npm run lint && npm run typecheck && npm run build)
```

## Retrospective

This increment is the commits in [Compare with the last tag](#compare-with-the-last-tag). A reviewer can create an account, log in, search the mentors in the database, open a profile, pay for a slot in Stripe test mode, and see the confirmed booking on the dashboard. Mentor onboarding saves to PostgreSQL. Student onboarding answers last for the visit. The password reset screens, mentor availability saving, ratings, reviews, posts, chat, and admin are not built yet. There are no automated tests and no CI workflow.

## AI log

Google Stitch was used to assist with generating the design for the project. Working from the Figma design, Stitch was used to regenerate that design, and then to regenerate the design icons and illustrations.

AI help was used to structure and database `schema.sql` creation. All the initial planning was done by us, with the help of draw.io for UML diagrams, AI was used as a mentor and teaching assistant.

The landing illustration is [hero-mentor.jpg](../../../frontend/src/assets/illustrations/hero-mentor.jpg). The colors and type from the design are in [index.css](../../../frontend/src/index.css).

## Team artefacts

The folder layout is in the [Project tree](../../../README.md#project-tree).

Frontend:

- [frontend/src/routes/router.tsx](../../../frontend/src/routes/router.tsx) — route table
- [frontend/src/auth/AuthProvider.tsx](../../../frontend/src/auth/AuthProvider.tsx) — who is logged in, from `/api/me`
- [frontend/src/api/](../../../frontend/src/api) — fetch helpers for auth, mentors, and bookings
- [frontend/src/components/mentors/MentorDirectory.tsx](../../../frontend/src/components/mentors/MentorDirectory.tsx) — mentor search and filters
- [frontend/src/pages/mentor-onboarding/](../../../frontend/src/pages/mentor-onboarding) — mentor onboarding steps
- [frontend/src/pages/mentors/CheckoutPage.tsx](../../../frontend/src/pages/mentors/CheckoutPage.tsx) — Stripe checkout form
- [frontend/src/pages/dashboard/StudentDashboardPage.tsx](../../../frontend/src/pages/dashboard/StudentDashboardPage.tsx) — upcoming bookings

Backend:

- [backend/src/app.ts](../../../backend/src/app.ts) — API routes, `/api/health` and `/api/me`
- [backend/src/modules/auth/](../../../backend/src/modules/auth) — register, login, logout, session cookie
- [backend/src/modules/mentors/](../../../backend/src/modules/mentors) — mentor onboarding and public mentor profiles
- [backend/src/modules/bookings/](../../../backend/src/modules/bookings) — checkout, Stripe payments, and bookings
- [backend/src/middleware/](../../../backend/src/middleware) — error handler, login check, Zod validation
- [backend/db/migrations/](../../../backend/db/migrations) — numbered SQL schema files
- [backend/db/seed.sql](../../../backend/db/seed.sql) — sample mentors

Project:

- [docker-compose.yml](../../../docker-compose.yml) — PostgreSQL 17 and pgAdmin 4
- [README.md](../../../README.md) — setup, run, and project tree
- [.env.example](../../../.env.example) — environment variable names
