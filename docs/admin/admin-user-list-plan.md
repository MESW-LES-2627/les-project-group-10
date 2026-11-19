# Plan: Admin user list (issue #36)

> **User story:** As an administrator, I want to view registered users, so that I can identify
> accounts when administering the platform.

Status: **implemented.** This document is the implementation plan agreed before any code was
written. The final behavior is described in [admin-user-list.md](admin-user-list.md).

Differences between the plan and the implementation:

- The seeded admin uses a **scrypt** password hash. The other seeded accounts use bcrypt, which the
  login cannot verify, so an admin seeded the same way could not have logged in.
- `total` always comes from a separate `COUNT(*)` query (the plan left this open).
- Added, outside the original file list: an admin with no student or mentor role is sent to the user
  list after login (`frontend/src/lib/authRedirect.ts`), and their avatar links to it
  (`frontend/src/layouts/DashboardLayout.tsx`).
- `isAdmin` was added to the `AuthUser` fixtures of four existing frontend tests, because the field is
  required by the type.

## 1. Scope

### In scope (this iteration)

- An `admin` role, modeled like `student` and `mentor` (a subclass table of `"user"`).
- One seeded admin account for local development.
- Two paginated, admin-only endpoints: `GET /api/admin/students` and `GET /api/admin/mentors`.
- `isAdmin` added to `GET /api/me`.
- A frontend page with two tabs (Students, Mentors), a table, pagination, and loading, empty and
  error states.
- Tests and documentation (Definition of Done).

### Out of scope

- **Banning / unbanning users.** Planned for a later iteration (see section 8).
- Listing admin-only accounts (accounts with an `admin` row but no `student` or `mentor` row).
- Search, filtering and sorting controls in the table.
- Promoting a user to admin through the API or UI.
- Any detailed admin dashboard (explicitly not in the MVP, see `CLAUDE.md`).

## 2. Acceptance criteria mapping

