-- Bildirim deep-link verisi (forum konusu, ödev vb.)
-- Supabase Dashboard → SQL Editor'de bir kez çalıştır.

alter table public.notifications
  add column if not exists data jsonb not null default '{}'::jsonb;
