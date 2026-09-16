-- ============================================================
-- ENRO PERMIT & EXTRACTION VOLUME MONITORING SYSTEM
-- ============================================================

-- 1. PERMITTEES
create table if not exists permittees (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  location       text,
  permit_no      text unique,
  type           text,
  commodity      text,
  rate           text,
  allowed_vol    numeric not null default 0 check (allowed_vol >= 0),
  remaining_vol  numeric not null default 0 check (remaining_vol >= 0),
  start_date     date,
  end_date       date,
  status         text default 'Active',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table permittees drop constraint if exists remaining_vol_non_negative;
alter table permittees add  constraint remaining_vol_non_negative check (remaining_vol >= 0);

-- 2. TRANSACTIONS
create table if not exists transactions (
  id                uuid primary key default gen_random_uuid(),
  permittee_id      uuid not null references permittees(id) on delete cascade,
  date              date not null,
  dr_no             text not null,
  volume            numeric not null check (volume > 0),
  amount            numeric not null default 0,
  op_no             text,
  truck_load        text,
  prev_balance      numeric not null,
  new_balance       numeric not null,
  recorded_by       text not null,
  recorded_at       timestamptz not null default now()
);

create index if not exists idx_transactions_permittee
  on transactions(permittee_id, recorded_at desc);

-- 3. AUTO-UPDATE updated_at
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_permittees_updated_at on permittees;
create trigger trg_permittees_updated_at
  before update on permittees
  for each row execute function set_updated_at();

-- 4. ATOMIC TRANSACTION RPC
create or replace function record_transaction(
  p_permittee_id uuid,
  p_date         date,
  p_dr_no        text,
  p_volume       numeric,
  p_amount       numeric,
  p_op_no        text,
  p_truck_load   text,
  p_recorded_by  text
) returns numeric
language plpgsql
security definer
as $$
declare
  v_remaining numeric;
  v_new       numeric;
begin
  select remaining_vol into v_remaining
  from permittees
  where id = p_permittee_id
  for update;

  if v_remaining is null then
    raise exception 'Permittee not found';
  end if;

  if p_volume is null or p_volume <= 0 then
    raise exception 'Volume must be greater than zero';
  end if;

  if p_volume > v_remaining then
    raise exception 'Over-extraction blocked: requested % cu.m, only % cu.m remaining',
      p_volume, v_remaining;
  end if;

  v_new := v_remaining - p_volume;

  insert into transactions (
    permittee_id, date, dr_no, volume, amount, op_no,
    truck_load, prev_balance, new_balance, recorded_by
  ) values (
    p_permittee_id, p_date, p_dr_no, p_volume, p_amount, p_op_no,
    p_truck_load, v_remaining, v_new, p_recorded_by
  );

  update permittees
    set remaining_vol = v_new
    where id = p_permittee_id;

  return v_new;
end;
$$;

-- 5. RLS
alter table permittees   enable row level security;
alter table transactions enable row level security;

drop policy if exists "permittees_authenticated_all" on permittees;
create policy "permittees_authenticated_all" on permittees
  for all to authenticated using (true) with check (true);

drop policy if exists "transactions_authenticated_all" on transactions;
create policy "transactions_authenticated_all" on transactions
  for all to authenticated using (true) with check (true);