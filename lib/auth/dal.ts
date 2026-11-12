import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { createSupabase, type Supabase } from "@/lib/supabase/server";
import type { Role } from "@/types/supabase";

/**
 * The Data Access Layer for accounts: the only place that decides who is logged
 * in. Every protected page and every Server Action asks here; nothing trusts the
 * navbar's hint cookie or anything the browser says about itself.
 */

export interface Viewer {
  id: string;
  email: string;
  displayName: string;
  role: Role;
}

export interface Session {
  viewer: Viewer;
  supabase: Supabase;
}

/**
 * The logged-in visitor, or null. The access token is verified (signature and
 * expiry) by `getClaims()`, which first renews it if it has expired; the role
 * comes from the database, not from the token.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  const supabase = await createSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, role")
    .eq("id", claims.sub)
    .maybeSingle();
  if (!profile) return null;
  return {
    supabase,
    viewer: {
      id: claims.sub,
      email: typeof claims.email === "string" ? claims.email : "",
      displayName: profile.display_name,
      role: profile.role,
    },
  };
});

/** Only a same-site path is allowed after logging in (no open redirects). */
export function safeNext(next: unknown, fallback = "/account"): string {
  if (typeof next !== "string" || !next.startsWith("/")) return fallback;
  if (next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}

/** For pages that need a login: sends visitors to /login, then back here. */
export async function requireSession(here: string): Promise<Session> {
  const session = await getSession();
  if (!session) redirect(`/login?next=${encodeURIComponent(safeNext(here))}`);
  return session;
}

/** For admin pages: anyone who isn't an admin gets a plain 404. */
export async function requireAdmin(): Promise<Session> {
  const session = await getSession();
  if (!session || session.viewer.role !== "admin") notFound();
  return session;
}
