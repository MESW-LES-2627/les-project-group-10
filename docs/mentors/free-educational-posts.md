# Free educational posts

Completed mentors can publish, edit and delete free educational posts from **Free posts** in the
dashboard (`/dashboard/posts`, linked from the sidebar next to **Services & fees**). Published
posts appear on the mentor's public profile (`/mentors/:mentorId`) and each post has its own
public URL (`/mentors/:mentorId/posts/:postId`) that any visitor can read without logging in or
paying.

## Fields and behavior

| Field   | Validation                                                        |
| ------- | ----------------------------------------------------------------- |
| `title` | Required, 1–150 characters after trimming leading/trailing spaces |
| `body`  | Required, 1–10,000 characters after trimming                      |

Saving is rejected with a field-level error (`400 validation_error`) when either `title` or `body`
is empty or whitespace-only, or exceeds its maximum length. When validation or saving fails, the
previously saved post remains unchanged in the database and the editor keeps the mentor's draft so
they can fix and retry.

Deleting a post permanently removes the row from `mentor_post`. It disappears from the mentor's
public profile immediately, and its previous public link (`/mentors/:mentorId/posts/:postId` and
`GET /api/mentors/:id/posts/:postId`) returns `404 post_not_found`.

Only the signed-in mentor who owns the post can create, edit or delete it. Management endpoints
always derive the mentor identity from the session cookie and reject unknown request fields (such as
`mentorId`). Student-only and admin accounts receive `403 not_a_mentor`, incomplete mentors receive
`409 onboarding_required`, unauthenticated requests receive `401`, and attempts against another
mentor's post id return `404 post_not_found`.

Posts of banned, deleted or incomplete mentors are hidden from both `/api/mentors/:id` and
`/api/mentors/:id/posts/:postId`. Post content is rendered as plain text with preserved line breaks
(`whitespace-pre-wrap`), never interpreted as HTML.

## API

Private management endpoints (mentor session required, `Cache-Control: no-store`):

- `GET /api/mentors/me/posts` — returns `{ "posts": [...] }` ordered newest first (`publishedAt DESC`).
- `POST /api/mentors/me/posts` — accepts `{ title, body }`, returns `201` with `{ "post": { ... } }`.
- `PUT /api/mentors/me/posts/:id` — accepts `{ title, body }`, updates `title`, `body` and `updatedAt`, returns `{ "post": { ... } }`.
- `DELETE /api/mentors/me/posts/:id` — deletes the post and returns `204`.

Public read endpoints (no authentication or payment required, `Cache-Control: no-store`):

- `GET /api/mentors/:id` — includes the mentor's `posts` array alongside `services`.
- `GET /api/mentors/:id/posts/:postId` — returns `{ "post": { id, mentorId, mentorName, mentorHeadline, title, body, publishedAt, updatedAt } }` or `404 post_not_found`.

## Frontend

- `/dashboard/posts` (`frontend/src/pages/dashboard/MentorPostsPage.tsx`) — protected mentor page
  following the same guard pattern as `/dashboard/services` and `/dashboard/slots`. Supports
  publishing, inline editing, inline delete confirmation, error recovery without losing drafts, and
  direct links to each post's public page.
- `/mentors/:mentorId` (`frontend/src/pages/mentors/MentorProfilePage.tsx`) — lists published free
  posts under **Free posts** with excerpts, reading time, published date and links to the full post.
- `/mentors/:mentorId/posts/:postId` (`frontend/src/pages/mentors/MentorPostPage.tsx`) — public
  reader view accessible without authentication or payment; displays **Post not found** if deleted
  or unavailable.

## Migration and local checks

```bash
npm --prefix backend run db:migrate
```

Migration `012_mentor_posts.sql` adds the `mentor_post` table (`id`, `mentor_id`, `title`, `body`,
`published_at`, `updated_at`) with non-blank `CHECK (btrim(...) <> '')` constraints and an index on
`(mentor_id, published_at DESC, id DESC)`. Do not edit or reverse applied migrations.

Unit, component, and integration tests:

```bash
npm --prefix backend test
npm --prefix backend run test:integration
npm --prefix frontend test
```

Format, lint, typecheck, and build checks:

```bash
npm run format:check
npm --prefix backend run lint
npm --prefix backend run typecheck
npm --prefix backend run build
npm --prefix frontend run lint
npm --prefix frontend run build
```
