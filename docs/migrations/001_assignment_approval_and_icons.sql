-- ============================================================
-- Zerdali — Ödev Onay Sistemi + Görsel (icon) Altyapısı
-- Bu dosyayı Supabase Dashboard → SQL Editor'de bir kez çalıştır.
-- Tekrar çalıştırmak güvenlidir (IF NOT EXISTS / DO blokları).
-- ============================================================

-- 1) assignment_submissions: onay/durum alanları
alter table public.assignment_submissions
  add column if not exists status text not null default 'pending',
  add column if not exists is_late boolean not null default false,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid,
  add column if not exists created_at timestamptz not null default now();

-- status yalnızca geçerli değerleri alsın
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'assignment_submissions_status_check'
  ) then
    alter table public.assignment_submissions
      add constraint assignment_submissions_status_check
      check (status in ('pending', 'approved', 'rejected'));
  end if;
end $$;

-- 2) Tek teslim garantisi: (assignment_id, student_id) benzersiz
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'assignment_submissions_unique_per_student'
  ) then
    alter table public.assignment_submissions
      add constraint assignment_submissions_unique_per_student
      unique (assignment_id, student_id);
  end if;
end $$;

-- 3) Mevcut (eski) teslimleri tutarlı hale getir:
--    puanlanmış olanları onaylı, kalanları bekliyor say.
update public.assignment_submissions
   set status = 'approved'
 where score is not null and status = 'pending';

-- 4) Görsel alanları zaten varsa dokunmaz; yoksa ekler.
alter table public.levels        add column if not exists icon_url text;
alter table public.meblah_types  add column if not exists icon_url text;
alter table public.achievements  add column if not exists icon_url text;

-- ============================================================
-- NOT: 'icons' adında public bir Storage bucket'ı gerekli.
-- Supabase → Storage → New bucket → name: icons → Public: ON
-- (Zaten varsa tekrar oluşturmana gerek yok.)
-- ============================================================
