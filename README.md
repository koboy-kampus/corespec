# CoreSpec

**Build your PC in 3D.** A spec-sheet styled PC builder for Indonesian buyers: pick
parts, watch them snap into a 3D case, catch compatibility problems before you pay,
and see every price in Rupiah.

![The CoreSpec builder with the 1440p Sweet Spot preset](docs/screenshots/builder.png)

## Features

- **3D builder.** Parts drop into a case sized from real dimensions. Exploded view,
  hover tooltips, orbit with mouse, touch or keyboard.
- **Live compatibility checks.** Socket, memory type, RAM slots, board and case form
  factor, GPU length, cooler height, PSU size and power headroom. Problem parts glow
  coral in 3D and are flagged in the part picker.
- **Prices in Rupiah.** Approximate street prices with the "as of" date always shown.
- **Wattage estimate** with a 1.3× PSU headroom target.
- **My builds.** Saved automatically in the browser; rename, duplicate, delete.
- **Share links.** The whole build lives in the URL (`/b/<code>`), with a read-only
  page, "Copy to my builds" and a social preview image.
- **Accessible.** Keyboard-only flow, screen-reader descriptions, zero axe-core
  violations at the last audit.

| Compatibility catch                                                     | Exploded view                                      | Mobile                                             |
| ----------------------------------------------------------------------- | -------------------------------------------------- | -------------------------------------------------- |
| ![An ITX case flagging three parts](docs/screenshots/compatibility.png) | ![Exploded 3D view](docs/screenshots/exploded.png) | ![Builder on a phone](docs/screenshots/mobile.png) |

More: [landing page](docs/screenshots/landing.png) · [shared build](docs/screenshots/shared.png)

## Tech stack

Next.js 16 (App Router, Cache Components) · React 19 · TypeScript (strict) ·
Tailwind CSS 4 · shadcn/ui on Radix · three.js with React Three Fiber and drei ·
Zustand · Motion · Vitest · Vercel Analytics · Sentry (optional).

## Getting started

Requirements: **Node.js 20.9 or newer** and npm.

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. No environment variables or API keys are needed.

### Scripts

| Command          | What it does                                                   |
| ---------------- | -------------------------------------------------------------- |
| `npm run dev`    | Development server with hot reload                             |
| `npm run build`  | Production build                                               |
| `npm start`      | Serve the production build                                     |
| `npm test`       | Unit tests (Vitest)                                            |
| `npm run lint`   | ESLint                                                         |
| `npm run format` | Format everything with Prettier (`format:check` to only check) |
| `npm run models` | Compress `models-src/` into `public/models/` (see 3D models)   |

Before committing: `npm run build && npm run lint && npm test`.

## Project structure

```
app/                  Routes: / · /builder · /builds · /b/[code] · /privacy · /credits · /prices
components/
  builder/            Slot list, part picker, summary, compatibility panel, viewport
  builds/             My builds library, share dialog
  viewer/             The 3D scene: case shell, parts, models, camera, animation
  landing/ layout/    Landing sections, navbar, footer, command palette
  ui/                 Design-system components (Button, Card, Badge, Dialog…)
data/
  parts/*.json        The parts catalogue (64 parts across 8 categories)
  presets.json        Starter builds
  meta.json           pricesAsOf date
  credits.json        3D model credits (required for every model)
lib/                  All logic: compatibility rules, power, share codes, 3D layout
store/                Zustand stores (builds library, UI state)
models-src/           Original 3D model files, before compression
public/models, draco  Compressed models and the self-hosted Draco decoder
```

Logic lives in `lib/` and is unit-tested; components stay small.

## Updating prices and parts

1. Edit the part in `data/parts/<category>.json`. Prices are **integer Rupiah**.
2. Set `pricesAsOf` in `data/meta.json` to today's date. It appears in the builder
   footer and on the price disclaimer.
3. Run `npm test`. The data tests check every part, and the presets must stay fully
   compatible.

Each part needs `dims` (mm) so it can be drawn in 3D.

## 3D models

Most parts are drawn procedurally. The CPU, RAM and GPU use small open-licence
models. To add one:

1. Put the original `.glb` in `models-src/` named `<id>-<author>.glb`.
2. Add an entry to `data/credits.json`: title, author, source URL, licence, licence
   URL and what was changed. Only **CC0 1.0** and **CC BY 3.0** are accepted.
3. Add its axes and recolour map in `lib/viewer/models.ts`.
4. Run `npm run models`. It Draco-compresses to `public/models/` and fails if a file
   is over 1 MB.

The tests fail if a model has no credit, a disallowed licence or a missing source.
Credits are shown on `/credits`.

## Environment variables

None are required. Optional ones are listed, empty, in [`.env.example`](.env.example):

| Variable                       | Secret? | Purpose                                                   |
| ------------------------------ | ------- | --------------------------------------------------------- |
| `NEXT_PUBLIC_SENTRY_DSN`       | No      | Turns on error reporting. Without it Sentry isn't loaded. |
| `SENTRY_AUTH_TOKEN`            | **Yes** | Uploads source maps at build time. Vercel only.           |
| `SENTRY_ORG`, `SENTRY_PROJECT` | No      | Which Sentry project receives the source maps.            |

Real values go in `.env.local` (git-ignored) or Vercel's environment variables, never
in the repo.

## Launch checklist (Vercel)

1. **Import the repo.** In Vercel: _Add New → Project_, pick the GitHub repo, keep the
   detected Next.js settings, and click _Deploy_. Every push to `main` now deploys
   production; other branches get preview URLs.
2. **Turn on analytics.** Project → _Analytics_ tab → _Enable_. The app already
   includes the script (it only loads on Vercel).
3. **Optional, error reporting.** Create a Sentry project (platform: Next.js). Then in
   Vercel → _Settings → Environment Variables_ add `NEXT_PUBLIC_SENTRY_DSN`, and for
   readable stack traces `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` and `SENTRY_PROJECT`.
   Redeploy. The Privacy page switches its wording automatically.
4. **Set a contact address.** Fill in `CONTACT_EMAIL` in `lib/site.ts`; the Privacy
   page shows it.
5. **Later, a custom domain.** Project → _Settings → Domains_ → add it, then create
   the DNS record Vercel shows at your registrar. Absolute URLs (sitemap, share
   previews) follow the production domain automatically.
6. **Smoke test.** Open the production URL: load a preset, share a build and open the
   link in a private window, then check `/sitemap.xml` and `/robots.txt`.

## Legal

- [Privacy](app/privacy/page.tsx): no accounts, no cookies, builds stay in the browser.
- [Price disclaimer](app/prices/page.tsx): prices are estimates, so check the store
  before buying.
- [Credits](app/credits/page.tsx): 3D models, open-source software and fonts.

CoreSpec isn't affiliated with any shop or manufacturer; product names belong to
their owners.
