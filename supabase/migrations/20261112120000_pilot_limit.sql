-- The pilot limit (owner, Nov 12, 2026: "150 tokens MAX per teacher while testing and I approve new teacher sign ins").
-- Run once in the Supabase SQL editor after 20261109120000_security.sql. Never edit this file after it has been run; add
-- a new migration instead. It changes no data.
--
-- A teacher can send orders only after the owner approves her (a row in pilot_teachers), and then only up to her token
-- allowance (150 to start) across every order she has sent, cancelled ones too: an order can be cancelled after the
-- agents have worked on it, so leaving those out would let send-and-cancel run up the bill. The owner (a row in
-- public.admins) is not limited, and the owner's scripts use the service key, which skips the check.
--
-- Approve a teacher: My orders (signed in as the owner) → "Teachers waiting for approval" → Approve. Or in the
-- dashboard: Table Editor → pilot_teachers → Insert row (her id from the teachers table; tokens 150).
-- Give someone more: change her row's tokens. Take approval back: delete her row.
-- The token total a teacher's page sends is checked again by the onboarding agent's recount: scripts/run-order.mjs
-- hands an order to the owner, before any build, when the recount is higher than what was sent.

-- ---------- 1. who may order, and how many tokens: only the owner can read or change it ----------
create table if not exists public.pilot_teachers (
  teacher uuid primary key references auth.users (id) on delete cascade,
  tokens integer not null default 150 check (tokens between 0 and 5000),
  note text check (note is null or length(note) <= 200),
  approved_at timestamptz not null default now()
);
alter table public.pilot_teachers enable row level security;
revoke all on public.pilot_teachers from public, anon, authenticated;

-- ---------- 2. tokens left (null: not approved) ----------
create or replace function public.pilot_tokens_left_for(p_teacher uuid) returns integer
  language sql stable security definer set search_path = public as $$
  select pt.tokens - coalesce((select sum(o.token_total)::integer from public.orders o where o.teacher = p_teacher), 0)
  from public.pilot_teachers pt where pt.teacher = p_teacher;
$$;
revoke all on function public.pilot_tokens_left_for(uuid) from public, anon, authenticated;

-- what the order page shows her: waiting for approval, or how many tokens she has left (null for the owner)
create or replace function public.my_pilot() returns jsonb
  language sql stable security definer set search_path = public as $$
  select case when auth.uid() is null or public.is_admin() then null
    else jsonb_build_object('approved', exists (select 1 from public.pilot_teachers where teacher = auth.uid()),
                            'tokensLeft', greatest(0, coalesce(public.pilot_tokens_left_for(auth.uid()), 0))) end;
$$;
revoke all on function public.my_pilot() from public, anon;
grant execute on function public.my_pilot() to authenticated;

-- ---------- 3. the owner's list and button (My orders) ----------
create or replace function public.pending_teachers()
  returns table (id uuid, email text, name text, created_at timestamptz)
  language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'only the owner can see this' using errcode = '42501'; end if;
  return query select t.id, t.email, t.name, t.created_at from public.teachers t
    where not exists (select 1 from public.pilot_teachers p where p.teacher = t.id)
      and not exists (select 1 from public.admins a where a.id = t.id)
    order by t.created_at desc limit 200;
end $$;
revoke all on function public.pending_teachers() from public, anon;
grant execute on function public.pending_teachers() to authenticated;

create or replace function public.approve_teacher(p_teacher uuid, p_tokens integer default 150) returns void
  language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'only the owner can approve teachers' using errcode = '42501'; end if;
  insert into public.pilot_teachers (teacher, tokens) values (p_teacher, p_tokens)
    on conflict (teacher) do update set tokens = excluded.tokens;
end $$;
revoke all on function public.approve_teacher(uuid, integer) from public, anon;
grant execute on function public.approve_teacher(uuid, integer) to authenticated;

-- ---------- 4. the insert check from 20261109120000_security.sql, with the pilot rules first ----------
create or replace function public.orders_check_new() returns trigger
  language plpgsql security definer set search_path = public as $$
declare per_day int; open_now int; p text; tokens_left int;
begin
  if auth.uid() is null or public.is_admin() then return new; end if;   -- the service key, or the owner
  for p in select jsonb_array_elements_text(new.upload_files) loop
    if p !~ ('^' || auth.uid()::text || '/' || new.id || '/(sources|training)/[^/]+$') or p ~ '(^|/)\.\.?(/|$)' then
      raise exception 'an upload path is outside this order''s folder' using errcode = '42501';
    end if;
  end loop;
  tokens_left := public.pilot_tokens_left_for(auth.uid());
  if tokens_left is null then
    raise exception 'Your account is waiting for approval: we''re letting teachers in a few at a time while we test.' using errcode = 'P0001';
  end if;
  if new.token_total < 1 then
    raise exception 'An order needs at least one item.' using errcode = 'P0001';
  end if;
  if new.token_total > tokens_left then
    raise exception 'This order is % tokens, and you have % left in the pilot. Make it smaller, or email us for more.',
      new.token_total, greatest(tokens_left, 0) using errcode = 'P0001';
  end if;
  select count(*) into per_day from public.orders where teacher = auth.uid() and created_at > now() - interval '24 hours';
  if per_day >= 10 then
    raise exception 'That''s a lot of orders in one day. Please wait a bit, or email us.' using errcode = 'P0001';
  end if;
  select count(*) into open_now from public.orders where teacher = auth.uid()
    and status not in ('final_ready', 'cancelled', 'failed');
  if open_now >= 5 then
    raise exception 'You have 5 orders in progress. Please wait for one to finish (or cancel one) before sending another.' using errcode = 'P0001';
  end if;
  new.created_at := now(); new.updated_at := now();
  return new;
end $$;
revoke all on function public.orders_check_new() from public, anon, authenticated;
