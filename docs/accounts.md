# Accounts (Phase 16)

Optional logins on top of CoreSpec, using Supabase (Auth and Postgres). Without
the Supabase settings the site has no login at all and works exactly as before.

- **Status:** 16a is built: accounts, builds in the account, guest import, roles
  and the admin users page. 16b moves the catalogue and listings into the
  database. 16c adds the diagrams and finishes these docs.
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
2. **Turn off email confirmation.** Go to **Authentication → Sign In / Providers
   → Email** and turn off **Confirm email**. Save. (See "Email confirmation"
   below for why.)
3. **Set the URLs.** In **Authentication → URL Configuration**:
   - **Site URL:** your preview URL.
   - **Redirect URLs:** add `http://localhost:3000/**` and
     `https://*-koboy-kampus.vercel.app/**`.
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
   Environment Variables (**Preview** only). Then redeploy the preview: push,
   or Vercel → Deployments → Redeploy.
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
