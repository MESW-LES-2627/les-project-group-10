# FEUP Connect

Platform connecting students with tutors, mentors and industry professionals.

See the [documentation index](docs/README.md) for feature guides and project notes.

See [Deployment](docs/deployment.md) for the Vercel/Neon setup and the `develop` staging → `main` production release flow.

See the [Definition of Done](docs/definition-of-done.md) for the checklist used to
verify and complete user stories.

## Prerequisites

- Node.js 22 or newer (ESLint and Vite crash on older versions; with nvm run `nvm use 22`)
- Docker (with Docker Compose)
- Git

## Setup

Run these once, from the **repo** root:

```bash
cp .env.example .env
npm install                 # root: Prettier + Git hooks (Husky)
(cd backend && npm install)
(cd frontend && npm install)
```

Then edit `.env`:

- Set `JWT_SECRET` to a random string of **32 or more characters**. The backend refuses to start
  without it. Generate one with:

  ```bash
  node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
  ```

- Keep `DATABASE_URL` consistent with `POSTGRES_USER`, `POSTGRES_PASSWORD` and `POSTGRES_DB`
  (same user, password and database name).
- Set `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY` to your Stripe test-mode API keys. Checkout
  uses test payments only. The backend verifies payments during checkout, booking and dashboard
  requests. See [Stripe payments](docs/payments/stripe.md) for the reload, expiry and retry flow.
- Write values as `KEY=value`. Never commit `.env`; each person has their own secret.

Start the database, then create the tables and load the sample data:

```bash
docker compose up -d db                              # PostgreSQL
(cd backend && npm run db:migrate && npm run db:seed)
```

The seed is safe to run again. **After every `git pull`, run `npm run db:migrate` again**, because
teammates add new numbered migrations in `backend/db/migrations/`. Never edit a migration that has
already been merged. Add a new numbered file instead.

## pgAdmin (optional database GUI)

pgAdmin 4 is defined in `docker-compose.yml` and runs next to PostgreSQL. Use it to browse tables and
run queries. Do not change the schema through it: schema changes go in numbered migration files.

1. In `.env`, set `PGADMIN_DEFAULT_EMAIL` to a valid email format (for example `admin@example.com`)
   and set `PGADMIN_DEFAULT_PASSWORD`.
2. Start both services (this also starts `db`):

   ```bash
   docker compose up -d
   ```

3. Open http://localhost:5050. pgAdmin runs in desktop mode here, so there is no login screen.
4. Register the database once: right-click **Servers**, then **Register > Server...**, and fill in:

   | Tab        | Field                | Value                                     |
   | ---------- | -------------------- | ----------------------------------------- |
   | General    | Name                 | `FEUP Connect` (any name)                 |
   | Connection | Host name/address    | `db`                                      |
   | Connection | Port                 | `5432`                                    |
   | Connection | Maintenance database | `POSTGRES_DB` from `.env`                 |
   | Connection | Username             | `POSTGRES_USER` from `.env`               |
   | Connection | Password             | `POSTGRES_PASSWORD` from `.env` (save it) |

   The host is `db`, not `localhost`, because pgAdmin runs inside Docker Compose and reaches
   PostgreSQL through the service name.

5. Browse the tables under **Servers > FEUP Connect > Databases > (your db) > Schemas > public >
   Tables**. The user table is called `"user"` and must be double-quoted in SQL
   (`SELECT * FROM "user";`) because `user` is a reserved word in PostgreSQL.

Your server registration is kept in the `pgadmin-data` volume, so you only do step 4 once.
`docker compose down -v` wipes it together with the database.

## Run

Use two terminals:

```bash
# Terminal 1
cd backend && npm run dev   # http://localhost:3000

# Terminal 2
cd frontend && npm run dev  # http://localhost:5173
```

Open http://localhost:5173 to see the landing page. The backend must be running, because the
frontend asks `/api/me` on every page load to find out who is logged in (the dev server proxies
`/api` to port 3000).

**Test accounts:** the seeded mentors (such as `ana.silva@example.com`) are sample data for search.
They **cannot log in**, because their passwords were hashed with a different algorithm than the
login uses. Create your own account at http://localhost:5173/signup instead. Registering as a
mentor leads to the onboarding steps; finishing them saves your profile.

