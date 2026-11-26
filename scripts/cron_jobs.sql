-- Weekly-tips scheduler setup (run in the Supabase SQL Editor only after the
-- migration and Edge Function have been deployed). The intended schedule is
-- Sunday at 09:00 in Asia/Kolkata; inspect the live job before applying.
--
-- Before configuring the job, inspect the existing job and database timezone:
--   select current_setting('cron.timezone', true);
--   select jobid, jobname, schedule, command
--   from cron.job
--   where command like '%/functions/v1/weekly-tips%';
-- pg_cron uses the database's `cron.timezone` setting. The script verifies it
-- is Asia/Kolkata. 09:00 IST is after 00:00 UTC, so the UTC-calendar-date
-- window is complete before the weekly run.
--
-- Create these Vault secrets beforehand (values are deliberately not shown):
--   weekly_tips_function_url  -> https://<project-ref>.supabase.co
--   weekly_tips_secret_key    -> a Supabase secret API key (never a publishable key)
--   weekly_tips_cron_secret   -> same value as Edge secret WEEKLY_TIPS_CRON_SECRET
--
-- Keep the Supabase secret API key in `apikey`. The gateway accepts it there
-- while verify_jwt remains enabled; the function also requires the separate
-- cron-only header secret. `pg_net` temporarily records request headers, so
-- restrict database access to trusted administrators.
do $setup$
declare
  weekly_schedule constant text := '0 9 * * 0';
  weekly_timezone constant text := 'Asia/Kolkata';
  weekly_command constant text := $job$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'weekly_tips_function_url')
        || '/functions/v1/weekly-tips',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'weekly_tips_secret_key'),
        'x-weekly-tips-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'weekly_tips_cron_secret')
      ),
      body := '{}'::jsonb
    );
  $job$;
  existing_job record;
begin
  if current_setting('cron.timezone', true) is distinct from weekly_timezone then
    raise exception 'Set cron.timezone to % before configuring weekly-tips; current value is %',
      weekly_timezone, current_setting('cron.timezone', true);
  end if;

  if not exists (select 1 from pg_extension where extname = 'pg_cron')
     or not exists (select 1 from pg_extension where extname = 'pg_net')
     or not exists (select 1 from pg_extension where extname = 'supabase_vault') then
    raise exception 'pg_cron, pg_net, and Supabase Vault must be enabled before configuring weekly-tips';
  end if;

  if (select count(*) from vault.decrypted_secrets where name in (
    'weekly_tips_function_url', 'weekly_tips_secret_key', 'weekly_tips_cron_secret'
  )) <> 3 then
    raise exception 'Create the three documented Vault secrets before configuring weekly-tips; do not use a publishable API key';
  end if;

  select jobid, jobname, command into existing_job
  from cron.job
  where command like '%/functions/v1/weekly-tips%'
    and jobname <> 'weekly-tips'
  limit 1;

  if found then
    raise exception 'Refusing to create a duplicate weekly-tips job: existing job % (%)',
      existing_job.jobname, existing_job.jobid;
  end if;

  -- Re-applying replaces only the named job, never accumulating duplicates.
  perform cron.unschedule(jobid) from cron.job where jobname = 'weekly-tips';
  perform cron.schedule('weekly-tips', weekly_schedule, weekly_command);
end;
$setup$;
