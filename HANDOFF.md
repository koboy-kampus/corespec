# CoreSpec handoff report (session 2)

_Written 11 November 2026, at the end of Phase 15. Every number below comes from a command run while writing this report, on Windows 11 with Node 26.13.0, unless marked otherwise. Session 1 (Phases 0–8) is summarised in §2; its full report is in git history (`git show 3db675e:HANDOFF.md`)._

**Legend:** ✅ done · ⚠️ partial · ❌ not done · 🔍 not checked

---

## 1. Overview

### What it does today

- CoreSpec is a dark, spec-sheet styled **3D PC builder** for Indonesian buyers, with English UI and prices in Rupiah.
- **PC:** 8 slots, **73 parts**. Each part drops into a 3D case sized from real dimensions. 9 compatibility rules plus a "missing parts" reminder; errors glow coral in 3D.
- **Setup (session 2):** 12 optional categories, **108 items** (monitor, arm, keyboard, mouse, mousepad, headset, speakers, webcam, microphone, desk lighting, desk, chair), drawn on a **3D desk**, with 5 setup rules (warnings and notes only). PC subtotal, setup subtotal and total.
- **Tiers and prices (session 2):** every category has at least 3 Budget, 3 Mid and 3 High-end options. Each price is _Checked_ (a marketplace listing Rei checked by hand, with its date) or _Estimate_, with links to Tokopedia or Shopee. Prices are never fetched or scraped.
- **3D models are data (session 2):** `data/models.json`, with a fallback from product model → category model → procedural box. 4 models today (CPU, RAM, GPU, keyboard).
- Builds save in the browser and share as links (`/b/<code>`), now including setup items. There is **no backend and no account system** yet (Phase 16).

### Stack

