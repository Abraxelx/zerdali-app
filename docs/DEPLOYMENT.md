# Zerdali — Dağıtım Rehberi (Ücretsiz: Render + Vercel)

Repo: https://github.com/Abraxelx/zerdali-app

## Sıra

1. **Render** — backend deploy
2. **Vercel** — frontend deploy
3. **Render env güncelle** — CORS + şifre sıfırlama URL'i
4. **Supabase** — Site URL + Redirect URLs

---

## 1. Backend — Render (ücretsiz)

### A) Blueprint ile (önerilen)

1. https://dashboard.render.com/ → GitHub ile giriş
2. **New** → **Blueprint** → `Abraxelx/zerdali-app` reposunu seç
3. `render.yaml` otomatik algılanır → **Apply**
4. Eksik env değişkenlerini panelden doldur (aşağıdaki tablo)
5. Deploy bitince URL al: `https://zerdali-api.onrender.com` (isim farklı olabilir)
6. Test: `GET https://SENIN-API.onrender.com/health` → `{"status":"ok"}`

### B) Manuel Web Service

| Ayar | Değer |
|------|-------|
| Root Directory | `backend` |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `gunicorn app:app --bind 0.0.0.0:$PORT` |
| Health Check | `/health` |
| Plan | Free |

### Render env değişkenleri

| Key | Değer |
|-----|-------|
| `SUPABASE_URL` | Supabase → Settings → API |
| `SUPABASE_ANON_KEY` | anon public key |
| `SUPABASE_SERVICE_KEY` | service_role secret |
| `SUPABASE_JWT_SECRET` | JWT Secret (tırnaklı olabilir) |
| `SECRET_KEY` | Rastgele uzun string |
| `CORS_ORIGINS` | Vercel URL (deploy sonrası güncelle) |
| `PASSWORD_RESET_REDIRECT_URL` | `https://SENIN-APP.vercel.app/reset-password` |

> İlk deploy'da Vercel URL henüz yoksa `CORS_ORIGINS` için geçici olarak Vercel URL'ini tahmin edebilir veya deploy sonrası güncellersin.

**Env kopyalama scripti** (lokal `.env`'den):

```bash
chmod +x scripts/print-deploy-env.sh
./scripts/print-deploy-env.sh https://zerdali-app.vercel.app https://zerdali-api.onrender.com
```

---

## 2. Frontend — Vercel (ücretsiz)

1. https://vercel.com/new → GitHub ile giriş
2. **Import** → `Abraxelx/zerdali-app`
3. Ayarlar:
   - **Root Directory:** `frontend`
   - Framework: Next.js (otomatik)
4. Environment Variables:

| Key | Değer |
|-----|-------|
| `NEXT_PUBLIC_API_URL` | Render backend URL |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key |

5. **Deploy** → URL: `https://zerdali-app.vercel.app`

---

## 3. Render env güncelle (Vercel URL belli olduktan sonra)

Render → `zerdali-api` → **Environment**:

```
CORS_ORIGINS=https://zerdali-app.vercel.app
PASSWORD_RESET_REDIRECT_URL=https://zerdali-app.vercel.app/reset-password
```

**Manual Deploy** veya otomatik redeploy bekle.

---

## 4. Supabase ayarları

**Authentication → URL Configuration:**

- Site URL: `https://zerdali-app.vercel.app`
- Redirect URLs:
  - `https://zerdali-app.vercel.app/reset-password`
  - `http://localhost:3000/reset-password` (lokal dev)

**Kontrol listesi:**

- [ ] Storage bucket'ları: `profile-images`, `assignment-files`, `submission-files`, `icons`
- [ ] RLS politikaları aktif
- [ ] Superadmin kullanıcı mevcut
- [ ] (Opsiyonel) Custom SMTP — şifre sıfırlama mail limiti için

---

## Canlı test

- [ ] `GET /health` → 200
- [ ] Login (öğrenci + superadmin)
- [ ] Dashboard yükleniyor (points, level)
- [ ] Yoklama alma
- [ ] Şifremi unuttum (mail veya Supabase panel recovery)

---

## Notlar

- **Render free:** 15 dk idle sonra uyur; ilk istek ~30 sn sürebilir
- **Vercel hobby:** Küçük/orta trafik için yeterli
- **`.env` dosyaları repoda yok** — tüm secret'lar Render/Vercel panelinde

## Lokal Geliştirme

```bash
# Terminal 1 — Backend (port 5001)
cd backend && source venv/bin/activate && flask --app app run --debug --port 5001

# Terminal 2 — Frontend
cd frontend && npm run dev
```
