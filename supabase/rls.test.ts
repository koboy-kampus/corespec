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

  it("pass on a project in use (an admin, a user with builds, the seeded catalogue) and leave it as it was", async () => {
    const db = await freshDb();
    await db.exec(read("seed.sql"));
    // Like the real project: its own admin, and a user with builds (one deleted).
    await db.exec(`
      insert into auth.users (id, email, raw_user_meta_data) values
        ('11111111-1111-4111-8111-111111111111', 'owner@example.com', '{"display_name": "Owner"}'),
        ('22222222-2222-4222-8222-222222222222', 'someone@example.com', '{}');
      update public.profiles set role = 'admin'
      where id = '11111111-1111-4111-8111-111111111111';
      insert into public.builds (owner, id, name, parts) values
        ('11111111-1111-4111-8111-111111111111', 'o-1', 'Owner build', '{}'),
        ('22222222-2222-4222-8222-222222222222', 's-1', 'One', '{}'),
        ('22222222-2222-4222-8222-222222222222', 's-2', 'Two', '{}'),
        ('22222222-2222-4222-8222-222222222222', 's-3', 'Three', '{}');
      update public.builds set deleted_at = now() where id = 's-3';
    `);
    const snapshot = async () =>
      (
        await db.query(`
          select
            (select json_agg(p order by id) from (select id, display_name, role from public.profiles) p) as profiles,
            (select json_agg(b order by owner, id) from (select owner, id, name, deleted_at is not null as gone from public.builds) b) as builds,
            (select count(*)::int from public.items) as items,
            (select count(*)::int from public.listings) as listings,
            (select count(*)::int from public.audit_log) as audit
        `)
      ).rows[0];
    const before = await snapshot();

    const results = await db.exec(read("tests/rls.sql"));
    expect(results.findLast((r) => r.fields.length > 0)?.rows).toEqual([
      { result: "All RLS tests passed" },
    ]);
    expect(await snapshot()).toEqual(before);
    await db.close();
  });

  it("catch the last admin being able to delete their account", async () => {
    const db = await freshDb();
    // delete_my_account() without its "last admin" check.
    await db.exec(`
      create or replace function public.delete_my_account()
      returns void language plpgsql security definer set search_path = '' as $$
      begin
        if (select auth.uid()) is null then
          raise exception 'Not signed in' using errcode = '42501';
        end if;
        delete from auth.users where id = (select auth.uid());
      end;
      $$;
    `);
    await expect(db.exec(read("tests/rls.sql"))).rejects.toThrow(
      /the last admin deletes their account/,
    );
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

  // Phase 16b: each of these loosens one rule and rls.sql must notice.
  it("catch a policy that lets a user write items", async () => {
    const db = await freshDb();
    await db.exec(`
      drop policy "items: admins update" on public.items;
      create policy "items: anyone updates" on public.items for update to authenticated using (true);
    `);
    await expect(db.exec(read("tests/rls.sql"))).rejects.toThrow(
      /non-admin writes an item or listing \(user updates an item\)/,
    );
    await db.close();
  });

  it("catch listings being writable by anon", async () => {
    const db = await freshDb();
    await db.exec(`
      grant insert on public.listings to anon;
      create policy "listings: anon inserts" on public.listings for insert to anon with check (true);
    `);
    await expect(db.exec(read("tests/rls.sql"))).rejects.toThrow(
      /non-admin writes an item or listing \(anon inserts a listing/,
    );
    await db.close();
  });

  it("catch a policy that hides inactive items", async () => {
    const db = await freshDb();
    await db.exec(`
      drop policy "items: everyone reads all" on public.items;
      create policy "items: active only" on public.items for select to anon, authenticated using (active);
    `);
    await expect(db.exec(read("tests/rls.sql"))).rejects.toThrow(
      /anon reads all items, active and inactive/,
    );
    await db.close();
  });

  it("catch the audit log being readable by users", async () => {
    const db = await freshDb();
    await db.exec(`
      drop policy "audit_log: admins read" on public.audit_log;
      create policy "audit_log: all read" on public.audit_log for select to authenticated using (true);
    `);
    await expect(db.exec(read("tests/rls.sql"))).rejects.toThrow(
      /only admins read the audit log/,
    );
    await db.close();
  });

  it("catch a listing rule being dropped", async () => {
    const db = await freshDb();
    await db.exec(
      "alter table public.listings drop constraint listings_checked_at_check;",
    );
    await expect(db.exec(read("tests/rls.sql"))).rejects.toThrow(
      /can't be checked in the future/,
    );
    await db.close();
  });

  // Item delete: each of these loosens one rule and rls.sql must notice.
  it("catch item_usage_count answering a non-admin", async () => {
    const db = await freshDb();
    await db.exec(`
      create or replace function public.item_usage_count(p_item_id text)
      returns integer language sql stable security definer set search_path = '' as $$
        select count(*)::integer from public.builds b
        where b.deleted_at is null and b.parts ->> 'cpu' = p_item_id;
      $$;
    `);
    await expect(db.exec(read("tests/rls.sql"))).rejects.toThrow(
      /a user calls item_usage_count/,
    );
    await db.close();
  });

  it("catch an item in use being deletable", async () => {
    const db = await freshDb();
    await db.exec("drop trigger items_refuse_delete_in_use on public.items;");
    await expect(db.exec(read("tests/rls.sql"))).rejects.toThrow(
      /an item a saved build uses can't be deleted/,
    );
    await db.close();
  });

  it("catch a user being able to delete items", async () => {
    const db = await freshDb();
    await db.exec(`
      drop policy "items: admins delete" on public.items;
      create policy "items: anyone deletes" on public.items for delete to authenticated using (true);
    `);
    await expect(db.exec(read("tests/rls.sql"))).rejects.toThrow(
      /non-admin writes an item or listing \(user deletes an item\)|a user deletes an item/,
    );
    await db.close();
  });

  // Orders (Phase 17a): the two rules that matter most.
  it("catch a policy that shows other people's orders", async () => {
    const db = await freshDb();
    await db.exec(`
      drop policy "orders: read own" on public.orders;
      create policy "orders: read all" on public.orders for select to authenticated using (true);
    `);
    await expect(db.exec(read("tests/rls.sql"))).rejects.toThrow(
      /user reads another user's order/,
    );
    await db.close();
  });

  it("catch the order functions accepting a wrong secret", async () => {
    const db = await freshDb();
    // The check without the comparison: any secret passes once a hash is set.
    await db.exec(`
      create or replace function public.check_order_secret(p_secret text)
      returns void language plpgsql stable security definer set search_path = '' as $$
      begin
        if (select secret_hash from public.payment_config where id) is null then
          raise exception 'Not allowed' using errcode = '42501';
        end if;
      end;
      $$;
    `);
    await expect(db.exec(read("tests/rls.sql"))).rejects.toThrow(
      /create_order accepts a wrong secret/,
    );
    await db.close();
  });

  // Chat (Phase 18a).
  it("catch a policy that shows other people's chat messages", async () => {
    const db = await freshDb();
    await db.exec(`
      drop policy "chat_messages: read own" on public.chat_messages;
      create policy "chat_messages: read all" on public.chat_messages for select to authenticated using (true);
    `);
    await expect(db.exec(read("tests/rls.sql"))).rejects.toThrow(
      /user reads another user's chat messages/,
    );
    await db.close();
  });

  it("catch a bot reply being accepted without the secret", async () => {
    const db = await freshDb();
    // post_bot_reply without its secret check.
    await db.exec(`
      create or replace function public.post_bot_reply(
        p_secret text, p_conversation_id uuid, p_body text, p_bot_rule text)
      returns public.chat_messages language plpgsql security definer set search_path = '' as $$
      declare result public.chat_messages;
      begin
        insert into public.chat_messages (conversation_id, sender_role, sender_id, body, bot_rule)
        values (p_conversation_id, 'bot', null, p_body, p_bot_rule)
        returning * into result;
        return result;
      end;
      $$;
    `);
    await expect(db.exec(read("tests/rls.sql"))).rejects.toThrow(
      /post_bot_reply accepts a wrong secret/,
    );
    await db.close();
  });

  /** alice (a user) with her conversation, acting as herself. */
  async function chatFixture() {
    const db = await freshDb();
    await db.exec(`
      insert into auth.users (id, email) values
        ('00000000-0000-4000-8000-0000000000a1', 'a@example.test'),
        ('00000000-0000-4000-8000-0000000000b1', 'b@example.test'),
        ('00000000-0000-4000-8000-0000000000c1', 'c@example.test');
      update public.profiles set role = 'admin' where id = '00000000-0000-4000-8000-0000000000c1';
    `);
    const as = (sub: string) => `
      set role authenticated;
      select set_config('request.jwt.claims', '{"sub": "${sub}", "role": "authenticated"}', false);
    `;
    const conv = async (sub: string) => {
      await db.exec(as(sub));
      const { rows } = await db.query<{ id: string }>(
        "select (public.get_or_create_conversation()).id as id",
      );
      await db.exec("reset role;");
      return rows[0].id;
    };
    return { db, as, conv };
  }

  it("save the message even when realtime.send fails (the panel polls)", async () => {
    const { db, as, conv } = await chatFixture();
    const id = await conv("00000000-0000-4000-8000-0000000000a1");
    await db.exec(`
      create or replace function realtime.send(payload jsonb, event text, topic text, private boolean default true)
      returns void language plpgsql as $$
      begin
        raise exception 'Realtime is down';
      end;
      $$;
    `);
    await db.exec(as("00000000-0000-4000-8000-0000000000a1"));
    await db.exec(`
      insert into public.chat_messages (conversation_id, sender_role, sender_id, body)
      values ('${id}', 'user', '00000000-0000-4000-8000-0000000000a1', 'Still saved?');
    `);
    await db.exec("reset role;");
    const { rows } = await db.query<{ n: number; last: string | null }>(`
      select (select count(*)::int from public.chat_messages where conversation_id = '${id}') as n,
             (select last_message_at from public.conversations where id = '${id}') as last
    `);
    expect(rows[0].n).toBe(1);
    expect(rows[0].last).not.toBeNull();
    const { rows: sent } = await db.query<{ n: number }>(
      "select count(*)::int as n from realtime.messages",
    );
    expect(sent[0].n).toBe(0);
    await db.close();
  });

  it("broadcast each message to its conversation's topic and chat:admin, privately", async () => {
    const { db, as, conv } = await chatFixture();
    const id = await conv("00000000-0000-4000-8000-0000000000a1");
    await db.exec(as("00000000-0000-4000-8000-0000000000a1"));
    await db.exec(`
      insert into public.chat_messages (conversation_id, sender_role, sender_id, body)
      values ('${id}', 'user', '00000000-0000-4000-8000-0000000000a1', 'Hello');
      reset role;
    `);
    const { rows } = await db.query<{
      topic: string;
      event: string;
      private: boolean;
      body: string;
    }>(
      "select topic, event, private, payload->>'body' as body from realtime.messages order by topic",
    );
    // Two sends, in any order (the topic names sort by the random id).
    expect(rows).toHaveLength(2);
    expect(rows).toEqual(
      expect.arrayContaining([
        { topic: `chat:${id}`, event: "message", private: true, body: "Hello" },
        { topic: "chat:admin", event: "message", private: true, body: "Hello" },
      ]),
    );
    await db.close();
  });

  it("let only the owner and admins join a conversation's topic, and only admins chat:admin (realtime.messages policies)", async () => {
    const { db, as, conv } = await chatFixture();
    const a = await conv("00000000-0000-4000-8000-0000000000a1");
    await conv("00000000-0000-4000-8000-0000000000b1");
    await db.exec(as("00000000-0000-4000-8000-0000000000a1"));
    await db.exec(`
      insert into public.chat_messages (conversation_id, sender_role, sender_id, body)
      values ('${a}', 'user', '00000000-0000-4000-8000-0000000000a1', 'Hello');
      reset role;
    `);
    // What a client joining `topic` would be allowed to receive: Realtime sets
    // realtime.topic and reads realtime.messages under the policies.
    const sees = async (who: string | null, topic: string) => {
      await db.exec(
        who
          ? as(who)
          : `set role anon; select set_config('request.jwt.claims', '{"role": "anon"}', false);`,
      );
      await db.exec(`select set_config('realtime.topic', '${topic}', false);`);
      const { rows } = await db.query<{ n: number }>(
        "select count(*)::int as n from realtime.messages where topic = realtime.topic()",
      );
      await db.exec("reset role;");
      return rows[0].n > 0;
    };
    const alice = "00000000-0000-4000-8000-0000000000a1";
    const bob = "00000000-0000-4000-8000-0000000000b1";
    const carol = "00000000-0000-4000-8000-0000000000c1";
    expect(await sees(alice, `chat:${a}`)).toBe(true);
    expect(await sees(bob, `chat:${a}`)).toBe(false);
    expect(await sees(carol, `chat:${a}`)).toBe(true);
    expect(await sees(null, `chat:${a}`)).toBe(false);
    expect(await sees(alice, "chat:admin")).toBe(false);
    expect(await sees(bob, "chat:admin")).toBe(false);
    expect(await sees(carol, "chat:admin")).toBe(true);
    expect(await sees(null, "chat:admin")).toBe(false);
    // Only select policies on realtime.messages: clients can't send.
    const { rows: policies } = await db.query<{ cmd: string }>(
      "select cmd from pg_policies where schemaname = 'realtime' and tablename = 'messages'",
    );
    expect(policies.map((p) => p.cmd)).toEqual(["SELECT"]);
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
      "audit_row",
      "chat_messages_after_insert",
      "chat_messages_before_insert",
      "check_order_secret",
      "create_order",
      "delete_my_account",
      "get_or_create_conversation",
      "handle_new_user",
      "is_admin",
      "item_usage_count",
      "items_refuse_delete_in_use",
      "mark_chat_read",
      "post_bot_reply",
      "set_conversation_status",
      "set_order_payment",
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
    // …except the two order functions: Midtrans's notification has no session,
    // so they're open to anon and refuse everything without ORDER_WRITE_SECRET
    // (rls.sql checks that).
    expect(
      grants
        .filter((g) => g.who === "anon")
        .map((g) => g.name)
        .sort(),
    ).toEqual(["create_order", "set_order_payment"]);
    // The trigger functions can't be called by anyone.
    for (const name of [
      "check_order_secret",
      "handle_new_user",
      "audit_row",
      "items_refuse_delete_in_use",
      "chat_messages_before_insert",
      "chat_messages_after_insert",
    ])
      expect(
        grants.find((g) => g.name === name),
        name,
      ).toBeUndefined();
    await db.close();
  });
});
