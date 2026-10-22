-- ===== Bus timings: passenger reports =====================================
-- Run this once in the Supabase SQL editor.
--
-- Passengers may INSERT and READ, but may not UPDATE or DELETE. Because there
-- is no UPDATE policy, nobody can approve their own report from the browser —
-- approval happens in the Supabase table editor.
-- ==========================================================================

create extension if not exists "pgcrypto";

create table if not exists public.bus_timings (
  id           uuid primary key default gen_random_uuid(),
  stop_id      text not null,
  route_id     text not null,
  direction    text,
  time         text not null
                 check (time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  day_type     text not null default 'weekday'
                 check (day_type in ('weekday', 'sunday')),
  submitted_by text,
  note         text,
  status       text not null default 'pending'
                 check (status in ('pending', 'approved', 'rejected')),
  created_at   timestamptz not null default now()
);

-- Rejects accidental duplicates, and is the main defence against someone
-- flooding the table with the same report over and over.
create unique index if not exists bus_timings_dedupe
  on public.bus_timings (stop_id, route_id, day_type, time);

alter table public.bus_timings enable row level security;

-- Anyone may read reports. The app shows 'approved' rows inside the main
-- timetable and 'pending' rows in a clearly-marked "awaiting review" list.
drop policy if exists "read reports" on public.bus_timings;
create policy "read reports"
  on public.bus_timings for select
  using (true);

-- Anyone may submit, but only ever as 'pending'.
drop policy if exists "insert pending only" on public.bus_timings;
create policy "insert pending only"
  on public.bus_timings for insert
  with check (status = 'pending');

-- No UPDATE or DELETE policies: approving and cleaning up happens from the
-- Supabase dashboard, where you are authenticated as the project owner.
