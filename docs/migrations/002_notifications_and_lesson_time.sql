-- Bildirimler + ders başlangıç saati
-- Supabase Dashboard → SQL Editor'de bir kez çalıştır.

-- Ders başlangıç saati (HH:MM)
alter table public.lessons add column if not exists lesson_time text;

-- Bildirimler
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);
