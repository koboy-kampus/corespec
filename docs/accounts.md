# Accounts (Phase 16)

Optional logins on top of CoreSpec, using Supabase (Auth and Postgres). Without
the Supabase settings the site has no login at all and works exactly as before.

- **Status:** 16a is built and set up on the real Supabase project (all checks
  in `rls.sql` pass there): accounts, builds in the account, guest import, roles
  and the admin users page. 16b (built, not yet run on the real project) moves
  the catalogue and listings into the database, with admin editing and an audit
  log; see "The catalogue in the database" below. 16c adds the diagrams and
  finishes these docs.
- **The plan:** [`phase-16-plan.md`](phase-16-plan.md).

## How it fits together

- **No Supabase code in the browser.** Logging in, logging out and syncing are
  Server Actions. The session lives in httpOnly cookies that page scripts can't
  read.
- **Every query runs as the visitor**, so the database's Row Level Security
  decides what they can see and change. The app has no service-role key at all.
- **Who is logged in** is decided in one place: `lib/auth/dal.ts`. Every
  protected page and every Server Action asks it again. `/admin` is a 404 for
  anyone who isn't an admin.
- **`proxy.ts`** (Next 16's name for Middleware) only runs on `/account`,
  `/admin`, `/login`, `/register`, `/forgot-password` and `/auth/*`. It renews the
  session cookie. The landing page, builder, My builds and shared builds never
  touch it, so they stay static.
- **The navbar menu** reads a small non-secret cookie, `cs-auth` (`user` or
  `admin`), so it can show "Account" without a server request. The cookie grants
  nothing.
- **Builds:** the browser's store (`store/build.ts`) stays the working copy.
  - Builds made while logged in get the account as their `owner`.
    `components/account/account-sync.tsx` sends changes about a second after
    each edit. The newest edit wins, and a delete always wins.
  - Deleting leaves a tombstone (`builds.deleted_at`), so a stale copy in
    another browser can't upload it again. The rules are in
    `lib/account/merge.ts`, with unit tests.
  - Guest builds (made before logging in) stay in the browser until you import
    them. The prompt comes once after login and the button stays on My account.
  - Logging out removes the account's builds from that browser; guest builds
    stay.
- **An expired access token** during a sync from `/builder`, where Proxy
  doesn't run, is renewed inside the Server Action. If renewal fails, the
  browser retries once (two tabs may have renewed it at the same moment), then
  shows "Please log in again". Builds stay safe in the browser meanwhile. See
  `lib/account/sync.test.ts`.

## Environment variables (names only)

| Name                                   | Where                            | Notes                                                                                           |
| -------------------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | `.env.local`, Vercel **Preview** | Project Settings → API                                                                          |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `.env.local`, Vercel **Preview** | Project Settings → API Keys → publishable (`sb_publishable_…`). The legacy anon key also works. |
| `NEXT_PUBLIC_AUTH_EMAIL`               | optional                         | `on` once a real email sender is set up. Shows "Forgot password?".                              |

Set these for **Preview** only. Production (the demo on `main`) then stays
exactly as it is, even after a merge, until they are added to Production too.
Never add a service-role or secret key: nothing uses one.

## Setting up the project (Rei, in the Supabase dashboard)

1. **New project.** Region: **Southeast Asia (Singapore)**, the closest to
   Indonesia.
2. **Turn on email logins.** Go to **Authentication → Sign In / Providers →
   Email**:
   - **Enable email provider:** on. A new project can have it **off** by
     default, and then nobody can register or log in.
   - **Confirm email:** off. (See "Email confirmation" below for why.)
   - **Minimum password length:** 8, the same as the app's own check
     (`lib/auth/validate.ts`).

   Save.

3. **Set the URLs.** In **Authentication → URL Configuration**:
   - **Site URL:** your preview URL.
   - **Redirect URLs:** add `http://localhost:3000/**` and
     `https://*-YOUR-SCOPE.vercel.app/**`.

   **Finding YOUR-SCOPE:** it's your Vercel account or team slug, and every
   preview URL ends with it, just before `.vercel.app`. For example, in
   `corespec-git-feat-phase-16-auth-rc-d1d8.vercel.app` the scope is `rc-d1d8`,
   so the redirect URL is `https://*-rc-d1d8.vercel.app/**`. It's also the
   first part of the dashboard address, `vercel.com/YOUR-SCOPE/…`. It isn't the
   GitHub account name.

4. **Create the tables.** Open **SQL Editor → New query**. Paste each file in
   `supabase/migrations/`, in name order, and **Run** each one:
   1. `20261112000100_profiles.sql`
   2. `20261112000200_builds.sql`
   3. `20261112000300_account_admin.sql`

   They are safe to run again.

5. **Check the security rules.** Paste `supabase/tests/rls.sql` into a new query
   and **Run**.
   - **Pass:** the result is **All RLS tests passed**. It rolls everything back,
     so it leaves no test users behind.
   - **Fail:** it stops at the first problem and names it.
6. **Put the two env vars** in `.env.local` and in Vercel → Settings →
   Environment Variables:
   - **Environment:** **Preview** only.
   - **Type:** **Config**. Vercel refuses the **Secret** type for
     `NEXT_PUBLIC_` variables, because those are built into the page anyway.
     That's fine here: the URL and the publishable key are meant to be public,
     and RLS protects the data.

   Then redeploy the preview: push, or Vercel → Deployments → Redeploy. Vercel
   may ask you to confirm the redeploy with a code sent to your email.

7. **Create your account.** Register at `/register` on the preview.
8. **Make yourself admin.** In **SQL Editor**, run this with your own email:

   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'YOUR-EMAIL');
   ```

   It works here because the SQL editor runs as the database owner. Nobody can
   do this from the website: users can't write `role`, and
   `public.set_role()` only accepts admins.

9. **Check it.** Log out and log in again. The account menu now has **Admin**,
   and `/admin` opens. From now on, promote others in **Admin → Users**.

## The catalogue in the database (16b)

### How it works

- **The JSON in `data/` stays the base.** It's bundled into the site, so the
  builder works with no database at all. The database holds the same catalogue
  (`items`, `listings`, `site_settings`), and admins edit it there.
- **Pages get only the differences.** `lib/catalogue/load.ts` reads the
  database (cached, tag `catalogue`) and compares it with the JSON
  (`lib/catalogue/rows.ts`). Only the items that differ go to the page, so a
  database that matches the JSON adds nothing at all to any page.
  `lib/parts.ts` applies those differences in place, on the server and in the
  browser (handed over by `components/catalogue/catalogue-overlay.tsx` in the
  root layout).
- **Pages stay static.** The landing page, builder and shared builds are built
  with the cached catalogue. An admin save calls `updateTag("catalogue")`, so
  they're rebuilt in the background within seconds; otherwise at the latest
  every hour.
- **The fallback.** With no Supabase settings, or settings but a database that
  can't be reached within 4 seconds, or one where `seed.sql` hasn't run yet, the
  site shows the JSON exactly as before and tries again within a minute. The
  admin overview says so. Tested in `lib/catalogue/catalogue.test.ts` (off,
  connection refused, no answer, empty, seeded, one edit) and by running the
  whole e2e suite with an unreachable database (below).
- **Deactivated items** (`active = false`) leave the builder's picker only.
  Everyone can still read them, so saved builds and share links that use them
  keep working. Items a preset uses can't be deactivated.
- **Listing rules** are the same as `npm run prices:apply`, checked in the admin
  form and again by the database (`listings` checks): https, on the
  marketplace's own domain, a whole number of rupiah above 0, a check date not
  in the future (Indonesian time). The "more than 40% from the estimate" check
  stays a question in the admin form: tick "The price is right" to save anyway.
- **The audit log** (`audit_log`) records every change to items, listings,
  settings and roles: who, when, and which fields changed. Only admins can read
  it; nobody can edit it.

### Setting it up (after the 16a steps)

In **SQL Editor → New query**, paste each file and **Run**, in this order:

1. `supabase/migrations/20261112000400_catalogue.sql`
2. `supabase/migrations/20261112000500_audit.sql`
3. `supabase/seed.sql`: the catalogue from the JSON. The result says **Seeded
   181 items and 4 listings**.
4. `supabase/tests/rls.sql` again: it now checks items, listings, settings and
   the audit log too. The result says **All RLS tests passed**.

All four are safe to run again. **Careful:** running `seed.sql` again puts the
seeded items back as the JSON has them, undoing admin edits to them. Run
`npm run db:export` first if those edits should be kept.

### Admin pages

- **`/admin/items`:** every item, with search and filters (category, tier,
  active or not, no checked listing). **Add item** creates a new one.
- **`/admin/items/<id>`:** the item's fields (the spec inputs come from
  `lib/catalogue/schema.ts`) and its checked listings: add, edit, delete, and
  **Mark checked today**.
- **`/admin/settings`:** "Estimates as of".
- **`/admin`:** catalogue totals, listings over 14 days old, and the 12 most
  recent changes from the audit log.

### Keeping the JSON in step

`npm run db:export` copies the database's catalogue back into `data/` (the JSON
files, `meta.json` and `price-check.csv`), using the publishable key from
`.env.local`. Look at `git diff`, run `npm test`, commit. `-- --check` only
reports what would change. A database seeded from the JSON exports back to the
same files byte for byte (`scripts/db-export.test.ts`).

After changing the JSON by hand (or with `prices:apply`), run
`npm run db:seed-sql` to regenerate `supabase/seed.sql`; the unit tests fail
while it's out of date.

## Email confirmation

**Off for now.**

- **Why:** Supabase's built-in email sender only delivers to members of your
  Supabase organisation, a few emails an hour. With confirmation on, your
  supervisor couldn't register with their own address.
- **Both paths are built.** With confirmation on, `/register` says "Check your
  email", and the link finishes sign-up through `/auth/confirm`.

To turn it on later:

1. **Set up a sender.** Supabase → **Authentication → Emails → SMTP Settings**:
   a custom SMTP sender (e.g. Resend).
2. **Point the email templates at `/auth/confirm`.** In **Authentication →
   Emails → Templates**:
   - **Confirm signup:**
     `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/account`
   - **Reset password:**
     `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/account/password`
3. **Switch on "Confirm email"** (step 2 of the setup above).
4. **Set `NEXT_PUBLIC_AUTH_EMAIL=on`**, which also shows "Forgot password?".

## Checking the preview by hand

- [ ] **As a guest:** the builder, presets, sharing and My builds all work.
      Nothing about accounts appears except a "Log in" link.
- [ ] **Import:** make a build as a guest, then register. The import prompt
      offers 1 build. Click **Import**. My builds says "In your account".
- [ ] **Sync:** make a build, then open the preview in another browser (or a
      private window) and log in. The build is there.
- [ ] **Delete:** delete it in one browser and reload the other. It's gone
      there too, and it doesn't come back.
- [ ] **Log out:** account builds leave that browser. Guest builds stay.
- [ ] **Admin access:** as a normal user, `/admin` is a 404. As admin,
      **Admin → Users** lists everyone. You can't change your own role.
- [ ] **Delete account:** in My account, **Delete account** removes the
      account. Logging in with it then fails.
- [ ] **Catalogue (16b):** in **Admin → Catalogue**, change an item's
      estimate and save. Within a few seconds a fresh load of the builder shows
      the new price for it. Change it back.
- [ ] **Listing:** add a listing with a price far from the estimate. The form
      asks you to confirm. **Mark checked today** sets today's date.
- [ ] **Deactivate:** untick "In the picker" on an item. The builder's picker
      no longer offers it; a share link that uses it still opens. Tick it again.
- [ ] **Audit:** `/admin` lists those changes under "Recent changes".

## Files

- **Database:** `supabase/migrations/*.sql` (tables, RLS, functions) and
  `supabase/tests/rls.sql` (the RLS checks).
- **Tests run here:** `supabase/rls.test.ts` runs the same migrations and checks
  against a local Postgres (PGlite) in the unit tests, so they're tested without
  a real project.
- **Auth:**
  - `lib/supabase/` (config, the server client);
  - `lib/auth/` (DAL, Server Actions, form checks, the hint cookie);
  - `proxy.ts`.
- **Builds:** `lib/account/` (merge rules, the sync Server Action) and
  `store/build.ts` (`account`, `tombstones`, `owner`).
- **UI:** `components/account/`, `app/login`, `app/register`, `app/account`,
  `app/admin`, `app/auth/confirm`, `app/forgot-password`.
- **Catalogue (16b):**
  - `lib/catalogue/` (fields per category, listing rules, rows ↔ items, the
    loader and its fallback, the seed generator);
  - `lib/admin/` (catalogue Server Actions and form reading),
    `components/admin/`, `app/admin/items`, `app/admin/settings`;
  - `supabase/seed.sql` (generated) and `supabase/seed.test.ts`;
  - `scripts/db-export.mjs`.
