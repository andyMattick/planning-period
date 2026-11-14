-- A failed order doesn't use up the pilot (owner, Nov 14, 2026: a test teacher's two orders failed before any agent
-- worked, and their 140 tokens counted against the 150). Run once in the Supabase SQL editor after
-- 20261112120000_pilot_limit.sql. It changes no data and is safe to run again. Cancelled orders still count (the agents
-- may have worked on them); 'failed' is set only by the order runner or the owner, never by a teacher.
create or replace function public.pilot_tokens_left_for(p_teacher uuid) returns integer
  language sql stable security definer set search_path = public as $$
  select pt.tokens - coalesce((select sum(o.token_total)::integer from public.orders o
                               where o.teacher = p_teacher and o.status <> 'failed'), 0)
  from public.pilot_teachers pt where pt.teacher = p_teacher;
$$;
revoke all on function public.pilot_tokens_left_for(uuid) from public, anon, authenticated;
-- end of the failed-orders migration
