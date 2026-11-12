import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";

/**
 * Runs the real migrations and supabase/tests/rls.sql (the file Rei runs in the
 * Supabase SQL editor) against a local Postgres (PGlite, Postgres compiled to
 * WebAssembly), with a small stand-in for Supabase's auth schema
 * (supabase/tests/supabase-shim.sql). It can't prove everything about a real
 * Supabase project, but it does prove the SQL runs, reruns, and that every
 * policy check in rls.sql passes, and fails when a policy is loosened.
 */

const dir = join(__dirname);
const read = (p: string) => readFileSync(join(dir, p), "utf8");
const migrations = readdirSync(join(dir, "migrations"))
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => read(join("migrations", f)));

async function freshDb() {
  const db = new PGlite();
  await db.exec(read("tests/supabase-shim.sql"));
  for (const sql of migrations) await db.exec(sql);
  return db;
}

describe("supabase migrations and RLS", { timeout: 60_000 }, () => {
  it("rerun cleanly (every migration twice)", async () => {
    const db = await freshDb();
    for (const sql of migrations) await db.exec(sql);
    await db.close();
  });

  it("pass every check in supabase/tests/rls.sql", async () => {
    const db = await freshDb();
    const results = await db.exec(read("tests/rls.sql"));
    const last = results.findLast((r) => r.fields.length > 0);
    expect(last?.rows).toEqual([{ result: "All RLS tests passed" }]);
    // Rolled back: nothing left behind.
    const { rows } = await db.query(
      "select count(*)::int as n from auth.users",
    );
    expect(rows).toEqual([{ n: 0 }]);
    await db.close();
  });

  it("catch a user being allowed to change their own role", async () => {
    const db = await freshDb();
    await db.exec("grant update (role) on public.profiles to authenticated;");
    await expect(db.exec(read("tests/rls.sql"))).rejects.toThrow(
      /user tries to set own role to admin/,
    );
    await db.close();
  });

  it("catch a policy that shows other people's builds", async () => {
    const db = await freshDb();
    await db.exec(`
      drop policy "builds: read own" on public.builds;
      create policy "builds: read all" on public.builds for select to authenticated using (true);
    `);
    await expect(db.exec(read("tests/rls.sql"))).rejects.toThrow(
      /user reads another user's build/,
    );
    await db.close();
  });

  it("catch anon being able to call a security definer function", async () => {
    const db = await freshDb();
    await db.exec(
      "grant execute on function public.delete_my_account() to anon;",
    );
    await expect(db.exec(read("tests/rls.sql"))).rejects.toThrow(
      /anon calls delete_my_account/,
    );
    await db.close();
  });

  it("set search_path on every security definer function", async () => {
    const db = await freshDb();
    const { rows } = await db.query<{ name: string; config: string[] | null }>(`
      select p.proname as name, p.proconfig as config
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.prosecdef
    `);
    expect(rows.map((r) => r.name).sort()).toEqual([
      "admin_list_users",
      "admin_stats",
      "delete_my_account",
      "handle_new_user",
      "is_admin",
      "set_role",
    ]);
    for (const r of rows) expect(r.config, r.name).toContain('search_path=""');
    // …and none of them can be run by anon (nor the sign-up trigger by anyone).
    const { rows: grants } = await db.query<{ name: string; who: string }>(`
      select p.proname as name, r.rolname as who
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      cross join pg_roles r
      where n.nspname = 'public' and p.prosecdef
        and r.rolname in ('anon', 'authenticated')
        and has_function_privilege(r.oid, p.oid, 'execute')
    `);
    expect(grants.filter((g) => g.who === "anon")).toEqual([]);
    expect(grants.find((g) => g.name === "handle_new_user")).toBeUndefined();
    await db.close();
  });
});
