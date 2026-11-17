-- Phase 18a: live chat between a user and the admin, with a rule-based bot.
--
-- One conversation per user. The owner reads their own conversation and its
-- messages; admins read everything. Users and admins write their own messages
-- directly (insert policies, checked again by a trigger that also holds the
-- rate limit). The bot writes through post_bot_reply(), which needs the
-- server's ORDER_WRITE_SECRET (the same secret as the checkout; no new env
-- var), so nobody can fake a bot message.
--
-- Live updates use Supabase Realtime **Broadcast from the database**: a trigger
-- sends every new message to the private topics `chat:<conversation_id>` (the
-- owner and admins may join) and `chat:admin` (admins only). Who may join a
-- topic is decided by select policies on realtime.messages. Clients only
-- listen; there is no insert policy on realtime.messages. If Realtime fails,
-- the message is still saved (the trigger catches the error and logs a
-- warning) and the chat panel's polling picks it up.
--
-- Rerunnable. Run after 20261117000100_orders.sql (it reuses
-- check_order_secret).

-- ---------------------------------------------------------------------------
-- Conversations
-- ---------------------------------------------------------------------------

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null unique references public.profiles (id) on delete cascade,
  status text not null default 'open'
    constraint conversations_status_check check (status in ('open', 'closed')),
  last_message_at timestamptz,
  user_last_read_at timestamptz,
  admin_last_read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists conversations_last_message_idx
  on public.conversations (last_message_at desc nulls last);

alter table public.conversations enable row level security;

-- Reading only. Changes go through the functions below.
revoke all on table public.conversations from public, anon, authenticated;
grant select on table public.conversations to authenticated;

drop policy if exists "conversations: read own" on public.conversations;
create policy "conversations: read own"
  on public.conversations for select to authenticated
  using (owner = (select auth.uid()));

drop policy if exists "conversations: admins read all" on public.conversations;
create policy "conversations: admins read all"
  on public.conversations for select to authenticated
  using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Messages
-- ---------------------------------------------------------------------------

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_role text not null
    constraint chat_messages_sender_role_check check (sender_role in ('user', 'admin', 'bot')),
  -- The user or admin who wrote it; null for the bot. No foreign key: an
  -- admin's replies stay in the thread if that admin's account is deleted.
  sender_id uuid,
  body text not null
    constraint chat_messages_body_check
    check (char_length(regexp_replace(body, '^\s+|\s+$', '', 'g')) between 1 and 1000),
  -- Which bot rule answered (lib/chat/bot.ts); only on bot messages.
  bot_rule text
    constraint chat_messages_bot_rule_check check (bot_rule ~ '^[a-z_]{1,40}$'),
  created_at timestamptz not null default now(),
  constraint chat_messages_sender_check check (
    (sender_role = 'bot' and sender_id is null and bot_rule is not null)
    or (sender_role <> 'bot' and sender_id is not null and bot_rule is null)
  )
);

create index if not exists chat_messages_conversation_created_idx
  on public.chat_messages (conversation_id, created_at);

alter table public.chat_messages enable row level security;

revoke all on table public.chat_messages from public, anon, authenticated;
grant select, insert on table public.chat_messages to authenticated;

drop policy if exists "chat_messages: read own" on public.chat_messages;
create policy "chat_messages: read own"
  on public.chat_messages for select to authenticated
  using (exists (
    select 1 from public.conversations c
    where c.id = conversation_id and c.owner = (select auth.uid())
  ));

drop policy if exists "chat_messages: admins read all" on public.chat_messages;
create policy "chat_messages: admins read all"
  on public.chat_messages for select to authenticated
  using ((select public.is_admin()));

drop policy if exists "chat_messages: users post in own conversation" on public.chat_messages;
create policy "chat_messages: users post in own conversation"
  on public.chat_messages for insert to authenticated
  with check (
    sender_role = 'user'
    and sender_id = (select auth.uid())
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.owner = (select auth.uid())
    )
  );

