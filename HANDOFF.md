# CoreSpec handoff report (session 3)

_Written 12 November 2026, at the end of Phase 16c, on the branch `feat/phase-16-auth`. Every number below comes from a command run during this session, on Windows 11 with Node 26.13.0, unless marked otherwise. Earlier reports are in git history: session 1 `git show 3db675e:HANDOFF.md`, session 2 `git show df9628d:HANDOFF.md`._

**Legend:** ✅ done · ⚠️ partial · ❌ not done · 🔍 not checked

---

## 1. Overview

### What it does today

- CoreSpec is a dark, spec-sheet styled **3D PC builder** for Indonesian buyers, with English UI and prices in Rupiah.
- **PC:** 8 slots, **73 parts**, drawn in a 3D case at real size. 9 compatibility rules plus a "missing parts" reminder; errors glow coral in 3D.
- **Setup:** 12 optional categories, **108 items**, drawn on a **3D desk**, with 5 setup rules (warnings and notes only).
- **Prices:** every item has an estimate; some have listings checked by hand on Tokopedia or Shopee. Prices are never fetched or scraped.
- **Builds** save in the browser and share as links (`/b/<code>`).
- **Accounts (session 3, Phase 16, optional):** with the Supabase settings, visitors can register and log in. Builds then sync to the account, guest builds can be imported, and admins manage users, the catalogue, checked listings and site settings, with an audit log. **Without the settings the site is exactly as before**: no login, no cookies, catalogue from the JSON.

### Stack

