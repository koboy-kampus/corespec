import {
  Armchair,
  Box,
  CircuitBoard,
  Cpu,
  Fan,
  Gpu,
  HardDrive,
  Headset,
  Keyboard,
  LampDesk,
  MemoryStick,
  Mic,
  Monitor,
  MonitorUp,
  Mouse,
  PanelTop,
  PlugZap,
  RectangleHorizontal,
  Speaker,
  Webcam,
  type LucideIcon,
} from "lucide-react";
import { cn } from "cn";
import type { Category } from "@/types/parts";

const ICONS: Record<Category, LucideIcon> = {
  cpu: Cpu,
  cooler: Fan,
  motherboard: CircuitBoard,
  ram: MemoryStick,
  gpu: Gpu,
  storage: HardDrive,
  psu: PlugZap,
  case: Box,
  monitor: Monitor,
  arm: MonitorUp,
  keyboard: Keyboard,
  mouse: Mouse,
  mousepad: RectangleHorizontal,
  headset: Headset,
  speakers: Speaker,
  webcam: Webcam,
  microphone: Mic,
  lighting: LampDesk,
  desk: PanelTop,
  chair: Armchair,
};

/** Category icon in a small coral-tinted tile. */
export function CategoryIcon({
  category,
  className,
  bare = false,
}: {
  category: Category;
  className?: string;
  /** Render just the glyph, without the tile. */
  bare?: boolean;
}) {
  const Icon = ICONS[category];
  if (bare) return <Icon aria-hidden className={cn("size-4", className)} />;
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-input bg-accent-soft text-accent",
        className,
      )}
    >
      <Icon className="size-4" />
    </span>
  );
}
