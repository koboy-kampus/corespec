"use client";

import { Html } from "@react-three/drei";
import { cn } from "cn";
import { CATEGORY_LABEL } from "@/lib/categories";
import { formatIDR } from "@/lib/format";
import { partLabel } from "@/lib/parts";
import type { Vec3 } from "@/lib/viewer/layout";
import type { Item } from "@/types/parts";
import type { Flag } from "./palette";

/** Hover label for a part or setup item in the 3D view: slot, name, price and any issue. */
export function PartTooltip({
  part,
  position,
  flag,
}: {
  part: Item;
  position: Vec3;
  flag?: Flag;
}) {
  return (
    <Html
      position={position}
      center
      zIndexRange={[20, 10]}
      className="pointer-events-none"
    >
      <div className="-translate-y-6 rounded-input border border-line bg-surface-2/95 px-3 py-2 whitespace-nowrap shadow-edge backdrop-blur">
        <p className="label-micro text-micro-sm text-fg-3">
          {CATEGORY_LABEL[part.category]}
          {flag ? (
            <span
              className={cn(
                "ml-2",
                flag === "error" ? "text-accent" : "text-warn",
              )}
            >
              {flag === "error" ? "Incompatible" : "Warning"}
            </span>
          ) : null}
        </p>
        <p className="text-[13px] leading-[18px] font-medium text-fg">
          {partLabel(part)}
        </p>
        <p className="spec text-spec-sm text-accent">
          {formatIDR(part.priceIDR)}
        </p>
      </div>
    </Html>
  );
}
