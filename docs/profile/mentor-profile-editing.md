# Mentor profile editing

Completed mentors can open **My profile** in the dashboard or **Edit profile** on their own public
profile. The editor is at `/dashboard/profile`. Its values come from the authenticated API, and a
successful save persists across refresh and a new sign-in.

## Fields and behavior

| Field                 | Validation                                                                            |
| --------------------- | ------------------------------------------------------------------------------------- |
| Professional headline | Required, 1–120 characters                                                            |
| About you             | Required, 1–1000 characters; experience, background and how the mentor helps students |
| Subjects              | 1–4 distinct existing database category names                                         |
| Skills                | Optional, at most 15 entries, 1–40 characters each; enter one per line                |

Text is trimmed on the server. Duplicate skills are collapsed case-insensitively, keeping the first
spelling. Category options come from the database. The UI shows validation errors, prevents repeated
submissions while saving, retains the draft after errors and discards unsaved changes
when **Cancel** is selected. Cancel returns to the public profile without saving, even if the draft
is invalid. A successful save returns to the public profile after the API confirms the update.

Mentor signup collects only account details (name, email and password). Onboarding collects the
professional headline and **About you** biography once. The editor uses the same labels and limits.
Service names and descriptions remain separate because they describe individual sessions.

The separate signup short bio, one-line intro and professional-background inputs have been removed.
Directory cards derive a whitespace-normalized excerpt of up to 160 characters from the saved
biography, with a three-line display limit. Public profiles show the complete biography, including
its line breaks. Updating **About you** therefore updates both views after reload.

Public profiles at `/mentors/:mentorId` allow anonymous visitors and show all subjects and skills.
The biography is rendered as text with line breaks, never interpreted as HTML. Profiles
with no services remain readable. Checkout and editing require authentication. Incomplete, banned
and deleted accounts remain hidden from public profile APIs.

Editing does not change services, prices, availability, account details, verification, bookings or
payments. Structured employment history, images, reviews and posts are outside this feature. The
existing directory search fields remain unchanged; edited subjects/skills are searchable on reload.

## API

All editor requests use the existing session cookie. The server selects the account from the session;
there is no arbitrary-account update endpoint. Student-only accounts receive `403 not_a_mentor`,
incomplete mentors receive `409 onboarding_required`, and invalid sessions receive `401`. Existing
banned/deleted-account checks apply. Accounts with both student and mentor roles can edit themselves.

`GET /api/mentors/me/profile` returns:

```json
{
  "profile": {
    "headline": "Software engineer",
    "bio": "I help students learn.",
    "subjects": ["Software Engineering"],
    "skills": ["TypeScript"]
  },
  "subjectOptions": ["Mathematics", "Software Engineering"]
}
```

`PUT /api/mentors/me/profile` accepts exactly the four properties inside `profile` above as its body
and returns `{ "profile": { ... } }` with normalized saved values. Unknown properties are rejected.
Invalid fields or category names return `400 validation_error`, using the standard error shape:

```json
{
  "error": {
    "code": "validation_error",
    "message": "Invalid input",
    "fields": { "bio": "About you is required" }
  }
}
```

Profile columns and category links are replaced in one transaction, with a mentor-row lock to
serialize simultaneous saves. Last successful save wins. Failed transactions roll back the entire
update. A lost network response may occur after a commit; the UI offers retry/reload without claiming
that a transport failure proves the database was unchanged. Private and public profile responses use
`Cache-Control: no-store`. Public list/detail responses use `bio` for the biography; they no longer
return `tagline` or `professionalBackground`.

## Migration and local checks

Use Node 22+. Keep the normal migration runner up to date:

```bash
npm --prefix backend run db:migrate
```

This simplification requires no new schema migration. Existing `tagline` and
`professional_background` columns and their values are retained unchanged for compatibility; current
forms and APIs no longer read or write them. They are not automatically merged into the biography.
Do not edit or reverse applied migrations, including `008_mentor_professional_background.sql`.

Unit and component tests:

```bash
npm --prefix backend test
npm --prefix frontend test
```

The frontend profile component tests use React Testing Library and jsdom; existing pure tests stay
in Node. HTTP/database tests run separately against a disposable PostgreSQL 17 database whose name
ends in `_test`. Docker example, creating the database once:

```bash
docker compose up -d db
docker compose exec db sh -c 'createdb -U "$POSTGRES_USER" feup_connect_test'
TEST_DATABASE_URL=postgres://USER:PASSWORD@localhost:5432/feup_connect_test npm --prefix backend run test:integration
```

Replace `USER`/`PASSWORD` with local database credentials. Never use a database containing useful data.
The integration configuration fails if the URL is missing or the database name does not end in
`_test`. The suite runs migrations, creates its own fixtures, tests HTTP/authentication and rollback
against real PostgreSQL, and cleans up its fixtures. It does not call Stripe. A transaction-local
schema checks upgrades from the previous migrations; a test-only trigger exercises rollback after
partial writes. Do not run another suite against the same database concurrently.

Remaining checks:

```bash
npm run format:check
npm --prefix backend run lint
npm --prefix backend run typecheck
npm --prefix backend run build
npm --prefix frontend run lint
npm --prefix frontend run build
```

PR CI targets `develop` and `main` and runs the unit, component and database integration tests.
No production credentials are required.

See [acceptance evidence](issue-21-acceptance.md) for executed scenarios and results.
