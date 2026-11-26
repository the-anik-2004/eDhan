-- One delivery row represents one user's weekly email. The unique index is
-- the durable idempotency boundary for concurrent or retried cron requests.
create table if not exists public.weekly_tip_deliveries (
  user_id text not null,
  period_start date not null,
  status text not null default 'processing'
    check (status in ('processing', 'sent', 'failed')),
  sent_at timestamptz,
  failed_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  primary key (user_id, period_start)
);

-- This also protects an already-created table that did not originally have a
-- primary key. It is intentionally non-destructive; resolve any pre-existing
-- duplicates before applying this migration if PostgreSQL reports them.
create unique index if not exists weekly_tip_deliveries_user_period_key
  on public.weekly_tip_deliveries (user_id, period_start);

alter table public.weekly_tip_deliveries enable row level security;

-- A retry never reclaims an existing period. This favors no duplicate emails;
-- failed deliveries remain auditable and can be explicitly remediated later.
create or replace function public.claim_weekly_tip_delivery(
  p_user_id text,
  p_period_start date
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.weekly_tip_deliveries (user_id, period_start, status)
  values (p_user_id, p_period_start, 'processing')
  on conflict (user_id, period_start) do nothing;

  return found;
end;
$$;

create or replace function public.fail_weekly_tip_delivery(
  p_user_id text,
  p_period_start date,
  p_error text
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.weekly_tip_deliveries
  set failed_at = now(), last_error = left(p_error, 500), status = 'failed'
  where user_id = p_user_id
    and period_start = p_period_start
    and status = 'processing';
$$;

revoke all on function public.claim_weekly_tip_delivery(text, date) from public;
revoke all on function public.fail_weekly_tip_delivery(text, date, text) from public;
grant execute on function public.claim_weekly_tip_delivery(text, date) to service_role;
grant execute on function public.fail_weekly_tip_delivery(text, date, text) to service_role;
