-- Forum etiketleri ve beğeni/beğenmeme
-- Supabase Dashboard → SQL Editor'de bir kez çalıştır.

create table if not exists public.forum_tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  color text,
  sort_order int not null default 0
);

insert into public.forum_tags (slug, label, color, sort_order) values
  ('zerdali-bug', 'Zerdali Bug', '#ef4444', 1),
  ('zerdali-site-istek', 'Zerdali Site İstek', '#3b82f6', 2),
  ('konusma', 'Konuşma', '#22c55e', 3),
  ('genel', 'Genel', '#a855f7', 4)
on conflict (slug) do nothing;

alter table public.forum_topics
  add column if not exists tag_id uuid references public.forum_tags(id);

create index if not exists forum_topics_tag_idx on public.forum_topics (tag_id);

create table if not exists public.forum_reactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('topic', 'comment')),
  target_id uuid not null,
  reaction text not null check (reaction in ('like', 'dislike')),
  created_at timestamptz not null default now(),
  unique (user_id, target_type, target_id)
);

create index if not exists forum_reactions_target_idx
  on public.forum_reactions (target_type, target_id);
