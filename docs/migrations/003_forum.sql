-- Forum: konular ve yorumlar (sınıf/grup bazlı)
-- Supabase Dashboard → SQL Editor'de bir kez çalıştır.
-- Not: student_groups.id bigint olduğu için group_id de bigint.

create table if not exists public.forum_topics (
  id uuid primary key default gen_random_uuid(),
  group_id bigint not null references public.student_groups(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.forum_comments (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.forum_topics(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists forum_topics_group_created_idx
  on public.forum_topics (group_id, created_at desc);

create index if not exists forum_comments_topic_created_idx
  on public.forum_comments (topic_id, created_at asc);

create index if not exists forum_topics_author_created_idx
  on public.forum_topics (author_id, created_at desc);
