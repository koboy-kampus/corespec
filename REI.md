# REI.md — CoreSpec build brief for Claude Code

> **How to use:** put this file in the root of an empty project folder, open Claude Code there, and say:
> `Read REI.md and start Phase 0.`
> (Tip: rename it to `CLAUDE.md` if you want Claude Code to load it automatically every session.)

---

## 0. Who you are and how we work

You are a senior frontend engineer building **CoreSpec** with Rei, a university informatics student who is mostly vibe coding. You do the heavy lifting; Rei reviews in the browser.

**Working rules**

1. Work **one phase at a time**, in order. For every phase:
   - **Plan** — 3–6 bullets of what you'll build.
   - **Implement** — write the code.
   - **Verify** — run `npm run build`, `npm run lint` and `npm test` (once tests exist). Fix every error before moving on.
   - **Summary** — 3–5 bullets in plain English: what was built, what Rei should click to check it, anything left over.
   - **Commit + push** — one commit per phase: `feat(phase-N): <short description>`, then `git push`. Follow section 7 (Git and secrets) every time.
2. After each phase, **stop and wait** for Rei to say "next" (or give feedback) before starting the next phase.
3. Explain things casually and briefly. Rei is rusty, so when you introduce a concept (Zustand, R3F anchors, etc.), add one sentence on what it does.
4. Never leave the app broken between phases. If something is unfinished, stub it cleanly with a visible "Coming soon" state.
5. Don't invent features beyond this brief without asking. If a decision isn't covered here, pick the simplest option and say what you picked.
6. Use the latest stable versions of every package. Check what `create-next-app` actually installs and adapt (e.g. Tailwind v4 uses `@theme` in CSS, not `tailwind.config.js`).

---

## 1. Product

**CoreSpec** is a dark, spec-sheet styled **3D PC builder** for Indonesian buyers. Users pick parts, see them snap into a 3D case, get live compatibility checks, and see the total price in **Indonesian Rupiah (IDR)**.

- UI language: **English**.
- Currency: **IDR only**, everywhere.
- Visual reference: the layout patterns of buildcores.com (dark landing page, bento feature grid, glass cards, monospace spec labels). **Borrow structure only — never copy their text, images, logos or assets.** All copy, names and visuals must be our own.

---

## 2. Stack (locked)

| Area | Choice |
| --- | --- |
| Framework | Next.js (App Router) + TypeScript (strict) |
| Styling | Tailwind CSS (v4, tokens in `@theme`) |
| UI primitives | shadcn/ui (Radix), restyled to our tokens |
| State | Zustand with `persist` (localStorage) |
| 3D | `three`, `@react-three/fiber`, `@react-three/drei` |
| Motion | `motion` (Framer Motion) |
| Icons | `lucide-react` |
| Tests | Vitest |
| Fonts | Geist, Geist Mono, IBM Plex Mono via `next/font` |
| Hosting | Vercel |

No backend in v1. All data lives in typed JSON in the repo.

---

## 3. Design system

### Colour tokens

Base palette: coral `#FE2E4B`, near-black `#0F0E0E`, charcoal `#161316`, mid slate `#4B4A4B`, white `#FFFFFF`. Extra tokens exist to keep text readable.

