# Admin user list

Administrators can list registered students and mentors at `/dashboard/admin/users` (issue #36).
This is the first admin feature. Banning users is planned for a later iteration. The original plan
is in [admin-user-list-plan.md](admin-user-list-plan.md).

## Admin role

An admin is a user with a row in the `admin` table (migration `010_admin.sql`). Like `student` and
`mentor`, it is a subclass of `"user"` that shares the user's id, so one account may be an admin and
also a student or a mentor. There is no role column and no API that creates admins.

`GET /api/me` returns `isAdmin` next to `isStudent` and `isMentor`.

### The seeded admin (development only)

`npm run db:seed` creates one admin, so there is an account to log in with:

| Field    | Value               |
| -------- | ------------------- |
| Email    | `admin@example.com` |
| Password | `Password123!`      |

Unlike the other seeded accounts, this password hash uses the algorithm the login verifies (scrypt),
so this account **can** log in. After logging in, an admin with no student or mentor role lands on
the user list.

> **Security:** the password is public in this repository. **Never run the seed on a shared or
> deployed database.** To create an admin anywhere else, insert a row into `admin` for an existing
> account by hand.

## API

Every route under `/api/admin` is guarded once, on the router (`requireAuth`, then `requireAdmin`),
so a route added later is protected by default.

| Method | Path                  | Purpose                      |
| ------ | --------------------- | ---------------------------- |
| GET    | `/api/admin/students` | One page of student accounts |
| GET    | `/api/admin/mentors`  | One page of mentor accounts  |

Query string (validated with Zod, same `400 validation_error` shape as the rest of the API):

| Parameter  | Rule                  | Default |
| ---------- | --------------------- | ------- |
| `page`     | integer, at least 1   | 1       |
| `pageSize` | integer, from 1 to 50 | 20      |

Response of `GET /api/admin/students?page=1&pageSize=20`:

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

The mentors response has the same shape, with `alsoStudent` instead of `alsoMentor`.

| Case                        | Response                                    |
| --------------------------- | ------------------------------------------- |
| Not logged in               | `401 unauthenticated`                       |
| Banned account              | `403 banned`                                |
| Logged in, not an admin     | `403 not_an_admin`                          |
| Invalid `page` / `pageSize` | `400 validation_error` with `fields`        |
| Page past the last page     | `200` with `users: []` and the real `total` |

Behavior:

- Soft-deleted users (`is_deleted`) are never listed.
- Users are sorted newest first (`created_at DESC`), with `id` as tie-breaker so pages are stable.
- Pagination is offset based (`LIMIT` / `OFFSET`), and `total` comes from a separate `COUNT(*)`
  with the same filter. If someone registers while an admin is paging, a row can shift between pages.
- The query selects only the columns above. The password hash is never read.
- Mentors who have not finished onboarding are listed. Admin-only accounts (no student or mentor
  row) are not listed in either tab.
- "Also mentor" / "Also student" is computed with `EXISTS` from the role tables, not stored.

## Page

`/dashboard/admin/users` (behind sign-in) has two tabs, **Students** and **Mentors**. Each is a
table with Name, Email, ID, Status (Active or Banned), Created and the other role (Yes or No).
Previous and Next buttons move through the pages, with a "Page X of Y" label. Changing tab goes back
to page 1. The page shows a loading message, an empty state, and an error state with a Retry button.

Navigation: a **Users** item in the dashboard sidebar, shown only to admins. An admin with no student
or mentor role is sent to this page after login, and their avatar links to it.

A user who is not an admin is redirected to `/dashboard`. That is only a convenience: the API
answers `403` to non-admins whatever the page does.

## Code map

| Part     | Files                                                                                             |
| -------- | ------------------------------------------------------------------------------------------------- |
| Database | `backend/db/migrations/010_admin.sql`, admin section at the end of `backend/db/seed.sql`          |
| Backend  | `backend/src/modules/admin/` (routes, queries, schemas), `backend/src/middleware/requireAdmin.ts` |
| Roles    | `findRoles` and `isAdmin` in `backend/src/modules/auth/auth.queries.ts`                           |
| Frontend | `frontend/src/api/admin.ts`, `frontend/src/pages/admin/AdminUsersPage.tsx`                        |
| Tests    | `backend/tests/admin/`, `frontend/tests/admin/`, `frontend/tests/auth/authRedirect.test.ts`       |

## Not in this iteration

Banning and unbanning, listing admin-only accounts, search and filters, and creating admins from the
application.
