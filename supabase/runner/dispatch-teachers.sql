-- Pilot sign-up emails (owner, Nov 14, 2026: "a notification to mattick.family3 when I get a request", and "send them an
-- email when we approve ALONG WITH steps on what they need to do"). Run it once in the SQL Editor, after
-- 20261112120000_pilot_limit.sql. It is not a migration and changes no data: it adds two triggers that ask GitHub to
-- start .github/workflows/teacher-email.yml, using the same Vault secrets as the order runner (dispatch.sql):
--   pp_github_repo, pp_github_token. Without them nothing is sent and sign-ups and approvals work exactly the same.
--   a new row in public.teachers (someone signed up)      → 'teacher-signup'   → an email to the owner
--   a new row in public.pilot_teachers (the owner approved) → 'teacher-approved' → a welcome email with the steps
-- Changing her tokens later sends nothing. The request goes out through pg_net after the transaction commits; a failed
-- request never blocks a sign-up or an approval. Safe to run again.
-- Turn off: alter table public.teachers disable trigger teachers_dispatch_email;
--           alter table public.pilot_teachers disable trigger pilot_teachers_dispatch_email;   (on again: enable trigger)
-- Copy ALL of it; the last line is "-- end of the teacher emails".

create extension if not exists pg_net with schema extensions;

create or replace function public.dispatch_teacher_email() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  kind text;
  who uuid;
  repo text;
  token text;
begin
  if tg_table_name = 'teachers' then
    kind := 'teacher-signup'; who := new.id;
  else
    kind := 'teacher-approved'; who := new.teacher;
  end if;
  select decrypted_secret into repo from vault.decrypted_secrets where name = 'pp_github_repo';
  select decrypted_secret into token from vault.decrypted_secrets where name = 'pp_github_token';
  if repo is null or token is null or repo !~ '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$' then
    return new;   -- not set up: nothing is sent
  end if;
  perform net.http_post(
    url := 'https://api.github.com/repos/' || repo || '/dispatches',
    body := jsonb_build_object('event_type', kind, 'client_payload', jsonb_build_object('id', who)),
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || token,
      'Accept', 'application/vnd.github+json',
      'X-GitHub-Api-Version', '2022-11-28',
      'User-Agent', 'teacher-email-dispatch',
      'Content-Type', 'application/json'),
    timeout_milliseconds := 5000);
  return new;
end $$;

revoke all on function public.dispatch_teacher_email() from public, anon, authenticated;

drop trigger if exists teachers_dispatch_email on public.teachers;
create trigger teachers_dispatch_email after insert on public.teachers
  for each row execute function public.dispatch_teacher_email();

drop trigger if exists pilot_teachers_dispatch_email on public.pilot_teachers;
create trigger pilot_teachers_dispatch_email after insert on public.pilot_teachers
  for each row execute function public.dispatch_teacher_email();
-- end of the teacher emails
