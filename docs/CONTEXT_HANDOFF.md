# Zerdali — Context Handoff Özeti

Bu dosya yeni AI sohbet oturumları veya geliştirici devralmaları için proje durumunu özetler.

**Son güncelleme:** 2026-06-06

---

## Proje

**Zerdali:** Oyunlaştırılmış eğitim platformu (Zerdalyum puan, Meblağ çarpanları, seviye sistemi).

**Workspace:** `/Users/xelil/Desktop/freelance-works/zerdali/zerdali-app`

**Stack:**

- Backend: Flask + Supabase (PostgreSQL, Auth, Storage)
- Frontend: Next.js App Router + TanStack Query
- Auth: Supabase Auth + `profiles` tablosu (role: `student` | `superadmin`)

**Supabase projesi:** `tiuonbkygmawldpjrxre.supabase.co`

---

## Çalıştırma

```bash
# Backend (port 5001 — macOS AirPlay 5000'i kullanır!)
cd backend && source venv/bin/activate && flask --app app run --debug --port 5001

# Frontend
cd frontend && npm run dev
```

**Env dosyaları:**

- `backend/.env` — `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`, `SUPABASE_JWT_SECRET`, `CORS_ORIGINS`, `PASSWORD_RESET_REDIRECT_URL=http://localhost:3000/reset-password`, `FLASK_RUN_PORT=5001`
- `frontend/.env.local` — `NEXT_PUBLIC_API_URL=http://localhost:5001`, Supabase public keys

**PyCharm:** Flask `flask run` ile başlat; `.flaskenv` + `.env` içinde port **5001**.

**Health check:** `GET http://localhost:5001/health`

---

## Tamamlanan Modüller (M0–M21)

| Alan | Durum |
|------|-------|
| Auth (register/login/me/forgot-password) | ✅ |
| RBAC (JWT decorator, require_role) | ✅ |
| Gruplar CRUD + üye yönetimi | ✅ |
| Dersler, yoklama, notlar (1–12) | ✅ |
| Ödevler + dosya yükleme + teslim + puanlama | ✅ |
| Zerdalyum puan motoru (`point_transactions`) | ✅ |
| Meblağ sistemi + çarpan | ✅ |
| Seviye + başarımlar | ✅ |
| Admin kullanıcı yönetimi | ✅ |
| Supabase Storage bucket | ✅ |
| Event loglama | ✅ |
| Frontend: login/register, öğrenci paneli, superadmin paneli | ✅ |
| Şifremi unuttum + reset-password akışı | ✅ |
| Backend pytest + frontend build | ✅ |
| Deploy dokümantasyonu (`docs/DEPLOYMENT.md`) | ✅ |

Detaylı endpoint listesi: `docs/DEVELOPMENT_PLAN.md`

---

## Klasör Yapısı (kritik dosyalar)

```
backend/
  app.py
  config.py
  routes/          auth, admin, group, lesson, assignment, gamification
  services/        auth_service, group_service, ...
  utils/           security.py, errors.py, db_helpers.py, group_fields.py
frontend/src/
  app/             login, register, forgot-password, reset-password, dashboard, admin/*
  lib/             api.ts, auth.tsx, supabase.ts, auth-recovery.ts
docs/              DEVELOPMENT_PLAN.md, DEPLOYMENT.md, CONTEXT_HANDOFF.md
```

---

## Önemli Teknik Kararlar & Düzeltilen Buglar

1. **Port 5000 → 5001** — macOS AirPlay çakışması; frontend API URL buna göre ayarlandı.
2. **JWT doğrulama** — `backend/utils/security.py`: önce Supabase `get_user(token)` API, fallback HS256 (`SUPABASE_JWT_SECRET`).
3. **Grup günü** — DB `lesson_day` smallint (0=Pazartesi … 6=Pazar); frontend dropdown; `"Cumartesi"` string hatası giderildi (`utils/group_fields.py`).
4. **Saat alanı** — DB `TIME`; `14:00` → `14:00:00` parse.
5. **Grup üyeleri görünmüyordu** — backend join + frontend `GroupCard` + `GET /admin/groups/:id/members`.
6. **Öğrenci gruba eklenemiyordu** — Supabase `maybe_single()` None dönüyordu; `utils/db_helpers.py` + `limit(1)` ile düzeltildi.
7. **Reset link "geçersiz"** — `frontend/src/lib/auth-recovery.ts` üç akışı destekliyor:
   - PKCE: `?code=`
   - token_hash: `?token_hash=...&type=recovery`
   - hash: `#access_token=...&type=recovery`
