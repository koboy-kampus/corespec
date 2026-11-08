import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Box,
  Check,
  Cpu,
  Plus,
  Search,
  Share2,
  Trash2,
  XCircle,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { PriceTag } from "@/components/ui/price-tag";
import { SectionHeader } from "@/components/ui/section-header";
import { Tip } from "@/components/ui/tooltip";

export const metadata: Metadata = { title: "Style guide" };

const colours = [
  { token: "--bg", value: "#0F0E0E", use: "Page background" },
  { token: "--surface", value: "#161316", use: "Cards, panels, nav" },
  { token: "--surface-2", value: "#1E1A1E", use: "Hover, raised, dropdowns" },
  { token: "--line", value: "rgba(255,255,255,.07)", use: "Hairline borders" },
  {
    token: "--line-strong",
    value: "#4B4A4B",
    use: "Dividers, inputs, disabled",
  },
  { token: "--text", value: "#FFFFFF", use: "Headings, key numbers" },
  { token: "--text-2", value: "#C9C6C9", use: "Body text" },
  { token: "--text-3", value: "#8C898C", use: "Captions, labels" },
  { token: "--accent", value: "#FE2E4B", use: "Links, icons, prices, focus" },
  { token: "--accent-strong", value: "#E01E3C", use: "Filled primary buttons" },
  {
    token: "--accent-soft",
    value: "rgba(254,46,75,.12)",
    use: "Selected, badges",
  },
  { token: "--ok", value: "#3DD68C", use: "Compatible" },
  { token: "--warn", value: "#F5B544", use: "Warnings" },
];

const typeScale = [
  {
    role: "Display H1",
    cls: "text-display-sm md:text-display text-fg",
    meta: "Geist 56/56 · 38/40 mobile · 600 · −2px",
    sample: "Build your PC in 3D.",
  },
  {
    role: "H2",
    cls: "text-h2 text-fg",
    meta: "Geist 32/36 · 500 · −0.5px",
    sample: "Start from a preset",
  },
  {
    role: "H3",
    cls: "text-h3 text-fg",
    meta: "Geist 22/28 · 500 · −0.3px",
    sample: "Live compatibility checks",
  },
  {
    role: "Body",
    cls: "text-body text-fg-2",
    meta: "Geist 15/22 · 400",
    sample:
      "Pick parts, watch them snap into place and see the total in Rupiah as you go.",
  },
  {
    role: "UI",
    cls: "text-ui font-medium text-fg",
    meta: "Geist 14/22 · 500–600 · −0.07px",
    sample: "Start Building",
  },
  {
    role: "Spec / price",
    cls: "spec text-spec text-fg-2",
    meta: "Geist Mono 12–14/18 · tabular-nums",
    sample: "8C/16T · 120 W · AM5 · Rp 6.250.000",
  },
  {
    role: "Micro label",
    cls: "label-micro text-fg-3",
    meta: "IBM Plex Mono 10–11/14 · uppercase · +0.08em",
    sample: "Total · Est. draw · Rev 0.1",
  },
];

const radii = [
  { name: "chip", px: 6, cls: "rounded-chip" },
  { name: "input", px: 10, cls: "rounded-input" },
  { name: "button", px: 14, cls: "rounded-btn" },
  { name: "card", px: 20, cls: "rounded-card" },
  { name: "tile", px: 26, cls: "rounded-tile" },
];

const sections = [
  "Colour",
  "Type",
  "Radius",
  "Buttons",
  "Badges",
  "Cards",
  "Kbd",
  "Tooltip",
  "Dialog",
  "Section header",
  "Price tag",
];

const slug = (s: string) => s.toLowerCase().replace(/\s+/g, "-");

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section
      id={slug(title)}
      className="scroll-mt-24 border-t border-line py-12"
    >
      <p className="mb-6 label-micro text-accent">{title}</p>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 py-3 md:flex-row md:items-center md:gap-6">
      <span className="w-28 shrink-0 label-micro text-fg-3">{label}</span>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

