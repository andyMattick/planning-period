-- Orders backend: sign-in, direct upload, the orders dashboard and online review (docs/BACKEND.md).
-- For a NEW Supabase project of its own, never Pet World's. Run once in the Supabase SQL editor (or `supabase db push`).
-- Never edit this file after it has been run; add a new migration instead.
--
-- Who can do what:
--   a teacher (signed in by email link)  sees and adds only her own rows and files; changes an order only through the
--                                        functions below (answer the follow-up, request changes, approve, cancel)
--   the owner (a row in public.admins)   can read every order, event and file in the dashboard
--   the owner's script (service key)     scripts/orders.mjs: bypasses RLS to move orders along and upload deliverables

-- ---------- tables ----------
create table if not exists public.teachers (
  id         uuid primary key references auth.users (id) on delete cascade,
  name       text not null default '',
  email      text not null default '',
  created_at timestamptz not null default now()
);

-- The owner role: put the owner's auth user id here (docs/BACKEND.md, step 6). Nobody can add a row from the site.
create table if not exists public.admins (
  id         uuid primary key references auth.users (id) on delete cascade,
  note       text,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id                text primary key check (id ~ '^pp-[0-9]{4}-[0-9]{2}-[0-9]{2}-[a-z0-9]{6}$'),
  teacher           uuid not null references public.teachers (id) on delete cascade,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  status            text not null default 'sent' check (status in (
                      'draft', 'sent', 'onboarding', 'needs_answer', 'building', 'preview_ready',
                      'changes_requested', 'approved', 'final_ready', 'cancelled', 'failed')),
  order_json        jsonb not null,                    -- the same order.json the zip carries (site/order.js)
  token_total       integer not null default 0 check (token_total >= 0),
  upload_files      jsonb not null default '[]',       -- ["<teacher>/<order>/sources/notes.pdf", …] in the uploads bucket
  follow_up         jsonb,                             -- {message, questions:[{id, ask, options, recommended, why}], at}
  answer            text,                              -- her reply in one line ("go", "1 B, 2 yes")
  answers           jsonb,                             -- {"q1": "B", …} from the one-tap options
  answered_at       timestamptz,
  review            jsonb,                             -- from the preview's REVIEW.html: {packHash, statement, documents:[{file, title, sha256}], docTitles}
  preview_files     jsonb not null default '[]',       -- ["preview/quiz-student-A.pdf", …] under deliverables/<teacher>/<order>/
  comments          jsonb,                             -- the comments-<id>.json shape (Request changes)
  approval          jsonb,                             -- the approval-<id>.json shape render-pack.mjs --final checks
  final_files       jsonb not null default '[]',       -- ["final/out.zip", "final/quiz-student-A.pdf", …]
  note              text,                              -- a short line from the owner the teacher sees (why it failed, a date)
  uploads_purged_at timestamptz                        -- when her uploads were deleted (CLAUDE.md rule 1)
);
create index if not exists orders_teacher_created on public.orders (teacher, created_at desc);
create index if not exists orders_status on public.orders (status);

create table if not exists public.order_events (
  id       bigint generated always as identity primary key,
  order_id text not null references public.orders (id) on delete cascade,
  at       timestamptz not null default now(),
  status   text not null,
  by       uuid,                                       -- the signed-in user, or null for the owner's script
  note     text
);
create index if not exists order_events_order on public.order_events (order_id, at);

-- ---------- helpers and triggers ----------
create or replace function public.is_admin() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where id = auth.uid());
$$;

-- A teacher row for every new sign-in (the email comes from Supabase Auth; she can change her name).
create or replace function public.handle_new_teacher() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  insert into public.teachers (id, email) values (new.id, coalesce(new.email, '')) on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created_teacher on auth.users;
create trigger on_auth_user_created_teacher after insert on auth.users
  for each row execute function public.handle_new_teacher();

-- Every status change lands in order_events, and updated_at moves.
create or replace function public.log_order_status() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.order_events (order_id, status, by) values (new.id, new.status, auth.uid());
  elsif new.status is distinct from old.status then
    new.updated_at := now();
    insert into public.order_events (order_id, status, by, note) values (new.id, new.status, auth.uid(), new.note);
  else
    new.updated_at := now();
  end if;
  return new;
