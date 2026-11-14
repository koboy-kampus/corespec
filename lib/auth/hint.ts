import type { Role } from "@/types/supabase";

/**
 * A small, non-secret cookie that says "this browser is logged in" (and as what),
 * so the navbar can show "Account" instead of "Log in" without asking the server
 * on every page. That keeps every public page static.
 *
 * It grants nothing: the real session is in Supabase's httpOnly cookies, and every
 * protected page and Server Action checks it on the server (lib/auth/dal.ts). The
 * worst a forged hint does is show a menu whose links then say "log in".
 */
export const HINT_COOKIE = "cs-auth";

export type Hint = Role;

/** Reads the hint from a Cookie header or `document.cookie`. */
export function parseHint(cookies: string): Hint | null {
  for (const part of cookies.split(";")) {
    const [name, value] = part.trim().split("=");
    if (name === HINT_COOKIE)
      return value === "admin" ? "admin" : value === "user" ? "user" : null;
  }
  return null;
}

/** Fired on window when this tab logs in or out, so the menu updates at once. */
export const HINT_EVENT = "corespec:auth";