export default function StyleguidePage() {
  return (
    <div className="container-page pt-12 pb-8">
      <SectionHeader
        as="h1"
        eyebrow="Sheet 01 · Components"
        title="Style guide"
        subtitle="Every CoreSpec token and component in one place. Resize the window to check 375, 768 and 1440px."
        layout="split"
      />

      <nav
        aria-label="Style guide sections"
        className="mt-8 mb-4 flex flex-wrap gap-2"
      >
        {sections.map((s) => (
          <a
            key={s}
            href={`#${slug(s)}`}
            className="rounded-chip border border-line bg-surface px-2.5 py-1 font-plex text-micro text-fg-2 uppercase transition-colors hover:border-line-hover hover:text-fg"
          >
            {s}
          </a>
        ))}
      </nav>

      <Section title="Colour">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {colours.map((c) => (
            <div
              key={c.token}
              className="overflow-hidden rounded-input border border-line bg-surface"
            >
              <div
                className="h-16 border-b border-line"
                style={{ background: `var(${c.token})` }}
              />
              <div className="flex flex-col gap-1 p-3">
                <span className="spec text-spec-sm text-fg">{c.token}</span>
                <span className="spec text-spec-sm break-all text-fg-3">
                  {c.value}
                </span>
                <span className="text-[12px] leading-4 text-fg-3">{c.use}</span>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Type">
        <div className="flex flex-col divide-y divide-line">
          {typeScale.map((t) => (
            <div
              key={t.role}
              className="grid gap-2 py-5 md:grid-cols-[180px_1fr] md:gap-8"
            >
              <div className="flex flex-col gap-1">
                <span className="label-micro text-fg">{t.role}</span>
                <span className="spec text-spec-sm text-fg-3">{t.meta}</span>
              </div>
              <p className={t.cls}>{t.sample}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Radius">
        <div className="flex flex-wrap gap-4">
          {radii.map((r) => (
            <div key={r.name} className="flex flex-col items-center gap-2">
              <div
                className={`size-20 border border-line-strong bg-surface shadow-edge ${r.cls}`}
              />
              <span className="label-micro text-fg-3">
                {r.name} · {r.px}
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Buttons">
        <Row label="Primary">
          <Button size="sm">Small</Button>
          <Button>Medium</Button>
          <Button size="lg" iconRight={<ArrowRight />}>
            Start Building
          </Button>
        </Row>
        <Row label="Secondary">
          <Button variant="secondary" size="sm" icon={<Plus />}>
            Add part
          </Button>
          <Button variant="secondary" icon={<Share2 />}>
            Share
          </Button>
          <Button variant="secondary" size="lg">
            Browse Presets
          </Button>
        </Row>
        <Row label="Glass">
          <div className="relative flex flex-wrap items-center gap-3 overflow-hidden rounded-card p-4">
            <div
              aria-hidden
              className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_30%,rgba(254,46,75,0.45),transparent_70%)]"
            />
            <Button variant="glass" size="sm" className="relative">
              Small
            </Button>
            <Button variant="glass" className="relative" icon={<Box />}>
              View in 3D
            </Button>
            <Button variant="glass" size="lg" className="relative">
              Large
            </Button>
          </div>
        </Row>
        <Row label="Ghost">
          <Button variant="ghost" size="sm">
            Small
          </Button>
          <Button variant="ghost" icon={<Search />}>
            Search
          </Button>
          <Button variant="ghost" size="lg">
            Large
          </Button>
        </Row>
        <Row label="Icon only">
          <Tip content="Remove part">
            <Button variant="secondary" size="icon-sm" aria-label="Remove part">
              <Trash2 />
            </Button>
          </Tip>
          <Tip content="Add part">
            <Button size="icon" aria-label="Add part">
              <Plus />
            </Button>
          </Tip>
          <Button variant="ghost" size="icon" aria-label="Search">
            <Search />
          </Button>
        </Row>
        <Row label="States">
          <Button>Default</Button>
          <Button className="outline-2 outline-offset-2 outline-accent">
            Focus (forced)
          </Button>
          <Button disabled>Disabled</Button>
          <Button variant="secondary" disabled>
            Disabled
          </Button>
          <span className="text-[13px] text-fg-3">
            Hover or Tab through to see live states.
          </span>
        </Row>
      </Section>

      <Section title="Badges">
        <Row label="Variants">
          <Badge>Neutral</Badge>
          <Badge variant="accent">Accent</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="accent" shape="pill">
            Beta
          </Badge>
        </Row>
        <Row label="Status">
          <Badge variant="ok" icon={<Check />}>
            Compatible
          </Badge>
          <Badge variant="warn" icon={<AlertTriangle />}>
            Low headroom
          </Badge>
          <Badge variant="error" icon={<XCircle />}>
            Incompatible
          </Badge>
        </Row>
        <p className="mt-2 text-[13px] text-fg-3">
          Coral is the brand colour, so errors always pair an icon with words,
          never colour alone.
        </p>
      </Section>

      <Section title="Cards">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <p className="mb-3 label-micro text-fg-3">Solid · 20</p>
            <CardTitle>Solid card</CardTitle>
            <CardDescription className="mt-2">
              Surface fill, hairline border, inner top glow.
            </CardDescription>
          </Card>
          <div className="relative overflow-hidden rounded-card">
            <div
              aria-hidden
              className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(254,46,75,0.45),transparent_60%)]"
            />
            <Card variant="glass" className="relative h-full">
              <p className="mb-3 label-micro text-fg-3">Glass · 20</p>
              <CardTitle>Glass card</CardTitle>
              <CardDescription className="mt-2">
                8px blur over 70% charcoal.
              </CardDescription>
            </Card>
          </div>
          <Card variant="bento" padding="lg">
            <p className="mb-3 label-micro text-fg-3">Bento · 26</p>
            <CardTitle>Bento tile</CardTitle>
            <CardDescription className="mt-2">
              For the landing feature grid.
            </CardDescription>
          </Card>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Card interactive className="min-w-0 cursor-pointer">
            <div className="flex items-start justify-between">
              <div>
                <p className="mb-3 label-micro text-fg-3">Interactive</p>
                <CardTitle>Hover me</CardTitle>
                <CardDescription className="mt-2">
                  Lifts 2px and the border brightens.
                </CardDescription>
              </div>
              <ArrowRight className="size-5 -translate-x-1 text-accent opacity-0 transition-all duration-150 group-hover/card:translate-x-0 group-hover/card:opacity-100" />
            </div>
          </Card>
          <Card padding="sm" className="flex min-w-0 items-center gap-4">
            <div className="flex size-10 items-center justify-center rounded-input bg-accent-soft text-accent">
              <Cpu className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="label-micro text-fg-3">CPU</p>
              <p className="truncate text-ui font-medium text-fg">
                Example 8-core processor
              </p>
            </div>
            <PriceTag value={6250000} />
          </Card>
        </div>
      </Section>

      <Section title="Kbd">
        <Row label="Keys">
          <KbdGroup>
            <Kbd>Ctrl</Kbd>
            <Kbd>K</Kbd>
          </KbdGroup>
          <Kbd>Esc</Kbd>
          <Kbd>↵</Kbd>
          <span className="text-[13px] text-fg-3">
            Try Ctrl K anywhere to open the search palette.
          </span>
        </Row>
      </Section>

      <Section title="Tooltip">
        <Row label="Sides">
          {(["top", "right", "bottom", "left"] as const).map((side) => (
            <Tip key={side} side={side} content={`Tooltip on ${side}`}>
              <Button variant="secondary" size="sm">
                {side}
              </Button>
            </Tip>
          ))}
        </Row>
      </Section>

      <Section title="Dialog">
        <Row label="Modal">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="secondary" icon={<Zap />}>
                Open dialog
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reset build?</DialogTitle>
                <DialogDescription>
                  This clears every slot in your current build. Saved builds are
                  not affected.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter showCloseButton>
                <Button>Reset</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </Row>
      </Section>

      <Section title="Section header">
        <div className="flex flex-col gap-10">
          <Card padding="lg">
            <SectionHeader
              eyebrow="Layout · left"
              title="Everything you need to plan a build"
              subtitle="Stacked title and subtitle, aligned left."
            />
          </Card>
          <Card padding="lg">
            <SectionHeader
              layout="split"
              eyebrow="Layout · split"
              title="Start from a preset"
              subtitle="Title on the left, subtitle and an optional action on the right from 768px up."
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  iconRight={<ArrowRight />}
                >
                  All presets
                </Button>
              }
            />
          </Card>
        </div>
      </Section>

      <Section title="Price tag">
        <Row label="Sizes">
          <PriceTag value={15378000} size="sm" />
          <PriceTag value={15378000} />
          <PriceTag value={15378000} size="lg" />
        </Row>
        <Row label="Tones">
          <PriceTag value={2499000} tone="accent" />
          <PriceTag value={2499000} tone="default" />
          <PriceTag value={2499000} tone="muted" />
        </Row>
        <Row label="Compact">
          <PriceTag value={15378000} compact />
          <PriceTag value={950000} compact />
        </Row>
        <Row label="Labelled">
          <PriceTag value={18450000} size="lg" label="Total" />
          <PriceTag value={6250000} tone="default" label="CPU" />
        </Row>
      </Section>
    </div>
  );
}