## Project tree

```
les-project-group-10/
├── README.md
├── docker-compose.yml        # PostgreSQL 17 and pgAdmin 4
├── .env.example              # copy to .env
├── package.json              # root: Prettier, Husky, lint-staged only
├── docs/
│   └── iterations/           # one CLAIM.md per iteration
├── backend/                  # Express 5 + TypeScript API
│   ├── db/
│   │   ├── migrations/       # numbered .sql files, applied in order
│   │   └── seed.sql          # sample mentors, safe to run again
│   ├── tests/                # *.test.ts, one folder per feature (mirrors src/modules)
│   │   ├── auth/
│   │   ├── mentors/
│   │   └── middleware/
│   └── src/
│       ├── app.ts            # builds the Express app (no listen)
│       ├── server.ts         # starts the server
│       ├── db/               # pool, migration runner, seed, transactions
│       ├── middleware/       # error handler, auth check, Zod validation
│       └── modules/          # one folder per feature
│           ├── auth/
│           ├── mentors/
│           └── bookings/     # checkout and Stripe payments
└── frontend/                 # React 19 + Vite + Tailwind CSS v4
    ├── tests/                # one folder per topic; unit and component tests for it share the folder
    │   ├── setup.ts          # jest-dom matchers, RTL cleanup after each test
    │   ├── support/
    │   │   └── render.tsx    # renderWithProviders: wraps a component in MemoryRouter (+ AuthContext)
    │   ├── auth/             # authRedirect.test.ts
    │   ├── booking/          # booking.test.ts, BookingPanel.test.tsx
    │   ├── mentor/           # mentorProfile/mentorSearch.test.ts, MentorFilters/MentorSearchResultCard.test.tsx
    │   ├── button/           # Button.test.tsx
    │   └── input/            # Input.test.tsx
    └── src/
        ├── api/              # fetch helpers for the backend
        ├── auth/             # login state
        ├── components/       # reusable UI
        ├── layouts/
        ├── lib/              # helpers (booking, mentor search, ...)
        ├── pages/            # landing, auth, dashboard, mentors, onboarding
        └── routes/           # router
```

## Testing

