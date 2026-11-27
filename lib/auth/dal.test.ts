import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * getSession() must suspend a prerender (io()) before Supabase's getClaims()
 * reads the clock; see the comment on getSession.
 */

const calls: string[] = [];

vi.mock("next/cache", () => ({
  io: vi.fn(async () => {
    calls.push("io");
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabase: vi.fn(async () => ({
    auth: {
      getClaims: vi.fn(async () => {
        calls.push("getClaims");
        return { data: { claims: { sub: "u1", email: "a@b.c" } }, error: null };
      }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: { display_name: "Ana", role: "user" },
          }),
        }),
      }),
    }),
  })),
}));

beforeEach(() => {
  calls.length = 0;
});

describe("getSession", () => {
  it("waits for io() before getClaims() reads the clock", async () => {
    const { getSession } = await import("./dal");
    const session = await getSession();
    expect(session?.viewer).toEqual({
      id: "u1",
      email: "a@b.c",
      displayName: "Ana",
      role: "user",
    });
    expect(calls).toEqual(["io", "getClaims"]);
  });
});