end $$;
drop trigger if exists orders_status_before on public.orders;
create trigger orders_status_before before update on public.orders
  for each row execute function public.log_order_status();
drop trigger if exists orders_status_after_insert on public.orders;
create trigger orders_status_after_insert after insert on public.orders
  for each row execute function public.log_order_status();

-- ---------- row level security ----------
alter table public.teachers enable row level security;
alter table public.admins enable row level security;
alter table public.orders enable row level security;
alter table public.order_events enable row level security;

drop policy if exists "teachers: own row or owner" on public.teachers;
create policy "teachers: own row or owner" on public.teachers for select to authenticated
  using (id = auth.uid() or public.is_admin());
drop policy if exists "teachers: change own name" on public.teachers;
create policy "teachers: change own name" on public.teachers for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "admins: owner reads" on public.admins;
create policy "admins: owner reads" on public.admins for select to authenticated using (id = auth.uid());

drop policy if exists "orders: own or owner" on public.orders;
create policy "orders: own or owner" on public.orders for select to authenticated
  using (teacher = auth.uid() or public.is_admin());
-- A teacher sends a new order: hers, status sent, nothing the team fills in yet.
drop policy if exists "orders: teacher sends" on public.orders;
create policy "orders: teacher sends" on public.orders for insert to authenticated
  with check (teacher = auth.uid() and status = 'sent'
    and follow_up is null and answer is null and answers is null and review is null and comments is null
    and approval is null and note is null and uploads_purged_at is null
    and preview_files = '[]'::jsonb and final_files = '[]'::jsonb);
-- No update or delete policy for teachers: the functions below are the only way she changes an order.

drop policy if exists "order_events: own or owner" on public.order_events;
create policy "order_events: own or owner" on public.order_events for select to authenticated
  using (public.is_admin() or exists (select 1 from public.orders o where o.id = order_id and o.teacher = auth.uid()));

grant select, update (name) on public.teachers to authenticated;
grant select on public.admins to authenticated;
grant select, insert on public.orders to authenticated;
grant select on public.order_events to authenticated;
revoke all on public.teachers, public.admins, public.orders, public.order_events from anon;

-- ---------- what a teacher can do to her order ----------
create or replace function public.answer_follow_up(p_order text, p_answer text, p_answers jsonb default null)
  returns void language plpgsql security definer set search_path = public as $$
declare o public.orders;
begin
  select * into o from public.orders where id = p_order and teacher = auth.uid() for update;
  if not found then raise exception 'order not found'; end if;
  if o.status <> 'needs_answer' then raise exception 'this order is not waiting for an answer (it is %)', o.status; end if;
  if coalesce(trim(p_answer), '') = '' then raise exception 'the answer is empty'; end if;
  update public.orders set answer = left(trim(p_answer), 2000), answers = p_answers, answered_at = now(),
    status = 'building', note = null where id = p_order;
end $$;

create or replace function public.request_changes(p_order text, p_comments jsonb)
  returns void language plpgsql security definer set search_path = public as $$
declare o public.orders;
begin
  select * into o from public.orders where id = p_order and teacher = auth.uid() for update;
  if not found then raise exception 'order not found'; end if;
  if o.status <> 'preview_ready' then raise exception 'there is no preview to review (the order is %)', o.status; end if;
  if p_comments->>'orderId' is distinct from p_order then raise exception 'the comments are for another order'; end if;
  if jsonb_array_length(coalesce(p_comments->'comments', '[]'::jsonb)) = 0 then raise exception 'write at least one comment'; end if;
  update public.orders set comments = p_comments, status = 'changes_requested', note = null where id = p_order;
end $$;

-- The approval must be for this order and this preview: the same pack hash and agreement text the preview's
-- REVIEW.html carries, and every preview PDF with the SHA-256 the browser computed from the bytes she was shown.
-- scripts/render-pack.mjs --final checks it all again before anything final is made.
create or replace function public.approve_order(p_order text, p_approval jsonb)
  returns void language plpgsql security definer set search_path = public as $$
