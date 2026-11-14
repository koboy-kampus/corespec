import "server-only";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { HINT_COOKIE, type Hint } from "@/lib/auth/hint";
import type { Database } from "@/types/supabase";
import { supabaseConfig } from "./config";

export type Supabase = SupabaseClient<Database>;

/**
 * Session cookies: httpOnly (no script on the page can read them; CoreSpec never
 * runs Supabase in the browser), Secure in production, SameSite=Lax.
 */
export const AUTH_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
};

/**
 * A Supabase client acting as the visitor (their session from the cookies), so
 * the database's Row Level Security applies to everything it does. Returns null
 * when accounts aren't configured.
 *
 * In a Server Action or Route Handler it also writes refreshed session cookies,
 * so an expired access token is renewed right there (the builder's sync runs
 * where proxy.ts doesn't). During a Server Component render cookies can't be
 * written, so it skips that; proxy.ts refreshes the session for those pages.
 */
export async function createSupabase(): Promise<Supabase | null> {
  const config = supabaseConfig();
  if (!config) return null;
  const store = await cookies();
  return createServerClient<Database>(config.url, config.key, {
    cookieOptions: AUTH_COOKIE_OPTIONS,
    cookies: {
      getAll: () => store.getAll(),
      setAll(list) {
        try {
          for (const { name, value, options } of list)
            store.set(name, value, options);
        } catch {
          // A Server Component render: cookies are read-only here.
        }
      },
    },
  });
}

const HINT_MAX_AGE = 400 * 24 * 60 * 60;

/** Sets (or, with null, clears) the "logged in" hint. Server Actions and Route Handlers only. */
export async function setHint(hint: Hint | null): Promise<void> {
  const store = await cookies();
  if (hint === null) {
    if (store.has(HINT_COOKIE)) store.delete(HINT_COOKIE);
    return;
  }
  if (store.get(HINT_COOKIE)?.value === hint) return;
  store.set(HINT_COOKIE, hint, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: HINT_MAX_AGE,
  });
}

/** Removes every Supabase session cookie (after the account is gone, say). */
export async function clearSessionCookies(): Promise<void> {
  const store = await cookies();
  for (const { name } of store.getAll())
    if (name.startsWith("sb-")) store.delete(name);
}