| Area                | Package                                                           | Version                                          |
| ------------------- | ----------------------------------------------------------------- | ------------------------------------------------ |
| Framework           | next                                                              | 16.4.5 (App Router, Turbopack, Cache Components) |
| UI runtime          | react / react-dom                                                 | 19.3.0 (React Compiler)                          |
| Language            | typescript                                                        | 5.9 (`strict: true`)                             |
| Styling             | tailwindcss                                                       | 4                                                |
| 3D                  | three · @react-three/fiber · @react-three/drei                    | 0.187 · 9.8 · 10.7                               |
| State               | zustand                                                           | 5.1 (persist to localStorage)                    |
| Backend (new)       | @supabase/ssr · @supabase/supabase-js                             | 0.12.7 · 2.118                                   |
| Tests               | vitest · @playwright/test · axe-core · @electric-sql/pglite (new) | 5.1 · 1.65 · 4.14 · 0.5.11                       |
| Model tooling (dev) | @gltf-transform/* · draco3dgltf · sharp                           | 4.5 · 1.5 · 0.35                                 |

---

## 2. What was built, phase by phase

- **Session 1 (Phases 0–8)** ✅ Scaffold, design system, landing page, catalogue and PC rules, builder, 3D viewer, save and share, polish, launch pages. Commits `5d7aa2c` to `3db675e`.
- **Session 2 (Phases 9–15)** ✅ Clean-up and performance, setup items and rules, 3D desk, tiers and checked prices, model pipeline v2, hero poster. Commits up to `df9628d`. The tag **`demo-stable-2026-11-11`** (`ac3689b`) is the known-good demo version.

### Session 3: Phase 16, login and backend (branch `feat/phase-16-auth`, not merged)

| Part                              | What was built                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Commits              |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| Plan                              | `docs/phase-16-plan.md`, approved with Rei's 7 changes (all items readable, tombstones, `security definer` rules, column lock, sign-up trigger, token refresh in the sync, Later notes)                                                                                                                                                                                                                                                                                                                                                                       | `a1044f2`            |
| **16a** Accounts                  | Supabase Auth with httpOnly cookies and Server Actions (no Supabase code in the browser). `/login`, `/register`, `/account` (name, password, builds, log out, delete), `/admin` and `/admin/users` (roles). Builds sync about a second after each edit; deletes leave a tombstone; guest builds can be imported. `proxy.ts` runs only on account routes, so public pages stay static. RLS on every table, no service-role key.                                                                                                                                | `8c6255f`, `f7d2888` |
| **16b** Catalogue in the database | `items`, `listings`, `site_settings`, `audit_log`. The JSON stays the bundled base; pages get only the database's differences (none when they match), so they stay static and the same size, and fall back to the JSON when the database is off, unreachable or empty. `/admin/items` (filters, add, edit, deactivate), listings with "Mark checked today" and the 40% confirm, `/admin/settings`, totals and recent changes on `/admin`. `seed.sql` generated from the JSON; `npm run db:export` copies the database back. Listing rules as database checks. | `68397f0`            |
| **16c** Diagrams and docs         | `npm run diagrams` draws the ERD and use case diagram (`docs/diagrams/`, English) and, for the PI write-up in Indonesian, the ERD, use case diagram and two activity diagrams as PNG (`docs/pi/`), plus `docs/pi/angka.md` with the numbers. `docs/accounts.md` finished; this report.                                                                                                                                                                                                                                                                        | the 16c commit       |

Also fixed in Phase 16: the navbar scrolled sideways at exactly 768 px with accounts on (16a), and two flaky tests (`blob:` URLs counted as outside requests; a cold-start timeout).

---

## 3. Checks

| Check                                         | Command                                                | Result                                                                                                  |
| --------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Lint                                          | `npm run lint`                                         | ✅ no problems                                                                                          |
| TypeScript                                    | `npx tsc --noEmit`                                     | ✅ 0 errors                                                                                             |
| Formatting                                    | `npx prettier --check .`                               | ✅ clean                                                                                                |
| Unit tests                                    | `npx vitest run`                                       | ✅ **319 passed** (25 files)                                                                            |
| End-to-end, accounts off                      | `npm run test:e2e`                                     | ✅ **75 passed**, axe **0 violations**                                                                  |
| End-to-end, accounts on, database unreachable | `E2E_SUPABASE_URL=http://127.0.0.1:9 npm run test:e2e` | ✅ **71 passed**, 4 skipped (accounts-off only)                                                         |
| Build                                         | `npm run build`                                        | ✅ passes (run by the e2e suite); `/`, `/builder`, `/about`, `/prices` static, `/b/[code]` static shell |

Session 2 ended at 238 unit and 70 e2e tests.

- **The database** is tested without a real project: `supabase/rls.test.ts` runs every migration (twice), `supabase/tests/rls.sql` (84 checks for anon, user and admin) on an empty database and on one already in use (an admin, a user with builds, the seeded catalogue; left exactly as it was), and 9 "mutation" tests (each loosens one rule and expects `rls.sql` to fail) in PGlite, a local Postgres. `supabase/seed.test.ts` checks the seed against the JSON item by item, and `scripts/db-export.test.ts` checks the export round trip byte for byte.
- **On the real project:** the 16a migrations and `rls.sql` passed. The 16b migrations and the seed ran on 12 Nov 2026 (181 items in 20 categories, 4 listings). `rls.sql` then stopped at "an admin reads every profile": it assumed an empty database, and the project now has Rei's admin account. Fixed: every total is now relative to what the project already has, or counts only the test's own accounts. 🔍 It needs one more run there (§11).

### What the e2e suite covers (`tests/e2e/`)

| File                                                       | Covers                                                                                                                        |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `builder.spec.ts`                                          | Picking parts, incompatibilities, picker filters (including tiers), presets, saving, the replace-preset dialog, phone layout  |
| `setup.spec.ts`, `setup-rules.spec.ts`                     | Setup tab, suggested setup, filter chips, totals, every setup rule from the UI                                                |
| `desk.spec.ts`                                             | Desk view switch, warnings in 3D, touch and wheel on the desk, chair fade                                                     |
| `prices.spec.ts`                                           | Checked and estimate labels, shop links and their `rel`, the 14-day note (mocked clock), summary and shared page              |
| `share.spec.ts`                                            | Storage migration, share links (old and new), My builds, touch and wheel on shared builds, phone widths                       |
| `hero.spec.ts`                                             | The hero and the builder show the same build; the hero poster still matches the live scene                                    |
| `visual.spec.ts`                                           | Screenshot baselines of the PC views, the hero and a full desk; models load once, and only when used                          |
| `demo.spec.ts`                                             | `docs/demo-script.md`, click for click                                                                                        |
| `keyboard.spec.ts`, `a11y.spec.ts`, `site.spec.ts`         | Keyboard-only run, axe on every page and dialog, site wording, no sideways scroll, poster first and no 3D with reduced motion |
| `accounts-off.spec.ts`, `catalogue-fallback.spec.ts` (new) | No account UI, cookies or outside requests without settings; the JSON catalogue with Supabase off or unreachable              |

### Lighthouse (mobile, median of 3 runs, local production build)

Lighthouse 13.6, mobile preset, default simulated throttling, `next start` on this laptop. Phase 16 was measured with accounts on (dummy settings: the preview URL is behind Vercel's login). "16a" is before the catalogue moved into the database; "16b" is after, once with the database unreachable and once with a stand-in serving the seeded rows.

| Route       | Metric    |    16a | 16b, DB unreachable | 16b, DB seeded |
| ----------- | --------- | -----: | ------------------: | -------------: |
| `/`         | Score     |     89 |                  89 |             90 |
|             | TBT       |  11 ms |               10 ms |           9 ms |
|             | LCP       | 3.83 s |              3.83 s |         3.71 s |
|             | JS (gzip) | 295 KB |              297 KB |         297 KB |
| `/builder`  | Score     |     98 |                 100 |             99 |
|             | TBT       | 171 ms |               91 ms |         113 ms |
|             | LCP       | 0.76 s |              0.76 s |         0.76 s |
|             | JS (gzip) | 581 KB |              583 KB |         583 KB |
| `/b/[code]` | Score     |     86 |                  86 |             88 |
|             | TBT       | 532 ms |              527 ms |         476 ms |
|             | LCP       | 1.06 s |              1.06 s |         1.06 s |
|             | JS (gzip) | 593 KB |              595 KB |         595 KB |

CLS is 0 everywhere. The only real change is +2 KB of JavaScript (the code that applies database changes); the rest is run-to-run noise. Session 2's measurements (Phases 9–15, accounts didn't exist yet), for comparison:

| Route       | Metric                | Phase 9 before | Phase 9 after | Phase 10 | Phase 15 | **Phase 15 + poster** |
| ----------- | --------------------- | -------------- | ------------- | -------- | -------- | --------------------- |
| `/`         | Score                 | 57             | 87            | 86       | 85       | **90**                |
|             | TBT                   | 875 ms         | 514 ms        | 532 ms   | 578 ms¹  | **20 ms**¹            |
|             | LCP (simulated)       | 6.5 s          | 0.9 s         | 0.9 s    | 0.9 s    | **3.7 s**²            |
|             | LCP (observed)        | —              | —             | —        | 0.19 s   | **0.15 s**            |
|             | CLS                   | 0              | 0             | 0        | 0        | **0**                 |
|             | JS during load (gzip) | 589 KB         | 566 KB        | 564 KB   | 578 KB   | **290 KB**            |
|             | Main-thread work      | —              | —             | 3.1 s    | 3.4 s    | **0.67 s**            |
| `/builder`  | Score                 | 70             | 71            | 96       | 97       | **95**                |
|             | TBT                   | 398 ms         | 356 ms        | 233 ms   | 203 ms   | **255 ms**            |
|             | LCP                   | 5.5 s          | 5.5 s         | 0.75 s   | 0.76 s   | **0.75 s**            |
|             | CLS                   | 0.023          | 0.023         | 0        | 0        | **0**                 |
|             | JS (gzip)             | 589 KB         | 577 KB        | 564 KB   | 576 KB   | **575 KB**            |
| `/b/[code]` | Score                 | 80             | 86            | 86       | 86       | **84**                |
|             | TBT                   | 846 ms         | 543 ms        | 544 ms   | 562 ms   | **615 ms**³           |
|             | LCP                   | 0.9 s          | 0.9 s         | 0.9 s    | 1.06 s   | **1.06 s**            |
|             | CLS                   | 0              | 0             | 0        | 0        | **0**                 |
|             | JS (gzip)             | 590 KB         | 567 KB        | 571 KB   | 585 KB   | **585 KB**            |

¹ Median of 5 runs.
² See "the LCP trade-off" below.
³ This page didn't change in the last commit. Its runs have ranged 551–689 ms across today's measurements, so treat 560–615 as one band: at the 600 ms target, not clearly under it (§10).

---

## 4. Data and content

| Group                       | Items   | Per tier (Budget / Mid / High-end) | Checked listings                                                                                          |
| --------------------------- | ------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------- |
| PC parts (8 categories)     | **73**  | 3/3/3 each; coolers 4/3/3          | CPU: Ryzen 5 7600 (Shopee). GPU: RX 9060 XT (Tokopedia, Shopee). Storage: Crucial P3 Plus 1TB (Tokopedia) |
| Setup items (12 categories) | **108** | exactly 3/3/3 each                 | none yet                                                                                                  |

- **Estimates** are dated `pricesAsOf` **8 November 2026** (`data/meta.json`). **Checked** prices are from 11 November 2026. Where both exist, the cheapest checked listing is shown and added up.
- **Specs to double-check** (dimensions, a few compatibility facts) are listed in `docs/price-check.md`.

### Presets

| Preset              | Estimate total | Shown total (with checked prices) | Est. draw | PSU   | Compatible |
| ------------------- | -------------- | --------------------------------- | --------- | ----- | ---------- |
| Budget 1080p        | Rp 9.080.000   | **Rp 9.080.000**                  | 277 W     | 550 W | ✅         |
| 1440p Sweet Spot    | Rp 17.618.000  | **Rp 23.445.294**                 | 305 W     | 650 W | ✅         |
| Creator Workstation | Rp 35.268.000  | **Rp 35.268.000**                 | 500 W     | 750 W | ✅         |

Suggested setups: Rp 4.530.000, Rp 15.330.000 and Rp 27.650.000. The estimates match the brief's targets (about Rp 9, 18 and 35 jt), and a unit test keeps them there. The 1440p Sweet Spot shows about Rp 23,4 jt because its GPU and SSD really cost about twice their estimates after the memory price surge (checked 11 Nov 2026). The presets are kept on purpose, and no page promises a fixed total.

---

## 5. 3D and assets

| Item                                    | Rendering                                                                                                                             | File                         | Size    | Licence                      |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ------- | ---------------------------- |
| CPU                                     | Model (`defaultFor: cpu`)                                                                                                             | `public/models/cpu.glb`      | 6.6 KB  | CC0 1.0 · iPoly3D            |
| Memory                                  | Model, one per stick                                                                                                                  | `public/models/ram.glb`      | 6.1 KB  | CC0 1.0 · iPoly3D            |
| Graphics                                | Model                                                                                                                                 | `public/models/gpu.glb`      | 10.2 KB | **CC BY 3.0** · pgonarg      |
| Keyboard (desk view)                    | Model, `fit: contain`                                                                                                                 | `public/models/keyboard.glb` | 55 KB   | **CC BY 3.0** · Alex Safayan |
| Motherboard, cooler, PSU, storage, case | Procedural (PCB with socket/DIMM/PCIe/VRM; tower with fin ribs or radiator; vent ribs; M.2 label or 2.5"; smoked glass, shroud, fans) | —                            | —       | ours                         |
| Other setup items                       | Procedural (monitor with lit screen and curve, arm, chair with 5-star base, speakers, lamp, etc.)                                     | —                            | —       | ours                         |

- **Pipeline:** `docs/models.md` explains how to add a model with no code (allowed and forbidden sources, the Blender checklist, a real walkthrough). `npm run models` and the tests refuse:
  - a missing credit;
  - a licence that isn't CC0 1.0 or CC BY 3.0/4.0;
  - a file over 400 KB;
  - a heaviest possible build over 2.5 MB.
- **Loading:** models load only when an item on screen uses them, and each file loads once. They're Draco-compressed with the decoder served from `public/draco/`. A model that fails falls back to the next step.
- **Hero poster:** `public/hero/poster.webp` (22 KB), made by `npm run hero:poster` from `/styleguide/hero` (internal, `noindex`, disallowed in robots).
- **Weight:** `public/` is about 355 KB in total: the Draco decoder is about 252 KB and the 4 models about 78 KB. `models-src/` (sources) is 268 KB, and `docs/screenshots/` is 1.8 MB (not served).
- **Layout checks:** `partClashes()` (PC) and the desk overlap tests run over thousands of combinations. `viewFrame()` keeps the exploded view in frame from 0.46 (tall phone) to 1.8 (wide) aspect ratios.

---

---

## 6. Security and secrets

- **`.gitignore`:** `.env*` (except `.env.example`, all values empty), `node_modules`, `.next`, `.vercel`.
- **Env vars (all optional):**
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: public by design (the publishable key only allows what RLS allows). Set in Vercel as type **Config**, **Preview only**.
  - `NEXT_PUBLIC_AUTH_EMAIL`: `on` once a real email sender exists.
  - `NEXT_PUBLIC_SENTRY_DSN` (not secret), `SENTRY_AUTH_TOKEN` (**secret**, build-time only), `SENTRY_ORG`, `SENTRY_PROJECT`.
- **No service-role or secret Supabase key** anywhere: every query runs as the visitor, under Row Level Security. Session cookies are httpOnly; the `cs-auth` hint cookie grants nothing.
- **Database rules:** RLS on every table; `profiles.role` only changes through `set_role()` (admins only, never your own, never the last admin); every `security definer` function has `search_path = ''`, checks the caller and can't be run by anon. Details: `docs/accounts.md`.
- **History scan of session 3** (`git log -p df9628d..HEAD`, added lines, the pattern from REI.md §7): **no secrets.** The matches are:

| Match                                | What it actually is                                                                                                                   |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `password` / `Password` (~100 lines) | The account forms: field names, `PASSWORD_MIN`, `PasswordForm`, messages like "Enter your password." No password values.              |
| `token` (~40 lines)                  | Supabase session handling and its tests (`refresh_token`, `token_hash`, `/auth/v1/token`), and fake tokens the tests build themselves |
| `secret`                             | "non-secret cookie", "no secret key", Vercel's "Secret" env type in the docs, and **Secretlab**                                       |
| `sk-`                                | **`desk-`** ids and `desk-edge`, as before                                                                                            |
| `abcdefgh.supabase.co`               | A made-up project URL in `lib/account/sync.test.ts`                                                                                   |

Sessions 1 and 2's known false positives (`mask-image`, design tokens, `SENTRY_AUTH_TOKEN` as a name, package names) still apply.

---

## 7. Deploy

- **Vercel:** every push to `main` deploys production; every push to `feat/phase-16-auth` deploys a **preview**. No `vercel.json`. Node: `engines >=20.9`, `.nvmrc` 24.
- **Production (`main`) has no Supabase settings**, so even after a merge it stays the guest-only site until the two env vars are added for Production too.
- **The preview has accounts on**, against Rei's Supabase project (Singapore), set up from `docs/accounts.md`. 16a was checked there.
- 🔍 **Not checked in this session:** PageSpeed on the preview (it's behind Vercel's login) and a real phone.

---

## 8. Git

- `main`: the demo, unchanged since session 2 (`df9628d`).
- `feat/phase-16-auth`: Phase 16, pushed, **not merged** (merge only when Rei says so).
- **Line endings:** `.gitattributes` keeps LF everywhere.
- **Tags:** `demo-stable-2026-11-11` → `ac3689b`.

---

## 9. Leftovers and known issues

1. **Bad share links return HTTP 200** with 404 content and `noindex` (a streaming limitation). Kept by Rei's decision.
2. **`/admin` for a logged-in non-admin** shows the 404 page with HTTP 200 (the same streaming limitation). Guests get a real 404 from `proxy.ts`.
3. **The admin pages have no e2e tests:** they need a real login. Their form reading and the catalogue rules have unit tests; `docs/accounts.md` has a manual preview checklist.
4. **Running `seed.sql` again resets** the seeded items to the JSON (admin edits lost). Run `npm run db:export` first if they should be kept.
5. **Supabase returns at most 1,000 rows per request** by default: plenty for 181 items and 4 listings, but the loader would need paging past that.
6. **Two builder tabs open at once** can overwrite each other's saved builds (true before accounts too).
7. **Specs not confirmed online** for some items (list in `docs/price-check.md`). **Only 3 items have checked listings**, and those show "Price may have changed" from 26 November 2026.
8. As in session 2: rare part overlaps that `partClashes()` still finds in some compatible builds (none in the presets), the `THREE.Clock` deprecation warning from React Three Fiber, and no physical-phone test of the 3D view.

---

## 10. Later

- **Item delete in the admin:** only deactivation is offered (share links keep working). Deleting would need a check that no preset uses the item.
- **`docs/pi/angka.md` is written by hand:** update its test counts and Lighthouse table when they change. `npm run diagrams` redraws the pictures from the data in `scripts/diagrams.mjs`.
- **Keyboard proportions:** the keyboard model is roughly TKL-shaped, and `fit: contain` keeps that shape, so full-size keyboards draw a little narrower than their real width. Fix with a full-size model as the `modelId` of the full-size keyboards, or a per-layout model.
- **Screenshot baselines are Windows-only** (`tests/e2e/visual.spec.ts-snapshots/*-win32.png`). If CI is added (Linux), regenerate them there with `npx playwright test visual --update-snapshots` and commit the `-linux` files.
- **More 3D models per setup category:** monitor, chair, headset, mouse, desk. No CC0/CC BY ones that look right were found yet. Each one is now a data-only change (`docs/models.md`).
- **More checked listings:** fill `data/price-check.csv` for the preset parts first, then the suggested setups.
- **`/b/[code]` weight:** "Copy to my builds" pulls in the build store and the catalogue. Loading the store only when the button is clicked would save about 15 KB gzip and some main-thread time.
- **The exploded toggle changes its label** ("Exploded view" ↔ "Assemble") as well as `aria-pressed`. Screen readers may announce that oddly. A fixed label with `aria-pressed` alone is the textbook pattern.
- **Footer links** "Presets", "Compatibility rules" and "Feedback" were removed in Phase 9. A public `/rules` page built from `docs/rules.md` would be a good addition for the write-up.
- **`/parts` catalogue page** is still a placeholder (unlinked, `noindex`). It could reuse the picker with tiers and shop links.
- **PageSpeed on the live URL** and a real-phone pass before any big demo. The demo script assumes a laptop.
- **Hero LCP (simulated 3.7 s):**
  - An option is a vector (SVG) poster, which is never an LCP candidate. It would need its own drawing of the scene, and matching the 3D render exactly would be hard.
  - Another is to make the hero image smaller than the heading on phones.
  - Re-run `npm run hero:poster` whenever the showcase build or the 3D look changes; the e2e test will say so.
- **Builder PageSpeed (mobile) is about 84 live** after Phases 13–15, down from 97 (Rei's measurement): there's more catalogue data. Look at loading catalogue data per category (the picker only needs the open category; the slot list and checks need only the chosen items).
- **`/b/[code]` TBT** sits at the 600 ms target (560–615 ms). The same deferral as the hero (mount the 3D after the first interaction) would help, but there the 3D view is the point of the page, so it's a judgement call.
- **Email confirmation with a real sender (Phase 16):** accounts start with confirmation off, because Supabase's built-in email only reaches the project's own team. To turn it on, set up a custom SMTP sender (e.g. Resend) in Supabase → Authentication → Emails → SMTP, switch "Confirm email" on, update the email templates (`docs/accounts.md`) and set `NEXT_PUBLIC_AUTH_EMAIL=on` (which also enables "Forgot password?"). The code for both paths is already there.
- **CAPTCHA on register:** Supabase Auth supports hCaptcha and Cloudflare Turnstile (Authentication → Attack Protection). It needs a widget on `/register` (and `/login`) and the token passed to `signUp` / `signInWithPassword` as `options.captchaToken`.
- **Rate limits:** Supabase Auth's built-in limits apply to sign-up, login and emails (Authentication → Rate Limits); review them before a public launch. The build sync Server Action has no rate limit of its own beyond the 200-builds-per-account cap in the database.

---

## 11. Finishing Phase 16

1. **Run `supabase/tests/rls.sql` again on the real project** (SQL editor) → "All RLS tests passed". The 16b SQL is already there: `…0400_catalogue.sql` and `…0500_audit.sql` ran, and `seed.sql` gave 181 items in 20 categories and 4 listings (12 Nov 2026). With Rei's admin account present, the "last admin can't delete their account" check is skipped with a notice (it would otherwise really delete the test admin until the rollback); the unit tests run it on an empty database.
2. **Walk the preview checklist** in `docs/accounts.md` (accounts, sync, delete, admin, catalogue, listing, deactivate, audit).
3. **Merge** `feat/phase-16-auth` into `main` only when Rei says so. Production stays guest-only until the env vars are added for Production.
4. **For the PI:** the pictures and numbers are in `docs/pi/`; English versions of the ERD and use case diagram are in `docs/diagrams/`.