drop policy if exists "chat_messages: admins post anywhere" on public.chat_messages;
create policy "chat_messages: admins post anywhere"
  on public.chat_messages for insert to authenticated
  with check (
    sender_role = 'admin'
    and sender_id = (select auth.uid())
    and (select public.is_admin())
  );

-- ---------------------------------------------------------------------------
-- Before insert: the server's clock, trimmed text, the sender checked again,
-- and the rate limit. security definer, so the counts see all of the sender's
-- messages whatever RLS would show them.
-- ---------------------------------------------------------------------------

create or replace function public.chat_messages_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  conv public.conversations;
  uid uuid := (select auth.uid());
begin
  new.id := gen_random_uuid();
  -- The wall clock, not the transaction's start: messages keep their order
  -- even when several are written in one transaction.
  new.created_at := clock_timestamp();
  -- Spaces, tabs and line breaks at either end.
  new.body := regexp_replace(new.body, '^\s+|\s+$', '', 'g');

  -- Serialises messages per conversation, so two fast inserts can't both slip
  -- under the rate limit.
  select * into conv from public.conversations
  where id = new.conversation_id for update;
  if not found then
    raise exception 'No such conversation' using errcode = '23503';
  end if;

  if new.sender_role = 'user' then
    if uid is null or new.sender_id is distinct from uid or conv.owner <> uid then
      raise exception 'Not allowed' using errcode = '42501';
    end if;
    if (
      select count(*) from public.chat_messages
      where sender_id = uid and sender_role = 'user'
        and created_at > clock_timestamp() - interval '30 seconds'
    ) >= 5 then
      raise exception 'You''re sending messages too fast. Wait a few seconds and try again.'
        using errcode = 'P0001', hint = 'chat_rate_limit';
    end if;
    if (
      select count(*) from public.chat_messages
      where sender_id = uid and sender_role = 'user'
        and created_at > clock_timestamp() - interval '1 day'
    ) >= 60 then
      raise exception 'You''ve sent 60 messages today, the daily limit. The admin can still read them all.'
        using errcode = 'P0001', hint = 'chat_rate_limit';
    end if;
  elsif new.sender_role = 'admin' then
    if uid is null or new.sender_id is distinct from uid
       or not exists (select 1 from public.profiles where id = uid and role = 'admin') then
      raise exception 'Not allowed' using errcode = '42501';
    end if;
  end if;
  -- 'bot': only post_bot_reply() writes these (it checks the secret and runs
  -- as the table's owner). No insert policy allows sender_role = 'bot', so a
  -- user's or admin's own insert never gets this far.

  return new;
end;
$$;

revoke all on function public.chat_messages_before_insert() from public, anon, authenticated;

drop trigger if exists chat_messages_before_insert on public.chat_messages;
create trigger chat_messages_before_insert
  before insert on public.chat_messages
  for each row execute function public.chat_messages_before_insert();

-- ---------------------------------------------------------------------------
-- After insert: bump the conversation and broadcast the message.
-- A Realtime failure never stops the message from being saved.
-- ---------------------------------------------------------------------------

create or replace function public.chat_messages_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  payload jsonb := to_jsonb(new);
begin
  update public.conversations
  set last_message_at = new.created_at
  where id = new.conversation_id;

  begin
    perform realtime.send(payload, 'message', 'chat:' || new.conversation_id::text, true);
    perform realtime.send(payload, 'message', 'chat:admin', true);
  exception when others then
    raise warning 'chat: realtime.send failed for message % (%); clients will poll',
      new.id, sqlerrm;
  end;

  return null;
end;
$$;

revoke all on function public.chat_messages_after_insert() from public, anon, authenticated;

drop trigger if exists chat_messages_after_insert on public.chat_messages;
create trigger chat_messages_after_insert
  after insert on public.chat_messages
  for each row execute function public.chat_messages_after_insert();

-- ---------------------------------------------------------------------------
-- Functions
-- ---------------------------------------------------------------------------

-- The caller's conversation, created on first use. Re-opens a closed one.
create or replace function public.get_or_create_conversation()
returns public.conversations
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  result public.conversations;
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;

  insert into public.conversations (owner) values (uid)
  on conflict (owner) do update
    set status = 'open'
    where public.conversations.status = 'closed'
  returning * into result;

  if result.id is null then
    select * into result from public.conversations where owner = uid;
  end if;
  return result;
end;
$$;

revoke all on function public.get_or_create_conversation() from public, anon, authenticated;
grant execute on function public.get_or_create_conversation() to authenticated;

-- Sets the caller's read time: the owner's, or the admins' when an admin reads
-- someone else's conversation.
create or replace function public.mark_chat_read(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  conv public.conversations;
begin
  select * into conv from public.conversations where id = p_conversation_id;
  if uid is null or not found then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if conv.owner = uid then
    update public.conversations set user_last_read_at = now() where id = conv.id;
  elsif (select public.is_admin()) then
    update public.conversations set admin_last_read_at = now() where id = conv.id;
  else
    raise exception 'Not allowed' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.mark_chat_read(uuid) from public, anon, authenticated;
grant execute on function public.mark_chat_read(uuid) to authenticated;

-- Close or reopen a conversation. Admins only.
create or replace function public.set_conversation_status(p_conversation_id uuid, p_status text)
returns public.conversations
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.conversations;
begin
  if not (select public.is_admin()) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if p_status is null or p_status not in ('open', 'closed') then
    raise exception 'Unknown status %', p_status using errcode = '22023';
  end if;
  update public.conversations set status = p_status
  where id = p_conversation_id
  returning * into result;
  return result;
end;
$$;

revoke all on function public.set_conversation_status(uuid, text) from public, anon, authenticated;
grant execute on function public.set_conversation_status(uuid, text) to authenticated;

-- The bot's reply (lib/chat/bot.ts decides what to say). Needs the server's
-- secret, and only answers a user: the conversation's latest message must be
-- from the user, so there is at most one bot reply per user message.
create or replace function public.post_bot_reply(
  p_secret text,
  p_conversation_id uuid,
  p_body text,
  p_bot_rule text
)
returns public.chat_messages
language plpgsql
security definer
set search_path = ''
as $$
declare
  latest text;
  result public.chat_messages;
begin
  perform public.check_order_secret(p_secret);

  perform 1 from public.conversations where id = p_conversation_id for update;
  if not found then
    raise exception 'No such conversation' using errcode = '23503';
  end if;

  select sender_role into latest from public.chat_messages
  where conversation_id = p_conversation_id
  order by created_at desc, id desc
  limit 1;
  if latest is distinct from 'user' then
    raise exception 'The bot only answers a user''s message'
      using errcode = 'P0001', hint = 'bot_not_after_user';
  end if;

  insert into public.chat_messages (conversation_id, sender_role, sender_id, body, bot_rule)
  values (p_conversation_id, 'bot', null, p_body, p_bot_rule)
  returning * into result;
  return result;
end;
$$;

revoke all on function public.post_bot_reply(text, uuid, text, text) from public, anon, authenticated;
grant execute on function public.post_bot_reply(text, uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime: who may join which topic (select policies on realtime.messages).
-- ---------------------------------------------------------------------------

-- True when the caller may listen to the topic: `chat:<id>` for that
-- conversation's owner or an admin, `chat:admin` for admins only. Runs as the
-- caller (security invoker), so it sees only what their RLS lets them see.
create or replace function public.can_join_chat_topic(p_topic text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select case
    when p_topic = 'chat:admin' then (select public.is_admin())
    when p_topic like 'chat:%' then
      (select auth.uid()) is not null and exists (
        select 1 from public.conversations c
        where c.id::text = substr(p_topic, 6)
          and (c.owner = (select auth.uid()) or (select public.is_admin()))
      )
    else false
  end;
$$;

revoke all on function public.can_join_chat_topic(text) from public, anon, authenticated;
grant execute on function public.can_join_chat_topic(text) to authenticated;

drop policy if exists "chat: join own or admin topics" on realtime.messages;
create policy "chat: join own or admin topics"
  on realtime.messages for select to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and (select public.can_join_chat_topic((select realtime.topic())))
  );
