# SI-VERENA SETDA — Frontend & Backend (Live)

## Frontend (satu-satunya, aktif)
**https://si-verena-setda-web.pages.dev**

## Backend (Worker)
**https://si-verena-api.si-verena-setda.workers.dev**

- Frontend dibuild dengan `VITE_API_URL` -> Worker.
- Semua endpoint backend sudah ter-fix:
  - Upload referensi `POST /api/file-ref` (tidak lagi 500)
  - Login bcrypt (bukan password hardcoded)
  - `JWT_SECRET` di-set via wrangler secret (token lama invalid)
  - CRUD user hanya admin (`/api/user`)
  - Register selalu role `biro_pengusul`
  - Data mock seed sudah dibersihkan (cleanup_demo_data.sql)

## Auto-Deploy
- Repo: fzalmi-cloud/si-verena-setda-cf (branch main)
- `deploy-worker.yml` -> Worker si-verena-api
- `deploy-frontend.yml` -> Pages project si-verena-setda-web
- Secret GitHub: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, VITE_API_URL

## Riwayat Cleanup
- 2026-08-17: Proyek Pages lama dihapus (si-verena-setda, si-verena-setda-fix).
  Hanya si-verena-setda-web yang tersisa.

## Manual Deploy (jika perlu)
```bash
cd frontend
VITE_API_URL="https://si-verena-api.si-verena-setda.workers.dev" npm run build
npx wrangler pages deploy dist --project-name si-verena-setda-web
```