| Area                | Package                                           | Version                                          |
| ------------------- | ------------------------------------------------- | ------------------------------------------------ |
| Framework           | next                                              | 16.4.5 (App Router, Turbopack, Cache Components) |
| UI runtime          | react / react-dom                                 | 19.3.0 (React Compiler)                          |
| Language            | typescript                                        | 5.9 (`strict: true`)                             |
| Styling             | tailwindcss                                       | 4                                                |
| 3D                  | three · @react-three/fiber · @react-three/drei    | 0.187 · 9.8 · 10.7                               |
| State               | zustand                                           | 5.1 (persist to localStorage)                    |
| Tests               | vitest · @playwright/test · axe-core              | 5.1 · 1.65 · 4.14                                |
| Model tooling (dev) | @gltf-transform/* · draco3dgltf · **sharp** (new) | 4.5 · 1.5 · 0.35                                 |

---

## 2. What was built, phase by phase

### Session 1 (Phases 0–8) ✅

Scaffold and design system, landing page, catalogue and the 9 PC rules, the builder, the 3D viewer, save and share, polish (models, exploded view, accessibility, SEO) and launch pages (`/privacy`, `/credits`, `/prices`, `/about`), deployed on Vercel. Commits `5d7aa2c` to `3db675e`.

### Session 2

| Phase                               | What was built                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Commits                                               |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| **9** Clean-up and performance      | Hero card with all 8 parts; "Need 1.3× · You have 2.1×" PSU label; footer without "Soon" links. Performance: 3D scene loads when visible and idle, lighting reflection map removed (~345 ms TBT), 30 fps hero sway, CSS hero entrance (landing LCP 6.5 → 0.9 s).                                                                                                                                                                                                                                                          | `a3b65bc`                                             |
| **10** Setup items                  | 12 setup categories, PC / Setup tabs, spec filter chips, "Add suggested setup", three totals. Setup items save and share; old saves and links still load (tested). Builder LCP 5.5 → 0.75 s.                                                                                                                                                                                                                                                                                                                              | `2300f04`                                             |
| **11** Setup rules                  | 5 setup rules (monitor resolution and refresh vs GPU class, G-Sync vs GPU brand, desk width, arm limits), warnings only. `docs/rules.md` documents every rule.                                                                                                                                                                                                                                                                                                                                                            | `337e7c1`, `c296340`, `23b8b4e`                       |
| **12** 3D desk view                 | Pure desk layout in mm (no overlaps across thousands of combinations, tested), desk scene in its own chunk, PC / Desk switch, amber highlights for setup warnings, chair that fades when it hides the screen, soft floor shadows. Shared page gets the desk view.                                                                                                                                                                                                                                                         | `4b9d7f9`, `c03acb8`, `a66265e`                       |
| **13** Tiers, links, checked prices | `tier` on every item, 9 new PC parts and 51 new setup items (every category exactly 3/3/3, coolers 4/3/3). `listings` with checked prices, "Checked" / "Estimate" labels, 14-day staleness note, shop links (`nofollow`, new tab, text names only). `data/price-check.csv` + `npm run prices:apply` (validates every row, refuses prices more than 40% from the estimate unless `--force`).                                                                                                                               | `250f9f6`, `de84fc6`, `bc56fcd`, `20e5ee6`, `035d67d` |
| Hero fix                            | GPU clipped into the cooler (in the builder too, hidden by the camera angle): the PCIe slot sat too close to the socket. Fixed in the shared layout; `partClashes()` test over every compatible build.                                                                                                                                                                                                                                                                                                                    | `ac3689b`                                             |
| **14** Model pipeline v2            | `data/models.json` (basis, `fit: stretch / contain`, recolour, credit, defaultFor), `modelId` on items, `resolveModel` in the PC and desk views, `npm run models` with licence and size checks, `npm run models:check`, `docs/models.md` with a real walkthrough. Keyboard model (CC BY 3.0) as the keyboard default. Screenshot tests for the 3D views.                                                                                                                                                                  | `8d53899`, `35676ec`, `b73015e`, `9583fbe`            |
| **15** Smoothing and handoff        | Hero **poster first** (a still WebP of the scene; the live 3D starts after load, idle and the first interaction, never with reduced motion, and pauses off screen or in a hidden tab). `.gitattributes` (LF everywhere). The exploded view frames everything that moved, so nothing leaves the screen on phones. The landing page no longer ships the parts catalogue. Camera hints no longer overlap buttons or the parts sheet. README, `/about`, this report, and `docs/demo-script.md` with an e2e test that runs it. | `b617188`, `315a8dc` and the hero poster commit       |

The tag **`demo-stable-2026-11-11`** marks `ac3689b`, the version before Phase 14, as known-good for the demo.

---

## 3. Checks (run while writing this report)

| Check      | Command                  | Result                                                                               |
| ---------- | ------------------------ | ------------------------------------------------------------------------------------ |
| Lint       | `npm run lint`           | ✅ no problems                                                                       |
| TypeScript | `npx tsc --noEmit`       | ✅ 0 errors                                                                          |
| Formatting | `npx prettier --check .` | ✅ clean                                                                             |
| Unit tests | `npx vitest run`         | ✅ **238 passed** (18 files)                                                         |
| End-to-end | `npm run test:e2e`       | ✅ **70 passed** (Playwright, installed Chrome), including axe with **0 violations** |
| Build      | `npm run build`          | ✅ passes (run by the e2e suite)                                                     |

Session 1 ended at 117 unit and 34 e2e tests.

### What the e2e suite covers (`tests/e2e/`)

| File                                               | Covers                                                                                                                        |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `builder.spec.ts`                                  | Picking parts, incompatibilities, picker filters (including tiers), presets, saving, the replace-preset dialog, phone layout  |
| `setup.spec.ts`, `setup-rules.spec.ts`             | Setup tab, suggested setup, filter chips, totals, every setup rule from the UI                                                |
| `desk.spec.ts`                                     | Desk view switch, warnings in 3D, touch and wheel on the desk, chair fade                                                     |
| `prices.spec.ts`                                   | Checked and estimate labels, shop links and their `rel`, the 14-day note (mocked clock), summary and shared page              |
| `share.spec.ts`                                    | Storage migration, share links (old and new), My builds, touch and wheel on shared builds, phone widths                       |
| `hero.spec.ts`                                     | The hero and the builder show the same build; the hero poster still matches the live scene                                    |
| `visual.spec.ts`                                   | Screenshot baselines of the PC views, the hero and a full desk; models load once, and only when used                          |
| `demo.spec.ts`                                     | `docs/demo-script.md`, click for click                                                                                        |
| `keyboard.spec.ts`, `a11y.spec.ts`, `site.spec.ts` | Keyboard-only run, axe on every page and dialog, site wording, no sideways scroll, poster first and no 3D with reduced motion |

### Lighthouse (mobile, median of 3 runs, local production build)

Same tool and settings every time (Lighthouse 13.6, mobile preset, default simulated throttling, `next start` on this laptop). TBT target: under 600 ms. "Phase 15" is before the hero poster, "+ poster" after it (the last commit of the session).

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

**The hero, poster first (last commit):**

- **Poster first:** the landing page now shows a still image of the hero scene. It's a 22 KB WebP rendered from the real 3D scene by `npm run hero:poster`.
- **When the 3D starts:** the live scene starts only after the page has loaded and gone idle, and then the first interaction or 3 quiet seconds. It draws nothing until every model is in, then replaces the poster in one frame. An e2e test checks the poster still matches the live scene.
- **Reduced motion:** the poster stays and 3D never loads.
- **When it stops:** the sway stops rendering when the hero is off screen or the tab is hidden.
- **Result:** TBT on `/` drops from about 578 ms to 20 ms, and main-thread work from 3.4 s to 0.67 s. Lighthouse finishes much sooner because the page goes quiet right after loading.
- **To be clear:** most of the TBT drop is because three.js and the scene now load _after_ the first seconds of the page, outside Lighthouse's window. Mounting them still costs about 0.4 s of main thread on this laptop. It just no longer competes with the page loading, and it never happens with reduced motion.

**The LCP trade-off:**

- The poster is now the largest element on a phone screen.
- Lighthouse's _simulated_ LCP for an image is pessimistic (3.7 s). In the same runs the _observed_ LCP got faster (0.19 → 0.15 s), and the image is only 22 KB with `fetchpriority="high"`.
- **What I tried:** inlining it as a data URI (no request at all) gave the same simulated 3.7 s and a heavier HTML. Preloading it from `<head>` didn't change it either.
- **Why it was 0.9 s before:** the line-drawing placeholder was an SVG, and SVG shapes are never LCP candidates.
- **Overall:** the score still went up (85 → 90). PageSpeed on the live site will show the same simulated LCP.

**Earlier in Phase 15:**

- Phase 15 removed the parts catalogue (57 KB, 15 KB gzip) from the landing page's own bundle. `useMediaQuery` and `partLabel` were importing it, and so was the hero viewer. It still arrives later through the prefetch of `/builder`.
- On `/b/[code]` it stays, because "Copy to my builds" needs the build store.

**In general:**

- **Local vs live:** local numbers are much faster than PageSpeed Insights on the live site, which simulates a mid-range phone over a slow network. Before this work, Rei measured live mobile scores of **62** for `/` and **97** for `/builder` (100 for accessibility, best practices and SEO). Run PageSpeed on the Vercel URL again after this deploys.

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

## 6. Security and secrets

- **`.gitignore`:** `.env*` (except `.env.example`, all values empty), `node_modules`, `.next`, `.vercel`.
- **Required env vars:** none. **Optional:** `NEXT_PUBLIC_SENTRY_DSN` (not secret), and `SENTRY_AUTH_TOKEN` (**secret**, build-time only), `SENTRY_ORG`, `SENTRY_PROJECT`.
- **History scan of session 2** (`git log -p 3db675e..HEAD`, added lines only, pattern from REI.md §7): **no secrets.** Every match is one of these:

| Match                                     | What it actually is                                                                                      |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `sk-` (155 lines)                         | The letters "sk" in **`desk-`**: desk ids (`desk-ikea-…`), `desk-edge`, file names like `desk-layout.ts` |
| `secret`                                  | The chair brand **Secretlab** (`chair-secretlab-titan-evo`), and this report quoting the session 1 scan  |
| `token`, `password`, `ghp_`, `-----BEGIN` | REI.md and this report quoting the scan command and the session 1 table                                  |

Session 1's table of known false positives (`mask-image`, design tokens, `SENTRY_AUTH_TOKEN` as a name, package names) still applies.

---

## 7. Deploy

- **Vercel:** the git integration deploys every push to `main`. No `vercel.json`, no required env vars. Node: `engines >=20.9`, `.nvmrc` 24.
- 🔍 **Not checked in this session:** the live site after the session 2 pushes, PageSpeed on the live URL, and a real phone.
- **Saved builds** live in each visitor's browser, so deploys never touch them. Old share links still open (tested).

---

## 8. Git

- Branch `main`, remote `github.com/koboy-kampus/corespec` (private), everything pushed.
- **Line endings:** `.gitattributes` (`* text=auto eol=lf`, binaries marked). The repository was already all LF, so no file changed. `git status` on Windows is now clean.
- **Tags:** `demo-stable-2026-11-11` → `ac3689b`.

---

## 9. Leftovers and known issues

1. **Bad share links return HTTP 200** with 404 content and `noindex` (a streaming limitation). Kept as is by Rei's decision.
2. **Builds live in one browser only** until Phase 16. This is documented on `/privacy`.
3. **Specs not confirmed online** for some new items: chair and speaker sizes, small-item sizes, a few desk height ranges and mounts. The list is in `docs/price-check.md`.
4. **Only 3 items have checked listings** (4 listings). Everything else shows "Estimate". From 26 November 2026 those listings will show "Price may have changed" until re-checked.
5. **Rare part overlaps** that `partClashes()` still finds in some compatible builds: a low-profile cooler over the RAM, the M.2 drive under the RAM on the ITX board, and a PSU or 2.5" drive crowding a long GPU in the smallest cases. None involve the presets.
6. **`THREE.Clock` deprecation warning** in the console comes from React Three Fiber itself.
7. **The 3D view isn't tried on a physical phone.** Touch is covered by e2e tests with real touch input in Chrome, but not on a device.

---

## 10. Later

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

---

## 11. What Phase 16 (login and backend) needs

From REI.md §8, plus what the code needs:

- **Rei first:** create the Supabase project and put the URL, the anon key and the service-role key in `.env.local` and Vercel. The service-role key is **server-only** (no `NEXT_PUBLIC_` prefix). Claude Code never sees or prints the values.
- **Read first:** the Next 16 docs in `node_modules/next/dist/docs/` on auth, cookies, proxy/middleware and server actions, and `@supabase/ssr` for Next 16.
- **Tables:**
  - `profiles` (role `user` | `admin`);
  - `builds` (owner, name, `parts` as JSON, in the same shape as `Build["parts"]` in `types/parts.ts`);
  - `parts` (seeded from `data/parts` and `data/setup`, including `tier` and `modelId`);
  - `listings` (seeded from the JSON).

  Row Level Security on every table.

- **What stays pure:** `lib/compat/*`, `lib/prices.ts`, `lib/viewer/*` and `lib/share.ts` take plain objects, so they and their tests don't change. Load parts from Supabase on the server and pass them in. Watch the catalogue weight (§3): don't ship the whole table to pages that don't need it.
- **Prices:** the admin panel replaces `data/price-check.csv` and `prices:apply`. Keep the same validation rules (`scripts/price-csv.mjs`) and the 40% safety check.
- **Guests:** keep localStorage builds working and offer "Import builds from this browser" after login. The store is `store/build.ts` (persist key `corespec-build`, version 2).
- **Share links** keep working unchanged: they encode part ids, not database rows.
- **For the write-up:** an ERD and a use case diagram (Guest, User, Admin) in `docs/`.
