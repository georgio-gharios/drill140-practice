-- drill140-practice: initial schema. Paste into the Supabase SQL editor (run once).
-- Anon (publishable key, used by /board) may SELECT events and turns only.
-- Everything else goes through the server with the secret key.

create table public.drills (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  conversation_id text unique,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  status text not null default 'running' check (status in ('running','ended','aborted'))
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  drill_id uuid references public.drills(id) on delete cascade,
  conversation_id text,
  kind text not null check (kind in (
    'drill_started','address_given','callback_given','patient_flat',
    'compressions_started','drill_ended','error')),
  summary text,                -- one line for the board; world-readable, so no PII
  seconds_since_start integer,
  input jsonb,
  ms integer
);
create index events_created_at_idx on public.events (created_at desc);

create table public.turns (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  drill_id uuid references public.drills(id) on delete cascade,
  conversation_id text,
  role text not null check (role in ('trainee','caller')),
  text text not null
);
create index turns_drill_idx on public.turns (drill_id, created_at);

create table public.approvals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  drill_id uuid references public.drills(id) on delete cascade,
  action jsonb not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected','expired')),
  decided_at timestamptz
);

-- Row security on everything.
alter table public.drills    enable row level security;
alter table public.events    enable row level security;
alter table public.turns     enable row level security;
alter table public.approvals enable row level security;

-- Anon: read events and turns only (needed for the board + Realtime).
create policy "anon reads events" on public.events for select to anon using (true);
create policy "anon reads turns"  on public.turns  for select to anon using (true);
grant select on public.events, public.turns to anon;

-- Server role (secret key): explicit grants, or new tables can fail with 42501.
grant select, insert, update, delete on public.drills, public.events, public.turns, public.approvals to service_role;

-- Realtime for the board.
alter publication supabase_realtime add table public.events;
alter publication supabase_realtime add table public.turns;
