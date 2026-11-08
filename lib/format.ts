/**
 * Formatting helpers. Every price in CoreSpec is an integer number of rupiah.
 */

const idr = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const idrCompact = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  notation: "compact",
  maximumFractionDigits: 1,
});

const plain = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });

/** 15378000 → "Rp 15.378.000" */
export function formatIDR(rupiah: number): string {
  return idr.format(Math.round(rupiah));
}

/** 15378000 → "Rp 15,4 jt" (for small cards) */
export function formatIDRCompact(rupiah: number): string {
  return idrCompact.format(Math.round(rupiah));
}

/** 357 → "357 mm" */
export function formatMM(mm: number): string {
  return `${plain.format(mm)} mm`;
}

/** 650 → "650 W" */
export function formatWatts(watts: number): string {
  return `${plain.format(watts)} W`;
}
