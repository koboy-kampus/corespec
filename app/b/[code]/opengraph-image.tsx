import { loadCatalogue } from "@/lib/catalogue/load";
import { ImageResponse } from "next/og";
import { CATEGORIES } from "@/lib/categories";
import { deriveBuild } from "@/lib/derive";
import { formatDate, formatIDR } from "@/lib/format";
import { PRICES_AS_OF } from "@/lib/parts";
import { decodeBuild } from "@/lib/share";

export const alt = "A PC build shared from CoreSpec";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// ImageResponse can't read CSS variables, so the brand colours are repeated here.
// Satori needs one text node per element: use template strings, not `{a} text {b}`.
const C = {
  bg: "#0f0e0e",
  surface: "#161316",
  line: "rgba(255,255,255,0.10)",
  text: "#ffffff",
  text2: "#c9c6c9",
  text3: "#8c898c",
  accent: "#fe2e4b",
  ok: "#3dd68c",
  warn: "#f5b544",
};

function status(errors: number, warnings: number, filled: number) {
  if (errors > 0) return { label: `${errors} incompatible`, color: C.accent };
  if (warnings > 0)
    return {
      label: `${warnings} warning${warnings > 1 ? "s" : ""}`,
      color: C.warn,
    };
  if (filled < CATEGORIES.length)
    return { label: "Incomplete", color: C.text3 };
  return { label: "Compatible", color: C.ok };
}

/** Social preview for /b/<code>: build name, total and part count. */
export default async function Image({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  await loadCatalogue();
  const { code } = await params;
  const shared = decodeBuild(code);
  const d = deriveBuild(shared?.parts ?? {});
  const s = status(d.errors, d.warnings, d.filled);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: C.bg,
        backgroundImage:
          "radial-gradient(circle at 85% 20%, rgba(254,46,75,0.28), rgba(254,46,75,0) 55%)",
        color: C.text,
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            border: `3px solid ${C.accent}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: 3,
              background: C.accent,
            }}
          />
        </div>
        <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: 4 }}>
          CORESPEC
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ fontSize: 24, letterSpacing: 3, color: C.text3 }}>
          SHARED BUILD
        </div>
        <div
          style={{
            fontSize: 76,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: -2,
            maxHeight: 170,
            overflow: "hidden",
          }}
        >
          {shared?.name ?? "Build your PC in 3D"}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          borderTop: `1px solid ${C.line}`,
          paddingTop: 32,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 22, color: C.text3, letterSpacing: 2 }}>
            TOTAL · APPROX.
          </div>
          <div style={{ fontSize: 64, fontWeight: 700, color: C.accent }}>
            {formatIDR(d.totalIDR)}
          </div>
          {d.setupFilled > 0 ? (
            <div style={{ fontSize: 22, color: C.text2 }}>
              {`PC ${formatIDR(d.pcIDR)} · Setup ${formatIDR(d.setupIDR)}`}
            </div>
          ) : null}
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", gap: 14, fontSize: 28 }}>
            <div style={{ color: C.text2 }}>
              {`${d.filled}/${CATEGORIES.length} parts`}
            </div>
            <div style={{ color: s.color }}>{`· ${s.label}`}</div>
          </div>
          <div style={{ fontSize: 20, color: C.text3 }}>
            {`Prices as of ${formatDate(PRICES_AS_OF)}`}
          </div>
        </div>
      </div>
    </div>,
    size,
  );
}
