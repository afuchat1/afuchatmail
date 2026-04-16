create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  client_reference text unique,
  skypay_reference_id text unique,
  plan_id text check (plan_id in ('professional', 'business')),
  amount integer not null check (amount > 0),
  currency text not null default 'UGX',
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed', 'cancelled')),
  method text,
  buyer_email text,
  seller_id text,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  plan_id text not null check (plan_id in ('starter', 'professional', 'business')),
  status text not null default 'active' check (status in ('active', 'past_due', 'cancelled', 'expired')),
  skypay_reference_id text unique references public.payment_transactions(skypay_reference_id) on delete set null,
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payment_transactions_user_id_idx on public.payment_transactions(user_id);
create index if not exists payment_transactions_status_idx on public.payment_transactions(status);
create index if not exists subscriptions_user_id_status_idx on public.subscriptions(user_id, status);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_payment_transactions_updated_at on public.payment_transactions;
create trigger set_payment_transactions_updated_at
before update on public.payment_transactions
for each row execute function public.set_updated_at();

drop trigger if exists set_subscriptions_updated_at on public.subscriptions;
create trigger set_subscriptions_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

alter table public.payment_transactions enable row level security;
alter table public.subscriptions enable row level security;

drop policy if exists "Users can view own payment transactions" on public.payment_transactions;
create policy "Users can view own payment transactions"
on public.payment_transactions
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can view own subscriptions" on public.subscriptions;
create policy "Users can view own subscriptions"
on public.subscriptions
for select
to authenticated
using (auth.uid() = user_id);