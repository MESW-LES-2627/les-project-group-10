# Issue #21 acceptance evidence

Executed on 6 November 2026 on `feat/mentor-profile-editing`, based on `main`.
Verification covers the field simplification and navigation fixes on top of `ea87899`.
Environment: Node 22.22.2, PostgreSQL 17 in a disposable local instance, Vitest 4.1.12, and the in-app
browser against Vite on port 5177 and Express on port 3001. The installed
PostgreSQL 17 binary was used with a separate temporary data directory and database. The normal
application database was not used. No Stripe calls or hosted deployments were part of acceptance.

## Acceptance criteria

| Criterion                            | Verification                                                                                                      | Expected                                                                              | Actual / result                                                                                                                                        |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Saved details load                   | Complete onboarding in the browser, then open the editor; assert private GET data in integration tests            | Stored headline, About you, subjects and skills populate controls                     | Pass: the onboarding biography loaded unchanged in the editor; HTTP tests check exact values and category options                                      |
| Valid edits persist                  | Edit About you, save and refresh in the browser; verify normalized fields and a new password sign-in through HTTP | Saved values survive reload and a new session                                         | Pass: browser retained the complete 236-character biography; HTTP tests verify skill normalization, category replacement and persistence after sign-in |
| Public details update                | Open the public profile and directory; test anonymous public APIs and anonymous rendering                         | Full biography on the profile; derived excerpt on the card; anonymous viewing allowed | Pass: browser showed full text on the profile and truncated card copy; HTTP/component tests verify anonymous access and all subjects/skills            |
| Invalid edits preserve saved profile | Submit malformed/unknown-category HTTP payloads and invalid component drafts                                      | Clear errors; no persisted changes                                                    | Pass: HTTP tests verified saved values unchanged; component tests show accessible field errors and preserve the draft                                  |
| Failed save preserves saved profile  | Force a category-link insert failure after scalar writes; simulate component API/network errors                   | Transaction rolls back; draft remains available for retry                             | Pass: real PostgreSQL tests confirm fields/links unchanged; component tests retain drafts and retry successfully                                       |
| Other users cannot edit              | Test anonymous/student/incomplete/banned/deleted access, mentor B targeting A, and an arbitrary-ID PUT            | Unauthorized changes rejected; owner controls stay private                            | Pass: HTTP tests cover each case and dual-role self-edit; component tests check owner controls, student denial and incomplete redirects                |

## Simplified registration and description fields

- Browser: registered a disposable mentor using only name/email/password, completed profile details
  without an intro, and entered one **About you** biography in the expertise step. The 1000-character
  counter and 120-character headline limit match the editor. Service description stayed separate.
- Browser: completed onboarding, loaded the exact biography in the editor, edited it to 236
  characters, saved and refreshed. The directory showed a truncated excerpt; the public profile
  showed the complete text with no separate background section.
- Browser: inspected signup, onboarding and editor layouts on desktop. The editor also fits at
  390px with content width equal to viewport width; no horizontal overflow or empty removed-field
  sections were observed. No browser console errors were recorded during the completed flow.
- Automated regressions assert signup does not require/send a biography, onboarding does not require
  an intro, both biography controls allow 1000 characters, retired editor properties are rejected,
  card text comes from the biography instead of legacy intro data, and legacy database values remain
  unchanged by edits.

## Profile navigation regressions

- Browser: cleared the required About you field and clicked Cancel. The editor returned to the
  mentor's own public profile and the original biography was unchanged.
- Browser: saved a new biography. The editor returned to the public profile automatically, showed
  the updated text and retained it after refresh.
- Browser: followed Preview my public profile from onboarding completion. It opened the signed-in
  mentor's own profile rather than the directory. Completion-page edit and dashboard links now
  target `/dashboard/profile` and `/dashboard` respectively.
- Component regressions cover successful-save navigation and fresh profile loading, cancellation
  without saving invalid drafts, cancellation after session expiry, and all completion-page links.

## Additional verification

- Backend unit suite: **45 tests passed**, including profile schema boundary/normalization tests and
  existing onboarding validation tests.
- Backend integration suite: **23 tests passed** against real PostgreSQL. Includes concurrent saves,
  category replacement, preservation of service/slot/booking/payment records, visibility rules,
  invalid/expired cookies, upgrade compatibility and rerunning migrations.
- Frontend suite: **65 tests passed**, including editor component tests, API mapping/errors, draft
  validation, updated search fields, plain-text rendering and checkout login return URLs.
- Earlier baseline browser checks covered the anonymous profile at 390px and validation error focus.
  The latest simplification additionally covers the editor at 390px and desktop, as described above.
  Screen-reader announcements have not been manually tested with assistive technology.
- Production frontend build, backend build/typecheck, both linters and formatting checks are recorded
  in the final local verification run. These local checks do not establish hosted CI status.

## Delivery boundaries

Changes remain local. No push, PR, merge, hosted CI execution or teammate review has occurred.
The field simplification and navigation fixes were approved for a local commit. CI and the main
README are unchanged by these updates.