8. **Şifre sıfırlama maili gelmiyor** — Supabase **`email rate limit exceeded`** (ücretsiz planda saatlik ~3–4 mail). Backend artık 429 ile Türkçe hata döndürüyor (`auth_service.py`); önceden hata yutulup "gönderildi" deniyordu.

---

## Şifremi Unuttum Akışı

1. `/login` → **Şifremi unuttum** → `/forgot-password`
2. `POST /auth/forgot-password` → `anon.auth.reset_password_for_email(email, { redirect_to })`
3. Mail linki → `/reset-password` → `establishRecoverySession()` → yeni şifre → `/login?reset=success`

**Supabase Dashboard ayarları (zorunlu):**

- Site URL: `http://localhost:3000`
- Redirect URLs: `http://localhost:3000/reset-password`
- Production'da kendi domain'leri de ekle

**Rate limit çözümleri:**

- ~1 saat bekle
- Supabase → Authentication → Users → **Send password recovery**
- Kalıcı: Authentication → **SMTP Settings** (SendGrid, Resend, Gmail vb.)

---

## Bilinen Test Kullanıcıları

| Rol | Bilgi |
|-----|-------|
| Superadmin | Supabase'de mevcut (panelden oluşturulmuş) |
| Öğrenci | **Eren Nart Batır** — UID `3623a1b1-4227-43aa-9051-e9ae69eb740a`, email `erennartbatir@gmail.com`, username `Ernxax1`, role `student` (`profiles` tablosuna SQL ile eklendi) |

Seed veriler: `meblah_types`, `levels` Supabase'de hazır.

---

## Henüz Yapılmayan / Açık Konular

1. **Admin'den başka kullanıcının şifresini sıfırlama** — uygulama içi endpoint yok; sadece Supabase panel veya forgot-password akışı.
2. **Custom SMTP** — production için Supabase'e bağlanmalı (rate limit sorunu).
3. **Şifre sıfırlama maili** — test sırasında rate limit dolabiliyor; 1 saat sonra veya panelden tekrar dene.

---

## API Özet

- Health: `GET /health`
- Auth: `POST /auth/register`, `/auth/login`, `/auth/forgot-password`, `GET /auth/me`
- Admin, grup, ders, yoklama, not, ödev, gamification route'ları mevcut
- Detay: `docs/DEVELOPMENT_PLAN.md`

---

## Son Yapılan Değişiklikler

`backend/services/auth_service.py` → `forgot_password()`:

- Rate limit → HTTP 429 + Türkçe mesaj
- Redirect URL hatası → HTTP 400 + hangi URL eklenmeli bilgisi
- Diğer hatalar loglanıyor; kayıtsız email için enumeration koruması devam (genel başarı mesajı)

---

## Yeni Sohbete Yapıştırılacak Prompt

```
Zerdali eğitim platformu üzerinde çalışıyorum.

Proje: Flask backend (port 5001) + Next.js frontend + Supabase (tiuonbkygmawldpjrxre).
Workspace: /Users/xelil/Desktop/freelance-works/zerdali/zerdali-app
Handoff: docs/CONTEXT_HANDOFF.md dosyasını oku.

M0–M21 tamamlandı (auth, RBAC, gruplar, dersler, yoklama, notlar, ödevler, gamification, admin/öğrenci UI, deploy docs).

Bilinen sorunlar:
- Şifre sıfırlama maili Supabase rate limit yüzünden gelmeyebilir (429 düzeltildi, SMTP önerildi)
- Admin'den kullanıcı şifre sıfırlama henüz yok

Önemli dosyalar: backend/services/auth_service.py, backend/utils/security.py, frontend/src/lib/auth-recovery.ts, frontend/src/lib/api.ts

Test öğrenci: erennartbatir@gmail.com (UID 3623a1b1-4227-43aa-9051-e9ae69eb740a)

[buraya yeni görevini yaz]
```

---

**Not:** `.env` / `.env.local` içindeki gerçek API anahtarlarını sohbete yapıştırma; anahtarlar local'de duruyor.
