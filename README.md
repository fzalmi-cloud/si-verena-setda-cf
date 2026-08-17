# SI-VERENA SETDA

**Sistem Verifikasi Renja Sekretariat Daerah**

Sistem untuk memverifikasi dokumen Rencana Kerja (Renja) Biro di Sekretariat Daerah menggunakan AI.

## Arsitektur

```
┌─────────────────────────────────────────────────────────────┐
│                    CLOUDFLARE STACK                          │
│                    (100% Free Tier)                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Frontend (React)  →  Workers (Hono)  →  D1 Database         │
│       Pages              API              SQLite             │
│                              ↓                               │
│                         Workers AI                           │
│                      (LLM - GRATIS!)                         │
│                              ↓                               │
│                         R2 Storage                           │
│                       (File Upload)                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Fitur

- ✅ Upload dokumen Renja (PDF, DOCX, XLSX)
- ✅ Auto verifikasi dokumen menggunakan AI
- ✅ Dashboard monitoring progress
- ✅ Generate draft Renja SETDA
- ✅ Skor kesiapan per biro
- ✅ Riwayat revisi

## Teknologi

| Komponen | Teknologi |
|----------|-----------|
| Frontend | React + Vite + Tailwind CSS |
| Backend | Cloudflare Workers + Hono.js |
| Database | Cloudflare D1 (SQLite) |
| Storage | Cloudflare R2 |
| LLM | Workers AI (Qwen3 30B) |
| Auth | JWT |

## Quick Start

### Prerequisites

- Node.js 18+
- Cloudflare account (gratis)
- Wrangler CLI

### Installation

```bash
# Clone repository
git clone <repo-url>
cd si-verena-setda

# Install all dependencies
npm run install:all

# Setup Cloudflare
wrangler login
wrangler d1 create si-verena-db
wrangler r2 bucket create si-verena-files
```

### Configuration

Update `worker/wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "si-verena-db"
database_id = "YOUR_D1_DATABASE_ID"  # Dari output wrangler d1 create
```

### Development

```bash
# Start development servers
npm run dev

# Terminal 1: Workers (http://localhost:8787)
# Terminal 2: Frontend (http://localhost:5173)
```

### Database Setup

```bash
# Run migrations
npm run db:migrate

# Seed data
npm run db:seed
```

### Deployment

```bash
# Deploy backend
npm run deploy

# Deploy frontend
npm run deploy:frontend
```

## Project Structure

```
si-verena-setda/
├── frontend/           # React frontend
│   ├── src/
│   │   ├── api/       # API client
│   │   ├── hooks/     # Custom hooks
│   │   ├── lib/       # Utilities
│   │   ├── pages/     # Page components
│   │   └── components/# UI components
│   └── package.json
│
├── worker/             # Cloudflare Workers
│   ├── src/
│   │   ├── routes/    # API routes
│   │   ├── middleware/# Auth, CORS
│   │   ├── db/        # Database schema
│   │   ├── llm/       # LLM integration
│   │   └── storage/   # R2 helpers
│   ├── wrangler.toml
│   └── package.json
│
├── MIGRATION_PLAN.md   # Migration documentation
└── README.md
```

## API Endpoints

### Auth
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register
- `GET /api/auth/me` - Get current user

### Dokumen
- `GET /api/dokumen` - List dokumen
- `POST /api/dokumen` - Upload dokumen
- `PUT /api/dokumen/:id` - Update dokumen
- `DELETE /api/dokumen/:id` - Hapus dokumen

### Pemeriksaan
- `GET /api/pemeriksaan` - List hasil
- `POST /api/pemeriksaan/auto` - Auto verifikasi
- `PUT /api/pemeriksaan/:id` - Update hasil

### Draft
- `GET /api/draft` - List draft
- `POST /api/draft/generate` - Generate draft
- `PUT /api/draft/bab/:id` - Update BAB

### LLM
- `POST /api/llm/generate` - Generate text
- `GET /api/llm/models` - List models

## LLM Usage

Workers AI gratis untuk 10,000 Neurons/hari (~80 dokumen/hari).

Model yang digunakan:
- **@cf/qwen/qwen3-30b-a3b-fp8** - Best value
- **@cf/meta/llama-3.2-3b-instruct** - General purpose
- **@cf/meta/llama-3.2-1b-instruct** - Fastest

## License

MIT

## ⚠️ Wajib: Konfigurasi Keamanan Sebelum Deploy

**1. JWT_SECRET (kritis — token bisa dipalsukan jika tidak diset)**
```bash
cd worker
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
wrangler secret put JWT_SECRET
```
JWT_SECRET **tidak boleh** ada di `wrangler.toml` (bocor ke repo). Jika belum diset,
semua endpoint API membalas `503 JWT_SECRET belum dikonfigurasi` sebagai pengaman.
Untuk development lokal: salin `worker/.dev.vars.example` → `worker/.dev.vars`.

**2. Password login**
- Verifikasi password memakai `password_hash` (bcrypt) — bukan password hardcoded.
- Data seed lama (plaintext) tetap bisa login dan otomatis di-upgrade ke bcrypt.
- `POST /api/auth/register` selalu membuat role `biro_pengusul` (anti privilege escalation).
- Pembuatan user dengan role khusus hanya melalui `POST /api/user` (admin).

**3. Bersihkan data demo/mock dari database yang sudah ter-seed**
```bash
cd worker
npm run db:cleanup    # hapus dokumen/hasil/skor/revisi/file_ref dummy (data master dipertahankan)
```

**4. Endpoint user hanya untuk admin**
CRUD user berada di `/api/user` (auth + role admin). Endpoint `/api/auth` publik
hanya berisi: `login`, `register`, `me`, `verify-token`.

## Riwayat Patch Keamanan

- `6f32b8f` — fix upload referensi (file-ref 500), login bcrypt, JWT_SECRET, otorisasi `/api/user`, register tanpa role dari client.
- `4e9eabf` — hapus seed data mock, fix bcrypt hash seed admin, fix DELETE R2 (key salah), handle 401 pada upload, onError toast file referensi.

## Deploy Status (2026-08-17)

- **Worker (API)**: `si-verena-api` — versi ter-fix SUDAH LIVE di production
  (semua perbaikan #1-#9 berlaku; JWT_SECRET sudah diset via `wrangler secret put`).
- **Frontend fix**: live di **https://si-verena-setda-fix.pages.dev** (Pages project baru,
  direct upload — project asli `si-verena-setda.pages.dev` masih terikat git ke
  `fzalmi/si-verena-setda` yang hanya bisa di-update oleh pemilik repo).
- Untuk menjadikan frontend fix sebagai situs utama: push kode ke `fzalmi/si-verena-setda`
  (oleh pemilik repo) agar Pages asli auto-rebuild, ATAU pindahkan domain/custom domain
  ke project `si-verena-setda-fix`.

### Deploy ulang frontend (setelah perubahan baru)
```bash
cd frontend
VITE_API_URL="https://si-verena-api.si-verena-setda.workers.dev" npm run build
cd ..
CLOUDFLARE_API_TOKEN=<token> CLOUDFLARE_ACCOUNT_ID=<account> node deploy-pages.mjs si-verena-setda-fix frontend/dist
# atau pakai wrangler:
cd frontend && npx wrangler pages deploy dist --project-name si-verena-setda-fix
```
