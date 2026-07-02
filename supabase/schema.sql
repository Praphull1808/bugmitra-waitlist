-- =========================================================
-- BugMitra Waitlist — Supabase Schema
-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query)
-- =========================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------
-- 1. Main table
-- ---------------------------------------------------------
create table if not exists waitlist (
  id              uuid primary key default gen_random_uuid(),
  full_name       text not null,
  email           text not null unique,
  skill_level     text not null check (skill_level in ('Beginner','Student','Freelancer','Developer')),
  coding_problem  text not null check (coding_problem in ('HTML','CSS','JavaScript','Python','React','Other')),
  referral_code   text not null unique,
  referred_by     text references waitlist(referral_code) on delete set null,
  referral_count  integer not null default 0,
  position        integer,
  badge           text,                 -- 'early_access' | 'lifetime_pro' | 'founder'
  joined_at       timestamptz not null default now()
);

create index if not exists idx_waitlist_email on waitlist (lower(email));
create index if not exists idx_waitlist_referral_code on waitlist (referral_code);
create index if not exists idx_waitlist_referred_by on waitlist (referred_by);
create index if not exists idx_waitlist_joined_at on waitlist (joined_at);

-- ---------------------------------------------------------
-- 2. Admin allowlist (who can access the admin dashboard)
-- ---------------------------------------------------------
create table if not exists admins (
  email text primary key
);

-- Add yourself once you've created a Supabase Auth user with this email:
-- insert into admins (email) values ('you@bugmitra.com');

-- ---------------------------------------------------------
-- 3. Referral code generator
-- ---------------------------------------------------------
create or replace function generate_referral_code()
returns text
language plpgsql
as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no 0/O/1/I ambiguity
  code text;
  exists_already boolean;
begin
  loop
    code := '';
    for i in 1..7 loop
      code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    end loop;
    select exists(select 1 from waitlist where referral_code = code) into exists_already;
    if not exists_already then
      return code;
    end if;
  end loop;
end;
$$;

-- ---------------------------------------------------------
-- 4. Before-insert trigger: set referral_code + position + badge defaults
-- ---------------------------------------------------------
create or replace function before_waitlist_insert()
returns trigger
language plpgsql
as $$
begin
  if new.referral_code is null or new.referral_code = '' then
    new.referral_code := generate_referral_code();
  end if;

  new.email := lower(trim(new.email));

  -- static "position at time of joining" snapshot
  select coalesce(count(*), 0) + 1 into new.position from waitlist;

  return new;
end;
$$;

drop trigger if exists trg_before_waitlist_insert on waitlist;
create trigger trg_before_waitlist_insert
  before insert on waitlist
  for each row execute function before_waitlist_insert();

-- ---------------------------------------------------------
-- 5. After-insert trigger: bump referrer's referral_count + badges
-- ---------------------------------------------------------
create or replace function after_waitlist_insert()
returns trigger
language plpgsql
as $$
declare
  new_count integer;
begin
  if new.referred_by is not null then
    update waitlist
      set referral_count = referral_count + 1
      where referral_code = new.referred_by
      returning referral_count into new_count;

    if new_count is not null then
      update waitlist
        set badge = case
          when new_count >= 25 then 'founder'
          when new_count >= 10 then 'lifetime_pro'
          when new_count >= 3  then 'early_access'
          else badge
        end
        where referral_code = new.referred_by;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_after_waitlist_insert on waitlist;
create trigger trg_after_waitlist_insert
  after insert on waitlist
  for each row execute function after_waitlist_insert();

-- ---------------------------------------------------------
-- 6. Row Level Security
-- ---------------------------------------------------------
alter table waitlist enable row level security;
alter table admins enable row level security;

-- Public (anon) can INSERT their own signup, nothing else directly.
drop policy if exists "public can insert" on waitlist;
create policy "public can insert" on waitlist
  for insert
  to anon
  with check (true);