declare o public.orders; missing int;
begin
  select * into o from public.orders where id = p_order and teacher = auth.uid() for update;
  if not found then raise exception 'order not found'; end if;
  if o.status <> 'preview_ready' or o.review is null then raise exception 'there is no preview to approve (the order is %)', o.status; end if;
  if p_approval->>'orderId' is distinct from p_order then raise exception 'the approval is for another order'; end if;
  if coalesce(trim(p_approval->>'name'), '') = '' then raise exception 'the approval needs your name'; end if;
  if p_approval->>'statement' is distinct from o.review->>'statement' then raise exception 'the agreement text is not the preview''s'; end if;
  if p_approval->>'packHash' is distinct from o.review->>'packHash' then raise exception 'the approval is for an older preview'; end if;
  select count(*) into missing from jsonb_array_elements(coalesce(o.review->'documents', '[]'::jsonb)) r
    where not exists (select 1 from jsonb_array_elements(coalesce(p_approval->'documents', '[]'::jsonb)) a
                      where a->>'file' = r->>'file' and a->>'sha256' = r->>'sha256');
  if missing > 0 then raise exception '% preview file(s) were not approved or changed since the preview was made', missing; end if;
  update public.orders set approval = p_approval, status = 'approved', note = null where id = p_order;
end $$;

create or replace function public.cancel_order(p_order text)
  returns void language plpgsql security definer set search_path = public as $$
declare o public.orders;
begin
  select * into o from public.orders where id = p_order and teacher = auth.uid() for update;
  if not found then raise exception 'order not found'; end if;
  if o.status in ('approved', 'final_ready', 'cancelled') then raise exception 'this order can''t be cancelled now (it is %)', o.status; end if;
  update public.orders set status = 'cancelled' where id = p_order;
end $$;

-- Retention (CLAUDE.md rule 1): the orders whose uploads are due for deletion. Storage files can only be deleted
-- through the Storage API, so `node scripts/orders.mjs purge --due` reads this list, deletes the files and sets
-- uploads_purged_at. Run it daily (docs/BACKEND.md, "Deleting uploads").
create or replace function public.orders_due_for_purge(p_days integer default 7)
  returns table (id text, teacher uuid, status text, updated_at timestamptz)
  language sql stable security definer set search_path = public as $$
  select o.id, o.teacher, o.status, o.updated_at from public.orders o
   where o.uploads_purged_at is null and o.upload_files <> '[]'::jsonb
     and o.status in ('final_ready', 'cancelled', 'failed')
     and o.updated_at < now() - make_interval(days => p_days)
   order by o.updated_at;
$$;

revoke all on function public.answer_follow_up(text, text, jsonb), public.request_changes(text, jsonb),
  public.approve_order(text, jsonb), public.cancel_order(text), public.orders_due_for_purge(integer),
  public.is_admin(), public.handle_new_teacher(), public.log_order_status() from public, anon;
grant execute on function public.answer_follow_up(text, text, jsonb), public.request_changes(text, jsonb),
  public.approve_order(text, jsonb), public.cancel_order(text), public.is_admin() to authenticated;
grant execute on function public.orders_due_for_purge(integer) to service_role;

-- ---------- storage: two private buckets ----------
-- uploads/<teacher id>/<order id>/{training,sources}/<file>   her files, deleted after delivery
-- deliverables/<teacher id>/<order id>/{preview,final}/<file> what the team sends back (only the owner's script adds)
insert into storage.buckets (id, name, public, file_size_limit)
  values ('uploads', 'uploads', false, 26214400), ('deliverables', 'deliverables', false, null)
  on conflict (id) do update set public = false;

drop policy if exists "uploads: teacher adds to her folder" on storage.objects;
create policy "uploads: teacher adds to her folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "uploads: teacher or owner reads" on storage.objects;
create policy "uploads: teacher or owner reads" on storage.objects for select to authenticated
  using (bucket_id = 'uploads' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
drop policy if exists "uploads: teacher deletes hers" on storage.objects;
create policy "uploads: teacher deletes hers" on storage.objects for delete to authenticated
  using (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "deliverables: teacher or owner reads" on storage.objects;
create policy "deliverables: teacher or owner reads" on storage.objects for select to authenticated
  using (bucket_id = 'deliverables' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
