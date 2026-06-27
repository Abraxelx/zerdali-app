-- Forum etiketleri (dinamik) + beğeni/beğenmeme
-- 009 atlanmış olsa bile çalışır. Supabase SQL Editor'de bir kez çalıştır.

-- Etiketler (kullanıcı oluşturur; varsayılan: Genel)
create table if not exists public.forum_tags (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  label text not null,
  color text default '#a855f7',
  sort_order int not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Eski 009 kurulumundan kalan tabloya yeni sütunlar
alter table public.forum_tags
  add column if not exists created_by uuid references public.profiles(id) on delete set null;

alter table public.forum_tags
  add column if not exists created_at timestamptz not null default now();

alter table public.forum_tags
  add column if not exists color text default '#a855f7';

alter table public.forum_tags
  add column if not exists sort_order int not null default 0;

alter table public.forum_tags alter column slug drop not null;

-- Konulara etiket bağlantısı
alter table public.forum_topics
  add column if not exists tag_id uuid references public.forum_tags(id);

create index if not exists forum_topics_tag_idx on public.forum_topics (tag_id);

-- Beğeni / beğenmeme
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

-- Varsayılan Genel etiketi
insert into public.forum_tags (slug, label, color, sort_order)
select 'genel', 'Genel', '#a855f7', 0
where not exists (select 1 from public.forum_tags where lower(label) = 'genel');

-- Tüm mevcut konuları Genel'e taşı
update public.forum_topics t
set tag_id = g.id
from public.forum_tags g
where lower(g.label) = 'genel'
  and (t.tag_id is null or t.tag_id is distinct from g.id);

-- Sabit etiketleri kaldır (sadece Genel kalsın)
delete from public.forum_tags where lower(label) <> 'genel';

-- Aynı isimli etiket tekrarını engelle
create unique index if not exists forum_tags_label_lower_idx on public.forum_tags (lower(label));
