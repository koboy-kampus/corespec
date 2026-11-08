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
3. Scan the staged diff for secrets: `git diff --cached | grep -nEi "(api[_-]?key|secret|token|password|sk-|ghp_|-----BEGIN)"`. If anything matches, **stop, unstage it, and tell Rei**.
4. Never use `git add -A` blindly on a dirty tree you haven't checked; never `git push --force`.

**Secret rules:**
- Real keys live only in `.env.local` (local) and Vercel → Settings → Environment Variables (production).
- Commit a `.env.example` with variable names and empty values only.
- Never prefix a secret with `NEXT_PUBLIC_` — that ships it to every visitor's browser. Secrets are used only in server code (route handlers, server components, server actions).
- Never print, log, or paste a key's value in chat, code, comments, tests or commit messages.
- v1 needs **no API keys at all**. If a feature seems to need one, ask Rei first.

---

**Start now with Phase 0. Plan → implement → verify → summary → commit, then wait for "next".**
