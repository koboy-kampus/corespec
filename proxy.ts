import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { HINT_COOKIE } from "@/lib/auth/hint";
import { supabaseConfig } from "@/lib/supabase/config";

/**
 * Proxy (Next 16's new name for Middleware). It only runs on the account pages
 * (see `config.matcher`), never on the landing page, the builder or shared
 * builds, so those stay static and fast.
 *
 * Its one job is keeping the session fresh: Server Components can't write
 * cookies, so a renewed access token is written here before the page renders.
 * It is an optimistic check only. The real checks are on the server, next to the
 * data (lib/auth/dal.ts), in every page and Server Action.
 *
 * Without Supabase settings it does nothing.
 */
export async function proxy(request: NextRequest) {
  const config = supabaseConfig();
  if (!config) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(config.url, config.key, {
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(list, headers) {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list)
          response.cookies.set(name, value, options);
        for (const [key, value] of Object.entries(headers ?? {}))
          response.headers.set(key, value);
      },
    },
  });

  // Renews the access token if it has expired (writing the cookies above).
  const { data } = await supabase.auth.getClaims();
  const loggedIn = !!data?.claims?.sub;
  const path = request.nextUrl.pathname;

  // Already logged in: skip the login and register forms.
  if (loggedIn && (path === "/login" || path === "/register")) {
    const to = NextResponse.redirect(new URL("/account", request.url));
    for (const c of response.cookies.getAll()) to.cookies.set(c);
    return to;
  }

  // Not logged in: /account needs a login (the page checks again on the server).
  if (!loggedIn && path.startsWith("/account")) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", path);
    const to = NextResponse.redirect(login);
    for (const c of response.cookies.getAll()) to.cookies.set(c);
    if (request.cookies.has(HINT_COOKIE)) to.cookies.delete(HINT_COOKIE);
    return to;
  }

  // Not logged in: admin pages are a plain 404 (the page checks the admin role
  // itself, for logged-in users too; this only gives guests the right status).
  if (!loggedIn && path.startsWith("/admin")) {
    return NextResponse.rewrite(new URL("/404", request.url), { status: 404 });
  }

  // No session cookies at all: the navbar's "logged in" hint is stale.
  const hasSession = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-"));
  if (!hasSession && request.cookies.has(HINT_COOKIE))
    response.cookies.delete(HINT_COOKIE);

  return response;
}

export const config = {
  matcher: [
    "/account/:path*",
    "/admin/:path*",
    "/login",
    "/register",
    "/forgot-password",
    "/auth/:path*",
  ],
};