| Criterion (#36)                                               | How the plan meets it                                                                                                                                                               |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Users are listed without duplicate entries                    | Each tab queries one role table whose `user_id` is a primary key, so a user appears at most once per tab.                                                                           |
| Identifier, name, email, roles and account status are visible | Columns: id, name, email, status (Active / Banned), created date, plus "Also mentor" / "Also student". The tab itself shows the main role.                                          |
| Refreshing shows current information                          | Every request reads the database. No caching on the server or client.                                                                                                               |
| Clear empty state and error state                             | The page renders a dedicated message for an empty page and for a failed request (with a retry button).                                                                              |
| Non-admins cannot access the page or the data                 | Backend: `requireAuth` + `requireAdmin` on the whole `/api/admin` router (401 / 403). Frontend: no sidebar link and a redirect for non-admins. The backend check is the real guard. |
| Password hashes, tokens and payment data are excluded         | The SQL selects only the listed columns. `password_hash` is never selected. Tests assert it is absent.                                                                              |

## 3. Design decisions

| Decision             | Choice                                                | Reason                                                                                                  |
| -------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Admin representation | New table `admin (user_id PK/FK -> "user")`           | Same pattern as `student` and `mentor`. No role column on `"user"`. One account may hold several roles. |
| First admin          | Inserted by `seed.sql`                                | No API path lets a user become admin.                                                                   |
| Endpoints            | Two endpoints, one per tab                            | Keeps each query and response simple and specific to its role.                                          |
| Pagination           | Server-side, offset based (`LIMIT` / `OFFSET`)        | Small number of records. Simple, and allows "page X of Y".                                              |
| Other role           | "Also mentor" / "Also student" computed with `EXISTS` | Derived from the role tables, so it cannot drift out of sync.                                           |
| Soft-deleted users   | Not shown                                             | `WHERE NOT u.is_deleted` in both queries.                                                               |
| Order                | `created_at DESC, id`                                 | Newest first. `id` breaks ties so pages are stable.                                                     |

## 4. Backend

### 4.1 Migration `backend/db/migrations/010_admin.sql`

```sql
-- Admin: shares the user's id. A user is an admin if this row exists.
CREATE TABLE admin (
  user_id UUID PRIMARY KEY REFERENCES "user" (id) ON DELETE CASCADE
);
```

New file only. No applied migration is edited.

### 4.2 Seed `backend/db/seed.sql`

Add one admin, idempotent like the rest of the seed (fixed id, `ON CONFLICT DO NOTHING`):

- `"user"` row: id `10000000-0000-0000-0000-000000000011`, username `Platform Admin`,
  email `admin@example.com`, same development password as the other seeded accounts.
- `admin` row with the same `user_id`.

> **Security note:** every seeded account shares the password in `seed.sql`, which is public in the
> repository. The seed is for local development only and must never be run on a shared or deployed
> database. The README and the feature doc will state this.

### 4.3 Roles and `/api/me`

- `backend/src/modules/auth/auth.queries.ts`: `findRoles` also checks the `admin` table and returns
  `isAdmin: boolean`.
- `GET /api/me` then returns `isAdmin` with no other change.

### 4.4 Middleware `backend/src/middleware/requireAdmin.ts`

- Runs after `requireAuth` (which already rejects logged-out, deleted and banned users).
- Looks up the `admin` row for `res.locals.user.id`.
- If missing: `throw new HttpError(403, 'not_an_admin', 'Administrator access required')`.

### 4.5 Module `backend/src/modules/admin/`

| File               | Contents                                                                                                                                            |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `admin.schemas.ts` | `listUsersQuerySchema`: `page` (`z.coerce.number().int().min(1)`, default 1) and `pageSize` (`z.coerce.number().int().min(1).max(50)`, default 20). |
| `admin.queries.ts` | `listStudents(page, pageSize)` and `listMentors(page, pageSize)`, parameterized SQL.                                                                |
| `admin.routes.ts`  | `adminRouter` with `adminRouter.use(requireAuth, requireAdmin)` and the two `GET` routes.                                                           |

Query strings arrive as strings, so the schema uses `z.coerce`. The existing `parseBody` helper
accepts any `unknown`, so it is reused as `parseBody(listUsersQuerySchema, req.query)` and gives
the same `400 validation_error` shape.

Example query (students; mentors is symmetric):

```sql
SELECT u.id,
       u.username,
       u.email,
       u.is_banned,
       u.created_at,
       EXISTS (SELECT 1 FROM mentor m WHERE m.user_id = u.id) AS also_mentor,
       COUNT(*) OVER () AS total
FROM student s
JOIN "user" u ON u.id = s.user_id
WHERE NOT u.is_deleted
ORDER BY u.created_at DESC, u.id
LIMIT $1 OFFSET $2;
```

- `$1` = `pageSize`, `$2` = `(page - 1) * pageSize`.
- `COUNT(*) OVER ()` returns the total number of matching rows on every row. When the page is past
  the end there are no rows, so the route falls back to a separate `SELECT COUNT(*)` with the same
  `WHERE` clause (or returns `total` from that query in all cases, whichever is simpler to read).
- The mentors query lists all mentors, including those who have not finished onboarding.

### 4.6 Mounting (`backend/src/app.ts`)

```ts
app.use('/api/admin', adminRouter);
```

### 4.7 API contract

`GET /api/admin/students?page=1&pageSize=20`

```json
{
  "users": [
    {
      "id": "uuid",
      "username": "Ana Silva",
      "email": "ana.silva@example.com",
      "isBanned": false,
      "createdAt": "2026-11-19T10:00:00.000Z",
      "alsoMentor": true
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 6
}
```

`GET /api/admin/mentors` returns the same shape with `alsoStudent` instead of `alsoMentor`.

| Case                        | Response                                    |
| --------------------------- | ------------------------------------------- |
| Not logged in               | `401 unauthenticated`                       |
| Logged in, banned           | `403 banned` (from `requireAuth`)           |
| Logged in, not an admin     | `403 not_an_admin`                          |
| Invalid `page` / `pageSize` | `400 validation_error` with `fields`        |
| Page past the last page     | `200` with `users: []` and the real `total` |

## 5. Frontend

| File                                            | Change                                                                                                         |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `src/api/auth.ts`                               | `AuthUser` gets `isAdmin: boolean`.                                                                            |
| `src/api/admin.ts`                              | `getAdminStudents(page, pageSize)` and `getAdminMentors(page, pageSize)` using `apiGet`, with typed responses. |
| `src/pages/admin/AdminUsersPage.tsx`            | The page (see below).                                                                                          |
| `src/routes/router.tsx`                         | Route `/dashboard/admin/users` inside `RequireAuth`.                                                           |
| `src/components/dashboard/DashboardSidebar.tsx` | "Users" item, shown only when `user.isAdmin`.                                                                  |

Page behavior:

- Non-admin users are redirected to `/dashboard` (convenience only; the backend returns 403 anyway).
- Two tabs, **Students** and **Mentors**. Switching tab resets to page 1.
- Table columns:
  - Students: Name, Email, ID, Status (Active / Banned), Created, Also mentor (Yes / No).
  - Mentors: Name, Email, ID, Status (Active / Banned), Created, Also student (Yes / No).
- `page` and the active tab live in React state. Changing either triggers a new fetch.
- Previous / Next buttons and a "Page X of Y" label (`Y = ceil(total / pageSize)`). Previous is
  disabled on page 1, Next on the last page.
- States: loading, empty ("No students to show" / "No mentors to show"), error (message plus a
  Retry button).
- Styling with Tailwind utilities and the existing `components/ui` pieces.

## 6. Tests

### Backend (`backend/tests/admin/`)

The test database is shared with other suites, so tests create their own users (random UUIDs, as in
`students.profile.integration.test.ts`) and assert on those users, not on exact totals.

- `admin.schemas.test.ts` (unit): defaults, coercion of strings, rejects `page=0`, `pageSize=51`,
  non-numbers.
- `admin.integration.test.ts`:
  - 401 without a session cookie.
  - 403 `not_an_admin` for a student and for a mentor.
  - 200 for an admin on both endpoints, with the documented shape.
  - No `password_hash` (or any key other than the documented ones) in each user object.
  - Soft-deleted users are not returned.
  - A user who is both student and mentor has `alsoMentor: true` / `alsoStudent: true`.
  - Pagination: `pageSize=1` returns one row, consecutive pages return different users, `total` is
    consistent, and a page past the end returns `users: []`.
  - 400 on an invalid query string.
- `auth` tests: `/api/me` returns `isAdmin: true` for an admin and `false` otherwise.

### Frontend (`frontend/tests/admin/`)

- `AdminUsersPage.test.tsx`: renders rows for the Students tab, switching to Mentors fetches the
  mentors endpoint, empty state, error state with retry, Previous/Next enabled and disabled
  correctly, non-admin is redirected.

## 7. Implementation order

1. Migration `010_admin.sql`.
2. Seed: admin user and `admin` row.
3. `findRoles` returns `isAdmin`. Add the `/api/me` test.
4. `requireAdmin` middleware.
5. Admin module: schemas, queries, routes. Mount in `app.ts`.
6. Backend tests (schemas and integration).
7. Frontend: `AuthUser.isAdmin`, `api/admin.ts`.
8. Frontend: page, route, sidebar item.
9. Frontend tests.
10. Docs: `docs/admin/admin-user-list.md` (endpoints, page, seeded admin, security note), README
    test-account note, and the `CLAUDE.md` schema and status sections (admin role now modeled).
11. Checks:

```bash
npm run format:check
(cd backend && npm run lint && npm run typecheck && npm test)
(cd frontend && npm run lint && npm run build && npm test)
```

## 8. Future work (not this iteration)

- **Ban / unban:** for example `PATCH /api/admin/users/:id` with `{ "isBanned": true }`, on the same
  guarded `adminRouter`. Open questions for that iteration: can an admin ban another admin or
  themselves, and should the action be logged? Banned users are already rejected at login and on
  every authenticated request by `requireAuth`.
- Listing admin-only accounts (for example an "Admins" tab).
- Search by name or email, and filters (banned only, and so on).
- Keyset pagination, if the number of users grows enough for offset pagination to be a problem.
