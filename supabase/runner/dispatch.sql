-- The automatic runner's trigger (optional; docs/BACKEND.md, "The automatic runner"). Run it in the SQL Editor after
-- the two Vault secrets exist. It is not a migration: the site works the same without it (the owner runs orders by
-- hand with scripts/orders.mjs).
--
-- When an order is sent (a new row with status 'sent') it asks GitHub to start .github/workflows/run-order.yml with
-- event type 'order-sent' (onboarding: the follow-up). When an order's status changes to 'building' (her answer, or a
-- follow-up with no questions) it sends 'order-answered' (the build, up to the preview). Nothing else starts it.
-- The request goes out through pg_net after the transaction commits; a failed request never blocks her order.
--
-- Vault secrets (Project Settings → Vault, or select vault.create_secret('<value>', '<name>')):
--   pp_github_repo   owner/repo, e.g. someone/some-repo
--   pp_github_token  a fine-grained GitHub token for that one repository with "Contents: Read and write" (what the
--                    dispatches API needs) and nothing else
-- Turn it off: alter table public.orders disable trigger orders_dispatch_runner;   (on again: enable trigger)
-- Remove it:   drop trigger if exists orders_dispatch_runner on public.orders; drop function if exists public.dispatch_order_runner();

create extension if not exists pg_net with schema extensions;

create or replace function public.dispatch_order_runner() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  kind text;
  repo text;
  token text;
begin
  if tg_op = 'INSERT' and new.status = 'sent' then
    kind := 'order-sent';
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status and new.status in ('sent', 'building') then
    kind := case new.status when 'sent' then 'order-sent' else 'order-answered' end;
  else
    return new;
  end if;
  select decrypted_secret into repo from vault.decrypted_secrets where name = 'pp_github_repo';
  select decrypted_secret into token from vault.decrypted_secrets where name = 'pp_github_token';
  if repo is null or token is null or repo !~ '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$' then
    return new;   -- not set up: the owner runs orders by hand
  end if;
  perform net.http_post(
    url := 'https://api.github.com/repos/' || repo || '/dispatches',
    body := jsonb_build_object('event_type', kind, 'client_payload', jsonb_build_object('id', new.id)),
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || token,
      'Accept', 'application/vnd.github+json',
      'X-GitHub-Api-Version', '2022-11-28',
      'User-Agent', 'order-runner-dispatch',
      'Content-Type', 'application/json'),
    timeout_milliseconds := 5000);
  return new;
end $$;

revoke all on function public.dispatch_order_runner() from public, anon, authenticated;

drop trigger if exists orders_dispatch_runner on public.orders;
create trigger orders_dispatch_runner after insert or update of status on public.orders
  for each row execute function public.dispatch_order_runner();
