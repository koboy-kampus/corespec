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
- `presets.json`: 3 valid builds — "Budget 1080p" (~Rp 9 jt), "1440p Sweet Spot" (~Rp 18 jt), "Creator Workstation" (~Rp 35 jt).
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

## 8. Session 2 — Phases 9 to 15

> **How to use (session 2):** open Claude Code in the repo and say:
> `Read REI.md section 8 and HANDOFF.md, then start Phase 9.`

Phases 0–8 are done and live on Vercel (see `HANDOFF.md`). Session 2 adds **setup items** (monitor, mouse, keyboard and the rest of a desk setup) with their own **3D desk view**, **marketplace links** with checked prices, and a smoothing pass. **Login and the backend come last (Phase 15)**, in a later session, on purpose.

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
- Reuse what exists: the drop animation, the coral glow for items flagged by Phase 11 rules, hover tooltips, `frameloop="demand"`, `dpr={[1, 2]}`, the keyboard camera controls, the reduced-motion behaviour, the screen-reader text description, the WebGL fallback and the error fallback.
- **Camera:** a fixed "seated view" preset plus orbit with limits; clicking a setup slot eases the camera to that item.
- **Shared builds:** `/b/[code]` shows the PC | Desk toggle when the build has setup items, with the same touch and wheel behaviour as the PC view today.
- Models: procedural is fine. A GLTF model is allowed only through the existing pipeline (CC0 or CC BY 3.0, `credits.json`, under 1 MB, tests).
- Measure the desk scene's extra JS (gzip) and add it to the summary.

**Done when:** adding and removing any setup item animates on the desk, a too-narrow desk glows coral, and the PC view behaves exactly as before.

### Phase 13 — Marketplace links and checked prices

Still **no backend**. Links and checked prices live in the JSON so Phase 15 can move them into the database later.

- **Data:** each part and setup item gets optional `listings: { marketplace: 'tokopedia' | 'shopee' | 'blibli'; url: string; priceIDR: number; checkedAt: string }[]`.
- **Price shown:** the lowest checked listing price when there is one, otherwise the estimate. The UI makes the difference clear: "Checked 12 Nov" vs "Estimate".
- **Stale prices:** a listing checked more than 14 days ago gets a small "Price may have changed" note.
- **Buy links:** the part detail in the picker, the summary and the shared build page get **"View on Tokopedia / Shopee / Blibli"** buttons for each listing.
- **Search links:** when a part has no listing, show **"Search on Tokopedia / Shopee"** links built from the product name (the marketplace's own search page). They're always honest and never point at a fake product.
- All outside links: `target="_blank"`, `rel="noopener noreferrer nofollow"`, and a small external-link icon. Use text names only: **no marketplace logos** (section 6).
- **Never scrape** marketplaces, and never fetch them from the app. Rei checks prices by hand.
- **Rei's workflow:** add `data/price-check.csv` (one row per item: id, name, marketplace, url, price, checked date) that Rei can fill in Excel or Google Sheets. Add `npm run prices:apply` (a script in `scripts/`) that validates the CSV (known ids, integer prices, real dates, https URLs on the 3 marketplace domains) and writes the listings into the JSON. It must print what it changed and fail loudly on bad rows. Replace the table in `docs/price-check.md` with short instructions for this workflow.
- Update `pricesAsOf` logic: show the newest `checkedAt` when listings exist. Update `/prices` to explain estimate vs checked.

**Done when:** a test CSV with 3 rows becomes 3 buy buttons with "Checked" dates, a bad row is rejected with a clear message, and parts without listings show search links.

### Phase 14 — Smoothing pass and handoff

- Lighthouse (mobile) on `/`, `/builder` and `/b/[code]` again; fix anything that got worse since Phase 9.
- Go through every page at 375, 768 and 1440 px; fix rough edges (spacing, long names, empty states, loading states).
- Add a `.gitattributes` (e.g. `* text=auto eol=lf`) so the Windows CRLF/LF noise in `git status` stops; renormalise once in its own commit.
- Known issue: in exploded view on narrow phones, the lifted cooler can leave the top of the viewport. Fix it by fitting the camera.
- Update the README (screenshots of the setup tab and the desk view), `/about`, the sitemap and the credits.
- **Rewrite `HANDOFF.md`** for session 2: what was built per phase, checks with real numbers, leftovers, and what Phase 15 needs.

**Done when:** all checks are green and `HANDOFF.md` is current.

### Phase 15 — Login and backend *(later session — don't start without Rei saying so)*

Rei's supervisor suggested user and admin login, because examiners like seeing it. Outline only; plan it in detail when Rei starts this phase.

- **Supabase** (Auth + Postgres), using `@supabase/ssr` with Next 16 (read the Next docs first).
- **Rei creates the Supabase project himself** and puts the keys in `.env.local` and Vercel. You never see, print or ask for their values. The service-role key is server-only and never gets a `NEXT_PUBLIC_` prefix (section 7).
- **Tables:** `profiles` (id, name, `role`: `user` | `admin`), `builds` (owner, name, parts, timestamps), `parts` (seeded from the JSON, PC and setup), `listings` (seeded from the JSON). Row Level Security on every table: users read and write only their own builds; only admins write parts and listings; everyone can read parts and listings.
- **Pages:** `/login` and `/register` (styled to the design system; the supervisor wants these to look good), account menu in the navbar, `/admin` guarded on the server.
- **Admin panel:** CRUD for parts, setup items and listings (with "mark as checked today"), so price checks move from the CSV into the browser.
- **Guests keep working with localStorage.** After logging in, offer "Import builds from this browser".
- The compatibility rules stay pure functions on plain objects, so their tests don't change.
- For the PI: export an ERD and a use case diagram (actors: Guest, User, Admin) into `docs/`.

---

**Session 2: start with Phase 9. Plan → implement → verify → summary → commit, then wait for "next".**

---

_Session 1 instruction, kept for history:_ **Start now with Phase 0. Plan → implement → verify → summary → commit, then wait for "next".**
