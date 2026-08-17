# Frontend Baru: si-verena-setda-web

## URL
**https://si-verena-setda-web.pages.dev**

## Koneksi ke Backend
- Backend (Worker): https://si-verena-api.si-verena-setda.workers.dev
- Frontend dibuild dengan `VITE_API_URL` -> Worker, jadi semua panggilan API
  (login, upload, pemeriksaan, file referensi) langsung ke backend yang sudah
  ter-fix (bcrypt, JWT_SECRET, /api/user admin-only, upload referensi 201).

## Auto-Deploy
- Repo: fzalmi-cloud/si-verena-setda-cf (branch main)
- Workflow: .github/workflows/deploy-frontend.yml -> Pages project si-verena-setda-web
- Env VITE_API_URL sudah diset di deployment_configs project.

## Proyek Pages lain di akun
- si-verena-setda (lama, terikat git fzalmi/si-verena-setda, belum di-update)
- si-verena-setda-fix (versi perantara, bisa dihapus)
- si-verena-setda-web (BARU - dipakai sekarang)

## Cara update manual (jika perlu)
cd frontend
VITE_API_URL="https://si-verena-api.si-verena-setda.workers.dev" npm run build
npx wrangler pages deploy dist --project-name si-verena-setda-web
