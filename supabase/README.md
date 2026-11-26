# Weekly tips Edge Function

`weekly-tips` sends one money-tips email per user and UTC seven-day transaction
window. It only accepts `POST` requests that pass Supabase gateway JWT/API-key
verification and include the `x-weekly-tips-cron-secret` header.

## Required Edge secrets

Configure these with `supabase secrets set` (never commit their values):

- `GEMINI_API_KEY`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `WEEKLY_TIPS_CRON_SECRET`

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are hosted Edge Function
defaults. `EMAIL_LOGO_URL` is optional. The cron header secret must match
`WEEKLY_TIPS_CRON_SECRET` exactly.

## Cron setup

Review the remote `cron.job` entry and `cron.timezone` first. You can inspect
them with the read-only queries at the top of `scripts/cron_jobs.sql`. No
existing schedule or timezone was recorded in this repository. The intended
schedule is Sunday at 09:00 in `Asia/Kolkata` (`0 9 * * 0`), selected because
the app reports completed UTC calendar dates. The script refuses to run unless
the database's `cron.timezone` is `Asia/Kolkata` and refuses to create a
duplicate job under a different name. Inspect the live job and timezone before
applying it; it replaces the `weekly-tips` job if that exact name already
exists.

Create Vault secrets named `weekly_tips_function_url`,
`weekly_tips_secret_key`, and `weekly_tips_cron_secret`. The API key must be a
Supabase secret API key (or legacy service-role key), never a publishable key.
The cron header secret must match the Edge secret
`WEEKLY_TIPS_CRON_SECRET`. The script sends the API key in `apikey` and keeps
`verify_jwt = true`; the handler additionally checks the cron-only header.
Reapplying the script replaces only the job named `weekly-tips`, and it stops
if it detects another job already invoking this function.

The app submits transaction dates as `YYYY-MM-DD`; the function uses a UTC
half-open `[start, end)` date range. The repository has no migration defining
the `transactions.date` PostgreSQL type. Before deployment, verify that it is
`date`; if it is a timestamp type, confirm its timezone semantics and align the
query/window before enabling the job.

Each user is claimed once per period in `weekly_tip_deliveries`. Failures are
recorded and do not stop processing other users; failed claims are not retried
automatically, to avoid duplicate emails, and require operator review.

Keep `verify_jwt = true` in `supabase/config.toml`; the function's additional
header secret makes the privileged all-user mailer inaccessible to normal
callers.
