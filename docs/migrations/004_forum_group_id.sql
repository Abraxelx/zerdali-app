-- Mevcut kurulumda forum_topics group_id yoksa ekle (003 eski sürüm çalıştırıldıysa)
-- student_groups.id bigint olduğu için group_id de bigint.

alter table public.forum_topics
  add column if not exists group_id bigint references public.student_groups(id) on delete cascade;

create index if not exists forum_topics_group_created_idx
  on public.forum_topics (group_id, created_at desc);
