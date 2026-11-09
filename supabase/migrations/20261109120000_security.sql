-- 🛡️ Dominyk's security review, Nov 9, 2026 (docs/security/2026-11-09.md, finding 3). Run once in the Supabase SQL
-- editor after 20261106120000_orders.sql. Never edit this file after it has been run; add a new migration instead.
-- It changes no data: it narrows what a signed-in teacher can do directly, and adds limits on what she can send.
--
-- Why: Supabase grants every new table and function in `public` to anon, authenticated and service_role by default.
-- The first migration revoked anon and added the grants it wanted, but never took back the defaults from
-- authenticated, so a signed-in teacher could still:
--   - call orders_due_for_purge(): the id, teacher id and status of other teachers' finished orders;
--   - change her own teachers.email (the update policy allows her row; only the name was meant to be hers);
--   - send any number of orders (each one starts the automatic runner, which spends on the AI), with any number of
--     upload paths, of any size.

-- ---------- 1. take back the defaults; grant only what the site uses ----------
revoke all on public.teachers, public.admins, public.orders, public.order_events from anon, authenticated;
grant select on public.teachers to authenticated;
grant update (name) on public.teachers to authenticated;
grant select on public.admins to authenticated;
grant select on public.orders to authenticated;
grant insert (id, teacher, status, order_json, token_total, upload_files) on public.orders to authenticated;
grant select on public.order_events to authenticated;

revoke all on function public.orders_due_for_purge(integer) from public, anon, authenticated;
grant execute on function public.orders_due_for_purge(integer) to service_role;
revoke all on function public.handle_new_teacher(), public.log_order_status() from public, anon, authenticated;
revoke all on function public.answer_follow_up(text, text, jsonb), public.request_changes(text, jsonb),
  public.approve_order(text, jsonb), public.cancel_order(text), public.is_admin() from public, anon;
grant execute on function public.answer_follow_up(text, text, jsonb), public.request_changes(text, jsonb),
  public.approve_order(text, jsonb), public.cancel_order(text), public.is_admin() to authenticated;

-- ---------- 2. sizes: nothing a teacher sends can be huge ----------
alter table public.orders drop constraint if exists orders_sizes;
alter table public.orders add constraint orders_sizes check (
  pg_column_size(order_json) <= 262144
  and jsonb_typeof(upload_files) = 'array' and jsonb_array_length(upload_files) <= 60
  and (answer is null or length(answer) <= 2000)
  and (answers is null or pg_column_size(answers) <= 16384)
  and (comments is null or pg_column_size(comments) <= 131072)
  and (approval is null or pg_column_size(approval) <= 65536)) not valid;   -- not valid: rows sent before today aren't rechecked

-- ---------- 3. what a teacher may send: her own folder, and not too many at once ----------
-- (the owner, in public.admins, is not limited; the owner's script uses the service key and skips this)
create or replace function public.orders_check_new() returns trigger
  language plpgsql security definer set search_path = public as $$
declare per_day int; open_now int; p text;
begin
  if auth.uid() is null or public.is_admin() then return new; end if;   -- the service key, or the owner
  for p in select jsonb_array_elements_text(new.upload_files) loop
    if p !~ ('^' || auth.uid()::text || '/' || new.id || '/(sources|training)/[^/]+$') or p ~ '(^|/)\.\.?(/|$)' then
      raise exception 'an upload path is outside this order''s folder' using errcode = '42501';
    end if;
  end loop;
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
drop trigger if exists orders_check_new on public.orders;
create trigger orders_check_new before insert on public.orders for each row execute function public.orders_check_new();
