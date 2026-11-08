import { ImageResponse } from "next/og";
import { CATALOG_STATS } from "@/lib/parts";

export const alt = "CoreSpec: build your PC in 3D, with prices in Rupiah";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Default share image for every page that doesn't have its own. */
export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: "#0f0e0e",
        backgroundImage:
          "radial-gradient(circle at 80% 30%, rgba(254,46,75,0.32), rgba(254,46,75,0) 55%)",
        color: "#ffffff",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            border: "3px solid #fe2e4b",
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
              background: "#fe2e4b",
            }}
          />
        </div>
        <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: 4 }}>
          CORESPEC
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ fontSize: 92, fontWeight: 700, letterSpacing: -3 }}>
          Build your PC in 3D.
        </div>
        <div style={{ fontSize: 32, color: "#c9c6c9" }}>
          {`Live compatibility checks · Prices in Rupiah · ${CATALOG_STATS.parts} parts`}
        </div>
      </div>
      <div style={{ fontSize: 22, color: "#8c898c" }}>
        Free · No sign-up · Made in Indonesia
      </div>
    </div>,
    size,
  );
}
