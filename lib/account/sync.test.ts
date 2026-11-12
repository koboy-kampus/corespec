import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The build sync Server Action runs from /builder, where proxy.ts never renews
 * the session. These tests run the real action with the real Supabase client,
 * a cookie jar standing in for next/headers, and a fake Supabase server (fetch),
 * to show that an expired access token is renewed inside the action (and the new
 * cookies written), and that a dead session answers "signed-out" without
 * touching the database.
 */

const URL_ = "https://abcdefgh.supabase.co";
const COOKIE = "sb-abcdefgh-auth-token";
const USER = "00000000-0000-4000-8000-0000000000aa";

// A cookie jar shaped like next/headers' cookies().
const jar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    getAll: () => [...jar].map(([name, value]) => ({ name, value })),
    get: (name: string) =>
      jar.has(name) ? { name, value: jar.get(name)! } : undefined,
    has: (name: string) => jar.has(name),
    set: (name: string, value: string, options?: { maxAge?: number }) => {
      if (value === "" || options?.maxAge === 0) jar.delete(name);
      else jar.set(name, value);
    },
    delete: (name: string) => jar.delete(name),
  }),
}));

const b64url = (s: string) => Buffer.from(s).toString("base64url");
/** An HS256-shaped token: the client checks it with the server (GET /user), not by signature. */
function jwt(exp: number): string {
  return [
    b64url(JSON.stringify({ alg: "HS256", typ: "JWT" })),
    b64url(
      JSON.stringify({
        sub: USER,
        email: "rei@example.test",
        role: "authenticated",
        aud: "authenticated",
        exp,
        iat: exp - 3600,
        session_id: "s1",
      }),
    ),
    "sig",
  ].join(".");
}

const now = () => Math.floor(Date.now() / 1000);
const user = {
  id: USER,
  aud: "authenticated",
  role: "authenticated",
  email: "rei@example.test",
  app_metadata: {},
  user_metadata: {},
  created_at: "2026-11-01T00:00:00Z",
};

function session(exp: number, refresh: string) {
  return {
    access_token: jwt(exp),
    refresh_token: refresh,
    token_type: "bearer",
    expires_in: 3600,
    expires_at: exp,
    user,
  };
}

/** Puts a session in the jar the way @supabase/ssr stores it. */
function storeSession(s: object) {
  jar.set(COOKIE, `base64-${b64url(JSON.stringify(s))}`);
}

function readSession(): { access_token: string; refresh_token: string } {
  const raw = jar.get(COOKIE)!;
  return JSON.parse(
    Buffer.from(raw.replace(/^base64-/, ""), "base64url").toString(),
  );
}

interface Call {
  method: string;
  path: string;
}
let calls: Call[] = [];
let refreshWorks = true;
let stored: object[] = [];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

async function fakeSupabase(input: RequestInfo | URL, init?: RequestInit) {
  const req = new Request(input, init);
  const url = new URL(req.url);
  calls.push({ method: req.method, path: url.pathname + url.search });
  const accept = req.headers.get("accept") ?? "";

  if (url.pathname === "/auth/v1/token") {
    if (!refreshWorks)
      return json(
        {
          code: "refresh_token_already_used",
          error_code: "refresh_token_already_used",
          msg: "Invalid Refresh Token: Already Used",
        },
        400,
      );
    return json(session(now() + 3600, "refresh-2"));
  }
  if (url.pathname === "/auth/v1/user") {
    const token = req.headers.get("authorization")?.replace(/^Bearer /, "");
    const exp = JSON.parse(
      Buffer.from(token!.split(".")[1], "base64url").toString(),
    ).exp;
    return exp > now() ? json(user) : json({ msg: "JWT expired" }, 401);
  }
  if (url.pathname === "/rest/v1/profiles") {
    const row = { display_name: "Rei", role: "user" };
    return accept.includes("vnd.pgrst.object") ? json(row) : json([row]);
  }
  if (url.pathname === "/rest/v1/builds" && req.method === "GET")
    return json(stored);
  if (url.pathname === "/rest/v1/builds" && req.method === "POST") {
    const rows = (await req.json()) as object[];
    stored = rows.map((r) => ({ ...r, created_at: new Date().toISOString() }));
    return json(stored, 201);
  }
  return json({ message: `unexpected ${req.method} ${url.pathname}` }, 500);
}

