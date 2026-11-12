# Phase 16 plan: login and backend

Status (2026-11-12): **approved by Rei** (A: split into 16a/16b/16c; B: email
confirmation off, both paths built), with the changes below. **16a is built and
running on the real project. 16b is built** (catalogue, listings, settings and
audit log in the database; see `docs/accounts.md`).

### Rei's changes to the draft

1. `items` RLS: everyone reads **all** items, active and inactive, so share
   links with deactivated items keep working. `active` only hides an item from
   the picker; the admin can filter on it.
2. Deletes sync through a **tombstone** (`builds.deleted_at`), never by deleting
   rows, so a deleted build can't be re-uploaded from another browser's stale
   copy. The merge function and its tests cover it (`lib/account/merge.ts`).
3. Every `security definer` function (`is_admin`, `set_role`,
   `delete_my_account`, `admin_stats`, `admin_list_users`, the sign-up trigger
   function):
   - sets `search_path = ''`;
   - checks permissions inside itself;
   - has execute revoked from `public` and `anon`;
   - is granted only what it needs.
4. **`profiles` column lock:** revoke update on the whole table from
   anon/authenticated first, then grant `update (display_name)` only. `rls.sql`
   includes these checks:
   - a user setting their own role to admin fails;
   - a user reading another user's build gets 0 rows;
   - anon calling `set_role` / `delete_my_account` fails;
   - a non-admin writing an item or listing fails (added with the 16b tables).
5. **Sign-up trigger:** trims `display_name` and caps it at 50 characters, with
   a fallback. It always sets `role = 'user'`.
6. **The build sync Server Action** runs from `/builder`, where `proxy.ts`
   doesn't refresh the session. It refreshes inside the action and, failing
   that, answers "please log in again", with a test.
7. HANDOFF "Later": email confirmation with a custom SMTP sender, CAPTCHA on
   register, rate limits. REI.md: the catalogue table is `items`.
   Branch: `feat/phase-16-auth` (never merged to main until Rei says so; main stays
   the demo version, tag `demo-stable-2026-11-11`).

## 0. Two decisions for Rei (recommendations first)

**A. Split into three parts on the branch, each testable on the Vercel preview:**

- **16a:** accounts, builds stored in the account, guest import, roles and an
  admin users page. The catalogue stays in JSON.
- **16b:** the catalogue and listings move into the database, with the JSON as
  fallback. Admin can edit items and listings, including "mark checked today".
- **16c:** RLS tests, diagrams, docs, privacy page and handoff.

16b is the big, risky refactor (the builder reads the catalogue synchronously in
about 20 client modules), so logins can be tested before it lands.

**B. Email confirmation off for now.** Supabase's built-in email service only
delivers to members of the Supabase organisation, a few emails per hour, so the
supervisor couldn't register with their own address. Both paths are built: with
confirmation on, the site shows "Check your email" and `/auth/confirm` finishes
sign-up. Turning it on later = dashboard switch + custom SMTP (e.g. Resend).
"Forgot password" also needs email: it ships but is only offered when
`NEXT_PUBLIC_AUTH_EMAIL=on`.

## 1. Tables (ERD)

