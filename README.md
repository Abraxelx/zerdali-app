# Zerdali

Oyunlaştırılmış eğitim platformu — Zerdalyum puan sistemi, Meblağ çarpanları ve seviye ilerlemesi.

## Stack

- **Backend:** Flask + Supabase (PostgreSQL, Auth, Storage)
- **Frontend:** Next.js (App Router)

## Kurulum

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# .env dosyasını Supabase bilgilerinizle doldurun
flask --app app run --debug --port 5001
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

## API

Health check: `GET http://localhost:5001/health`

> **macOS notu:** Port 5000 AirPlay tarafından kullanılır. Backend varsayılan olarak **5001** portunda çalışır.

Tüm endpoint'ler için `docs/DEVELOPMENT_PLAN.md` dosyasına bakın.