const build = {
  id: "b-1",
  name: "Gaming",
  parts: { cpu: "cpu-amd-ryzen-5-7600" },
  updatedAt: "2026-11-12T08:00:00.000Z",
};

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", URL_);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
  vi.stubGlobal("fetch", vi.fn(fakeSupabase));
  jar.clear();
  calls = [];
  stored = [];
  refreshWorks = true;
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

async function syncBuilds(input: unknown) {
  const mod = await import("./sync");
  return mod.syncBuilds(input);
}

describe("syncBuilds (Server Action)", () => {
  it("renews an expired access token inside the action, writes the new cookies, then syncs", async () => {
    storeSession(session(now() - 60, "refresh-1"));

    const res = await syncBuilds({
      account: USER,
      builds: [build],
      tombstones: [],
    });

    expect(res).toMatchObject({ ok: true, userId: USER, displayName: "Rei" });
    expect(res.ok && res.builds.map((b) => b.id)).toEqual(["b-1"]);
    // Renewed once, with the old refresh token…
    expect(
      calls.filter((c) => c.path.startsWith("/auth/v1/token")),
    ).toHaveLength(1);
    // …and the new session is in the cookies for the next request.
    expect(readSession().refresh_token).toBe("refresh-2");
    expect(jar.get("cs-auth")).toBe("user");
    // The build reached the account.
    expect(calls).toContainEqual({
      method: "POST",
      path: expect.stringMatching(/^\/rest\/v1\/builds/),
    });
  });

  it("answers signed-out (and writes nothing) when the session can't be renewed", async () => {
    storeSession(session(now() - 60, "refresh-1"));
    refreshWorks = false;

    const res = await syncBuilds({
      account: USER,
      builds: [build],
      tombstones: [],
    });

    expect(res).toEqual({
      ok: false,
      reason: "signed-out",
      message: "Your session has ended. Please log in again.",
    });
    expect(calls.some((c) => c.path.startsWith("/rest/v1/"))).toBe(false);
  });

  it("answers signed-out when there is no session at all", async () => {
    const res = await syncBuilds({ account: null, builds: [], tombstones: [] });
    expect(res).toMatchObject({ ok: false, reason: "signed-out" });
    expect(calls.some((c) => c.path.startsWith("/rest/v1/"))).toBe(false);
  });

  it("uses a still-valid token without renewing it", async () => {
    storeSession(session(now() + 1800, "refresh-1"));
    const res = await syncBuilds({ account: USER, builds: [], tombstones: [] });
    expect(res.ok).toBe(true);
    expect(calls.some((c) => c.path.startsWith("/auth/v1/token"))).toBe(false);
  });

  it("rejects a malformed request before asking Supabase anything", async () => {
    storeSession(session(now() + 1800, "refresh-1"));
    const res = await syncBuilds({
      account: USER,
      builds: "nope",
      tombstones: [],
    });
    expect(res).toMatchObject({ ok: false, reason: "invalid" });
    expect(calls).toEqual([]);
  });

  it("ignores builds from another account and says the account switched", async () => {
    storeSession(session(now() + 1800, "refresh-1"));
    const res = await syncBuilds({
      account: "00000000-0000-4000-8000-0000000000bb",
      builds: [build],
      tombstones: [],
    });
    expect(res).toMatchObject({ ok: true, switched: true, builds: [] });
    expect(calls.some((c) => c.method === "POST")).toBe(false);
  });

  it("answers not-configured without Supabase settings", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    const res = await syncBuilds({ account: null, builds: [], tombstones: [] });
    expect(res).toMatchObject({ ok: false, reason: "not-configured" });
    expect(calls).toEqual([]);
  });
});
