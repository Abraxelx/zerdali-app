-- 2048 Faz 2-5: ayarlar, haftalık ödüller
-- Supabase SQL Editor'de bir kez çalıştır (011'den sonra).

create table if not exists public.game_2048_settings (
  id int primary key default 1 check (id = 1),
  enabled boolean not null default true,
  weekly_play_limit int not null default 5,
  participation_min_tile int not null default 512,
  participation_zerdalyum int not null default 5,
  rank1_zerdalyum int not null default 50,
  rank2_zerdalyum int not null default 30,
  rank3_zerdalyum int not null default 20,
  rank4_10_zerdalyum int not null default 10,
  rank1_meblah_type_id bigint references public.meblah_types(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.game_2048_settings (id)
values (1)
on conflict (id) do nothing;

create table if not exists public.game_2048_weekly_rewards (
  id uuid primary key default gen_random_uuid(),
  week_key text not null,
  player_id uuid not null references public.profiles(id) on delete cascade,
  reward_kind text not null check (reward_kind in ('rank', 'participation')),
  rank int,
  zerdalyum int not null default 0,
  meblah_type_id bigint references public.meblah_types(id) on delete set null,
  granted_at timestamptz not null default now(),
  unique (week_key, player_id, reward_kind, rank)
);

create index if not exists game_2048_weekly_rewards_week_idx
  on public.game_2048_weekly_rewards (week_key, granted_at desc);
