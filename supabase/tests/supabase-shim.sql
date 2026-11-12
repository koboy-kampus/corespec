-- A small stand-in for what a Supabase project already has, so the migrations and
-- supabase/tests/rls.sql can run against a plain local Postgres in the unit tests
-- (supabase/rls.test.ts). Never run this on a real Supabase project: it already
-- has all of this, and much more.

create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;

create schema auth;

create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email varchar(255),
  raw_user_meta_data jsonb,
  created_at timestamptz default now()
);

-- Supabase's auth.uid(): the `sub` of the request's JWT claims.
create function auth.uid() returns uuid
language sql stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;

grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;

-- Supabase grants everything in public to these roles by default, which is why
-- every migration revokes what it doesn't want before granting what it does.
alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
