-- ============================================================
-- ENRO PORTAL — ACTIVITY LOGS (Final Setup)
-- ============================================================
-- Run this entire script once. Safe to re-run.
-- ============================================================


-- ============================================================
-- 1. ACTIVITY LOGS TABLE
-- ============================================================
create table if not exists activity_logs (
    id              uuid primary key default gen_random_uuid(),
    action          text not null,               -- LOGIN | LOGOUT | FAILED_LOGIN | INSERT | UPDATE | DELETE
    entity_type     text not null,               -- auth | permittees | transactions
    entity_id       uuid,
    entity_name     text,
    performed_by    text,                        -- user email
    performed_at    timestamptz not null default now(),
    details         jsonb,
    user_agent      text
);

create index if not exists idx_activity_logs_performed_at
    on activity_logs(performed_at desc);
create index if not exists idx_activity_logs_entity
    on activity_logs(entity_type, entity_id);
create index if not exists idx_activity_logs_performed_by
    on activity_logs(performed_by, performed_at desc);


-- ============================================================
-- 2. TRIGGER FUNCTION — for permittees only
-- ============================================================
create or replace function log_activity()
returns trigger
language plpgsql
security definer
as $$
declare
    v_user_email  text;
    v_entity_name text;
    v_entity_id   uuid;
    v_details     jsonb;
begin
    -- Grab user email from JWT
    begin
        v_user_email := current_setting('request.jwt.claims', true)::json->>'email';
    exception when others then
        v_user_email := null;
    end;

    if (TG_OP = 'DELETE') then
        v_entity_id   := OLD.id;
        v_entity_name := coalesce(OLD.name, OLD.id::text);
        v_details     := jsonb_build_object('before', to_jsonb(OLD));
    elsif (TG_OP = 'UPDATE') then
        v_entity_id   := NEW.id;
        v_entity_name := coalesce(NEW.name, NEW.id::text);
        v_details     := jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW));
    else
        v_entity_id   := NEW.id;
        v_entity_name := coalesce(NEW.name, NEW.id::text);
        v_details     := jsonb_build_object('after', to_jsonb(NEW));
    end if;

    insert into activity_logs
        (action, entity_type, entity_id, entity_name, performed_by, details)
    values
        (TG_OP, TG_TABLE_NAME, v_entity_id, v_entity_name, v_user_email, v_details);

    return coalesce(NEW, OLD);
end;
$$;

-- Attach trigger to permittees
drop trigger if exists trg_log_permittees on permittees;
create trigger trg_log_permittees
    after insert or update or delete on permittees
    for each row execute function log_activity();

-- Remove any leftover trigger on transactions (RPC handles this now)
drop trigger if exists trg_log_transactions on transactions;


-- ============================================================
-- 3. RPC — LOGIN / LOGOUT / FAILED_LOGIN
--    ★ UPDATED: extracts the "reason" into its own field
-- ============================================================
create or replace function log_auth_event(
    p_action      text,
    p_email       text,
    p_user_agent  text default null
)
returns void
language plpgsql
security definer
as $$
declare
    v_reason text;
begin
    -- The JS appends " — reason text" to the user agent string.
    -- Extract everything after " — " as the human-readable reason.
    v_reason := null;
    if p_user_agent is not null and position(' — ' in p_user_agent) > 0 then
        v_reason := split_part(p_user_agent, ' — ', 2);
    end if;

    insert into activity_logs
        (action, entity_type, entity_name, performed_by, user_agent, details)
    values (
        p_action,
        'auth',
        p_email,
        p_email,
        p_user_agent,
        jsonb_build_object(
            'at',         now(),
            'reason',     v_reason,
            'user_agent', p_user_agent
        )
    );
end;
$$;

grant execute on function log_auth_event(text, text, text) to anon, authenticated;


-- ============================================================
-- 4. RPC — record_transaction (LOGS DR ENTRIES TOO)
-- ============================================================
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
    v_name      text;
    v_permit_no text;
    v_user      text;
begin
    -- Lock the permittee row
    select remaining_vol, name, permit_no
      into v_remaining, v_name, v_permit_no
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

    -- Insert the transaction
    insert into transactions (
        permittee_id, date, dr_no, volume, amount, op_no,
        truck_load, prev_balance, new_balance, recorded_by
    ) values (
        p_permittee_id, p_date, p_dr_no, p_volume, p_amount, p_op_no,
        p_truck_load, v_remaining, v_new, p_recorded_by
    );

    -- Update permittee balance
    update permittees
       set remaining_vol = v_new
     where id = p_permittee_id;

    -- Get the calling user's email
    begin
        v_user := current_setting('request.jwt.claims', true)::json->>'email';
    exception when others then
        v_user := null;
    end;
    v_user := coalesce(v_user, p_recorded_by, 'system');

    -- Log the DR entry to activity_logs
    insert into activity_logs (
        action, entity_type, entity_name, performed_by, details
    ) values (
        'INSERT',
        'transactions',
        p_dr_no,
        v_user,
        jsonb_build_object(
            'permittee',    v_name,
            'permit_no',    v_permit_no,
            'dr_no',        p_dr_no,
            'date',         p_date,
            'volume',       p_volume,
            'amount',       p_amount,
            'op_no',        p_op_no,
            'truck_load',   p_truck_load,
            'prev_balance', v_remaining,
            'new_balance',  v_new,
            'recorded_by',  p_recorded_by
        )
    );

    return v_new;
end;
$$;


-- ============================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================
alter table activity_logs enable row level security;

-- Drop existing policies so this script is safe to re-run
drop policy if exists "activity_logs_authenticated_read"   on activity_logs;
drop policy if exists "activity_logs_authenticated_insert" on activity_logs;
drop policy if exists "activity_logs_anon_insert_failed"   on activity_logs;
drop policy if exists "activity_logs_authenticated_delete" on activity_logs;
drop policy if exists "activity_logs_read"                 on activity_logs;
drop policy if exists "activity_logs_insert"               on activity_logs;
drop policy if exists "activity_logs_delete"               on activity_logs;
drop policy if exists "activity_logs_all_access"           on activity_logs;

-- One permissive policy — simplest, most robust
create policy "activity_logs_all_access"
    on activity_logs
    for all
    using (true)
    with check (true);


-- ============================================================
-- 6. VERIFY
-- ============================================================
-- Confirm trigger is attached to permittees only:
select trigger_name, event_manipulation, event_object_table
from information_schema.triggers
where trigger_name in ('trg_log_permittees', 'trg_log_transactions')
order by event_object_table, event_manipulation;

-- Confirm policies exist:
select policyname, cmd
from pg_policies
where tablename = 'activity_logs';

-- See current counts:
select action, entity_type, count(*)
from activity_logs
group by action, entity_type
order by entity_type, action;