| Token | Value | Use |
| --- | --- | --- |
| `--bg` | `#0F0E0E` | Page background |
| `--surface` | `#161316` | Cards, panels, nav |
| `--surface-2` | `#1E1A1E` | Hover, raised panels, dropdowns |
| `--line` | `rgba(255,255,255,0.07)` | Hairline card borders |
| `--line-strong` | `#4B4A4B` | Dividers, input borders, disabled. **Never body text** (too low contrast) |
| `--text` | `#FFFFFF` | Headings, key numbers |
| `--text-2` | `#C9C6C9` | Body text |
| `--text-3` | `#8C898C` | Captions, labels, meta |
| `--accent` | `#FE2E4B` | Brand coral: links, icons, prices, glows, focus rings |
| `--accent-strong` | `#E01E3C` | **Filled primary buttons** (white text passes contrast here; it doesn't on `#FE2E4B`) |
| `--accent-soft` | `rgba(254,46,75,0.12)` | Selected rows, badges, chip fills |
| `--ok` | `#3DD68C` | Compatible |
| `--warn` | `#F5B544` | Warnings |

Because the brand colour is red, **"incompatible" must always show an icon + words**, never colour alone.

### Typography

| Role | Font | Size / line height | Weight | Tracking |
| --- | --- | --- | --- | --- |
| Display H1 | Geist | 56/56 desktop, 38/40 mobile | 600 | −2px |
| H2 | Geist | 32/36 | 500 | −0.5px |
| H3 | Geist | 20–24/28 | 500 | −0.3px |
| Body | Geist | 15/22 | 400 | 0 |
| UI (nav, buttons) | Geist | 14/22 | 500–600 | −0.07px |
| Specs, prices | Geist Mono | 12–14/18, `tabular-nums` | 400–500 | 0 |
| Micro labels | IBM Plex Mono | 10–11/14, UPPERCASE | 400 | +0.08em |

### Shape and depth

- Radius scale: `6` chips · `10` inputs/small buttons · `14` buttons/list cards · `20` cards · `26` bento tiles.
- Depth = **inner glows, not drop shadows**: surfaces get `inset 0 1px 0 rgba(255,255,255,0.06)`.
- Primary button: `--accent-strong` fill with a subtle top highlight; hover → `brightness(1.05)` + glow `0 6px 20px rgba(254,46,75,0.18)`; 150ms transitions.
- Secondary button: `--surface` fill, `--line` border, hover → `--surface-2`.
- Glass: `backdrop-filter: blur(8px)` over `rgba(22,19,22,0.7)` (sticky nav, floating build summary).
- One coral radial glow behind the hero; everything else flat.
- Visible focus ring everywhere: 2px `--accent` with offset.
- Respect `prefers-reduced-motion`.

### Rupiah

- Store every price as an **integer number of rupiah**. No floats.
- `lib/format.ts` → `formatIDR(n)` using `new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })` → `Rp 15.378.000`.
- Optional `formatIDRCompact` for small cards.
- Prices render in Geist Mono with tabular numbers.

---

## 4. Architecture

```
corespec/
  app/
    layout.tsx            fonts, nav, footer
    page.tsx              landing page
    builder/page.tsx      the 3D builder
    b/[code]/page.tsx     shared build (read-only)   [Phase 6]
    styleguide/page.tsx   component gallery          [Phase 1]
    globals.css           Tailwind @theme tokens
  components/
    ui/                   Button, Badge, Card, Dialog, Tabs, Tooltip, Kbd, SectionHeader, PriceTag
    layout/               Navbar, MobileMenu, Footer, CommandPalette
    landing/              Hero, BuildSummaryCard, QuickStart, FeatureBento, ClosingCTA
    builder/              SlotList, PartPicker, PartRow, BuildSummary, CompatPanel, WattageMeter
    viewer/               Scene, CaseShell, PartMesh, Anchors, CameraRig
  lib/
    format.ts             formatIDR, formatMM, formatWatts
    compat/rules.ts       one pure function per rule
    compat/check.ts       runs all rules → results[]
    power.ts              wattage estimate
    share.ts              encode/decode build ↔ URL code   [Phase 6]
  store/build.ts          Zustand store (persisted)
  data/
    parts/<category>.json seed parts, prices in IDR
    presets.json          Quick Start builds
  types/parts.ts
  public/models/          GLTF files (later)
```

### Data model

```ts
type Category = 'cpu' | 'motherboard' | 'ram' | 'gpu' | 'storage' | 'psu' | 'case' | 'cooler';
type Socket = 'AM5' | 'AM4' | 'LGA1700' | 'LGA1851';
type BoardFF = 'ATX' | 'mATX' | 'ITX';
type AnchorId = 'cpu' | 'cooler' | 'ram' | 'gpu' | 'm2' | 'psu' | 'board' | 'case';

interface PartBase {
  id: string;               // 'cpu-amd-ryzen-7-7800x3d'
  category: Category;
  brand: string;
  name: string;
  priceIDR: number;         // integer rupiah
  dims?: { l: number; w: number; h: number }; // mm → sizes placeholder meshes
  model?: string;           // GLTF path, optional (later)
  anchor: AnchorId;
}
interface Cpu extends PartBase { socket: Socket; cores: number; threads: number; tdpW: number }
interface Motherboard extends PartBase { socket: Socket; formFactor: BoardFF; ddr: 'DDR4' | 'DDR5'; ramSlots: number; m2Slots: number }
interface Ram extends PartBase { ddr: 'DDR4' | 'DDR5'; capacityGb: number; sticks: number; speedMts: number }
interface Gpu extends PartBase { lengthMm: number; tdpW: number; vramGb: number }
interface Storage extends PartBase { kind: 'M.2' | 'SATA'; capacityGb: number }
interface Psu extends PartBase { watts: number; formFactor: 'ATX' | 'SFX'; rating: string }
interface Case extends PartBase { formFactors: BoardFF[]; maxGpuMm: number; maxCoolerMm: number; psuFF: 'ATX' | 'SFX' }
interface Cooler extends PartBase { type: 'Air' | 'AIO'; heightMm: number; sockets: Socket[] }

interface Build { id: string; name: string; parts: Partial<Record<Category, string>>; updatedAt: string }
```

### Compatibility rules (v1)

Each rule is a pure function returning `{ id, severity: 'error' | 'warning' | 'info', message, partIds[] }`.

| Rule | Check | Severity |
| --- | --- | --- |
| CPU socket | CPU `socket` = board `socket` | error |
| Memory type | RAM `ddr` = board `ddr` | error |
| RAM slots | RAM `sticks` ≤ board `ramSlots` | error |
| Board fits case | board `formFactor` in case `formFactors` | error |
| GPU clearance | GPU `lengthMm` ≤ case `maxGpuMm` | error |
| Cooler clearance | air cooler `heightMm` ≤ case `maxCoolerMm` | error |
| Cooler socket | CPU socket in cooler `sockets` | error |
| PSU size | PSU `formFactor` fits case `psuFF` (SFX fits ATX bays, not the reverse) | error |
| PSU headroom | PSU watts ≥ estimated draw × 1.3 → else warning; < 1.0 × draw → error | warning / error |
| Missing parts | any required category empty | info |

**Estimated draw** = CPU TDP + GPU TDP + 50 W (board) + 5 W × RAM sticks + 5 W per drive + 15 W fans.

The UI, the 3D viewer (coral outline on offending parts) and the tests all read the same `check(build)` result.

---

## 5. Phases

### Phase 0 — Setup

- `create-next-app` (TypeScript, App Router, Tailwind, ESLint, `src/` off, alias `@/*`).
- Init shadcn/ui. Install: `zustand three @react-three/fiber @react-three/drei motion lucide-react` and dev `vitest @types/three`.
- Prettier, `npm test` script.
- `git init`, first commit. Remind Rei how to push to GitHub and import into Vercel (just the steps, short).

**Done when:** `npm run dev` shows a blank dark page with no errors.

### Phase 1 — Design system and shell

- Tokens (section 3) in `globals.css`; fonts via `next/font`.
- Components in `components/ui`: `Button` (primary, secondary, glass, ghost × sm/md/lg, optional icon), `Badge`, `Card` (solid, glass, bento), `Kbd`, `Tooltip`, `SectionHeader` (title + subtitle, left or split layout), `PriceTag`.
- `Navbar`: logo (simple geometric SVG mark + "CORESPEC" wordmark) with a "BETA" pill; links Builder, Parts, Builds, About; search button with `Ctrl K` hint (opens a placeholder command palette); "Start Building →" button. Transparent at top, glass + hairline border once scrolled. Below 768px: logo, small CTA, hamburger → slide-in drawer.
- `Footer`: tagline "Spec it. See it. Build it.", link columns (Product, Resources, Community, Legal), and a **monospace engineering title block** (`CORESPEC · REV 0.1 · SCALE 1:1 · SHEET 01/01 · © 2026`).
- `/styleguide` page showing every component and state.

**Done when:** `/styleguide` looks right at 375, 768 and 1440px.

### Phase 2 — Landing page (priority: make it look sick)

Container: `max-width 1248px`, `padding 0 24px`. Sections separated by 1px `--line` borders. Sections:

1. **Hero** — two columns (text ~40%, visual ~60%), stacks on mobile.
   - H1: "Build your PC in 3D." Subline in `--text-2`.
   - 2×2 feature list with icons: a live catalogue count computed from the seeded data (e.g. "64 parts across 8 categories", via `CATALOG_STATS` in `lib/parts.ts`, so it is always true and grows with the data), "Live compatibility checks", "Prices in Rupiah", "Wattage estimates". Never hard-code a part count.
   - CTAs: primary "Start Building" → `/builder`; secondary "Browse Presets" → scrolls to Quick Start.
   - Trust row in mono: "Free · No sign-up · Made in Indonesia".
   - Right side: coral radial glow + placeholder visual (a stylised SVG/CSS PC case for now; Phase 5 replaces it with the live 3D scene).
   - Floating glass `BuildSummaryCard` over the visual: 5–6 part rows (category icon, name, price), total in IDR, wattage.
2. **Quick Start** — split header ("Start from a preset" + subtitle) beside a row of 3 preset cards (name, tagline, total IDR, "Customise →") plus a "Start from scratch" card. Data from `presets.json`.
3. **Feature bento** — "Everything you need to plan a build". Row 1 grid: wide · narrow · wide (`gap 12px`, tiles `rounded-[26px]`, 350px tall desktop). Row 2: three tiles, middle wider. Tiles: 3D viewer, Cost tracking (mini total readout), Compatibility (checklist: socket, DDR, GPU length, cooler height with ✓ marks), FPS estimate (labelled "Illustrative"), Price compare (generic store chips — no real retailer logos), Power (wattage meter vs PSU). Use CSS/SVG illustrations, no external images.
4. **Closing CTA** — big centred line + primary button.
5. **Footer**.

Micro-interactions: cards lift (`translateY(-2px)`) and border brightens on hover; scroll-reveal fade-up (Motion, `once: true`); hidden "→" arrows fade in on card hover.

**Done when:** it looks polished on desktop and mobile, no layout shift, no console errors.

### Phase 3 — Data and logic

- `types/parts.ts` from section 4.
- Seed **~8 parts per category (~64 total)** with real product names and **approximate** Indonesian street prices as integers. Add `data/meta.json` with `{ "pricesAsOf": "<today>", "note": "Approximate prices" }`. Mix AM5, AM4 and Intel; DDR4 and DDR5; ATX, mATX and ITX boards and cases; at least one small ITX case that rejects long GPUs so the rules have something to catch.
- `presets.json`: 3 valid builds — "Budget 1080p" (~Rp 9 jt), "1440p Sweet Spot" (~Rp 18 jt in estimates; Rp 23,4 jt with the checked prices since Phase 13), "Creator Workstation" (~Rp 35 jt).
- `store/build.ts`: `setPart`, `removePart`, `loadPreset`, `reset`, `rename`; persisted.
- `lib/compat`, `lib/power.ts`, `lib/format.ts`.
- Vitest: one pass + one fail case per rule, plus `formatIDR` tests.

**Done when:** `npm test` is green.

### Phase 4 — Builder UI

`/builder` layout (desktop): **slot list left** (8 category slots: icon, chosen part or "Choose…", price, remove) · **viewport centre** · **summary right** (total IDR, wattage meter, compatibility panel grouped by severity).

- **PartPicker** dialog per category: search, brand filter, price range, sort (price/name); each row shows key specs in mono and price; incompatible parts are dimmed with the reason, still selectable but flagged.
- Choosing a part updates totals and checks instantly.
- Mobile: viewport on top, bottom sheet with tabs **Parts / Summary**.
- Empty state ("Pick a CPU to start"), no-results state, "Load preset" and "Reset" actions.

**Done when:** Rei can go from scratch or a preset to a full build with correct total and warnings.

### Phase 5 — 3D viewer

- `viewer/Scene` loaded via `next/dynamic` with `ssr: false`; show a skeleton while loading.
- `CaseShell`: rounded-box case sized from case `dims`, smoked-glass side panel (transparent material), subtle edge lines.
- **Anchor map**: named positions inside the case (board plate, CPU socket, RAM slots, PCIe x16, M.2, PSU shroud, cooler mount) computed from case + board form factor.
- `PartMesh`: rounded boxes sized from each part's `dims` (mm → scene units), tinted per category; GPU and cooler get simple fan-circle details.
- **Snap animation**: new part drops from above onto its anchor with a spring (~400ms); removal lifts and fades out.
- OrbitControls with limits and damping; selecting a slot eases the camera toward that anchor.
- Parts flagged by `check()` glow coral with an outline.
- Performance: `frameloop="demand"`, `dpr={[1, 2]}`, soft environment lighting, a static fallback if WebGL is unavailable.
- Reuse the scene (auto-rotating, a preset build) in the landing hero.

**Done when:** adding/removing any part animates smoothly on a mid-range laptop.

### Phase 6 — Save and share *(next session)*

- Saved builds list (localStorage): rename, duplicate, delete.
- Share: encode the build into a short URL-safe code → `/b/[code]` read-only page with "Copy to my builds".
- Open Graph image per shared build (name, total, part count).

### Phase 7 — Polish *(next session)*

- Swap placeholders for open-source GLTF models (Draco, lazy loaded) — **only models whose licence allows it**; record each in `data/credits.json`.
- Exploded view; hover tooltips on 3D parts.
- Keyboard-only flow; a11y pass; SEO metadata, sitemap; 404 + error boundaries.

### Phase 8 — Launch

- Vercel production + custom domain, Vercel Analytics, Sentry.
- Pages: Privacy, Credits (3D models), price disclaimer ("Prices are estimates — check the store before buying").
- README with setup steps and screenshots.

---

## 6. Hard rules

- English UI, IDR prices, integers only.
- No copied text, images, logos or assets from BuildCores or retailers. No hotlinked external images.
- FPS numbers are always labelled "Illustrative estimate".
- Prices are labelled approximate with the `pricesAsOf` date shown in the builder footer.
- Mobile-first responsive; test at 375 / 768 / 1440.
- TypeScript strict, no `any` unless commented why.
- Keep components small; logic in `lib/`, not in JSX.

---

## 7. Git and secrets

**Repo setup (Phase 0, once):**
- Check `gh auth status`. If not logged in, ask Rei to run `gh auth login` himself — never handle his GitHub password or tokens.
- Create a **private** repo and push: `gh repo create corespec --private --source=. --remote=origin --push`.

**Before every commit:**
1. Run `git status` and read the list of files about to be committed.
2. Make sure `.gitignore` contains `.env*` (allow only `.env.example`), `node_modules`, `.next`, `.vercel`.
3. Scan the staged diff for secrets: `git diff --cached | grep -nEi "(api[_-]?key|secret|token|password|sk-|ghp_|-----BEGIN)"`. If anything matches, compare each match with the known false positives listed in `HANDOFF.md` §5. If **every** match is one of them, name them in the summary and continue. Otherwise **stop, unstage it, and tell Rei**.
4. Never use `git add -A` blindly on a dirty tree you haven't checked; never `git push --force`.

**Secret rules:**
- Real keys live only in `.env.local` (local) and Vercel → Settings → Environment Variables (production).
- Commit a `.env.example` with variable names and empty values only.
- Never prefix a secret with `NEXT_PUBLIC_` — that ships it to every visitor's browser. Secrets are used only in server code (route handlers, server components, server actions).
- Never print, log, or paste a key's value in chat, code, comments, tests or commit messages.
- v1 needs **no API keys at all**. If a feature seems to need one, ask Rei first.

---

## 8. Session 2 — Phases 9 to 16

> **How to use (session 2):** open Claude Code in the repo and say:
> `Read REI.md section 8 and HANDOFF.md, then start Phase 9.`

Phases 0–8 are done and live on Vercel (see `HANDOFF.md`). Session 2 adds **setup items** (monitor, mouse, keyboard and the rest of a desk setup) with their own **3D desk view**, a **curated tiered catalogue** with **marketplace links** and checked prices, a **3D model pipeline** for real models, and a smoothing pass. **Login and the backend come last (Phase 16)**, in a later session, on purpose.

**Everything in sections 0, 3, 6 and 7 still applies**: one phase at a time, plan → implement → verify → summary → commit + push, then stop and wait for "next". On top of that:

- Next 16 renamed and changed some APIs. Before using a Next API you haven't used in this repo yet, read its guide in `node_modules/next/dist/docs/` (see `AGENTS.md`).
- **Verify** now means `npm run lint`, `npx tsc --noEmit`, `npx vitest run`, `npm run test:e2e` and `npm run build`, all green. New features get new unit tests **and** e2e tests, and the axe test must stay at **0 violations**.
- Don't break what exists: old share links, saved builds in localStorage (write a tested storage migration if the shape changes), the 9 compatibility rules and their tests, and the PC 3D viewer.
- Rei isn't in a rush this session. Prefer doing a phase well over doing it fast, and say in the summary what you'd still improve.

### Phase 9 — Clean-up and performance

Finish the leftovers from session 1, with numbers.

- **Hero build card:** show all **8** parts of the showcase build so the rows add up to the total (it shows 6 today: cooler and case are missing). Keep the card compact on mobile.
- **Power label on the hero card:** replace the plain draw/PSU text with `Need 1.3× · You have 2.1×` (PSU watts ÷ estimated draw, one decimal), computed from `lib/power.ts`, never hard-coded. Keep the meter bar.
- **Footer:** remove every link that has no page ("Soon" items in `lib/nav.ts`). Drop empty columns.
- **Performance:** PageSpeed showed **9–11 s Total Blocking Time** on `/b/[code]`. First measure it locally with Lighthouse (mobile preset) on `/`, `/builder` and `/b/[code]` against `next build && next start`, then fix the biggest causes (likely candidates: loading the 3D scene only when it's near the viewport or after the page is idle, splitting heavy client components, deferring Sentry and analytics, trimming Motion/Radix in the base bundle). Target: TBT under 600 ms on the mobile preset. **The summary must include a before/after table** (TBT, LCP, CLS, JS gzip per route).
- `HANDOFF.md` says "21 parts" for `docs/price-check.md`; the file has **23**. Fix the number.

**Done when:** the hero card total matches its rows, the footer has no "Soon", and the before/after table shows TBT going down.

### Phase 10 — Setup items: data and builder

Add a second group of slots, **Setup**, next to the 8 PC slots. All setup slots are **optional**: they never appear in the "missing parts" reminder.

**Categories** (first version; Rei will add more later, so adding a category must be a one-place change: a type, a label, an icon, a JSON file and specs):

| Category   | Items | Key fields (plus `dims` in mm, like PC parts)                                    |
| ---------- | ----- | -------------------------------------------------------------------------------- |
| Monitor    | 6     | `sizeIn`, `resolution` (`1080p`/`1440p`/`4K`/`UW1440p`), `refreshHz`, `panel`, `adaptiveSync` (`FreeSync`/`G-Sync`/`None`), `curved` |
| Keyboard   | 6     | `layout` (`Full`/`TKL`/`75%`/`65%`), `switches`, `wireless`                     |
| Mouse      | 6     | `weightG`, `wireless`, `maxDpi`                                                  |
| Headset    | 6     | `connection` (`3.5mm`/`USB`/`2.4GHz`/`Bluetooth`), `wireless`                    |
| Mousepad   | 4     | `size` (`M`/`L`/`XL`/`Desk`)                                                     |
| Speakers   | 4     | `kind` (`2.0`/`2.1`)                                                             |
| Webcam     | 4     | `resolution`, `fps`                                                              |
| Microphone | 4     | `connection` (`USB`/`XLR`)                                                       |
| Chair      | 4     | `type` (`Gaming`/`Ergonomic`)                                                    |
| Desk       | 4     | `widthMm`, `depthMm`, `heightMinMm`, `heightMaxMm` (same value for fixed desks), `adjustable` |
| Monitor arm | 4    | `monitors` (1/2), `maxSizeIn`, `maxLoadKg`, `mount` (`Clamp`/`Grommet`)          |
| Desk lighting | 4  | `kind` (`Light bar`/`LED strip`/`Lamp`), `rgb`, `usbPowered`                     |

That is **12 setup categories**.

- **Builder LCP first (from Phase 9):** the builder shows a skeleton until the saved build loads, which keeps LCP at about 5.5 s. Render the empty builder straight away and fill in the saved build after it loads from localStorage. Re-measure and report before/after.
- **Field ideas:** field choices may take ideas from the BuildCores OpenDB schema, but **do not copy any records or text from it** (it's CC BY-NC-SA 4.0). Write our own data for products sold in Indonesia.
- **Types:** split the current `Category` into `PcCategory` (the existing 8) and `SetupCategory`, with `Category = PcCategory | SetupCategory`. Keep the compatibility rules, the power estimate and the PC 3D viewer typed on `PcCategory` so they don't change. Setup items get their own base type (no PC `anchor`; give them a desk placement instead, used in Phase 12).
- **Data:** real product names that are sold in Indonesia, approximate integer IDR prices, mixed budget to high-end. Same honesty rule as before: prices are estimates, and the `/prices` page says so. Add the new items to `docs/price-check.md`.
- **Builder UI:** the slot list gets two sections, **PC** and **Setup** (tabs or a segmented control; same on the mobile sheet). The part picker works for setup categories too, with their own spec chips and filters.
- **Totals:** the summary shows **PC subtotal**, **Setup subtotal** and **Total**. The wattage meter stays PC-only (monitors and speakers plug into the wall, not the PSU); say that in one line under the meter.
- **Presets:** keep the 3 PC presets and their totals exactly as they are (the landing page relies on them). Give each preset an optional matching setup, applied with an **"Add suggested setup"** button, not automatically.
- **Saving and sharing:** setup items save with the build and travel in share links. Old links must still open (add a test with a link encoded before this phase). The `/b/[code]` page and the OG image show the setup total when there is one.
- **Landing page:** update `CATALOG_STATS` so the hero count stays true, and mention setup items in one bento tile or feature line. Don't change the hero 3D scene.

**Done when:** Rei can build a PC plus a full desk setup, see three totals, save it, share it and open the link in a private window.

### Phase 11 — Setup rules

Add rule-based checks for setup items, in the same style as `lib/compat/rules.ts` (pure functions, same result shape, read by the UI and tests). They are **info or warning only, never error**: a setup choice never makes a build "incompatible".

- **GPU class:** add `targetRes: '1080p' | '1440p' | '4K'` to every GPU (a rough class, picked by you and stated as approximate in a code comment).
- **Monitor resolution vs GPU:** monitor resolution above the GPU's `targetRes` → warning, e.g. "This GPU is aimed at 1080p; a 4K monitor will need lower settings."
- **Refresh rate vs GPU:** a monitor of 240 Hz or more at exactly the GPU's `targetRes` → info, e.g. "High refresh rates (240 Hz) at 1440p are hard to reach with this GPU." Above `targetRes`, only the resolution warning shows (no refresh note on top).
- **Desk width:** the monitor's width plus the speakers (if any) wider than the desk's `widthMm` → warning. Use the same numbers the 3D desk uses in Phase 12.
- **Sync tech vs GPU brand (info):** a monitor with `adaptiveSync: 'G-Sync'` (a hardware module) plus an AMD GPU → "This monitor's G-Sync module needs an NVIDIA GPU for variable refresh; it still works as a normal monitor." FreeSync monitors stay silent (they work on both brands).
- **Monitor arm vs monitor (warning):** the monitor's `sizeIn` above the arm's `maxSizeIn`, or its `weightKg` above the arm's `maxLoadKg` → warning. Monitors get `weightKg` (panel without stand); arms already have `maxSizeIn` and `maxLoadKg`.
- **No GPU yet:** the GPU rules (resolution, refresh rate, sync) stay silent until a GPU is picked.
- Show setup results in the compat panel under their own **Setup** heading. One pass case and one fail case per rule in Vitest.
- Write the rule table into `docs/rules.md` (rule, inputs, condition, severity, message), for Rei's PI write-up. Include the 9 PC rules too.

**Done when:** each rule can be triggered from the UI, and `docs/rules.md` lists all rules.

### Phase 12 — 3D desk view

A second 3D view for the setup. In the builder viewport, a toggle **PC | Desk** (the Setup tab opens Desk; the PC tab opens PC).

- **Scene:** a separate scene component, loaded with `next/dynamic` and `ssr: false` as its **own chunk**, so the PC builder and the landing page don't pay for it.
- **Desk:** procedural, sized from the chosen desk's dims (default 1200 × 600 × 750 mm when none is picked, drawn faded with a "No desk picked" label).
- **Items on and around the desk**, all procedural, sized from `dims`, in the existing palette:
  - monitor (stand, thin bezel, screen with a soft emissive glow), keyboard, mouse, mousepad under both, speakers either side of the monitor, webcam on top of the monitor, mic on a small stand, headset on a hook or stand;
  - the chair in front of the desk;
  - the PC itself as a simplified box sized from the chosen case, on the floor beside the desk or on the desk when it's small (ITX), with a glow for the case's side panel.
- Reuse what exists: the drop animation, the amber warning glow for items flagged by Phase 11 rules (coral stays for errors, and setup rules never produce errors), hover tooltips, `frameloop="demand"`, `dpr={[1, 2]}`, the keyboard camera controls, the reduced-motion behaviour, the screen-reader text description, the WebGL fallback and the error fallback.
- **Camera:** a fixed "seated view" preset plus orbit with limits; clicking a setup slot eases the camera to that item.
- **Shared builds:** `/b/[code]` shows the PC | Desk toggle when the build has setup items, with the same touch and wheel behaviour as the PC view today.
- Models: procedural is fine. Real models come through the Phase 14 pipeline.
- Measure the desk scene's extra JS (gzip) and add it to the summary.

**Done when:** adding and removing any setup item animates on the desk, the items hanging over a too-narrow desk glow amber, and the PC view behaves exactly as before.

### Phase 13 — Curated tiers, marketplace links and checked prices

Still **no backend**. Tiers, links and checked prices live in the JSON so Phase 16 can move them into the database later.

**Part A — Curated tiered catalogue.** CoreSpec stays a **curated** catalogue, not a database of every product on the market.

- **Tier field:** add a required `tier: 'budget' | 'mid' | 'high'` to every PC part and setup item.
- **3 × 3 × 3:** every category (8 PC + 12 setup) gets **3 items per tier, 9 in total**. Assign tiers by what each product is aimed at, not only by price, and note in a code comment that tiers are an approximate judgement.
- **Never remove or rename an existing item** to reach 9: old share links and saved builds point at those ids. Add new items where a tier is short; if a category ends up with more than 3 in a tier, keep them and say so in the summary.
- **New items:** same rules as before: real products sold in Indonesia, approximate integer IDR prices, full specs and `dims`, added to `docs/price-check.md` (or the CSV from Part B).
- **Presets and suggested setups don't change**, and their totals stay the same.
- **Picker:** tier chips (**Budget / Mid / High-end**) as a filter, plus a small tier label on each row. The default sort stays as it is.
- **Tests:** every category has at least 3 items per tier; every id that existed before this phase still exists; preset totals are unchanged.

**Part B — Marketplace links and checked prices.** Outbound links only: no checkout, no cart, no stock on CoreSpec.

- **Data:** each part and setup item gets optional `listings: { marketplace: 'tokopedia' | 'shopee' | 'blibli'; url: string; priceIDR: number; checkedAt: string }[]`.
- **Price shown:** the lowest checked listing price when there is one, otherwise the estimate. The UI makes the difference clear: "Checked 12 Nov" vs "Estimate".
- **Stale prices:** a listing checked more than 14 days ago gets a small "Price may have changed" note.
- **Buy links:** the part detail in the picker, the summary and the shared build page get **"View on Tokopedia / Shopee / Blibli"** buttons for each listing.
- **Search links:** when a part has no listing, show **"Search on Tokopedia / Shopee"** links built from the product name (the marketplace's own search page). They're always honest and never point at a fake product.
- All outside links: `target="_blank"`, `rel="noopener noreferrer nofollow"`, and a small external-link icon. Use text names only: **no marketplace logos** (section 6).
- **Never scrape** marketplaces, and never fetch them from the app. Rei checks prices by hand.
- **Rei's workflow:** add `data/price-check.csv` (one row per item: id, name, marketplace, url, price, checked date) that Rei can fill in Excel or Google Sheets. Add `npm run prices:apply` (a script in `scripts/`) that validates the CSV (known ids, integer prices, real dates, https URLs on the 3 marketplace domains) and writes the listings into the JSON. It must print what it changed and fail loudly on bad rows. Replace the table in `docs/price-check.md` with short instructions for this workflow.
- Update `pricesAsOf` logic: show the newest `checkedAt` when listings exist. Update `/prices` to explain estimate vs checked.

**Done when:** every category has 3 items per tier with tier chips in the picker, a test CSV with 3 rows becomes 3 buy buttons with "Checked" dates, a bad row is rejected with a clear message, and parts without listings show search links.

### Phase 14 — 3D model pipeline v2

Set up the system so Rei can add real 3D models one at a time from Blender, without touching code and without breaking the viewer or the page speed. **This phase builds the pipeline; it doesn't need many new models.** Moving today's 3 models (CPU, RAM, GPU) into it is enough to prove it works; add a model for another category only if you find one with an allowed licence.

**Fallback chain.** Every part and setup item resolves its look in this order:

1. **Product model:** the item's own `modelId`, if it has one;
2. **Category model:** the default model for its category (today: CPU, RAM, GPU), scaled to the item's `dims` by `fitModel`, exactly like now;
3. **Procedural box:** what's drawn today.

A model that fails to load falls back to the next step, as it does today.

**Data.**

- Replace the hard-coded `MODELS` object in `lib/viewer/models.ts` with `data/models.json`. One entry per model: `id`, `file`, `basis`, `recolour` (optional), `credit` (an id in `data/credits.json`) and `defaultFor` (a category, for category models only).
- Add optional `modelId?: string` to PC parts and setup items.
- Add `resolveModel(item)` in `lib/viewer/` that walks the chain and returns a model entry or `null`. The PC scene and the desk scene both use it, so setup items (monitor, keyboard, chair and so on) can get models too.
- Load models only for items that are on screen, and load each model file once even when several items share it.

**Licences.** Anything in `public/models/` can be downloaded by any visitor, so putting a model on the site counts as redistributing it.

- Add **CC BY 4.0** to `ALLOWED_LICENCES`, next to CC0 1.0 and CC BY 3.0. CC BY models need author, source, licence URL and changes in `credits.json`, and they show on `/credits` (the existing tests already check this).
- **Never allowed**, and listed in `docs/models.md` with the reason: models imported through the IKEA Browser add-on (IKEA's terms apply; the add-on grants no licence), BlendKit **Royalty Free** assets (BlendKit only allows them where users can't easily extract them, and a web `.glb` is easy to extract), Sketchfab **Standard/Store** licences, and any **NC**, **ND** or **SA** Creative Commons licence.
- **No brand logos** on any model (section 6). Remove them in Blender.

**Size budgets** (tests enforce them; keep the Phase 9 performance):

- Each model file is **under 400 KB** after compression (was 1 MB).
- The **heaviest possible build** (the largest model per category, PC and setup together) loads **under 2.5 MB** of models in total.
- Textures are resized to **at most 1024 px** and compressed to **WebP** by `npm run models`. Add `sharp` as a dev dependency so this step actually runs.
- Keep recolouring to the CoreSpec palette as the default, so models and procedural boxes look like one set. A model may keep its own textures only when its entry says so, with a one-line reason.

**Tools for Rei.**

- `npm run models` keeps doing the compression: dedup, prune, weld, texture resize, Draco. It now reads `data/models.json` and fails loudly on a missing credit, a disallowed licence or an over-budget file.
- Add `npm run models:check <file>`: it prints a source model's size, triangle count, material names (for the `recolour` map), texture sizes, bounding box and whether it's over budget. Rei runs it before adding a model.
- **Don't use gltfjsx to generate a component per model.** Models are data, not code: adding a model must never need a new component. gltfjsx is fine for inspecting a file.
- Write `docs/models.md` for Rei: allowed sources (CC0 or CC BY on Poly Pizza and Sketchfab, CC0 on BlendKit), the forbidden list above, and a **Blender export checklist**:
  - apply all transforms; units in metres; +Y up;
  - origin at the bottom centre;
  - remove logos and hidden parts;
  - give materials clear names;
  - export **glTF Binary (.glb)** without Draco (the pipeline adds it);
  - save it as `models-src/<id>.glb`, then add the `models.json` and `credits.json` entries and run `npm run models` and `npm test`.
  Walk through one example from start to finish.

**Tests:** every `modelId` exists in `models.json`; every model entry has a credit with an allowed licence; both size budgets; `resolveModel` for each step of the chain; and the PC view and desk view look the same as before for the 3 moved models (compare screenshots in e2e).

**Done when:** today's 3 models run through `data/models.json` with nothing changed on screen, `docs/models.md` exists, and adding a test model with a fake disallowed licence or a 500 KB file fails the tests with a clear message.

### Phase 15 — Smoothing pass and handoff

- Lighthouse (mobile) on `/`, `/builder` and `/b/[code]` again; fix anything that got worse since Phase 9.
- Go through every page at 375, 768 and 1440 px; fix rough edges (spacing, long names, empty states, loading states).
- Add a `.gitattributes` (e.g. `* text=auto eol=lf`) so the Windows CRLF/LF noise in `git status` stops; renormalise once in its own commit.
- Known issue: in exploded view on narrow phones, the lifted cooler can leave the top of the viewport. Fix it by fitting the camera.
- Update the README (screenshots of the setup tab and the desk view), `/about`, the sitemap and the credits.
- **Rewrite `HANDOFF.md`** for session 2: what was built per phase, checks with real numbers, leftovers, and what Phase 16 needs.

**Done when:** all checks are green and `HANDOFF.md` is current.

### Phase 16 — Login and backend *(later session — don't start without Rei saying so)*

Rei's supervisor suggested user and admin login, because examiners like seeing it. Outline only; plan it in detail when Rei starts this phase.

- **Supabase** (Auth + Postgres), using `@supabase/ssr` with Next 16 (read the Next docs first).
- **Rei creates the Supabase project himself** and puts the keys in `.env.local` and Vercel. You never see, print or ask for their values. The service-role key is server-only and never gets a `NEXT_PUBLIC_` prefix (section 7).
- **Tables:** `profiles` (id, name, `role`: `user` | `admin`), `builds` (owner, name, parts, timestamps), `items` (the catalogue, seeded from the JSON, PC parts and setup items, with `tier` and `modelId`; called `items` to match the code's `Item` type), `listings` (seeded from the JSON). Row Level Security on every table: users read and write only their own builds; only admins write items and listings; everyone can read items (active and inactive, so old share links keep working) and listings.
- **Pages:** `/login` and `/register` (styled to the design system; the supervisor wants these to look good), account menu in the navbar, `/admin` guarded on the server.
- **Admin panel:** CRUD for parts, setup items and listings (with "mark as checked today"), so price checks move from the CSV into the browser.
- **Guests keep working with localStorage.** After logging in, offer "Import builds from this browser".
- The compatibility rules stay pure functions on plain objects, so their tests don't change.
- For the PI: export an ERD and a use case diagram (actors: Guest, User, Admin) into `docs/`.

## 9. Session 3 — Phases 17 and 18

> **How to use (session 3):** open Claude Code in the repo and say:
> `Read REI.md section 9 and HANDOFF.md, then start Phase 17a.`

Rei's supervisor asked for two more features at the 16 November bimbingan: a **payment simulation with a downloadable PDF receipt** (the items plus a picture of the PC and the setup) and a **live chat** with the admin. CoreSpec is still **not a shop**: nothing is sold, stocked or shipped, and every screen and the PDF say so.

**Deadline: Phase 17a and 17b must be on a Vercel preview by Wednesday 18 Nov, evening**, so Rei can test on his phones before the bimbingan on Thursday 19 Nov. If time runs short, cut scope in this order: admin orders list → QR code on the PDF → desk picture on the PDF. Never cut: the "simulation" wording, the server-side price recalculation, the tests of the status rules.

**Everything in sections 0, 3, 6, 7 and the session 2 rules in section 8 still applies** (read the Next 16 docs in `node_modules/next/dist/docs/` before using a Next API that's new to this repo: Route Handlers and `next/script` are both new here). On top of that:

- Work on a new branch **`feat/phase-17-checkout`** and open a PR; never push to `main`.
- **Still no Supabase service-role key.** The pattern for trusted writes is in 17a.
- New SQL goes in **new** migration files (rerunnable, like the others). Don't run them on the real project: the chat does that, then reruns `supabase/tests/rls.sql`.
- **With the Midtrans settings missing the site is exactly as before**: no Checkout button, no order pages, no request to Midtrans, and `accounts-off.spec.ts` stays green. Checkout also needs accounts on.
- Rei types every key himself. Never print, log or ask for a key's value.

### Facts checked in the Midtrans docs on 17 Nov 2026 (don't work from memory)

- **Product: Snap, pop-up mode.** The server asks for a token; the browser opens the payment pop-up with it. No Core API charge calls.
- **Create a transaction:** `POST https://app.sandbox.midtrans.com/snap/v1/transactions`, headers `Accept: application/json`, `Content-Type: application/json`, `Authorization: Basic base64(SERVER_KEY + ":")`. Body: `transaction_details: { order_id, gross_amount }` (integer rupiah) plus optional `item_details: [{ id, price, quantity, name }]`, `customer_details`, `expiry: { unit, duration }`, `custom_field1..3`. `order_id`: unique, at most 50 characters, only letters, digits, `-`, `_`, `~`, `.`. **The item prices × quantities must add up to `gross_amount`** or Midtrans rejects the request. Success is HTTP 201 with `{ token, redirect_url }`.
- **Browser:** load `https://app.sandbox.midtrans.com/snap/snap.js` with `data-client-key="<client key>"`, then `window.snap.pay(token, { onSuccess, onPending, onError, onClose })`. The same token re-opens the same payment.
- **Status check:** `GET https://api.sandbox.midtrans.com/v2/{order_id}/status`, same Basic auth. Returns `transaction_status`, `fraud_status`, `gross_amount` (a string like `"9080000.00"`), `payment_type`, `transaction_id`, `settlement_time`, `status_code`. An order whose pop-up was closed before a payment method was chosen has no transaction yet (expect a 404; **check this in the sandbox** and treat it as "still pending").
- **Statuses:** `pending`, `settlement`, `capture` (cards), `deny`, `cancel`, `expire`, `failure`, `refund`, `partial_refund`, `chargeback`, `authorize`. Paid means `status_code` 200 **and** `transaction_status` is `settlement`, or `capture` with `fraud_status` `accept`.
- **Notification (webhook):** Midtrans POSTs JSON to the Payment Notification URL set in its dashboard (Settings → Configuration). The URL must be public: **a Vercel preview URL is behind Vercel's login, so the webhook only works on production.** `signature_key` = SHA-512 hex of `order_id + status_code + gross_amount + SERVER_KEY`, with `gross_amount` exactly as the string in the body. Notifications can arrive twice or out of order. Answer within 5 seconds; any 2xx stops retries.
- **Sandbox testing:** card `4811 1111 1111 1114`, any future expiry, CVV `123`, OTP `112233`. QRIS on a desktop: copy the QR image's address into `https://simulator.sandbox.midtrans.com/v2/qris/index`. BCA VA: `https://simulator.sandbox.midtrans.com/bca/va/index`. **QRIS has a Rp 10.000.000 limit per transaction** (a Bank Indonesia rule), and most CoreSpec builds cost more, so **don't restrict `enabled_payments`**: let Snap list every method the sandbox account has. Check in the sandbox what Snap does with QRIS above the limit and say so in the summary.

### Phase 17a — Orders and the Midtrans Sandbox checkout

**Environment variables** (add to `.env.example` with empty values and comments; `docs/accounts.md` gets a "Checkout simulation" section with the setup steps):

| Name | Kind | Notes |
| --- | --- | --- |
| `MIDTRANS_SERVER_KEY` | **secret**, server only | Vercel type Secret. Used only in `lib/checkout/midtrans.ts` (`import "server-only"`). |
| `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` | public by design | Vercel type Config. Goes in the `snap.js` tag. |
| `ORDER_WRITE_SECRET` | **secret**, server only | Random, 32 bytes or more. See "Trusted writes". |

`lib/checkout/config.ts`: `checkoutConfig()` returns null unless all three **and** the Supabase settings are present. **Only the sandbox hosts appear in the code** (`app.sandbox.midtrans.com`, `api.sandbox.midtrans.com`); there is no production switch, so a real key can never charge anyone.

**Database** (`supabase/migrations/20261117000100_orders.sql`):

- `public.orders`: `id uuid` pk, `order_no text unique` (e.g. `CS-20261119-7K3F9Q`: this is the Midtrans `order_id`), `owner uuid` → `profiles` (on delete cascade), `build_name text`, `parts jsonb` (the `{category: itemId}` snapshot, checked by `build_parts_ok`), `items jsonb` (the price snapshot: `[{ id, category, brand, name, priceIDR, priceKind: "checked" | "estimate" }]`), `pc_idr`, `setup_idr`, `total_idr` (integers, `total_idr > 0`), `status text` in (`pending`, `paid`, `failed`, `expired`, `cancelled`) default `pending`, `payment_type text`, `midtrans_transaction_id text`, `snap_token text`, `created_at`, `updated_at`, `paid_at`.
- RLS on. `select`: the owner reads their own, admins read all (use the existing admin check function). **No insert, update or delete grants for `anon` or `authenticated` at all.**
- **Trusted writes without a service-role key:** a table `public.payment_config` (one row, `secret_hash text`, RLS on, no policies, no grants) holds the SHA-256 hex of `ORDER_WRITE_SECRET`. Two `security definer` functions with `search_path = ''`, each taking `p_secret text` first and raising unless `encode(sha256(convert_to(p_secret, 'utf8')), 'hex')` equals the stored hash (and refusing everything while the hash is null):
  - `create_order(p_secret, p_owner, p_order_no, p_build_name, p_parts, p_items, p_pc_idr, p_setup_idr, p_total_idr)` → the new row. Also refuses when the owner already has 5 `pending` orders created in the last hour (spam cap).
  - `set_order_payment(p_secret, p_order_no, p_status, p_payment_type, p_transaction_id, p_snap_token)` → the row. **Status rules live here:** `paid` is final; `pending` never replaces another status; `failed` / `expired` / `cancelled` never replace `paid`; `paid_at` is set once; a null argument leaves its column alone. Unknown `order_no` returns nothing (no error).
  - Grant execute to `anon` and `authenticated` (the webhook has no session). Without the secret they are useless: test exactly that.
- The migration leaves `secret_hash` null. Rei makes the secret and its hash locally; the hash (not the secret) is safe to share, and the chat stores it with one SQL statement.
- Extend `supabase/tests/rls.sql` and `supabase/rls.test.ts`: anon reads no orders; a user reads only their own; an admin reads all; nobody can insert/update/delete directly; both functions refuse a wrong secret and a null hash; every status rule above; the spam cap. Add mutation tests for the two rules that matter most (owner-only read, wrong secret refused). Update `types/supabase.ts`.

**Server code** (`lib/checkout/`, logic in pure functions with unit tests):

- `order.ts` (pure): `buildOrderDraft(parts, name)` resolves the items from the catalogue, takes `shownPrice` and `priceSource` per item, and returns the snapshot and totals, or a refusal: `empty` (no items) or `incompatible` (`check(parts)` has at least one **error**; warnings and missing parts don't block). **Prices never come from the browser.** `toMidtransItems()` (names cut to 50 characters, quantity 1; test that the sum always equals `total_idr`), `newOrderNo()`, `mapMidtransStatus()` (the "Statuses" rule above → our five statuses, or null for "no change"), `verifySignature()` (SHA-512, `timingSafeEqual`).
- `midtrans.ts` (server only): `createSnapToken(order)` and `fetchStatus(orderNo)` with `fetch`, a 8-second timeout and no caching. No Midtrans npm package.
- `actions.ts` (`"use server"`):
  - `startCheckout({ name, parts })`: `getSession()` (refuse guests) → `loadCatalogue()` → `buildOrderDraft` → `create_order` → `createSnapToken` (with `expiry` 60 minutes and `customer_details.first_name` = the display name only: **never send the user's email to Midtrans**) → store the token with `set_order_payment` → return `{ orderId, orderNo, token }`.
  - `refreshOrder(orderId)`: the owner (or an admin) asks; the server calls `fetchStatus`, checks `gross_amount` equals the order's total, maps the status and calls `set_order_payment`. **This is the main path**: it works on localhost and on previews, where the webhook can't reach.
  - `resumePayment(orderId)`: returns the stored token for the owner's `pending` order.
- `app/api/midtrans/notification/route.ts` (`POST`, the first Route Handler in this repo: read the Next docs): parse the JSON, find nothing → 200; verify the signature with `MIDTRANS_SERVER_KEY` (bad signature → 403, logged without the body's secrets); check `gross_amount` against the order; then **confirm with `fetchStatus`** and apply that status. Always answer 200 once the signature is good. It isn't in `proxy.ts`'s matcher; keep it that way.

**Pages and UI** (English UI as everywhere; the Indonesian line below is fixed wording):

- **Builder:** a primary **"Checkout (simulation)"** button in the build summary. Disabled, with the reason next to it, when the build is empty or has compatibility **errors** ("Fix 2 compatibility errors to check out": this is the rule-based system gating the order, which the PI is about). Guests see it enabled and go to `/login?next=/checkout`. Hidden entirely when checkout isn't configured.
- **`/checkout`** (needs a login; add `/checkout` and `/orders/:path*` to `proxy.ts`'s matcher and guard on the server with `requireSession`): the order summary for the current build from the browser's store: items grouped PC / Setup with Checked or Estimate labels, both subtotals, the total, the compatibility status, and a banner: **"Payment simulation. Midtrans Sandbox: no real money, nothing is sold or shipped."** with **"SIMULASI — bukan bukti transaksi"**. "Pay with Midtrans (sandbox)" calls `startCheckout`, loads `snap.js` **only now** (never on any other page) and opens the pop-up. `onSuccess` / `onPending` / `onClose` → go to `/orders/<id>`; `onError` → a toast and stay.
- **`/orders`** ("My orders", in the account menu): order number, date, build name, total, status badge.
- **`/orders/[id]`**: on load, a `pending` order calls `refreshOrder` once (and has a "Check payment status" button and "Continue payment"). Shows the status, the same item table from the **snapshot** (not today's prices), totals, payment method, the sandbox banner, a short "How to pay in the sandbox" box (the test card and the QRIS simulator link from the facts above, opening in a new tab), and a link to the build's share page. A missing or foreign order is a 404.
- **`/admin/orders`**: every order, newest first, with the owner's display name, total and status; filter by status. Read-only.
- `robots`: disallow `/checkout` and `/orders`; all three pages `noindex`.

**Tests:** unit tests for everything in `order.ts` (including: a tampered price in the input changes nothing; an incompatible build is refused; the signature check with a known example). The Server Actions and the route handler get unit tests with `fetch` mocked: wrong amount, bad signature, duplicate and out-of-order notifications, 404 from the status API. e2e: with checkout off, no button and `/checkout` is a 404; with dummy settings, the button's three states (empty, errors, ready) and the guest redirect. A real payment can't run in CI: add a manual checklist to `docs/accounts.md`. axe stays at 0 on the new pages.

### Phase 17b — The PDF receipt with the 3D pictures

- On `/orders/[id]`, a **"Download receipt (PDF)"** button, for any status (the status is printed on it).
- **Pictures:** the page already knows the order's `parts`, so render them: mount the PC `Viewer` and, when the order has setup items, the `DeskViewer`, at a fixed size (e.g. 1200 × 900, pixel ratio 2) in the default assembled camera position, not exploded, no error glow, on the app's dark background. Capture each canvas to PNG **straight after a render** (call `gl.render(scene, camera)` then `toDataURL` in the same tick, or use `preserveDrawingBuffer` on these two canvases only: don't change the builder's canvases). Wait until the models have loaded (the scenes already know) before capturing. If WebGL is missing or a capture fails, the PDF is still made, with "3D preview unavailable" in the picture's place.
- **PDF:** made in the browser with **`pdf-lib`** (loaded only when the button is clicked; say in the summary how many KB it adds to that click and confirm no other page's JavaScript grew). A4 portrait, light background so it prints well:
  - Header: the CoreSpec wordmark as text, "Receipt — payment simulation", order number, date and time (WIB), the buyer's display name.
  - A diagonal watermark and a footer line on **every page**: **"SIMULASI — bukan bukti transaksi"**, and "Midtrans Sandbox. No real payment was made and nothing is sold or shipped."
  - Status (Paid / Pending / …), payment method, Midtrans transaction id.
  - The PC picture and the desk picture.
  - The item table from the snapshot: category, brand and name, Checked / Estimate, price; PC subtotal, setup subtotal, total, in Rupiah as the app formats them.
  - Compatibility line: "Compatible: all 15 rules passed" (or the warnings, in short).
  - A QR code to the build's share link, with the link as text under it. A small QR library is fine (lazy, with the PDF); if none is small enough, print the link only and say so.
- File name `corespec-receipt-<order_no>.pdf`. Keep the layout code in `lib/receipt/` (pure: data in, bytes out) with a unit test that the PDF has the order number, the watermark text on each page and the right total, for a PC-only order, a PC + setup order and a 20-item order that needs a second page.
- e2e: with a stubbed order, the button downloads a file starting with `%PDF`. Test the capture at phone width too: the pictures must come out the same size whatever the screen.

### Phase 17c — Docs, diagrams and handoff

- `npm run diagrams`: add `orders` (and `payment_config`) to the ERD; add "Checkout (simulation)", "Download receipt" (User) and "View orders" (Admin) to the use case diagram; a new activity diagram "Simulasi pembayaran" for `docs/pi/`. Update `docs/pi/angka.md` (tables, tests, pages).
- `docs/accounts.md`: the Midtrans setup steps, the env vars, the manual test checklist. `docs/demo-script.md`: a checkout segment (pick the Budget 1080p preset → checkout → pay with the test card → receipt PDF). `/privacy`: one paragraph on what goes to Midtrans (order number, item names, amounts, display name; no email).
- `HANDOFF.md`: a session 4 report in the usual format, with the new false positives for the secret scan (`MIDTRANS_SERVER_KEY`, `ORDER_WRITE_SECRET`, `snap_token`, `signature_key` as names).

### Phase 18 — Live chat with a rule-based bot

> **How to use:** `Read REI.md "Phase 18", then plan Phase 18a.` Work on the branch **`feat/phase-18-chat`** (it starts from `feat/phase-17-checkout`, so all of Phase 17 is in it). **Never push to `feat/phase-17-checkout`**: its preview is Rei's Thursday demo and must not change. Open a separate draft PR, `feat/phase-18-chat` → `main`.

**Goal:** before the 19 Nov bimbingan, a logged-in user can open a chat, get instant answers from a **rule-based bot** for common questions, and talk to the **admin**, who answers from an inbox. Both sides update **live**.

**Deadline and cuts:** 18a and 18b on the Phase 18 preview by Wednesday 18 Nov, morning WIB. If time runs short, cut in this order: unread badges → quick-reply chips → closing a conversation. Never cut: the database rules (RLS, length cap, rate limit), the bot's tests, and the polling fallback.

All of section 9's rules still apply (no service-role key, new SQL in a new migration that the chat runs, Rei types keys, read the Next docs before new Next APIs). On top of that:

- **Chat needs accounts on.** Without the Supabase settings there is no chat UI, no Realtime code and no outside request; `accounts-off.spec.ts` stays green.
- **Pages that don't show the chat don't grow.** The Realtime client loads only when a logged-in user opens the chat panel or the admin opens `/admin/chat`. Report the KB that adds.

### Facts checked in the Supabase docs on 18 Nov 2026

- **Use Realtime Broadcast from the database**, not Postgres Changes: Supabase recommends Broadcast for most cases and Postgres Changes only for testing or few users. A trigger on the table calls `realtime.send(payload, event, topic, is_private)` (or `realtime.broadcast_changes(...)`), which writes to `realtime.messages`, and Realtime sends it to subscribed clients.
- **Private channels:** the client subscribes with `supabase.channel(topic, { config: { private: true } })` after `await supabase.realtime.setAuth(token)`. Who may join a topic is decided by **RLS policies on `realtime.messages`**, using `(select realtime.topic())` for the topic name. Policies are cached per connection.
- Messages sent with `is_private = true` only reach private channels.

### Design

**Topics:**
- `chat:<conversation_id>`: one per user conversation. The owner and admins may join.
- `chat:admin`: admins only. Every new message in any conversation is also sent here, so the inbox updates live.

**Clients only listen.** They never send over Realtime. Every write goes through a Server Action, so the database checks run, and **no insert policy on `realtime.messages`** is needed. Only add select policies.

**Getting the token to the browser.** CoreSpec's session lives in httpOnly cookies, and so far no Supabase code runs in the browser. Realtime needs the user's access token client-side. A Server Action `getRealtimeToken()` returns the current access token, or null for guests, through the existing `getSession()` (which renews it). The client calls `setAuth` with it and asks again shortly before it expires or when the channel errors. This is the **one exception** to "no Supabase in the browser". It's read-only: the browser client is never used for queries. Write it down in `docs/accounts.md`, and say in the summary what it changes.

**Fallback:** if the channel isn't `SUBSCRIBED` within 10 seconds, or drops, the panel polls a Server Action every 5 seconds until Realtime is back. The demo must work on campus wifi.

### Phase 18a — Database and the bot

**Migration `supabase/migrations/20261118000100_chat.sql`** (rerunnable):

- `public.conversations`:
  - `id uuid` pk, `owner uuid unique` → `profiles` (on delete cascade). One conversation per user.
  - `status` in (`open`, `closed`), default `open`.
  - `last_message_at`, `user_last_read_at`, `admin_last_read_at`, `created_at`.
- `public.chat_messages`:
  - `id uuid` pk, `conversation_id` → conversations (cascade).
  - `sender_role` in (`user`, `admin`, `bot`), `sender_id uuid` (null for bot).
  - `body text`, 1–1000 characters after trimming.
  - `bot_rule text` (which rule answered, for bot messages; null otherwise), `created_at`.
  - Index on `(conversation_id, created_at)`.
- **RLS (select):** the owner reads their own conversation and its messages; admins read all.
- **Writes:**
  - No direct insert, update or delete grants for anyone except as below.
  - A user inserts only `sender_role = 'user'`, with `sender_id = auth.uid()`, into their own conversation.
  - An admin inserts only `sender_role = 'admin'`, with `sender_id = auth.uid()`, into any conversation.
  - Use insert policies plus a `before insert` trigger that forces `created_at = now()` and refuses anything else.
  - `get_or_create_conversation()`: `security definer`, for the caller only. Re-opens a closed conversation.
  - `mark_chat_read(conversation_id)`: sets the caller's read time; owner or admin only.
  - `set_conversation_status(conversation_id, status)`: admin only.
- **Bot messages** are written through `post_bot_reply(p_secret, conversation_id, body, bot_rule)`. It's `security definer`, checks the secret like `create_order` does (reuse `check_order_secret`, so it's the same `ORDER_WRITE_SECRET`; no new env var), and only accepts a reply in a conversation whose latest message is from the user. Users can't fake bot messages.
- **Rate limit (database):**
  - A user may send at most 5 messages in 30 seconds and 60 per day; the 6th raises `chat_rate_limit` with a friendly message.
  - Admins: no limit.
  - Bot: at most 1 reply per user message, enforced by the "latest message is from the user" rule.
- **Broadcast trigger:** `after insert` on `chat_messages`, `security definer`, `search_path = ''`. It calls `realtime.send` with the message row as JSON, event `message`, to **both** `chat:<conversation_id>` and `chat:admin`, private. It also updates `conversations.last_message_at`.
- **`realtime.messages` select policies:**
  - Authenticated users may join `chat:<id>` when that conversation's owner is `auth.uid()`, or when they're an admin.
  - Only admins may join `chat:admin`.
  - Use `(select realtime.topic())` and check `realtime.messages.extension = 'broadcast'`.
  - No other policies on that table.
- **Tests:**
  - PGlite has no `realtime` schema: add a stand-in to `supabase/tests/supabase-shim.sql` (`realtime.messages`, `realtime.topic()` reading a setting, `realtime.send()` inserting a row) and keep it out of the real project.
  - Extend `rls.sql` (and its counts in `docs/pi/angka.md`): who reads which conversations and messages; users can't post as admin or bot, or into another user's conversation; the length cap; the rate limit; bot replies need the secret and a user's message last; topic join rules for user, other user, admin and anon.
  - **The `realtime.messages` policies can't be tested in PGlite the same way as on Supabase.** Test the policy expressions through the shim, and add a short manual check (two browsers) to `docs/accounts.md`.
  - Two new mutation tests: "another user's messages readable" and "bot reply without the secret accepted".

**The bot (`lib/chat/bot.ts`, pure functions, tested like the compatibility rules):**

- `matchBotRule(text)` returns `{ rule, reply, quickReplies }` or null. It normalises the text (lowercase, strip accents and punctuation) and matches keywords in **English and Indonesian**. Rules, in priority order:
  1. `human` (admin, human, manusia, cs, operator): "I'll let the admin know. An admin will reply soon (Admin akan membalas segera)." Marks the conversation as needing a human.
  2. `prices` (price, harga, mahal, murah, real, asli): explains Checked vs Estimate, the check date, and that prices are never scraped.
  3. `compatibility` (compatible, kompatibel, error, incompatible, cocok, socket, psu, watt): how the 15 rules work, error vs warning, and a link to the builder.
  4. `checkout` (checkout, bayar, pay, payment, pembayaran, midtrans, simulasi): it's a Midtrans **Sandbox** simulation, no real money, nothing is sold or shipped, plus the test card.
  5. `receipt` (struk, receipt, pdf, nota, invoice): where to download it, and the "SIMULASI — bukan bukti transaksi" mark.
  6. `share` (share, bagikan, link, kirim): how share links work.
  7. `account` (login, akun, account, password, daftar, register): what an account adds; the bot never asks for or handles passwords.
  8. `greeting` (halo, hai, hi, hello, pagi, siang, malam, p): a greeting plus the quick replies.
- **No match:** "Thanks! An admin will reply soon (Admin akan membalas segera)." Send it **at most once per 10 minutes** per conversation, so the bot doesn't repeat itself.
- **The bot stays quiet while an admin is active:** no bot reply if an admin message is in the last 10 minutes.
- Replies are English (the UI language), with the Indonesian line where given. Keep them short (≤ 300 characters), with no links outside CoreSpec and no contact details.
- `quickReplies`: 4–5 chips that send a canned question: "Are the prices real?", "Why is my build incompatible?", "How does checkout work?", "Download receipt", "Talk to admin".
- **Unit tests:** every rule fires on its English and Indonesian keywords; priority order (e.g. "harga checkout" picks one, deterministically); accents and casing; no match → null; the 10-minute rules; reply length cap.
- **Server Action `sendChatMessage(body)`:** session → `get_or_create_conversation` → insert the user message (RLS) → `matchBotRule` + the quiet rules → `post_bot_reply`. Return the new rows. Errors (`chat_rate_limit`, length) come back as friendly messages.

### Phase 18b — Chat UI and the admin inbox

**User side:**
- A **chat button** (bottom right, above the safe area on phones) for logged-in users only, on every page except `/admin/*`.
  - Don't let it cover the builder's sticky summary bar or the Snap pop-up. On `/checkout` it's hidden while paying.
  - Guests see nothing. The `/about` page gets one line: "Log in to chat with the admin."
- The panel is a sheet on phones (full height, like the mobile picker: `100dvh`, safe areas, only the list scrolls) and a 380 × 560 card on desktop.
  - Header: "CoreSpec chat", a status dot (Live / Reconnecting), and a note: "A bot answers common questions; the admin replies when online."
  - Bubbles by sender: you, Admin, Bot (with a small "Bot" label).
  - Quick-reply chips when the conversation is empty or after a bot reply.
  - Text box with a counter (1000) and Enter to send (Shift+Enter for a new line).
  - Errors shown inline.
- **Loading:** the first open loads the history (last 50 messages, "Load earlier" for more), subscribes to `chat:<id>`, and marks it read. A new message while the panel is closed shows an unread dot on the button. Keep it simple: check when the user navigates, not with a background socket.
- **Accessibility:**
  - The panel is a dialog with a label; focus moves to the text box.
  - New messages are announced through a polite live region.
  - Escape closes the panel; focus returns to the button.
  - axe 0.

**Admin side, `/admin/chat`** (plus a link on `/admin` with the count of unread conversations):
- Left: conversations, newest first, with the user's display name, last message preview, an unread badge, and "Needs admin" when the `human` rule fired or the bot had no answer. Filter: All / Needs admin / Open / Closed.
- Right: the thread, a reply box, and Close / Reopen.
- Subscribed to `chat:admin`: new messages move their conversation to the top live.
- On phones: the list, and tapping opens the thread full screen with a back button.

**Tests:**
- Unit: the Server Actions with Supabase mocked (rate-limit message, length, bot quiet rules, guest refused).
- e2e with accounts off: no chat button, `/admin/chat` is a 404.
- e2e with dummy settings: the button is hidden for guests.
- The logged-in panel can't run in CI. Build `/styleguide/chat`, showing the panel and the inbox with sample messages in every state (empty, quick replies, bot, admin, error, reconnecting). Run axe and a phone-width screenshot check there.
- Add a manual two-browser checklist to `docs/accounts.md`: user sends → bot answers instantly → admin inbox shows it live → admin replies → user sees it live without refreshing; a second user can't see it; a 6th fast message is refused; with wifi off and on, it reconnects.

### Phase 18c — Docs and diagrams (short)

- `npm run diagrams`:
  - ERD: add `conversations` and `chat_messages`.
  - Use case: User "Chat dengan admin / bot"; Admin "Membalas chat".
  - New activity diagram `docs/pi/aktivitas-live-chat.png`, with lanes Pengguna, Server, Basis data, Admin, and the bot's rule matching as its own decision.
- `docs/pi/angka.md`: tables, functions, bot rules (8 + fallback) with a table of their keywords, test counts, RLS check count.
- `docs/demo-script.md`: a chat segment (2 browsers: phone as user, laptop as admin).
- `/privacy`: chat messages are stored in the database and readable by admins.
- `HANDOFF.md`: Phase 18 section.

---

**Session 4: Phase 19 (section 10) runs on `feat/phase-19-models`; start with Phase 19a.** _Earlier:_ **Session 3: Phase 17 is done (PR #6). Phase 18 runs on `feat/phase-18-chat`; start with Phase 18a.** _Earlier:_ **Session 3: start with Phase 17a. Plan → implement → verify → summary → commit, then wait for "next".**

_Session 2 instruction, kept for history:_ **Session 2: start with Phase 9. Plan → implement → verify → summary → commit, then wait for "next".** After Phase 12b, continue with Phase 13 (tiers, then marketplace links), then Phase 14 (model pipeline v2).

---

_Session 1 instruction, kept for history:_ **Start now with Phase 0. Plan → implement → verify → summary → commit, then wait for "next".**

---

## 10. Session 4 — Phase 19: new 3D models for the desk view

> **How to use:** `Read REI.md section 10, then plan Phase 19a.` Work on **`feat/phase-19-models`** (it starts from `feat/phase-18-chat`, so Phases 17 and 18 are in it). Open a draft PR `feat/phase-19-models` → `main`. Don't push to the 17 or 18 branches.

**Why:** at the 19 Nov bimbingan the supervisor didn't like the desk view's boxes (especially the desk and the chair) and asked for better 3D, at least for the items in the presets and suggested setups. The ujian demo will be a **recording** made a few days before the ujian (early December), so the desk view has to look good on video.

**What's already done (chat, 22 Nov):** 16 models made from scratch with Blender Python scripts, in `models-src/`. They're our own work, so there's no licence problem: credit them as "CoreSpec (Syah Reihan Pratama Nandi)", **CC0 1.0**. The scripts are in `tools/blender/` (run with Blender's Python module `bpy`, see 19c), and the previews are in `docs/models/previews/`. Every file follows the `docs/models.md` checklist: metres, origin at the bottom centre, x = width, y = up, z = toward the person, no Draco, no textures, no logos.

| Model id | Use for | Fit | Triangles | Materials |
| --- | --- | --- | --- | --- |
| `desk-four-leg` | fixed desks (`adjustable` false) — **category model** for `desk` | stretch | ~2.5k | `wood` (top), `leg`, `black` |
| `desk-sit-stand` | sit-stand desks (`adjustable` true) | stretch | ~2.5k | `wood`, `leg`, `steel`, `black` |
| `chair-gaming` | chairs with `type` Gaming (racing back, pillows, coral piping) | contain | ~8.8k | `black`, `fabric`, `dark`, `steel`, `accent` |
| `chair-office` | chairs with `type` Ergonomic (mesh back) — **category model** for `chair` | contain | ~8.7k | `black`, `fabric`, `mesh`, `dark`, `steel` |
| `monitor-flat` | flat monitors on their own stand — **category model** for `monitor` | stretch | ~2.2k | `black`, `screen`, `dark`, `accent` |
| `monitor-curved` | `curved` monitors on their own stand (slim Y-legs) | stretch | ~2.6k | same |
| `monitor-panel` | **any monitor hanging on an arm** (no stand) | stretch | ~1.7k | same |
| `arm-single` | **category model** for `arm`: articulated gas-spring arm, clamp at the back (−z), VESA plate at the front (+z) | stretch | ~2.5k | `black`, `dark`, `steel` |
| `speaker-bookshelf` | **category model** for `speakers` (one speaker; the layout draws two) | stretch | ~1k | `dark`, `black`, `steel` |
| `light-bar` | lighting with `kind` "Light bar" | stretch | ~1k | `dark`, `black`, `light` |
| `desk-lamp` | lighting with `kind` "Lamp" | contain | ~0.7k | `dark`, `steel`, `black`, `light` |
| `mousepad` | **category model** for `mousepad` | stretch | ~0.5k | `pad`, `dark` |
| `headset` | **category model** for `headset` (with boom mic) | contain | ~4.7k | `dark`, `fabric`, `pad`, `steel`, `black`, `accent` |
| `mouse` | **category model** for `mouse` (light strip at the back) | stretch | ~2.1k | `dark`, `black`, `steel`, `accent` |
| `microphone` | **category model** for `microphone` (desk stand) | contain | ~3.2k | `black`, `steel`, `dark`, `mesh`, `light` |
| `webcam` | **category model** for `webcam` (clip over the screen) | contain | ~1.8k | `black`, `dark`, `steel`, `screen`, `light` |

LED strips keep their procedural look. The keyboard model is unchanged.

**Fix round (22 Nov, after 19a):** `microphone` re-exported (tripod legs now run from a hub down to the feet, thicker). New `monitor-panel-curved` (same panel, curved, no stand): use it for a **curved monitor on an arm** (the code rule next to `monitor-panel`). Both come from `tools/blender/build_fix1.py`.

**PC case for the desk view (22 Nov, branch `models/pc-case`):** `case-mid-tower` (`tools/blender/build_case.py`, ~7.1k triangles): mid-tower, front mesh at +z, **glass side on +x**, simple internals behind the glass (board, GPU with fan rings, tower cooler, RAM, PSU shroud, 3 front + 1 rear fan with `accent` rings). Rules: **desk view only** (the PC view keeps drawing the real parts; add a way for a model to apply to one view only, e.g. `"views": ["desk"]`), fit `stretch` to the chosen case's dims (ITX cases too). Turn it so the glass faces the desk (mirror if the PC sits on the other side). Materials: `glass` must render transparent (about 15% opacity, low roughness, no depth write so the internals show), `accent` glows (emissive, like RGB; per-item `finish` can change it), `mesh` for the front.

### Phase 19a — Wire the models in

1. **`data/models.json`**: one entry per model above (`basis` identity, `fit` as in the table, `defaultFor` where marked). `data/credits.json`: one "CoreSpec, CC0 1.0, made with Blender scripts in tools/blender" entry the models share (or one each, whatever `/credits` handles best). Then `npm run models` and check every compressed file against the budgets (each < 400 KB, the heaviest build < 2.5 MB); report the sizes.
2. **Choosing the model is data, not code, wherever possible.** Add `modelId` to the items that need the non-default model: sit-stand desks → `desk-sit-stand`; Gaming chairs → `chair-gaming`; curved monitors → `monitor-curved`; Light bars → `light-bar`; Lamps → `desk-lamp`. A test in `lib/data.test.ts` checks the rule holds for every item (so a new item added through the admin panel can't drift silently: if that's a problem, put the rule in `resolveModel` instead, and explain which you chose).
3. **The one rule that is code:** a monitor drawn on an arm uses `monitor-panel` (the layout doesn't draw a stand then). And the arm's model fills the arm's box from the clamp to the VESA plate (the layout already knows `poleZ` and `vesaZ`; make the arm item's box span that depth so the stretched model reaches the screen).
4. **Desk-view palette for models.** Today `recolour` only knows the PC tones. Let models in the desk view use the desk tones too, and add the ones these models need: `wood` (light oak default), `leg` (dark steel), `fabric` (dark grey), `mesh` (dark grey, slightly lighter than fabric), `pad` (near-black cloth), `accent` (CoreSpec coral by default), `screen` (the existing emissive screen tone), `light` (the existing emissive light tone). Update the `recolour` docs. Check light and dark themes if the desk view has both.
5. **Fit check:** every preset and suggested setup, in the desk view at desktop and phone width: nothing floats, sinks into the desk, or pokes through another item; the chair still turns; the warning glow still lights the right model (glow on models, not only boxes — check how the PC view does it). Exploded view and any other desk-view states still work.
6. Tests: model resolution for each rule above, recolour with desk tones, the budget test, the e2e smoke that the desk view renders with models (no console errors), axe 0. Report the KB the desk view downloads for each preset before and after.

### Phase 19b — Per-item colours ("finish")

The research for the presets showed colourways matter (white vs oak desks, orange Cougar stitching, red AOC trim). Add an optional **`finish`** to setup items: a map from **material name** to colour (`"#RRGGBB"`), applied on top of `recolour` for that item only. Items without it keep the palette.

- Validation: keys must be material names the item's model actually has; values `#RRGGBB`. Unit tests.
- **Admin panel:** on a setup item's edit page, a "Finish" section listing the item's model's material names, each with a colour input and "reset to default". Saved like other item fields (DB column `finish jsonb` on `items`, new migration, RLS unchanged, audit log entry). The JSON catalogue keeps working when accounts are off.
- The PDF receipt's 3D pictures use the finish too (they reuse the scene).
- **Finishes for the preset items** (from Rei's research, 22 Nov):

| Item | finish |
| --- | --- |
| `desk-ikea-lagkapten-adils-120-60` | `wood` light oak `#C9A57B`, `leg` black `#1E1E20`, `black` `#1E1E20` |
| `desk-ikea-trotten-sit-stand-120-70` | `wood` white `#E8E6E1`, `leg` anthracite `#3A3B3F`, `steel` `#4A4B50` |
| `desk-ikea-mittzon-sit-stand-140-80` | `wood` walnut `#5C3B28`, `leg` black `#1E1E20`, `steel` `#2A2A2D` |
| `chair-cougar-armor-one` | `accent` orange `#F26B1D` |
| `chair-ikea-markus` | `fabric` dark grey `#3A3B3E`, `mesh` dark grey `#45464A` |
| `monitor-aoc-24g4` | `accent` red `#D0202A` |
| `monitor-lg-ultragear-27gr75q` | `accent` dark purplish red `#7E2848` |
| `headset-hyperx-cloud-ii` | `accent` red `#C4161C` |
| `headset-hyperx-cloud-stinger-2` | `accent` `#1E1E20` (all black) |
| `headset-logitech-g435-lightspeed` | `dark` black `#1C1C1E`, `accent` neon yellow `#D7F205`, `fabric` `#2A2A2D` |
| `mouse-logitech-g102-lightsync` | `accent` RGB cyan `#3FD0FF` |
| `mouse-logitech-g304-lightspeed` | `accent` `#26262A` (no RGB) |
| `mouse-logitech-g502-x` | `accent` `#26262A` (no RGB) |
| `speakers-creative-pebble-plus` | `steel` copper `#B87333` |
| `speakers-logitech-z120` | (leave default; the white back isn't a separate part) |
| `microphone-rode-podmic` | `mesh` grille `#6E6F73` |
| `lighting-benq-screenbar-halo` | `dark` `#3A3B3F` |

Everything else in the presets is black/dark and keeps the default.

### Phase 19c — Docs, PI material, handoff

- `tools/blender/README.md`: how to rebuild the models (`pip install bpy` for the matching Python, then `python tools/blender/build_roundN.py`; outputs land in an `out/` folder next to the scripts — change `OUT` to a repo-relative path while you're there), which script makes which model, and the axis convention. Don't make the build part of CI.
- `docs/models.md`: the new models, the selection rules, the desk tones, and `finish`.
- `/credits`: shows the CoreSpec models.
- `docs/pi/`: a figure for the PI with the new desk view for each preset (screenshots at 1600 px wide, light background if the desk view supports it, otherwise as is), plus `docs/pi/angka.md` (number of models, triangles, KB).
- `docs/demo-script.md`: the desk-view segment now shows the new models; note that the demo will be recorded.
- `HANDOFF.md`: a Phase 19 section.

### Rules for Phase 19

- Don't edit the `.glb` files by hand. If a model needs a change, say what and the chat changes the script and re-exports (or change the script yourself and re-export, if `bpy` installs on Rei's PC).
- Keep everything else from sections 6–9: branch + PR, new migration for `finish`, the chat runs it, rls.sql rerun, Rei tests on his phones before merge.