REI.md calls the catalogue table `parts`; proposed name **`items`** (matches the
code's `Item`, and it holds setup items too).

| Table                 | Columns                                                                                                                                                                                                                                                 | Notes                                                                                                                                                                    |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `profiles`            | `id uuid` PK → `auth.users(id)` on delete cascade; `display_name text` (1–50); `role text` (`user` / `admin`, default `user`); `created_at`, `updated_at`                                                                                               | Created by a trigger on sign-up                                                                                                                                          |
| `builds`              | `owner uuid` → `profiles(id)` cascade; `id text` (the browser's build id); `name text` (1–60); `parts jsonb` (`{category: itemId}`, same shape as `Build["parts"]`); `created_at`, `updated_at`; `deleted_at` (tombstone)                               | PK `(owner, id)`. Checks: `parts` is an object with ≤ 20 string values; ≤ 200 live builds per user; a tombstone is final and wiped; `updated_at` ≤ now + 5 min (trigger) |
| `items` (16b)         | `id text` PK; `category text` (one of 20); `brand`, `name text`; `tier text` (`budget`/`mid`/`high`); `price_idr int > 0`; `dims jsonb`; `specs jsonb`; `model_id text null`; `active bool` default true; `created_at`, `updated_at`, `updated_by uuid` | Deactivate, don't delete (old share links still resolve). Items used by a preset can't be deactivated                                                                    |
| `listings` (16b)      | `id uuid` PK; `item_id text` → `items` cascade; `marketplace text` (`tokopedia`/`shopee`/`blibli`); `url text` (https, that marketplace's domain); `price_idr int > 0`; `checked_at date` (not in the future); `created_by`, `updated_at`               | Unique `(item_id, url)`. Same rules as `prices:apply`, as DB checks                                                                                                      |
| `site_settings` (16b) | `key text` PK; `value jsonb`                                                                                                                                                                                                                            | `estimatesAsOf` (today `data/meta.json`)                                                                                                                                 |
| `audit_log` (16b)     | `id bigint`; `actor uuid`; `action text`; `table_name`, `row_id text`; `at timestamptz`; `diff jsonb`                                                                                                                                                   | Written by triggers on `items`, `listings`, `profiles.role`                                                                                                              |

Stays in the repo: presets, `models.json`, model files, compatibility rules.

## 2. Row Level Security

RLS on for every table. Helper `is_admin()`: `security definer` function checking
`profiles.role` for `auth.uid()`.

| Table           | Read                                          | Insert          | Update                                                                                                         | Delete                             |
| --------------- | --------------------------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| `profiles`      | own; admins all                               | none (trigger)  | own `display_name` only (column grants; `role` via `set_role()`, admin-only, refuses to demote the last admin) | none (cascade)                     |
| `builds`        | own only                                      | own             | own                                                                                                            | nobody: deleting sets `deleted_at` |
| `items`         | everyone, **all items** (active and inactive) | admin           | admin                                                                                                          | admin (UI deactivates)             |
| `listings`      | everyone                                      | admin           | admin                                                                                                          | admin                              |
| `site_settings` | everyone                                      | admin           | admin                                                                                                          | admin                              |
| `audit_log`     | admin                                         | none (triggers) | none                                                                                                           | none                               |

- Admins can't read other people's builds (privacy); `/admin` shows counts via a
  `security definer` stats function.
- `delete_my_account()` removes the auth user; everything cascades.
- No secret / service-role key in the app: every query runs as the visitor.

## 3. First admin (Rei, Supabase dashboard)

1. **New project**, region Singapore (`ap-southeast-1`).
2. **Authentication → Sign In / Providers → Email**: enable the email provider
   (it can be off by default), turn off "Confirm email", minimum password
   length 8.
3. **Authentication → URL Configuration**: Site URL = preview URL. Redirect URLs:
   `http://localhost:3000/**`, `https://*-<vercel-scope>.vercel.app/**` (see
   `docs/accounts.md` for finding the scope).
4. **SQL Editor**: run each file in `supabase/migrations/` in name order, then
   `supabase/seed.sql` (16b).
5. Register at `/register` on the preview (or **Authentication → Users → Add user**
   with "Auto Confirm User").
6. **SQL Editor**:
   `update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'YOUR-EMAIL');`
7. Log out and in; `/admin` opens. Promote others from `/admin/users`.

## 4. Env vars (names only; Rei sets values)

| Name                                                                                   | Where                            | Public?             |
| -------------------------------------------------------------------------------------- | -------------------------------- | ------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`                                                             | `.env.local`, Vercel **Preview** | yes                 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_…`; legacy anon key works too) | `.env.local`, Vercel **Preview** | yes (safe with RLS) |
| `NEXT_PUBLIC_AUTH_EMAIL` (`on`/`off`, default `off`)                                   | optional                         | yes                 |

No service-role key anywhere. Preview-only on Vercel keeps production (the demo)
unchanged even after a merge. `.env.example` gets the names with empty values.

## 5. Auth with Next 16

From `node_modules/next/dist/docs` (auth, Proxy, Cache Components) + `@supabase/ssr` 0.12.x:

- Login/logout/register: HTML forms → **Server Actions** (`useActionState`), work
  before hydration. Session in httpOnly cookies. No Supabase code on public pages.
- **DAL** `lib/auth/dal.ts` (`server-only`): `getUser()`, `requireUser()`,
  `requireAdmin()` via `getClaims()` + profile. Every protected page and every
  Server Action calls these. `/admin` → 404 for non-admins.
- **`proxy.ts`** (renamed Middleware) refreshes the session cookie, matcher only
  `/account`, `/admin`, `/login`, `/register`, `/auth/*`. Public pages untouched.
- **Cache Components:** session reads behind `<Suspense>` with a static shell;
  nothing cookie-reading in the root layout.
- **Navbar menu:** a non-secret `cs-auth=1` hint cookie (set on login, cleared on
  logout) decides "Log in" vs "Account ▾" client-side; real checks on the server.

## 6. Pages

- `/register` (display name, email, password ≥ 8 with strength hint), `/login`
  (+ "Forgot password?" when email is on), `/auth/confirm` route handler.
- Account menu: display name, My account, Admin (admins), Log out.
- `/account`: display name, account builds, import from this browser, log out,
  delete account (confirm).
- Without Supabase: `/login` + `/register` say "Accounts aren't set up on this
  site"; no menu.

## 7. Admin panel

- `/admin`: counts (users, builds, items), listings older than 14 days, recent audit.
- `/admin/users`: list (name, email, joined, #builds), promote/demote; not self, not last admin.
- `/admin/items` (16b): search/filter (category, tier, active, no checked listing);
  edit/add with a schema-generated form; preset items can't be deactivated.
- Listings per item (16b): add/edit/delete, **"Mark checked today"**, the 40% gap
  check as a tick-to-confirm warning.
- Settings (16b): "estimates as of".
- Saves call `updateTag("catalogue")`, so changes show without a redeploy.

## 8. Builds, guest import, logout

- Guests unchanged (localStorage).
- Logged in: store stays the working copy; changes upload via a Server Action
  ~1 s after editing stops. Merge by id, newest `updatedAt` wins; a delete always wins and leaves a tombstone.
- Guest import dialog: "Import N builds from this browser into your account?"
  Import / Not now ("Not now" remembered per account per browser). Pure,
  unit-tested merge function.
- Logout removes account builds from this browser; guest builds stay.
- Store version stays 2; account builds get one optional field.

## 9. With no Supabase at all

Everything works exactly as today for guests (builder, presets, checks, prices,
links, 3D, My builds, share links, landing poster, all pages, sitemap).
`isSupabaseConfigured()` false → no menu, `/login`/`/register` notice, `/admin` and
`/account` 404, `proxy.ts` no-op, catalogue from JSON, Supabase never imported.
All 70 e2e + 238 unit tests run without env vars; new e2e: no auth cookies, no
Supabase requests, `/login` notice. 16b: configured-but-unreachable → JSON
fallback + warning; `npm run db:export` refreshes the JSON/CSV from the DB.

## 10. Migrations, seed, tests

- `supabase/migrations/20261112000100_profiles.sql`, `…0200_builds.sql`,
  `…0300_account_admin.sql`, `…0400_catalogue.sql` (16b), `…0500_audit.sql` (16b). Rerunnable
  (`if not exists`, `create or replace`, `drop policy if exists`); SQL editor or
  `supabase link` + `supabase db push`.
- `npm run db:seed-sql` → committed `supabase/seed.sql` (idempotent upserts).
- `supabase/tests/rls.sql`: anon / user / other user / admin assertions.
- Unit: row ↔ `Item` round-trip (181 items), zod validation, seed generation,
  build merge/import, DAL with mocked client.
- Manual preview checklist in `docs/accounts.md`.

## 11. For the PI write-up (16c)

- `docs/diagrams/erd.mmd`, `use-cases.mmd` (Mermaid) exported to SVG + PNG.
- Use cases: Guest (build, check, share, browse prices); User extends Guest
  (register, log in, sync builds, import guest builds, delete account); Admin
  extends User (manage items, listings, users, settings, view audit log).
- `docs/accounts.md`: architecture, RLS table, env vars, admin steps.
- `/privacy` update: email, display name and builds stored in Supabase
  (Singapore); auth cookies only after login; delete account any time.

## 12. Risks

- 16b refactor: keep `getItem()` and friends with the same API, fed by a
  provider; first step toward loading catalogue data per category.
- No real database available here (no Docker / no project access): covered by
  unit tests, `rls.sql` run by Rei, and preview testing.
