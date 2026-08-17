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