-- No direct SELECT/UPDATE/DELETE for anon — all reads go through
-- the security-definer RPC functions below, or through an authenticated admin.
drop policy if exists "admins can select" on waitlist;
create policy "admins can select" on waitlist
  for select
  to authenticated
  using (exists (select 1 from admins a where a.email = auth.jwt() ->> 'email'));

drop policy if exists "admins can delete" on waitlist;
create policy "admins can delete" on waitlist
  for delete
  to authenticated
  using (exists (select 1 from admins a where a.email = auth.jwt() ->> 'email'));

drop policy if exists "admins can update" on waitlist;
create policy "admins can update" on waitlist
  for update
  to authenticated
  using (exists (select 1 from admins a where a.email = auth.jwt() ->> 'email'));

drop policy if exists "admins can read admins" on admins;
create policy "admins can read admins" on admins
  for select
  to authenticated
  using (exists (select 1 from admins a where a.email = auth.jwt() ->> 'email'));

-- ---------------------------------------------------------
-- 7. Public RPC functions (safe, limited data only)
-- ---------------------------------------------------------

-- Total live count, for the "X Developers Joined" counter
create or replace function get_waitlist_count()
returns integer
language sql
security definer
set search_path = public
as $$
  select count(*)::int from waitlist;
$$;
grant execute on function get_waitlist_count() to anon;

-- Does this email already exist? (duplicate check before insert)
create or replace function check_email_exists(p_email text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(select 1 from waitlist where email = lower(trim(p_email)));
$$;
grant execute on function check_email_exists(text) to anon;

-- Live rank: referrers move up. Ordered by referral_count desc, joined_at asc.
create or replace function get_live_position(p_email text)
returns integer
language sql
security definer
set search_path = public
as $$
  select rank::int from (
    select email, row_number() over (order by referral_count desc, joined_at asc) as rank
    from waitlist
  ) ranked
  where ranked.email = lower(trim(p_email));
$$;
grant execute on function get_live_position(text) to anon;

-- Resolve a referral code to its owner's email + name (used to attribute referred_by safely)
create or replace function resolve_referral_code(p_code text)
returns table(owner_email text, owner_name text)
language sql
security definer
set search_path = public
as $$
  select email, full_name from waitlist where referral_code = upper(trim(p_code));
$$;
grant execute on function resolve_referral_code(text) to anon;

-- Public-safe signup insert (validates + delegates to trigger logic)
create or replace function submit_waitlist_entry(
  p_full_name text,
  p_email text,
  p_skill_level text,
  p_coding_problem text,
  p_referred_by text default null
)
returns table(out_id uuid, out_referral_code text, out_position int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_ref_code text;
  v_position int;
  v_referrer text;
begin
  if check_email_exists(p_email) then
    raise exception 'DUPLICATE_EMAIL';
  end if;

  if p_referred_by is not null and length(trim(p_referred_by)) > 0 then
    select referral_code into v_referrer from waitlist where referral_code = upper(trim(p_referred_by));
  end if;

  insert into waitlist (full_name, email, skill_level, coding_problem, referred_by)
  values (trim(p_full_name), lower(trim(p_email)), p_skill_level, p_coding_problem, v_referrer)
  returning id, referral_code, position into v_id, v_ref_code, v_position;

  return query select v_id, v_ref_code, v_position;
end;
$$;
grant execute on function submit_waitlist_entry(text, text, text, text, text) to anon;

-- Referral leaderboard (public-safe: first name + masked email + count, top 10)
create or replace function get_referral_leaderboard(p_limit int default 10)
returns table(display_name text, referral_count int, badge text)
language sql
security definer
set search_path = public
as $$
  select full_name, referral_count, badge
  from waitlist
  where referral_count > 0
  order by referral_count desc, joined_at asc
  limit p_limit;
$$;
grant execute on function get_referral_leaderboard(int) to anon;
