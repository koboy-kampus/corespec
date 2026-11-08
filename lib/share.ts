import { CATEGORIES } from "@/lib/categories";
import { ALL_PARTS, getPart } from "@/lib/parts";
import type { Build, Category } from "@/types/parts";

/**
 * Share codes: a build squeezed into a short, URL-safe string.
 *
 *   "1" + one 5-character code per part + "." + base64url(name)
 *   e.g. 1k3f0aq81zz… .MTQ0MHAgU3dlZXQgU3BvdA
 *
 * Each part code is a hash of the part id, not its position in the catalogue,
 * so adding parts later never breaks old links. Parts that were removed from the
 * catalogue are skipped and counted in `missing`.
 */
const VERSION = "1";
const PART_CODE_LEN = 5;
export const MAX_NAME_LENGTH = 60;
const CODE_PATTERN = new RegExp(
  `^${VERSION}((?:[0-9a-z]{${PART_CODE_LEN}}){0,${CATEGORIES.length}})(?:\\.([A-Za-z0-9_-]*))?$`,
);

/** FNV-1a hash of the id, as 5 base-36 characters. */
export function partCode(id: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return (h % 36 ** PART_CODE_LEN).toString(36).padStart(PART_CODE_LEN, "0");
}

const BY_CODE = new Map(ALL_PARTS.map((p) => [partCode(p.id), p]));

function toBase64Url(text: string): string {
  let bin = "";
  for (const byte of new TextEncoder().encode(text))
    bin += String.fromCharCode(byte);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(b64: string): string {
  const std = b64.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(std + "===".slice((std.length + 3) % 4));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

export interface SharedBuild {
  name: string;
  parts: Build["parts"];
  /** Parts in the link that are no longer in the catalogue. */
  missing: number;
}

export function encodeBuild(build: Pick<Build, "name" | "parts">): string {
  const parts = CATEGORIES.flatMap((c) => {
    const id = build.parts[c];
    return id && getPart(id) ? [partCode(id)] : [];
  }).join("");
  const name = build.name.trim().slice(0, MAX_NAME_LENGTH);
  return `${VERSION}${parts}${name ? `.${toBase64Url(name)}` : ""}`;
}

/** Reads a share code. Returns null when it isn't a valid code at all. */
export function decodeBuild(code: string): SharedBuild | null {
  const match = CODE_PATTERN.exec(code);
  if (!match) return null;
  const [, partChunk, nameChunk = ""] = match;

  let name = "";
  try {
    name = nameChunk ? fromBase64Url(nameChunk) : "";
  } catch {
    return null;
  }

  const parts: Partial<Record<Category, string>> = {};
  let missing = 0;
  for (let i = 0; i < partChunk.length; i += PART_CODE_LEN) {
    const part = BY_CODE.get(partChunk.slice(i, i + PART_CODE_LEN));
    if (!part || parts[part.category]) missing++;
    else parts[part.category] = part.id;
  }

  return {
    name: name.trim().slice(0, MAX_NAME_LENGTH) || "Shared build",
    parts,
    missing,
  };
}

export function sharePath(build: Pick<Build, "name" | "parts">): string {
  return `/b/${encodeBuild(build)}`;
}
