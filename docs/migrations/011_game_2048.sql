-- 2048 oyun oturumları (Faz 1)
-- Supabase Dashboard → SQL Editor'de bir kez çalıştır.

create table if not exists public.game_2048_runs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  week_key text not null,
  score int not null default 0,
  max_tile int not null default 0,
  moves int not null default 0,
  duration_sec int not null default 0,
  status text not null default 'active' check (status in ('active', 'finished', 'abandoned')),
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists game_2048_runs_student_started_idx
  on public.game_2048_runs (student_id, started_at desc);

create index if not exists game_2048_runs_week_score_idx
  on public.game_2048_runs (week_key, max_tile desc, score desc);
