import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkoutConfig, readSetting, resetSettingWarnings } from "./config";

/**
 * Settings pasted with a stray newline or space (Midtrans's auth tolerates
 * them, our signature check doesn't) are trimmed, with one warning per setting
 * that never contains the value or its length.
 */

const SERVER = "SB-Mid-server-CONFIG-TEST-abc123";
const CLIENT = "SB-Mid-client-CONFIG-TEST-def456";
const SECRET = "config-test-write-secret-789";

const ENV = {
  MIDTRANS_SERVER_KEY: SERVER,
  NEXT_PUBLIC_MIDTRANS_CLIENT_KEY: CLIENT,
  ORDER_WRITE_SECRET: SECRET,
  NEXT_PUBLIC_SUPABASE_URL: "https://abcdefgh.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
};

let warn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  for (const [k, v] of Object.entries(ENV)) vi.stubEnv(k, v);
  resetSettingWarnings();
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("checkoutConfig", () => {
  it("reads clean settings as they are, without warning", () => {
    expect(checkoutConfig()).toEqual({
      serverKey: SERVER,
      clientKey: CLIENT,
      writeSecret: SECRET,
    });
    expect(warn).not.toHaveBeenCalled();
  });

  it("trims all three settings", () => {
    vi.stubEnv("MIDTRANS_SERVER_KEY", `${SERVER}\n`);
    vi.stubEnv("NEXT_PUBLIC_MIDTRANS_CLIENT_KEY", ` ${CLIENT} `);
    vi.stubEnv("ORDER_WRITE_SECRET", `\t${SECRET}\r\n`);
    expect(checkoutConfig()).toEqual({
      serverKey: SERVER,
      clientKey: CLIENT,
      writeSecret: SECRET,
    });
  });

  it("warns once per trimmed setting, naming it but never leaking the value or its length", () => {
    vi.stubEnv("MIDTRANS_SERVER_KEY", `${SERVER}\n`);
    vi.stubEnv("ORDER_WRITE_SECRET", `${SECRET} `);
    checkoutConfig();
    checkoutConfig();
    expect(warn.mock.calls).toEqual([
      ["[checkout] MIDTRANS_SERVER_KEY had surrounding whitespace; trimmed"],
      ["[checkout] ORDER_WRITE_SECRET had surrounding whitespace; trimmed"],
    ]);
    const logged = JSON.stringify(warn.mock.calls);
    for (const leak of [
      SERVER,
      SECRET,
      String(SERVER.length),
      String(SERVER.length + 1),
      String(SECRET.length),
      String(SECRET.length + 1),
    ])
      expect(logged).not.toContain(leak);
  });

  it("treats a whitespace-only setting as missing", () => {
    vi.stubEnv("MIDTRANS_SERVER_KEY", " \n");
    expect(checkoutConfig()).toBeNull();
  });
});

describe("readSetting", () => {
  it("is undefined for an unset setting", () => {
    delete process.env.CONFIG_TEST_UNSET;
    expect(readSetting("CONFIG_TEST_UNSET")).toBeUndefined();
    expect(warn).not.toHaveBeenCalled();
  });
});
