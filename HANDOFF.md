# CoreSpec handoff report (sessions 4 and 5)

_Session 5 (25 November 2026, Phase 20 on `feat/phase-20-verify-receipt`, PR #9) added the Phase 20 parts below: §1, §2, §3, §7, §8, §9, §10 and §14. Written 17 November 2026 at the end of Phase 17c, updated 18 November 2026 at the end of Phase 18c on the branch `feat/phase-18-chat` (draft PR #7, not merged; it contains all of Phase 17), and updated 23 November 2026 at the end of Phase 19c on `feat/phase-19-models` (draft PR #8, which starts from `feat/phase-18-chat`). Every number below comes from a command run during this session, on Windows 11 with Node 26.13.0, unless marked otherwise. Earlier reports are in git history: session 1 `git show 3db675e:HANDOFF.md`, session 2 `git show df9628d:HANDOFF.md`, session 3 (Phase 16, with the 14 and 15 Nov updates) `git show 7db6ce4:HANDOFF.md`. Sections that didn't change in this session (data, 3D, older Lighthouse runs) are shortened here; the session 3 report has the full tables._

**Legend:** ✅ done · ⚠️ partial · ❌ not done · 🔍 not checked

---

## 1. Overview

### What it does today

- CoreSpec is a dark, spec-sheet styled **3D PC builder** for Indonesian buyers, with English UI and prices in Rupiah.
- **PC:** 8 slots, **73 parts**, drawn in a 3D case at real size, with 10 PC rules. **Setup:** 12 categories, **108 items**, on a 3D desk, with 5 setup rules.
- **Prices:** estimates for every item, and a few listings checked by hand on Tokopedia or Shopee. Prices are never fetched or scraped.
- **Builds** save in the browser and share as links (`/b/<code>`). **Accounts (Phase 16, live on production):** login, sync, and an admin panel for users, catalogue, listings and settings.
- **Phase 17: checkout** with Midtrans **Sandbox** (test mode), orders, and a **PDF receipt** with 3D pictures of the build. No real money moves and nothing is sold or shipped. Until Phase 20 every screen and the receipt said "SIMULASI — bukan bukti transaksi"; since Phase 20 (the supervisor's request) the app says it only once on `/checkout` and once in the receipt's footer, and the presenter says it aloud (§2, Phase 20).
- **New on 25 Nov (Phase 20): admin verification.** An admin verifies each paid order; the order and the receipt show who and when ("Diverifikasi oleh: Admin CoreSpec 1", a VERIFIED box). The receipt's 3D pictures are now light and bright (the app keeps its dark look).
- **Without the Midtrans settings the site is exactly as before:** no button, and the new pages and the notification URL are a 404. Production has no Midtrans settings today; the preview does.
- **New on 22–23 Nov (Phase 19): real 3D models in the desk view.** 18 models made for CoreSpec in Blender (CC0, scripts in `tools/blender/`) replace the boxes for every desk item and, in the desk view only, the PC case. Setup items can carry a **finish** (their own colours per model part, editable in the admin); the desk view got a lighting pass and a tighter default camera for the recorded demo. The PC view is unchanged.
- **New on 18 Nov (Phase 18): live chat.** Logged-in users chat with the admin; a **rule-based bot** (keywords in English and Indonesian, no AI) answers common questions at once, and the admin replies from an inbox at `/admin/chat`. Both sides update live through Supabase Realtime, with polling every 5 seconds as a fallback. Without the Supabase settings there is no chat UI and no Realtime code.

### Stack

As in session 3 (Next 16.4.5 with Cache Components, React 19.3, TypeScript 5.9, Tailwind 4, three 0.187 with react-three-fiber 9.8 and drei 10.7, zustand 5.1, `@supabase/ssr` 0.12.7, Vitest 5.1, Playwright 1.65, axe-core 4.14, PGlite 0.5.11). New, pinned exactly:

| Area           | Package   | Version | Loaded                                         |
| -------------- | --------- | ------- | ---------------------------------------------- |
| PDF receipt    | `pdf-lib` | 1.17.1  | only when "Download receipt (PDF)" is clicked  |
| QR code on PDF | `uqr`     | 0.1.3   | with pdf-lib                                   |
| Midtrans       | none      | —       | `fetch` on the server; `snap.js` from Midtrans |

Phase 18 adds one, pinned to the exact version `@supabase/supabase-js` already depends on, so the lockfile keeps one copy:

| Area     | Package                 | Version | Loaded                                                          |
| -------- | ----------------------- | ------- | --------------------------------------------------------------- |
| Realtime | `@supabase/realtime-js` | 2.118.0 | only when the chat panel opens a conversation, or `/admin/chat` |

There is no Midtrans npm package: the server calls the sandbox REST API with `fetch`, and the browser loads Midtrans's `snap.js` only when Pay (or Continue payment) is pressed.

---

## 2. What was built, phase by phase

- **Session 1 (Phases 0–8)** ✅ Scaffold to launch pages. Commits `5d7aa2c` to `3db675e`.
- **Session 2 (Phases 9–15)** ✅ Performance, setup items, 3D desk, tiers and checked prices, model pipeline v2, hero poster. Up to `df9628d`; tag **`demo-stable-2026-11-11`** (`ac3689b`).
- **Session 3 (Phase 16)** ✅ Accounts, catalogue in the database, admin panel, diagrams. Merged 14 Nov (PR #3). Then on `main`: the phone picker (PR #4, 15 Nov) and "Share build" in the navbar plus deleting unused catalogue items (PR #5, `2c2e437`, 15 Nov).

### Session 4: Phase 17, the checkout simulation (branch `feat/phase-17-checkout`, draft PR #6)

| Part                        | What was built                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Commits                         |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| **17a** Orders and checkout | `orders` and `payment_config` tables; trusted writes without a service-role key (`create_order` and `set_order_payment` only work with `ORDER_WRITE_SECRET`; the database keeps its SHA-256). Status rules in the database (paid is final, pending never replaces another status) and a cap of 5 unpaid orders per hour. Server-side repricing from the catalogue, Snap token, `refreshOrder` (status API, the main path), "Continue payment", and `POST /api/midtrans/notification` (signature, amount, then confirm with the status API). "Checkout (simulation)" in the build summary, gated by the compatibility errors; `/checkout`, `/orders`, `/orders/[id]`, `/admin/orders`. | `7e862c7`, `8df2cf2`, `97d057e` |
| **17b** PDF receipt         | "Download receipt (PDF)" on `/orders/[id]`, any status. The PC and desk scenes are drawn off screen at a fixed 1200 × 900 (the same on a phone), then an A4 PDF is laid out in the browser: order facts, QR code to the share page, both pictures, the item snapshot with subtotals and total, "Compatibility (checked <date>): …", and the simulation watermark and footer on every page. Layout code in `lib/receipt/` (data in, bytes out).                                                                                                                                                                                                                                        | `7db6ce4`                       |
| **17c** Docs, diagrams      | `npm run diagrams`: `orders` and `payment_config` in the ERD; "Checkout (simulation)", "Download receipt (PDF)" (User) and "View orders" (Admin) in the use case diagram; a new activity diagram `docs/pi/aktivitas-simulasi-pembayaran.png`. `docs/pi/angka.md` updated. `docs/accounts.md` setup status; a checkout segment in `docs/demo-script.md`; a checkout paragraph on `/privacy` (only when checkout is on); this report.                                                                                                                                                                                                                                                   | the 17c commit                  |

### Session 4, continued: Phase 18, live chat (branch `feat/phase-18-chat`, draft PR #7)

| Part                                | What was built                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Commits                         |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| **18a** Database and the bot        | `conversations` (one per user) and `chat_messages`; RLS (own or admin reads; users and admins insert as themselves); a `security definer` insert trigger with an empty `search_path` that trims the body (1–1000 characters), checks the sender and holds the rate limit (5 per 30 s, 60 per day); an after-insert trigger that broadcasts each message with `realtime.send` to `chat:<id>` and `chat:admin`, catching any Realtime failure so the message is always saved; `post_bot_reply` only with `ORDER_WRITE_SECRET`; the join policy on `realtime.messages`. The bot (`lib/chat/bot.ts`): 8 rules in priority order plus a fallback; "Needs admin" is worked out from the messages, not stored. | `9fd3ed9`                       |
| **18b** Chat UI and the inbox       | The `receipt` rule moved above `checkout`. `getRealtimeToken()`; the chat button and panel (a full-height sheet on phones, a card on desktop; quick questions; Enter sends); the admin inbox `/admin/chat` with filters, unread badges, Close / Reopen; Live / Reconnecting with polling every 5 s; `/styleguide/chat`. The button's code loads only in a logged-in browser.                                                                                                                                                                                                                                                                                                                            | `ec204db`, `1c799a8`, `37c169a` |
| **18b fixes** after the iPhone test | The bot answers question rules even right after an admin reply (only greeting, human and the fallback stay quiet for 10 minutes); functions in Vercel's `sin1` region (`vercel.json`); optimistic sending ("Sending…", then "Not sent — Retry" on error); a 16px text box on phones (no iOS zoom) that is one line when empty and grows with the text; no sideways scroll.                                                                                                                                                                                                                                                                                                                              | `d8bd610`                       |
| **18c** Docs, diagrams              | `npm run diagrams`: `conversations` and `chat_messages` in the ERD; "Chat dengan admin / bot" (User) and "Membalas chat" (Admin) in the use case diagram; a new activity diagram `docs/pi/aktivitas-live-chat.png` (lanes Pengguna, Server, Basis data, Admin, with the bot's rule matching as its own decision). `docs/pi/angka.md` (the chat numbers and a table of the bot's keywords); a chat segment in `docs/demo-script.md`; a chat paragraph on `/privacy` (only when accounts are on); the setup status in `docs/accounts.md`; this report.                                                                                                                                                    | the 18c commit                  |

### Session 4, continued: Phase 19, desk-view 3D models (branch `feat/phase-19-models`, draft PR #8)

| Part                       | What was built                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Commits                                                          |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| **19a** Wire the models in | 16 models from the chat (Blender Python, `tools/blender/`) in `models-src/` and `data/models.json`. Variant rules are data (`variantFor` + `match`, and `layout: "on-arm"` for a monitor on an arm), so admin-added items get the right model with no migration. One model box per speaker; desk tones `wood`, `mesh`, `accent`, `screen`, `light`. Fix round: microphone legs, `monitor-panel-curved`.                                                                                             | `d995410`, `4b9635f`, `09bb8da`, `9d029ab`                       |
| **19b** Finish             | `items.finish` (migration `20261122000100_item_finish.sql`, run on the real project 22 Nov): material → `#RRGGBB`, setup items only, checked in the site (a material the item's models have, no glowing ones, ≤ 12) and in the database (shape, setup-only). 16 preset finishes from Rei's research. Desk view and receipt use it; admin Finish section with "Reset to default"; audit log. `rls.sql` +10 checks, 2 mutation tests. Fixed the admin "3D model" select listing indexes.              | `3a60d2d`, `b6565a6`                                             |
| **19b** Lighting           | Desk view only: key light 2.6 → 3.1, two rim lights from behind so dark items part from the page.                                                                                                                                                                                                                                                                                                                                                                                                   | `4a84bdf`, `d6f08a2`                                             |
| Headset and case           | Headset rebuilt on its under-desk hook (`fit: stretch`). `case-mid-tower` with `"views": ["desk"]` (a new rule): drawn for every case in the desk view, stretched to its dims, glass toward the person and front toward the desk (mirrored when the PC is right of the desk's middle), glass 15% see-through without depth write, RGB that glows. RGB strips behind the glass (`models/case-rgb`). G435 finish loses `fabric` (`20261123000100_g435_finish.sql`; done by hand on the real project). | `d72a5e2`, `65db9c4`, `51f5da5`, `203e753`, `c985260`, `f2ce19a` |
| Camera and colour          | Default desk camera frames the setup's own items at about 75–80% of the view on any screen shape (`frameBox`, `seatedHome`), R resets to it. Desk greys and rim lights made neutral (they read mauve under the coral back light); the coral rim lowered. PC tones untouched.                                                                                                                                                                                                                        | `203e753`                                                        |
| **19c** Docs, PI material  | `tools/blender/README.md` (rebuild steps, script per model, axes; outputs now in `tools/blender/out/`, git-ignored); `docs/models.md` (new models, `views`, desk tones, finish); `/credits` shows the 18 CoreSpec models as one card; `docs/pi/` desk-view figures per preset and a before/after pair from the same camera, `docs/pi/angka.md` (models, triangles, KB); recording notes and step 6b in `docs/demo-script.md` (and `demo.spec.ts`); this section.                                    | the 19c commit                                                   |

### Session 5: Phase 20, admin verification and a brighter receipt (branch `feat/phase-20-verify-receipt`, PR #9)

| Part                     | What was built                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Commit         |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| **20a** Database         | `supabase/migrations/20261125000100_order_verification.sql`: `orders.verified_at`, `verified_by` (→ `profiles`, on delete set null), `verified_by_name` (a snapshot of the admin's display name), a check (all null, or time + name on a **paid** order), a partial index for "needs verification". `verify_order(p_order_id)` (security definer, `search_path = ''`, `authenticated` only): admins only, paid only, once only ("Order CS-… is already verified by X"), writes `audit_log` (`order.verify`, whose action check was widened). No update grant on `orders`; no un-verify in the app (fix mistakes by hand in SQL). `set_order_payment` unchanged. `rls.sql` +29 checks (230), 1 mutation test (20). **Live on the production Supabase project** (25 Nov; `rls.sql` passed there). | `bb7bfbe`      |
| **20a** App              | `/admin/orders`: "Needs verification (n)" filter (the default when any exist; "All" is `?status=all`), Verify with "Verify order CS-… as {name}?", Verified by / Verified at columns; a Server Action that re-checks admin and shows friendly errors in a toast. `/admin/orders/[id]` (read-only detail, buyer's name, Verify, receipt). `/admin`: the Orders card counts orders to verify; the recent changes read "Verified order CS-… by {admin}" (`lib/admin/audit.ts`, unknown actions shown as they are). `/orders`, `/orders/[id]`: "Paid · awaiting admin verification" or "Verified by {name} · {date} WIB". Receipt: a VERIFIKASI ADMIN row and a VERIFIED box. Checked by hand on the preview with two admins (25 Nov).                                                              | `372a62a`      |
| **20b** Receipt pictures | The receipt capture only (`studio` on the scenes): neutral studio lights, interior lights placed so the parts read through the glass without hotspots, a light floor and soft shadow, thin grey outlines on dark materials only; the transparent capture is laid over a `#F2F3F5 → #DCDFE4` gradient and saved as JPEG 0.85. The app's builder and desk views are byte-identical before and after (screenshots compared). `npm run receipt:samples` makes `docs/pi/struk-contoh-*.pdf` + page-1 PNGs (rendered by headless Chrome's PDF viewer; `pdfjs-dist` wasn't installed). PDF 324–365 KB → 96–98 KB.                                                                                                                                                                                      | `fff45a0`      |
| Wording                  | The simulation wording left the UI: banner, how-to box (with the test card), eyebrows, subtitles, "(simulation)"/"(sandbox)" on buttons and titles, bot sentences, an error message. Kept: one grey line under the pay button ("Payments run on Midtrans Sandbox (test mode). No real money is charged."), the receipt's footer ("Midtrans Sandbox (test mode) — not proof of a real purchase."), and a test-mode sentence on `/privacy`. The receipt's title is just "Receipt"; no watermark. The receipt's desk picture is framed ~17% tighter. **The test card is no longer shown anywhere in the app**: it's in `docs/demo-script.md` (speaker notes) and `docs/accounts.md`.                                                                                                               | `19fbc2b`      |
| **20c** Docs             | `npm run diagrams`: ERD with the three `orders` columns and `verified_by` → `profiles`; use case "Melakukan pembayaran" (Pengguna) and "Memverifikasi pesanan" (Admin); `aktivitas-pembayaran.png` (renamed from `aktivitas-simulasi-pembayaran.png`, with an Admin lane, "via Midtrans Sandbox") and a new `aktivitas-verifikasi-admin.png`. `docs/pi/angka.md`, `docs/demo-script.md` (checkout + verification segment, Pelanggan Demo as the buyer), `docs/accounts.md` (two admins and the demo buyer), this report.                                                                                                                                                                                                                                                                        | the 20c commit |

---

## 3. Checks

| Check                                    | Command                                                                                                  | Result                                                                                             |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Lint                                     | `npm run lint`                                                                                           | ✅ no problems                                                                                     |
| TypeScript                               | `npx tsc --noEmit`                                                                                       | ✅ 0 errors                                                                                        |
| Formatting                               | `npx prettier --check .`                                                                                 | ⚠️ clean except `tests/e2e/mobile-picker.spec.ts` (from `main`; fix separately, by Rei's decision) |
| Unit tests                               | `npx vitest run`                                                                                         | ✅ **400 passed** (30 files)                                                                       |
| End-to-end, checkout off                 | `npm run test:e2e`                                                                                       | ✅ **112 passed**, 6 skipped, axe 0                                                                |
| End-to-end, checkout on (dummy settings) | `E2E_SUPABASE_URL=http://127.0.0.1:9 E2E_CHECKOUT=on npx playwright test checkout a11y receipt accounts` | ✅ **28 passed**, 6 skipped, axe 0                                                                 |
| Build                                    | `npm run build` (run by the e2e suite)                                                                   | ✅ `/`, `/builder` static; `/b/[code]` partial prerender                                           |

Session 3 ended at 319 unit and 95 e2e tests.

**Phase 18 (18 Nov, after the iPhone fixes `d8bd610`):**

| Check                                        | Command                                                                                                                          | Result                                                                              |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Lint, TypeScript                             | `npm run lint`, `npx tsc --noEmit`                                                                                               | ✅ clean                                                                            |
| Formatting                                   | `npx prettier --check .`                                                                                                         | ⚠️ clean except `tests/e2e/mobile-picker.spec.ts` (as above)                        |
| Unit tests                                   | `npx vitest run`                                                                                                                 | ✅ **515 passed** (35 files)                                                        |
| End-to-end, accounts off                     | `npm run test:e2e`                                                                                                               | ✅ **118 passed**, 10 skipped, axe 0                                                |
| End-to-end, accounts and checkout on (dummy) | `E2E_SUPABASE_URL=http://127.0.0.1:9 E2E_CHECKOUT=on npx playwright test chat a11y checkout receipt accounts catalogue-fallback` | ✅ **38 passed**, 7 skipped, axe 0                                                  |
| Database (PGlite)                            | part of the unit tests                                                                                                           | ✅ `rls.sql` **191 checks**; **17 mutation tests** (2 new for the chat)             |
| Real devices                                 | iPhone and laptop on the Phase 18 preview                                                                                        | ✅ live both ways, Needs admin, reconnect, rate limit, Retry, no zoom, instant send |

**Phase 19 (23 Nov, 19c):**

| Check                                        | Command                                                                                                                          | Result                                                                                                     |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Lint, TypeScript                             | `npm run lint`, `npx tsc --noEmit`                                                                                               | ✅ clean                                                                                                   |
| Formatting                                   | `npx prettier --check .`                                                                                                         | ⚠️ clean except `tests/e2e/mobile-picker.spec.ts` (as above)                                               |
| Unit tests                                   | `npx vitest run`                                                                                                                 | ✅ **566 passed** (36 files)                                                                               |
| End-to-end, accounts off                     | `npm run test:e2e`                                                                                                               | ✅ **118 passed**, 10 skipped, axe 0 (the flaky picker test below failed once; 57/57 on its own)           |
| End-to-end, accounts and checkout on (dummy) | `E2E_SUPABASE_URL=http://127.0.0.1:9 E2E_CHECKOUT=on npx playwright test chat a11y checkout receipt accounts catalogue-fallback` | ✅ **38 passed**, 7 skipped, axe 0                                                                         |
| Database (PGlite)                            | part of the unit tests                                                                                                           | ✅ `rls.sql` **201 checks** (191 + 10 for finish); **19 mutation tests** (2 new for finish)                |
| Models                                       | `npm run models`                                                                                                                 | ✅ 22 models, 305 KB; heaviest build 235 KB (budget 2.5 MB); largest file 55 KB (budget 400 KB)            |
| Visual baselines                             | part of the e2e                                                                                                                  | ✅ PC view baselines unchanged through Phase 19; only the desk baseline was updated (each time on purpose) |
| Real devices                                 | Rei's phones on the Phase 19 preview                                                                                             | 🔍 before merging PR #8                                                                                    |

**Phase 20 (25 Nov):**

| Check                                        | Command                                                                               | Result                                                                                                           |
| -------------------------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Lint, TypeScript                             | `npm run lint`, `npx tsc --noEmit`                                                    | ✅ clean                                                                                                         |
| Formatting                                   | `npx prettier --check .`                                                              | ⚠️ clean except `tests/e2e/mobile-picker.spec.ts` (as above)                                                     |
| Unit tests                                   | `npx vitest run`                                                                      | ✅ **581 passed** (39 files)                                                                                     |
| End-to-end, accounts off                     | `npm run test:e2e`                                                                    | ✅ **119 passed**, 10 skipped, axe 0; visual baselines unchanged                                                 |
| End-to-end, accounts and checkout on (dummy) | `E2E_SUPABASE_URL=http://127.0.0.1:9 E2E_CHECKOUT=on npx playwright test`             | ✅ **122 passed**, 7 skipped                                                                                     |
| Database (PGlite)                            | part of the unit tests                                                                | ✅ `rls.sql` **230 checks** (201 + 29 for verification); **20 mutation tests** (1 new: "a non-admin can verify") |
| App views unchanged                          | screenshots of the PC and desk views, three presets, before (`372a62a`) and after 20b | ✅ byte-identical                                                                                                |
| Real devices                                 | the PR #9 preview                                                                     | ✅ 20a by hand (two admins, race toast, audit rows); 🔍 Rei's phone tests before merging                         |

The `mobile-picker` "at least 4 items visible" test is flaky: it failed now and then during Phase 18 and also on the commit before the chat, so it isn't caused by it.

### 3a. End-to-end results

- 17b (17 Nov, before the docs): **112 passed**, 6 skipped (checkout-on only) with checkout off; **28 passed**, 6 skipped with dummy checkout settings. axe **0 violations** on every page, including the new ones.
- 17c rerun (17 Nov, after the `/privacy` change): the same, **112 passed** and **28 passed**, axe 0. With checkout on, the a11y run covers `/privacy` with the new paragraph.

### What the new tests cover

- **Database** (`supabase/rls.test.ts`, `supabase/tests/rls.sql`, PGlite): anon reads no orders; users read only their own; admins read all; nobody inserts, updates or deletes orders directly; both functions refuse a wrong secret and a null hash; every status rule; the spam cap. Two new mutation tests (someone else's orders readable; a wrong secret accepted), 15 in all.
- **Order logic** (`lib/checkout/order.test.ts`): a tampered price in the input changes nothing; an incompatible build is refused; the Midtrans items always add up to the total; the status mapping; the SHA-512 signature against a worked example.
- **Server Actions and the notification route** with `fetch` mocked: wrong amount, bad signature, duplicate and out-of-order notifications, a 404 from the status API.
- **Receipt** (`lib/receipt/*.test.ts`): the PDF is read back: order number, the stamp and footer on every page, totals, a 20-item order on two pages, the demo order on one page, characters the PDF font can't draw.
- **e2e:** with checkout off, no button and the new pages are a 404; with dummy settings, the button's three states (empty, errors, ready), the guest redirect, and the receipt download at desktop and phone widths (both pictures 1200 × 900).

### What Phase 18's tests cover

- **Database:** a user reads only their own conversation; nobody posts as another user, as an admin or as the bot; the bot needs the secret; the trimmed length check; the rate limit; the broadcast to both topics, and a message is still saved when `realtime.send` raises; who may join which topic.
- **Bot:** every rule fires in English and Indonesian; priority order; accents and casing; whole-word matching for short keywords; the quiet rules; the reply length cap; no outside links or contact details.
- **Live updates** (fake timers): Live after subscribing; polling every 5 s when not subscribed within 10 s or after a drop; one catch-up poll; never two polls at once.
- **Optimistic sending** (`lib/chat/pending.ts`) and the admin actions refusing non-admins.
- **e2e:** no chat with accounts off; guests see no button; the panel opens, passes axe and is a full-height sheet on a phone; no button on `/admin`; `/styleguide/chat` in every state, including the text box (16px, one line, grows and resets) and the sending / not-sent states.

### Lighthouse

Not rerun in this session. The measured pages (`/`, `/builder`, `/b/[code]`) didn't change in a way that matters: no page's JavaScript grew, except about 0.7 KB (uncompressed) on `/builder` and `/b/[code]` for the capture hook in the shared 3D scene. The receipt click loads about **470 KB gzipped** (pdf-lib, layout and QR about 182 KB; three.js about 281 KB, the same file the builder uses; the two scenes about 16 KB). Session 3's numbers (§3 of its report) still stand.

Phase 18 (not rerun either): every page grows by **0.9 KB** of JavaScript (1.3 KB gzipped), the empty slot for the chat button. A logged-in browser loads the button (1.4 KB gzipped); opening the panel loads 4.9 KB, plus Realtime 16.5 KB once a conversation exists; the admin inbox is about 14 KB. `/`, `/builder` and `/about` stay static.

---

## 4. Data and content

Unchanged from session 3: **181 items** (73 PC, 108 setup), estimates dated 8 Nov 2026, 4 checked listings (11 Nov 2026), 3 presets (Budget 1080p Rp 9.080.000; 1440p Sweet Spot Rp 23.445.294 shown; Creator Workstation Rp 35.268.000).

- **QRIS has a Rp 10.000.000 limit** per transaction (a Bank Indonesia rule). The Budget 1080p preset alone is below it; most builds with a setup are above it. `enabled_payments` isn't restricted, so Snap lists every method the sandbox account has. 🔍 What Snap does with QRIS above the limit hasn't been checked yet (§11).

---

## 5. 3D and assets

**Phase 19:** 22 models (4 by others, 18 made for CoreSpec); `docs/models.md` has the rules and `docs/pi/angka.md` the per-model triangles and sizes. The desk view draws every setup item but LED strips with a model, and the PC case with `case-mid-tower` (desk view only); the PC view still draws the case as its open frame. Finishes, glass and RGB are desk-view only. The Blender build isn't part of CI (`tools/blender/README.md`); `bpy` wasn't installed on this laptop, so the new `out/` paths in the scripts weren't run here.

Phase 17: `components/viewer/capture-frame.tsx` renders a frame and reads the canvas straight after (no `preserveDrawingBuffer`, so the builder's canvases are untouched). The receipt's scenes run with reduced motion, no intro, no warning glow, assembled.

---

## 6. Security and secrets

- **Env vars (names only):** as session 3, plus three for checkout. All three and the Supabase settings must be present, or checkout stays off.

| Name                              | Kind                                     | Notes                                                                      |
| --------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------- |
| `MIDTRANS_SERVER_KEY`             | **secret**, server only (Vercel: Secret) | Used only in `lib/checkout/` (`import "server-only"`)                      |
| `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` | public by design (Vercel: Config)        | Goes in the `snap.js` tag                                                  |
| `ORDER_WRITE_SECRET`              | **secret**, server only (Vercel: Secret) | 32 random bytes, made on Rei's laptop; only its SHA-256 is in the database |

- **Only the sandbox hosts are in the code** (`app.sandbox.midtrans.com`, `api.sandbox.midtrans.com`). There is no production switch, so even a production key couldn't charge anyone.
- **Still no service-role key.** Order writes go through two `security definer` functions that refuse any call without the server's secret; `payment_config` has no grants and no policies.
- **Never sent to Midtrans:** the user's email. Sent: order number, item ids, names and prices, total, display name.
- **Prices never come from the browser:** the server reprices every item from the catalogue.
- **Phase 18 adds no environment variable.** The bot reuses `ORDER_WRITE_SECRET` through `check_order_secret`.
- **One exception to "no Supabase in the browser":** `getRealtimeToken()` gives the chat's Realtime client the user's access token, held in memory only while the chat panel or `/admin/chat` is open. The client only listens to its own private topics (the join policy decides who may join); every write is still a Server Action. It allows nothing beyond what RLS already allows that user, but an injected script could read it there, where it can't read the httpOnly cookie. Written up in `docs/accounts.md`.
- **Chat rules in the database:** `security definer` triggers with an empty `search_path`, so the rate limit sees all the sender's messages whatever RLS says; no insert policy on `realtime.messages`.
- **History scan of session 4** (`git log -p main..HEAD`, added lines, the pattern from REI.md §7): **no secrets.** The matches are:

| Match                                                                | What it actually is                                                                                                                                               |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MIDTRANS_SERVER_KEY`, `ORDER_WRITE_SECRET` (and `SECRET`, `Secret`) | Variable **names** in code, `.env.example` (empty), docs and the e2e config. Vercel's "Secret" type in the docs.                                                  |
| `secret_hash`, `p_secret`, `check_order_secret`, `writeSecret`       | Column, parameter and function names in the migration, `rls.sql` and the server code                                                                              |
| `snap_token`, `token`, `Token`                                       | The Snap token column and its handling (`createSnapToken`, `resumePayment`). Tokens are per-payment and short-lived, and never logged.                            |
| `signature_key`                                                      | Midtrans's notification field name; the 128-hex value in `lib/checkout/order.test.ts` is a worked example for the made-up key `SB-Mid-server-TEST-not-a-real-key` |
| `SB-Mid-server-…`, `SB-Mid-client-…`                                 | Made-up test keys: `…-e2e-dummy`, `…-ROUTE-TEST`, `…-UNIT-TEST`, `…-TEST-not-a-real-key`                                                                          |
| `"route-test-secret"`, `"unit-test-secret"`, `"e2e-dummy-secret"`    | Made-up secrets in the tests and the e2e config                                                                                                                   |
| `sk-`                                                                | **`desk-scene`** (as before, `desk-` ids)                                                                                                                         |

Sessions 1–3's known false positives (`password` in the account forms, Supabase `refresh_token`, `mask-image`, design tokens, `SENTRY_AUTH_TOKEN` as a name, **Secretlab**, `desk-`) still apply.

---

## 7. Deploy

- **Production** (`main`, https://corespec-eight.vercel.app): accounts on, **checkout off** (no Midtrans variables). Unchanged by this session.
- **Preview** (`feat/phase-17-checkout`, draft PR #6): accounts and **checkout on**. Done by Rei and the chat on 17 Nov 2026:
  - ✅ The migration `supabase/migrations/20261117000100_orders.sql` ran on the real Supabase project.
  - ✅ `supabase/tests/rls.sql` (the Phase 17 version) passed there.
  - ✅ The SHA-256 of `ORDER_WRITE_SECRET` is stored in `payment_config`.
  - ✅ `MIDTRANS_SERVER_KEY`, `ORDER_WRITE_SECRET` (Secret) and `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` (Config) are set for Vercel **Preview**, and the preview was redeployed.
  - ✅ **A real sandbox card payment went through on the preview: two orders are Paid.**
- **Preview** (`feat/phase-18-chat`, draft PR #7): accounts and checkout on, plus the chat. Done by Rei and the chat on 18 Nov 2026:
  - ✅ The migration `supabase/migrations/20261118000100_chat.sql` ran on the real Supabase project.
  - ✅ `supabase/tests/rls.sql` (191 checks) passed there.
  - ✅ The functions now run in Vercel's **Singapore region `sin1`** (`vercel.json`), next to the Supabase database. Before, they ran in Vercel's default US region and one send took 1–2 seconds; after, sending felt instant on the iPhone test (not measured in numbers).
  - ✅ The two-browser checklist passed on an iPhone and a laptop.
- **Preview** (`feat/phase-19-models`, draft PR #8): Phase 18's setup plus Phase 19. Done by Rei and the chat:
  - ✅ `supabase/migrations/20261122000100_item_finish.sql` ran on the real project (22 Nov); `rls.sql` with **201 checks** passed there; the 16 preset finishes are in place.
  - ✅ The G435 `fabric` key was removed by hand in the SQL editor (23 Nov), so `20261123000100_g435_finish.sql` doesn't need to run there; it keeps a fresh database the same.
  - 🔍 Rei tests on his phones before PR #8 leaves draft.
- **Preview** (`feat/phase-20-verify-receipt`, PR #9): Done by Rei and the chat on 25 Nov 2026:
  - ✅ `supabase/migrations/20261125000100_order_verification.sql` ran on the real (production) Supabase project; `rls.sql` with **230 checks** passed there. The project is shared by production and the previews, so production's database already has the columns and `verify_order`; production's app gets them when PR #9 is merged.
  - ✅ Two admins: **Admin CoreSpec 1** and **Admin CoreSpec 2**.
  - ✅ 20a walked by hand on the preview: unverified receipt, the Verify dialog, the toast, "Verified by" on the buyer's order, the receipt with the VERIFIED box, the "Already verified by …" race toast, the audit rows.
  - 🔍 Rei's phone tests before merging; then the Pelanggan Demo account for the recording (`docs/accounts.md`).
- Phase 20 doesn't change whether checkout is on in production: that still depends on the three Midtrans variables there (above).
- `vercel.json` sets the region for the whole project, so production moves to `sin1` too when PR #7 is merged. That is the intended effect (the database is in Singapore).
- **The webhook can't reach the preview** (it's behind Vercel's login), so on the preview status comes from `refreshOrder` (on load and "Check payment status"). The Payment Notification URL in the Midtrans dashboard is for production, once checkout is turned on there.

---

## 8. Git

- `main`: production, last merge `2c2e437` (PR #5, 15 Nov 2026). Phase 17 isn't on it.
- `feat/phase-17-checkout`: commits `7e862c7`, `8df2cf2`, `97d057e` (17a), `7db6ce4` (17b), `7b656cb` (17c). **Draft PR #6** (https://github.com/koboy-kampus/corespec/pull/6). Its preview is the Thursday demo: nothing more is pushed to it. Don't merge until Rei says so.
- `feat/phase-18-chat` (starts from `feat/phase-17-checkout`): `c2f14f3` (the brief), `9fd3ed9` (18a), `ec204db`, `1c799a8`, `37c169a` (18b), `d8bd610` (the iPhone fixes), the 18c commit. **Draft PR #7** (https://github.com/koboy-kampus/corespec/pull/7) → `main`. Merging it brings Phase 17 too.
- `feat/phase-19-models` (starts from `feat/phase-18-chat`): 19a–19c, plus the chat's model branches merged in (`models/pc-case`, `models/headset-hook`, `models/case-rgb`). **Draft PR #8** → `main`; stays a draft until Rei has tested on his phones. Merging it brings Phases 17 and 18 too.
- `feat/phase-20-verify-receipt` (from `main` at `182369f`, which has Phases 17–19): `dfc312d` (brief), `bb7bfbe` (20a database), `372a62a` (20a app), `fff45a0` (20b), `19fbc2b` (wording), the 20c commit. **PR #9** → `main`, ready for review; Rei merges after his phone tests.
- Kept on GitHub: `feat/phase-16-auth`, `fix/mobile-picker-filters`, `feat/builder-share-and-item-delete`.
- **Line endings:** LF everywhere (`.gitattributes`). **Tags:** `demo-stable-2026-11-11` → `ac3689b`.

---

## 9. Leftovers and known issues

1. **Prettier warning in `tests/e2e/mobile-picker.spec.ts`**, from `main`. To be fixed separately, not on this branch.
2. **Two sandbox checks are still open:** the status API's answer for an order whose pop-up was closed before a method was chosen (the code treats a 404 as "still pending"; tested with mocks only), and what Snap shows for **QRIS above Rp 10.000.000**.
3. **The webhook is untested against Midtrans itself:** its logic has unit tests, but only production can receive it.
4. **The receipt's compatibility line uses today's catalogue**, not the one at order time, so it says "checked <today's date>". The prices are the order's snapshot.
5. **Receipt fonts are the PDF standard fonts** (Latin only): characters they can't draw become "?" (tested). Item names are all Latin today.
6. **The admin and order pages have no logged-in e2e tests** (they need a real login and a real payment). Their logic has unit tests; `docs/accounts.md` has the manual checklist.
7. **Chat:** the inbox reads the newest 200 conversations and 2,000 messages at a time (plenty for a demo). Focus returning to the chat button after Escape is checked by hand only (the e2e browser has no real session). Realtime itself can't be tested locally: the tests use a stand-in for Supabase's `realtime` schema, and the live behaviour was checked by hand on the preview.
8. **Phase 19:** a PC case can't have a finish (finish is for setup items; Rei's call, 23 Nov). From the default camera the case's top RGB strip sits under its roof; the shroud strip, fan rings and front strips show. The case model is stretched to each case's catalogue dims, so compact cases look squat. The default camera reframes (eases) when items are added or removed, since it frames what's there.
9. **Phase 20:** the app no longer shows the test card or the QRIS/VA simulator links (by the supervisor's request); whoever tries checkout needs them from the presenter (`docs/demo-script.md`, speaker notes). There's no un-verify in the app. The receipt samples' share links point at production (`/styleguide/receipts`), real receipts at whichever site they're made on. `npm run receipt:samples` needs Google Chrome (its PDF viewer makes the PNGs).
10. As in session 3: bad share links and `/admin` for non-admins answer HTTP 200 with 404 content; running `seed.sql` again resets admin edits; two open builder tabs can overwrite each other; some specs unconfirmed (`docs/price-check.md`); rare part overlaps; the `THREE.Clock` deprecation warning.

---

## 10. Later

- **Checkout on production** (if it isn't on yet): add the three variables for Production, set the Payment Notification URL (`docs/accounts.md` step 5) and walk the checklist there. Since Phase 20 the app says "test mode" once on `/checkout` and once on the receipt; the presenter says the rest.
- **Chat on production:** merge PR #7 when Rei decides. The chat migration is already on the shared Supabase project, so nothing else is needed; checkout stays off there until the Midtrans variables are added.
- **Order expiry clean-up:** pending orders whose Snap token expired stay pending until someone opens them (then the status API says expired). A scheduled check isn't needed for a simulation.
- Everything in session 3's §10 still applies (email confirmation with a real sender, CAPTCHA, `/b/[code]` weight and TBT, builder PageSpeed, more models and checked listings, a public `/rules` page).

---

## 11. Finishing Phase 17

1. ✅ **Setup on the real project and the preview** (§7), including two paid sandbox orders.
2. 🔍 **Walk the rest of the checklist** in `docs/accounts.md` on the preview: closing the pop-up, Continue payment with QRIS or VA, the QRIS limit, the spam cap, Admin → Orders, and the receipt from a phone.
3. 🔍 **Rehearse the demo's checkout segment** (`docs/demo-script.md`, "Optional: the checkout simulation") on the preview before 19 Nov.
4. **For the PI:** the updated ERD and use case diagram and the new activity diagram are in `docs/pi/`, the numbers in `docs/pi/angka.md`.
5. **Merge** PR #6 when Rei decides; it changes nothing on production until the Midtrans variables are added there.

---

## 12. Finishing Phase 18

1. ✅ **Setup on the real project** (§7): migration, `rls.sql` (191 checks), functions in `sin1`.
2. ✅ **Two-browser test** on the preview (iPhone and laptop): live both ways, Needs admin, reconnect, rate limit, Retry, no zoom, instant send, the bot answering questions after an admin reply.
3. 🔍 **Rehearse the chat segment** (`docs/demo-script.md`, "Optional: live chat") on the preview before 19 Nov, with the phone as the user and the laptop as the admin.
4. **For the PI:** the updated ERD and use case diagram and the new activity diagram `aktivitas-live-chat.png` are in `docs/pi/`; the numbers and the bot's keyword table are in `docs/pi/angka.md`.
5. **Merge** PR #7 when Rei decides (it includes Phase 17).

---

## 13. Finishing Phase 19

1. ✅ **Database on the real project:** the finish migration, `rls.sql` (201 checks) and the 16 preset finishes (22 Nov); the G435 `fabric` removal by hand (23 Nov).
2. 🔍 **Rei tests the PR #8 preview on his phones:** the desk view of the three presets (models, finishes, case glass, headset on its hook), R reset, the admin Finish section on one setup item (change, save, check the desk view, reset, audit log), and that `/admin` says the catalogue comes from the database.
3. 🔍 **Record the demo** (`docs/demo-script.md`, "Recording"), early December.
4. **For the PI:** `docs/pi/tampilan-meja-*.png` (three presets, and the before/after pair `tampilan-meja-sebelum.png` / `tampilan-meja-sesudah.png`, side by side in `tampilan-meja-sebelum-sesudah.png`); the numbers in `docs/pi/angka.md`.
5. **Merge** PR #8 when Rei decides (it includes Phases 17 and 18).

---

## 14. Finishing Phase 20

1. ✅ **Database on the real project:** the verification migration and `rls.sql` (230 checks), 25 Nov. Nothing more to run.
2. ✅ **Two admins** with receipt-ready names: Admin CoreSpec 1 and Admin CoreSpec 2 (`docs/accounts.md`, "Two admins and the demo buyer").
3. 🔍 **Rei tests the PR #9 preview on his phones:** the verification flow, both receipts (verified and not), the brighter pictures, and that `/checkout`, `/orders` and the receipt carry only the one test-mode line each.
4. 🔍 **Make the Pelanggan Demo account** and rehearse the checkout + verification segment (`docs/demo-script.md`) with two browsers, as Admin CoreSpec 1. Keep the speaker notes (test card, OTP, simulator links) beside the laptop.
5. **For the PI:** `docs/pi/erd.png`, `use-case.png`, `aktivitas-pembayaran.png`, `aktivitas-verifikasi-admin.png`, the four `struk-contoh-*` PDFs and PNGs (`struk-contoh-belum-verifikasi` vs `struk-contoh-creator-workstation` is the before/after), and the numbers in `docs/pi/angka.md`.
6. **Merge** PR #9 when Rei decides (deadline: live by Sunday 29 Nov). The demo is recorded a few days before the exam (before 5 Dec).
