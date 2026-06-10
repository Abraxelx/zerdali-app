# Zerdali — Dağıtım Rehberi

## Backend (Railway)

1. Railway'de yeni proje oluştur
2. GitHub repo'yu bağla, root directory: `backend`
3. Environment variables ekle:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_KEY`
   - `SUPABASE_JWT_SECRET`
   - `SECRET_KEY`
4. Deploy otomatik başlar; health check: `/health`

## Frontend (Vercel)

1. Vercel'de yeni proje oluştur
2. Root directory: `frontend`
3. Environment variables:
   - `NEXT_PUBLIC_API_URL` → Railway backend URL
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy

## Supabase

Production öncesi kontrol listesi:
- RLS politikaları aktif
- Storage bucket'ları oluşturulmuş: `profile-images`, `assignment-files`, `submission-files`, `icons`
- `profiles` trigger çalışıyor
- Superadmin kullanıcı mevcut

## Lokal Geliştirme

```bash
# Terminal 1 — Backend
cd backend && source venv/bin/activate && flask --app app run --debug

# Terminal 2 — Frontend
cd frontend && npm run dev
```