Both packages use [Vitest](https://vitest.dev) for tests. Tests live under a top-level `tests/`
folder in each package, grouped by topic rather than by test type: backend tests are grouped by
module, one subfolder per `src/modules/*` folder (for example `backend/tests/auth/password.test.ts`
tests `backend/src/modules/auth/password.ts`). Frontend tests are grouped by feature, and a unit
test and the component test(s) for the same feature share one folder — `frontend/tests/mentor/`
holds the `mentorProfile.ts`/`mentorSearch.ts` unit tests _and_ the `MentorFilters`/
`MentorSearchResultCard` component tests, and `frontend/tests/booking/` holds both the `booking.ts`
unit test and the `BookingPanel` component test.

```bash
(cd backend && npm test)
(cd frontend && npm test)
```

The default backend test suite covers pure functions such as password hashing, session tokens,
and Zod schemas. It uses no database or network, and makes no Stripe calls.

`npm test` runs those unit tests. Database integration tests run separately and need a disposable
database, because they run migrations and insert and delete real rows. The config
(`backend/vitest.integration.config.ts`) refuses to start unless `TEST_DATABASE_URL` is set and the
database name ends in `_test`, so they can never touch your development data. Create it once, then
run the tests from the repository root (replace the credentials if yours differ from
`.env.example`):

```bash
docker compose up -d db
docker compose exec db sh -c 'createdb -U "$POSTGRES_USER" feup_connect_test'
(cd backend && TEST_DATABASE_URL=postgres://feup:feup@localhost:5432/feup_connect_test npm run test:integration)
```

The tests apply the migrations to that database themselves (no `db:migrate` or `db:seed` needed) and
clean up their own rows. Without `TEST_DATABASE_URL` you get "TEST_DATABASE_URL must point to a
disposable database with a name ending in \_test", which is the guard working, not a bug. Drop the
database when you no longer need it with
`docker compose exec db sh -c 'dropdb -U "$POSTGRES_USER" feup_connect_test'`.

The integration tests cover profiles, booking reservations, concurrent checkout, deployment
readiness, student profiles and the categories list. Stripe is mocked. CI runs both suites.

Frontend tests are a mix of:

- **Unit tests** for the `src/lib/` helpers (booking math, mentor search, redirects) — no rendering.
- **Component tests**, using [React Testing Library](https://testing-library.com/react) and
  [`@testing-library/user-event`](https://testing-library.com/docs/user-event/intro) against a
  `jsdom` environment. They test what the user sees and does (rendered text, clicks, typed input),
  not component internals. None of them call the real API — mock `fetch`, or pass data/callbacks
  as props, instead.

To write a new component test, add it to the `tests/<feature>/` folder for the component it covers
(or make a new one, named after the feature, if it doesn't fit an existing one) and render through
the shared helper:

```tsx
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../support/render';
import { MyComponent } from '@/components/.../MyComponent';

renderWithProviders(<MyComponent />);
// or, for a page/link that needs a starting route or a logged-in user:
renderWithProviders(<MyComponent />, { route: '/mentors/123', authValue: fakeAuthValue });
```

`renderWithProviders` (in `frontend/tests/support/render.tsx`) always wraps the component in a
`MemoryRouter`, since most components use `Link` or router hooks, and optionally in an
`AuthContext.Provider` when an `authValue` is passed, for components that call `useAuth()`.
`frontend/tests/setup.ts` registers the `jest-dom` matchers (`toBeInTheDocument`, `toHaveValue`,
...) and runs Testing Library's `cleanup()` after every test.

**Node version note:** `jsdom` is pinned to `^24.x` rather than its latest major, because newer
`jsdom` releases require Node's `require(esm)` support (stable from Node 22.12), which breaks on
Node versions below that with an `ERR_REQUIRE_ESM` error from one of jsdom's CSS dependencies.

## Useful commands

| Where    | Command                                        | What it does                                 |
| -------- | ---------------------------------------------- | -------------------------------------------- |
| root     | `npm run format` / `npm run format:check`      | Format / check formatting                    |
| backend  | `npm run lint` / `npm run typecheck`           | ESLint / TypeScript check                    |
| backend  | `npm test`                                     | Run Vitest unit tests                        |
| backend  | `TEST_DATABASE_URL=… npm run test:integration` | Run database integration tests (see Testing) |
| backend  | `npm run db:migrate` / `npm run db:seed`       | Apply new migrations / seed                  |
| frontend | `npm run lint` / `npm run build`               | ESLint / type check and build                |
| frontend | `npm test`                                     | Run Vitest unit tests                        |
| root     | `docker compose down`                          | Stop the database (keeps data)               |
| root     | `docker compose down -v`                       | Stop and wipe the database                   |

## Troubleshooting

- **Port 5432 already in use:** stop your local Postgres, or change the port mapping in `docker-compose.yml`.
- **Port 5050 already in use:** change the left side of `ports: ['5050:80']` for `pgadmin` in `docker-compose.yml`.
- **pgAdmin container restarts or exits:** `PGADMIN_DEFAULT_EMAIL` in `.env` must be a valid email
  address. Check the logs with `docker compose logs pgadmin`.
- **`ECONNREFUSED` in the frontend:** the backend isn't running (Terminal 1).
- **Backend exits with `JWT_SECRET must be set...` or `DATABASE_URL is not set`:** fix `.env` (see
  Setup) and restart `npm run dev`. The backend reads `.env` only at start-up.
- **`relation ... does not exist` or `column ... does not exist`:** your database is behind. Run
  `npm run db:migrate` in `backend/`.
- **`syntax error at or near "user"` in your own SQL:** the table is called `"user"`, a reserved
  word, so it must always be double-quoted.
- **`util.styleText is not a function` or `does not provide an export named 'styleText'`:** you are
  on an old Node version. Switch to Node 22 (`nvm use 22`).
- **Logged in but the page acts logged out:** open the site as `http://localhost:5173` (not another
  host name or the backend port directly), so the session cookie is sent with the API calls.
- **Postgres password or user changed in `.env` but nothing happens:** an existing database volume
  keeps its old credentials. Recreate it with `docker compose down -v`, which wipes all data.
