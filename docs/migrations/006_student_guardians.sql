-- Veli rolü ve öğrenci–veli ilişkisi (many-to-many)
-- Supabase Dashboard → SQL Editor'de bir kez çalıştır.

create table if not exists public.student_guardians (
  guardian_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (guardian_id, student_id),
  check (guardian_id <> student_id)
);

create index if not exists student_guardians_student_idx
  on public.student_guardians (student_id);

create index if not exists student_guardians_guardian_idx
  on public.student_guardians (guardian_id);
