-- Kullanıcı giriş / oturum kayıtları (superadmin aktivite görünümü)
-- Supabase Dashboard → SQL Editor'de bir kez çalıştır.

create table if not exists public.user_login_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  entry_type text not null default 'login' check (entry_type in ('login', 'session')),
  logged_in_at timestamptz not null default now(),
  ip_address text,
  user_agent text
);

create index if not exists user_login_logs_logged_in_at_idx
  on public.user_login_logs (logged_in_at desc);

create index if not exists user_login_logs_user_logged_in_at_idx
  on public.user_login_logs (user_id, logged_in_at desc);
