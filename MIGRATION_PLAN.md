# MIGRATION PLAN: Base44 → Cloudflare Stack
## SI-VERENA SETDA (Sistem Verifikasi Renja Sekretariat Daerah)

---

## 📋 Daftar Isi

1. [Ringkasan Eksekutif](#1-ringkasan-eksekutif)
2. [Arsitektur Target](#2-arsitektur-target)
3. [Phase 1: Setup & Foundation](#3-phase-1-setup--foundation)
4. [Phase 2: Database Migration (D1)](#4-phase-2-database-migration-d1)
5. [Phase 3: Backend API (Workers)](#5-phase-3-backend-api-workers)
6. [Phase 4: Auth System](#6-phase-4-auth-system)
7. [Phase 5: File Storage (R2)](#7-phase-5-file-storage-r2)
8. [Phase 6: LLM Integration](#8-phase-6-llm-integration)
9. [Phase 7: Frontend Migration](#9-phase-7-frontend-migration)
10. [Phase 8: Testing & Deployment](#10-phase-8-testing--deployment)
11. [Timeline & Estimasi](#11-timeline--estimasi)
12. [Risk & Mitigasi](#12-risk--mitigasi)
13. [Checklist](#13-checklist)

---

## 1. Ringkasan Eksekutif

### Mengapa Migrasi?

| Aspek | Base44 (Sekarang) | Cloudflare (Target) |
|-------|-------------------|---------------------|
| **Vendor Lock-in** | Tinggi — terikat Base44 | Rendah — standard stack |
| **Biaya** | Tidak diketahui (tergantung Base44) | **100% GRATIS** atau ~$2-5/bulan |
| **Kontrol** | Terbatas | Penuh atas code & infra |
| **LLM Provider** | Hanya Claude (via Base44) | **Workers AI (GRATIS!)**, DeepSeek, dll |
| **Skalabilitas** | Terikat platform | Global CDN, auto-scale |
| **Data Sovereignty** | Di server Base44 | Di Cloudflare (bisa dipilih region) |

### Scope Migrasi

- **12 entity types** → 12 D1 tables
- **~115 API calls** → Workers API endpoints
- **4 LLM integration points** → **Workers AI (GRATIS!)** / DeepSeek fallback
- **4 file upload points** → R2 presigned URLs
- **Auth system** → Custom JWT di Workers
- **Frontend** → Tetap Vite React, deploy ke Pages

---

## 2. Arsitektur Target

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLOUDFLARE INFRASTRUCTURE                     │
│                         (100% Free Tier)                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────┐                                                  │
│  │ Cloudflare     │  Static files (Vite build output)                │
│  │ Pages          │  Custom domain: si-verena.setda-sumbar.id        │
│  │ (Frontend)     │  Auto-deploy dari Git                            │
│  └───────┬────────┘                                                  │
│          │ fetch('/api/*')                                            │
│          ▼                                                            │
│  ┌────────────────────────────────────────────────────────────┐      │
│  │ Cloudflare Workers (API Backend)                            │      │
│  │ Hono.js router                                              │      │
│  │                                                              │      │
│  │  POST /api/auth/login          → JWT token                  │      │
│  │  POST /api/auth/register       → Create user                │      │
│  │  GET  /api/auth/me             → Current user               │      │
│  │                                                              │      │
│  │  GET    /api/dokumen            → List dokumen              │      │
│  │  POST   /api/dokumen            → Upload dokumen            │      │
│  │  PUT    /api/dokumen/:id        → Update dokumen            │      │
│  │  DELETE /api/dokumen/:id        → Hapus dokumen             │      │
│  │                                                              │      │
│  │  GET    /api/pemeriksaan        → List hasil                │      │
│  │  POST   /api/pemeriksaan/auto   → Auto verifikasi (LLM)    │      │
│  │  PUT    /api/pemeriksaan/:id    → Update hasil              │      │
│  │                                                              │      │
│  │  GET    /api/draft              → List draft                │      │
│  │  POST   /api/draft/generate     → Generate draft (LLM)      │      │
│  │  GET    /api/draft/:id/bab      → List BAB                  │      │
│  │  PUT    /api/draft/bab/:id      → Update BAB                │      │
│  │  POST   /api/draft/bab/:id/regen → Regenerate BAB (LLM)    │      │
│  │                                                              │      │
│  │  POST   /api/upload/presign     → Get R2 upload URL         │      │
│  │  GET    /api/upload/:key        → Get file URL              │      │
│  │                                                              │      │
│  │  GET    /api/biro               → List biro                 │      │
│  │  GET    /api/skor               → List skor                 │      │
│  │  GET    /api/revisi             → List riwayat revisi       │      │
│  │  GET    /api/file-ref           → List file referensi       │      │
│  └──────────────────────────────────────────────────────────────┘      │
│                    │              │              │                      │
│         ┌──────────┘              │              └──────────┐          │
│         ▼                        ▼                         ▼          │
│  ┌──────────────┐    ┌──────────────────┐    ┌──────────────────┐     │
│  │ D1 Database  │    │ R2 Object Storage│    │ LLM Provider     │     │
│  │ (SQLite)     │    │ (File Upload)    │    │                  │     │
│  │              │    │                  │    │ Workers AI       │     │
│  │ 12 tables    │    │ PDF, DOCX, XLSX  │    │ **(GRATIS!)**    │     │
│  │ 5GB free     │    │ Images           │    │                  │     │
│  │              │    │ 10GB free        │    │ @cf/qwen/qwen3   │     │
│  │ Indexes on:  │    │                  │    │ -30b-a3b-fp8     │     │
│  │ - nama_biro  │    │ Structure:       │    │ 10K neurons/day  │     │
│  │ - tahun      │    │ /dokumen/{id}    │    │                  │     │
│  │ - kategori   │    │ /referensi/{id}  │    │ ~80 dokumen/day  │     │
│  └──────────────┘    └──────────────────┘    └──────────────────┘     │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Phase 1: Setup & Foundation

**Durasi: 1-2 hari**

### 1.1 Buat Struktur Project Monorepo

```
si-verena-setda/
├── frontend/                    # Vite React app (existing code)
│   ├── src/
│   │   ├── api/
│   │   │   ├── client.js        # NEW — API client (replace base44Client)
│   │   │   └── endpoints.js     # NEW — API endpoint definitions
│   │   ├── hooks/
│   │   │   ├── useAuth.js       # NEW — Auth hook
│   │   │   ├── useDokumen.js    # NEW — Data hooks
│   │   │   ├── usePemeriksaan.js
│   │   │   ├── useDraft.js
│   │   │   └── ...
│   │   ├── lib/
│   │   │   ├── AuthContext.jsx   # MODIFIED — pakai custom auth
│   │   │   ├── autoVerifikasi.js # MODIFIED — pakai new API
│   │   │   └── ...
│   │   ├── pages/               # UNCHANGED — minor import changes
│   │   └── components/          # UNCHANGED
│   ├── vite.config.js           # MODIFIED — remove base44 plugin
│   ├── wrangler.toml            # NEW — Pages config
│   └── package.json             # MODIFIED — remove @base44 deps
│
├── worker/                      # Cloudflare Workers (NEW)
│   ├── src/
│   │   ├── index.ts             # Main entry — Hono router
│   │   ├── middleware/
│   │   │   ├── auth.ts          # JWT verification middleware
│   │   │   ├── cors.ts          # CORS middleware
│   │   │   └── rbac.ts          # Role-based access control
│   │   ├── routes/
│   │   │   ├── auth.ts          # /api/auth/*
│   │   │   ├── dokumen.ts       # /api/dokumen/*
│   │   │   ├── pemeriksaan.ts   # /api/pemeriksaan/*
│   │   │   ├── draft.ts         # /api/draft/*
│   │   │   ├── upload.ts        # /api/upload/*
│   │   │   ├── biro.ts          # /api/biro/*
│   │   │   ├── skor.ts          # /api/skor/*
│   │   │   ├── revisi.ts        # /api/revisi/*
│   │   │   └── fileRef.ts       # /api/file-ref/*
│   │   ├── db/
│   │   │   ├── schema.ts        # D1 table definitions
│   │   │   ├── queries.ts       # Reusable query functions
│   │   │   └── seed.ts          # Seed data (9 biro, admin user)
│   │   ├── llm/
│   │   │   ├── provider.ts      # LLM provider — Workers AI
│   │   │   └── prompts.ts       # Shared prompt templates
│   │   ├── storage/
│   │   │   └── r2.ts            # R2 upload/download helpers
│   │   └── types.ts             # Shared TypeScript types
│   ├── drizzle.config.ts        # Drizzle ORM config
│   ├── wrangler.toml            # Workers + D1 + R2 config
│   ├── package.json
│   └── tsconfig.json
│
├── package.json                 # Root — workspace scripts
├── .github/
│   └── workflows/
│       ├── deploy-frontend.yml  # Auto-deploy Pages
│       └── deploy-worker.yml    # Auto-deploy Workers
└── MIGRATION_PLAN.md            # This file
```

### 1.2 Setup Cloudflare Account

```bash
# Install Wrangler CLI
npm install -g wrangler

# Login ke Cloudflare
wrangler login

# Buat D1 database
wrangler d1 create si-verena-db
# Output: database_id = "xxxx-xxxx-xxxx"

# Buat R2 bucket
wrangler r2 bucket create si-verena-files

# Verify
wrangler d1 list
wrangler r2 bucket list
```

### 1.3 Inisialisasi Worker Project

```bash
mkdir worker && cd worker
npm init -y
npm install hono drizzle-orm @libsql/client
npm install -D wrangler @cloudflare/workers-types drizzle-kit typescript
```

### 1.4 Inisialisasi Frontend (dari existing)

```bash
# Copy existing frontend
cp -r src/ frontend/src/
cp index.html frontend/
cp vite.config.js frontend/
cp tailwind.config.js frontend/
cp postcss.config.js frontend/
cp jsconfig.json frontend/
cp components.json frontend/

# Install deps (tanpa base44)
cd frontend
npm install
npm uninstall @base44/sdk @base44/vite-plugin
```

---

## 4. Phase 2: Database Migration (D1)

**Durasi: 2-3 hari**

### 2.1 Schema D1 (SQL)

File: `worker/src/db/schema.sql`

```sql
-- ============================================
-- SI-VERENA D1 Schema
-- ============================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'biro_pengusul',
  biro_id TEXT,
  nama_biro TEXT,
  avatar_url TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Biro table
CREATE TABLE IF NOT EXISTS biro (
  id TEXT PRIMARY KEY,
  nama_biro TEXT NOT NULL,
  kode_biro TEXT,
  kepala_biro TEXT,
  status TEXT DEFAULT 'aktif',
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_biro_status ON biro(status);

-- Periode Renja
CREATE TABLE IF NOT EXISTS periode_renja (
  id TEXT PRIMARY KEY,
  tahun INTEGER NOT NULL UNIQUE,
  status TEXT DEFAULT 'aktif',
  tanggal_mulai TEXT,
  tanggal_selesai TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Dokumen Renja
CREATE TABLE IF NOT EXISTS dokumen_renja (
  id TEXT PRIMARY KEY,
  biro_id TEXT,
  nama_biro TEXT NOT NULL,
  periode_tahun INTEGER NOT NULL,
  level_unit TEXT DEFAULT 'biro',
  jenis_dokumen TEXT NOT NULL,
  sub_jenis TEXT,
  nama_file TEXT,
  file_url TEXT,
  file_key TEXT,
  file_size INTEGER,
  status_upload TEXT DEFAULT 'diunggah',
  status_dokumen TEXT DEFAULT 'diunggah',
  sumber_dokumen TEXT,
  parent_document_id TEXT,
  versi INTEGER DEFAULT 1,
  catatan_upload TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (biro_id) REFERENCES biro(id),
  FOREIGN KEY (parent_document_id) REFERENCES dokumen_renja(id)
);
CREATE INDEX idx_dokumen_nama_biro ON dokumen_renja(nama_biro);
CREATE INDEX idx_dokumen_tahun ON dokumen_renja(periode_tahun);
CREATE INDEX idx_dokumen_jenis ON dokumen_renja(jenis_dokumen);
CREATE INDEX idx_dokumen_status ON dokumen_renja(status_upload);

-- Hasil Pemeriksaan
CREATE TABLE IF NOT EXISTS hasil_pemeriksaan (
  id TEXT PRIMARY KEY,
  dokumen_renja_id TEXT,
  biro_id TEXT,
  nama_biro TEXT NOT NULL,
  periode_tahun INTEGER,
  kategori TEXT NOT NULL,
  sub_kategori TEXT,
  item_pemeriksaan TEXT NOT NULL,
  status TEXT DEFAULT 'perlu_review_manual',
  halaman TEXT,
  kutipan_dokumen TEXT,
  catatan_otomatis TEXT,
  catatan_verifikator TEXT,
  status_validasi TEXT DEFAULT 'belum_divalidasi',
  divalidasi_oleh TEXT,
  tanggal_validasi TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (dokumen_renja_id) REFERENCES dokumen_renja(id)
);
CREATE INDEX idx_hasil_biro ON hasil_pemeriksaan(nama_biro);
CREATE INDEX idx_hasil_tahun ON hasil_pemeriksaan(periode_tahun);
CREATE INDEX idx_hasil_kategori ON hasil_pemeriksaan(kategori);
CREATE INDEX idx_hasil_status ON hasil_pemeriksaan(status);

-- Skor Dokumen
CREATE TABLE IF NOT EXISTS skor_dokumen (
  id TEXT PRIMARY KEY,
  biro_id TEXT,
  nama_biro TEXT NOT NULL,
  periode_tahun INTEGER NOT NULL,
  skor_kelengkapan REAL,
  skor_sistematika REAL,
  skor_tabel REAL,
  skor_matriks REAL,
  skor_konsistensi REAL,
  skor_substansi REAL,
  skor_total REAL,
  level_kesiapan TEXT,
  status_final TEXT DEFAULT 'draft',
  tanggal_pemeriksaan TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_skor_biro ON skor_dokumen(nama_biro);
CREATE INDEX idx_skor_tahun ON skor_dokumen(periode_tahun);

-- File Referensi
CREATE TABLE IF NOT EXISTS file_referensi (
  id TEXT PRIMARY KEY,
  judul TEXT NOT NULL,
  deskripsi TEXT,
  jenis TEXT DEFAULT 'pedoman_renja',
  nama_file TEXT,
  file_url TEXT NOT NULL,
  file_key TEXT,
  diunggah_oleh TEXT,
  aktif INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Draft Renja Setda
CREATE TABLE IF NOT EXISTS draft_renja_setda (
  id TEXT PRIMARY KEY,
  tahun INTEGER NOT NULL,
  versi INTEGER DEFAULT 1,
  judul TEXT NOT NULL,
  status TEXT DEFAULT 'draft_otomatis',
  generated_by TEXT,
  validated_by TEXT,
  generated_at TEXT,
  validated_at TEXT,
  catatan_umum TEXT,
  jumlah_biro INTEGER,
  biro_digunakan TEXT,
  ringkasan_eksekutif TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_draft_tahun ON draft_renja_setda(tahun);
CREATE INDEX idx_draft_status ON draft_renja_setda(status);

-- Draft Renja BAB
CREATE TABLE IF NOT EXISTS draft_renja_bab (
  id TEXT PRIMARY KEY,
  draft_id TEXT NOT NULL,
  nomor_bab TEXT NOT NULL,
  judul_bab TEXT NOT NULL,
  isi_bab TEXT,
  status_bab TEXT DEFAULT 'draft_otomatis',
  catatan_verifikator TEXT,
  sumber_data TEXT,
  urutan REAL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (draft_id) REFERENCES draft_renja_setda(id)
);
CREATE INDEX idx_bab_draft ON draft_renja_bab(draft_id);

-- Draft Renja Rekap Biro
CREATE TABLE IF NOT EXISTS draft_renja_rekap_biro (
  id TEXT PRIMARY KEY,
  draft_id TEXT NOT NULL,
  biro_id TEXT,
  nama_biro TEXT NOT NULL,
  jumlah_program INTEGER DEFAULT 0,
  jumlah_kegiatan INTEGER DEFAULT 0,
  jumlah_subkegiatan INTEGER DEFAULT 0,
  total_pagu REAL DEFAULT 0,
  jumlah_catatan INTEGER DEFAULT 0,
  status_kesiapan TEXT DEFAULT 'tidak_ada_dokumen',
  dokumen_id TEXT,
  skor_kesiapan REAL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (draft_id) REFERENCES draft_renja_setda(id)
);

-- Draft Renja Validasi
CREATE TABLE IF NOT EXISTS draft_renja_validasi (
  id TEXT PRIMARY KEY,
  draft_id TEXT NOT NULL,
  komponen TEXT NOT NULL,
  sumber_data TEXT,
  status TEXT DEFAULT 'tidak_ditemukan',
  catatan_sistem TEXT,
  aksi_perbaikan TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (draft_id) REFERENCES draft_renja_setda(id)
);

-- Riwayat Revisi
CREATE TABLE IF NOT EXISTS riwayat_revisi (
  id TEXT PRIMARY KEY,
  biro_id TEXT,
  nama_biro TEXT NOT NULL,
  periode_tahun INTEGER,
  versi INTEGER,
  jenis_dokumen TEXT,
  file_url TEXT,
  file_key TEXT,
  catatan_revisi TEXT,
  diunggah_oleh TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_revisi_biro ON riwayat_revisi(nama_biro);
CREATE INDEX idx_revisi_tahun ON riwayat_revisi(periode_tahun);
```

### 2.2 Seed Data

File: `worker/src/db/seed.sql`

```sql
-- Seed 9 Biro SETDA
INSERT INTO biro (id, nama_biro, kode_biro, status) VALUES
  ('biro-001', 'Biro Pemerintahan dan Otonomi Daerah', 'PEM-OTDA', 'aktif'),
  ('biro-002', 'Biro Kesejahteraan Rakyat', 'KESRA', 'aktif'),
  ('biro-003', 'Biro Hukum', 'HUKUM', 'aktif'),
  ('biro-004', 'Biro Pengadaan Barang dan Jasa', 'PBJ', 'aktif'),
  ('biro-005', 'Biro Perekonomian', 'EKON', 'aktif'),
  ('biro-006', 'Biro Administrasi Pembangunan', 'ADM-BANG', 'aktif'),
  ('biro-007', 'Biro Administrasi Pimpinan', 'ADPIM', 'aktif'),
  ('biro-008', 'Biro Umum', 'UMUM', 'aktif'),
  ('biro-009', 'Biro Organisasi', 'ORG', 'aktif');

-- Seed Admin user (password: admin123 — hash di-generate saat setup)
INSERT INTO users (id, email, full_name, password_hash, role) VALUES
  ('user-admin', 'admin@setda-sumbar.id', 'Administrator', '$argon2id$...', 'admin');

-- Seed periode aktif
INSERT INTO periode_renja (id, tahun, status) VALUES
  ('periode-2027', 2027, 'aktif');
```

### 2.3 Drizzle ORM Setup

File: `worker/drizzle.config.ts`

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  driver: 'd1',
  dbCredentials: {
    wranglerConfigPath: 'wrangler.toml',
    dbName: 'si-verena-db',
  },
});
```

### 2.4 Wrangler Config

File: `worker/wrangler.toml`

```toml
name = "si-verena-api"
main = "src/index.ts"
compatibility_date = "2024-12-01"

[[d1_databases]]
binding = "DB"
database_name = "si-verena-db"
database_id = "YOUR_D1_DATABASE_ID"

[[r2_buckets]]
binding = "R2"
bucket_name = "si-verena-files"

[vars]
JWT_SECRET = "your-jwt-secret-change-this"
DEEPSEEK_API_KEY = "sk-xxxx"
LLM_PROVIDER = "deepseek"  # atau "workers-ai"
FRONTEND_URL = "https://si-verena.pages.dev"
```

---

## 5. Phase 3: Backend API (Workers)

**Durasi: 5-7 hari**

### 3.1 Main Entry Point

File: `worker/src/index.ts`

```typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authMiddleware } from './middleware/auth';
import { authRoutes } from './routes/auth';
import { dokumenRoutes } from './routes/dokumen';
import { pemeriksaanRoutes } from './routes/pemeriksaan';
import { draftRoutes } from './routes/draft';
import { uploadRoutes } from './routes/upload';
import { biroRoutes } from './routes/biro';
import { skorRoutes } from './routes/skor';
import { revisiRoutes } from './routes/revisi';
import { fileRefRoutes } from './routes/fileRef';

type Bindings = {
  DB: D1Database;
  R2: R2Bucket;
  JWT_SECRET: string;
  DEEPSEEK_API_KEY: string;
  LLM_PROVIDER: string;
  FRONTEND_URL: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// CORS
app.use('/api/*', cors({
  origin: ['http://localhost:5173', 'https://si-verena.pages.dev'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Public routes
app.route('/api/auth', authRoutes);

// Protected routes
app.use('/api/*', authMiddleware);
app.route('/api/dokumen', dokumenRoutes);
app.route('/api/pemeriksaan', pemeriksaanRoutes);
app.route('/api/draft', draftRoutes);
app.route('/api/upload', uploadRoutes);
app.route('/api/biro', biroRoutes);
app.route('/api/skor', skorRoutes);
app.route('/api/revisi', revisiRoutes);
app.route('/api/file-ref', fileRefRoutes);

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

export default app;
```

### 3.2 Endpoint Mapping (Base44 → Workers)

| Base44 Call | Workers Endpoint | Method |
|-------------|-----------------|--------|
| `base44.auth.loginWithProvider()` | `/api/auth/login` | POST |
| `base44.auth.me()` | `/api/auth/me` | GET |
| `base44.auth.logout()` | `/api/auth/logout` | POST |
| `base44.entities.DokumenRenja.list()` | `/api/dokumen` | GET |
| `base44.entities.DokumenRenja.filter({...})` | `/api/dokumen?nama_biro=X&tahun=Y` | GET |
| `base44.entities.DokumenRenja.create({...})` | `/api/dokumen` | POST |
| `base44.entities.DokumenRenja.update(id, {...})` | `/api/dokumen/:id` | PUT |
| `base44.entities.HasilPemeriksaan.list()` | `/api/pemeriksaan` | GET |
| `base44.entities.HasilPemeriksaan.filter({...})` | `/api/pemeriksaan?nama_biro=X&kategori=Y` | GET |
| `base44.entities.HasilPemeriksaan.bulkCreate([...])` | `/api/pemeriksaan/bulk` | POST |
| `base44.entities.HasilPemeriksaan.update(id, {...})` | `/api/pemeriksaan/:id` | PUT |
| `base44.entities.SkorDokumen.filter({...})` | `/api/skor?nama_biro=X&tahun=Y` | GET |
| `base44.entities.SkorDokumen.create({...})` | `/api/skor` | POST |
| `base44.entities.SkorDokumen.update(id, {...})` | `/api/skor/:id` | PUT |
| `base44.entities.DraftRenjaSetda.list()` | `/api/draft` | GET |
| `base44.entities.DraftRenjaSetda.get(id)` | `/api/draft/:id` | GET |
| `base44.entities.DraftRenjaSetda.create({...})` | `/api/draft` | POST |
| `base44.entities.DraftRenjaSetda.update(id, {...})` | `/api/draft/:id` | PUT |
| `base44.entities.DraftRenjaBab.filter({...})` | `/api/draft/:id/bab` | GET |
| `base44.entities.DraftRenjaBab.create({...})` | `/api/draft/:id/bab` | POST |
| `base44.entities.DraftRenjaBab.update(id, {...})` | `/api/draft/bab/:id` | PUT |
| `base44.entities.Biro.list()` | `/api/biro` | GET |
| `base44.entities.FileReferensi.filter({...})` | `/api/file-ref?aktif=true` | GET |
| `base44.entities.FileReferensi.create({...})` | `/api/file-ref` | POST |
| `base44.entities.FileReferensi.delete(id)` | `/api/file-ref/:id` | DELETE |
| `base44.entities.RiwayatRevisi.filter({...})` | `/api/revisi?nama_biro=X&tahun=Y` | GET |
| `base44.entities.RiwayatRevisi.list()` | `/api/revisi` | GET |
| `base44.entities.User.list()` | `/api/users` | GET |
| `base44.entities.User.update(id, {...})` | `/api/users/:id` | PUT |
| `base44.entities.User.delete(id)` | `/api/users/:id` | DELETE |
| `base44.integrations.Core.UploadFile({...})` | `/api/upload/presign` → R2 | POST |
| `base44.integrations.Core.InvokeLLM({...})` | `/api/llm/generate` | POST |

### 3.3 Contoh Route Implementation

File: `worker/src/routes/dokumen.ts`

```typescript
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

type Bindings = {
  DB: D1Database;
  R2: R2Bucket;
};

export const dokumenRoutes = new Hono<{ Bindings: Bindings }>();

// GET /api/dokumen — list dengan filter
dokumenRoutes.get('/', async (c) => {
  const namaBiro = c.req.query('nama_biro');
  const tahun = c.req.query('tahun');
  const jenis = c.req.query('jenis_dokumen');
  const limit = parseInt(c.req.query('limit') || '100');
  const offset = parseInt(c.req.query('offset') || '0');

  let query = 'SELECT * FROM dokumen_renja WHERE 1=1';
  const params: any[] = [];

  if (namaBiro) {
    query += ' AND nama_biro = ?';
    params.push(namaBiro);
  }
  if (tahun) {
    query += ' AND periode_tahun = ?';
    params.push(parseInt(tahun));
  }
  if (jenis) {
    query += ' AND jenis_dokumen = ?';
    params.push(jenis);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const { results } = await c.env.DB.prepare(query).bind(...params).all();
  return c.json(results);
});

// POST /api/dokumen — create dokumen
dokumenRoutes.post('/', async (c) => {
  const body = await c.req.json();
  const id = crypto.randomUUID();

  await c.env.DB.prepare(
    `INSERT INTO dokumen_renja (id, biro_id, nama_biro, periode_tahun, level_unit, jenis_dokumen, sub_jenis, nama_file, file_url, file_key, status_upload, catatan_upload)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, body.biro_id, body.nama_biro, body.periode_tahun,
    body.level_unit || 'biro', body.jenis_dokumen, body.sub_jenis,
    body.nama_file, body.file_url, body.file_key,
    body.status_upload || 'diunggah', body.catatan_upload
  ).run();

  return c.json({ id, ...body }, 201);
});

// PUT /api/dokumen/:id — update dokumen
dokumenRoutes.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();

  const sets: string[] = [];
  const params: any[] = [];

  for (const [key, value] of Object.entries(body)) {
    if (key !== 'id') {
      sets.push(`${key} = ?`);
      params.push(value);
    }
  }

  sets.push("updated_at = datetime('now')");
  params.push(id);

  await c.env.DB.prepare(
    `UPDATE dokumen_renja SET ${sets.join(', ')} WHERE id = ?`
  ).bind(...params).run();

  return c.json({ id, ...body });
});
```

---

## 6. Phase 4: Auth System

**Durasi: 2-3 hari**

### 4.1 JWT-based Authentication

File: `worker/src/routes/auth.ts`

```typescript
import { Hono } from 'hono';
import { sign, verify } from 'hono/jwt';

export const authRoutes = new Hono();

// POST /api/auth/login
authRoutes.post('/login', async (c) => {
  const { email, password } = await c.req.json();

  const user = await c.env.DB.prepare(
    'SELECT * FROM users WHERE email = ? AND is_active = 1'
  ).bind(email).first();

  if (!user) {
    return c.json({ error: 'Email atau password salah' }, 401);
  }

  // Verify password (gunakan argon2 atau bcrypt via WASM)
  const validPassword = await verifyPassword(password, user.password_hash);
  if (!validPassword) {
    return c.json({ error: 'Email atau password salah' }, 401);
  }

  const token = await sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      biro_id: user.biro_id,
      nama_biro: user.nama_biro,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
    },
    c.env.JWT_SECRET
  );

  return c.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      biro_id: user.biro_id,
      nama_biro: user.nama_biro,
    },
  });
});

// POST /api/auth/register
authRoutes.post('/register', async (c) => {
  const { email, password, full_name, role, biro_id, nama_biro } = await c.req.json();

  const existing = await c.env.DB.prepare(
    'SELECT id FROM users WHERE email = ?'
  ).bind(email).first();

  if (existing) {
    return c.json({ error: 'Email sudah terdaftar' }, 409);
  }

  const id = crypto.randomUUID();
  const password_hash = await hashPassword(password);

  await c.env.DB.prepare(
    `INSERT INTO users (id, email, full_name, password_hash, role, biro_id, nama_biro)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, email, full_name, password_hash, role || 'biro_pengusul', biro_id, nama_biro).run();

  return c.json({ id, email, full_name, role }, 201);
});

// GET /api/auth/me
authRoutes.get('/me', async (c) => {
  const payload = c.get('jwtPayload');
  const user = await c.env.DB.prepare(
    'SELECT id, email, full_name, role, biro_id, nama_biro, avatar_url FROM users WHERE id = ?'
  ).bind(payload.sub).first();

  if (!user) {
    return c.json({ error: 'User tidak ditemukan' }, 404);
  }

  return c.json(user);
});
```

### 4.2 Auth Middleware

File: `worker/src/middleware/auth.ts`

```typescript
import { Context, Next } from 'hono';
import { verify } from 'hono/jwt';

export const authMiddleware = async (c: Context, next: Next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Token tidak ditemukan' }, 401);
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const payload = await verify(token, c.env.JWT_SECRET);
    c.set('jwtPayload', payload);
    await next();
  } catch (err) {
    return c.json({ error: 'Token tidak valid atau expired' }, 401);
  }
};
```

### 4.3 Frontend Auth Client

File: `frontend/src/api/client.js`

```javascript
const API_BASE = import.meta.env.VITE_API_URL || 'https://si-verena-api.your-subdomain.workers.dev';

class ApiClient {
  constructor() {
    this.baseUrl = API_BASE;
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  async request(path, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      this.setToken(null);
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  // Auth
  login(email, password) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  register(data) {
    return this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  me() {
    return this.request('/api/auth/me');
  }

  // Generic CRUD
  list(entity, params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/${entity}${query ? `?${query}` : ''}`);
  }

  get(entity, id) {
    return this.request(`/api/${entity}/${id}`);
  }

  create(entity, data) {
    return this.request(`/api/${entity}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  update(entity, id, data) {
    return this.request(`/api/${entity}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  delete(entity, id) {
    return this.request(`/api/${entity}/${id}`, {
      method: 'DELETE',
    });
  }

  // Bulk operations
  bulkCreate(entity, items) {
    return this.request(`/api/${entity}/bulk`, {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
  }
}

export const api = new ApiClient();
```

---

## 7. Phase 5: File Storage (R2)

**Durasi: 1-2 hari**

### 5.1 Upload Flow

```
Frontend                    Workers                    R2
   │                          │                        │
   │  1. Request presign URL  │                        │
   │─────────────────────────>│                        │
   │                          │  2. Generate URL       │
   │                          │───────────────────────>│
   │  3. Return presign URL   │                        │
   │<─────────────────────────│                        │
   │                          │                        │
   │  4. Upload file directly │                        │
   │──────────────────────────────────────────────────>│
   │                          │                        │
   │  5. Confirm upload       │                        │
   │─────────────────────────>│                        │
   │                          │  6. Save metadata      │
   │                          │─────── D1 ────────────>│
   │  7. Return file URL      │                        │
   │<─────────────────────────│                        │
```

### 5.2 R2 Upload Handler

File: `worker/src/routes/upload.ts`

```typescript
import { Hono } from 'hono';

export const uploadRoutes = new Hono();

// POST /api/upload — direct upload ke R2
uploadRoutes.post('/', async (c) => {
  const formData = await c.req.formData();
  const file = formData.get('file') as File;
  const folder = formData.get('folder') || 'dokumen';

  if (!file) {
    return c.json({ error: 'File tidak ditemukan' }, 400);
  }

  const key = `${folder}/${crypto.randomUUID()}/${file.name}`;

  await c.env.R2.put(key, file, {
    httpMetadata: {
      contentType: file.type,
      contentDisposition: `attachment; filename="${file.name}"`,
    },
  });

  const fileUrl = `${c.env.FRONTEND_URL}/api/files/${key}`;

  return c.json({
    file_url: fileUrl,
    file_key: key,
    nama_file: file.name,
    file_size: file.size,
  });
});

// GET /api/files/:key — serve file dari R2
uploadRoutes.get('/files/*', async (c) => {
  const key = c.req.path.replace('/api/files/', '');

  const object = await c.env.R2.get(key);

  if (!object) {
    return c.json({ error: 'File tidak ditemukan' }, 404);
  }

  const headers = new Headers();
  headers.set('Content-Type', object.httpMetadata?.contentType || 'application/octet-stream');
  headers.set('Content-Disposition', object.httpMetadata?.contentDisposition || 'inline');
  headers.set('Cache-Control', 'public, max-age=31536000');

  return new Response(object.body, { headers });
});
```

### 5.3 Frontend File Upload Hook

File: `frontend/src/hooks/useUpload.js`

```javascript
import { useState } from 'react';
import { api } from '@/api/client';

export function useUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const upload = async (file, folder = 'dokumen') => {
    setUploading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);

      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) throw new Error('Upload gagal');

      const result = await response.json();
      setProgress(100);
      return result;
    } finally {
      setUploading(false);
    }
  };

  return { upload, uploading, progress };
}
```

---

## 8. Phase 6: LLM Integration

**Durasi: 2-3 hari**

### 6.1 LLM Provider — Workers AI (GRATIS!)

> **UPDATE**: Kini menggunakan **Cloudflare Workers AI** sebagai LLM utama (100% GRATIS)
> - Free tier: **10,000 Neurons/hari** (~80 dokumen/hari)
> - Model: `@cf/qwen/qwen3-30b-a3b-fp8` (best value)
> - Tidak perlu API key external
> - Latensi ~100ms (edge)

File: `worker/src/llm/provider.ts`

```typescript
export interface LLMProvider {
  generate(prompt: string, options?: {
    model?: string;
    responseJsonSchema?: object;
  }): Promise<string>;
}

// Workers AI — Primary (GRATIS)
export class WorkersAIProvider implements LLMProvider {
  constructor(private ai: Ai) {}

  async generate(prompt: string, options?: {
    model?: string;
    responseJsonSchema?: object;
  }): Promise<string> {
    const model = options?.model || '@cf/qwen/qwen3-30b-a3b-fp8';
    
    const response = await this.ai.run(model, {
      messages: [
        {
          role: 'system',
          content: 'Kamu adalah asisten AI untuk verifikasi dokumen perencanaan pemerintahan Indonesia. Berikan jawaban yang akurat dan formal dalam format JSON.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 2048,
      response_format: options?.responseJsonSchema 
        ? { type: 'json_object' } 
        : undefined,
    });

    return response.response;
  }
}

// Factory function
export function getLLMProvider(env: { AI: Ai }): LLMProvider {
  return new WorkersAIProvider(env.AI);
}
```

### 6.2 Workers AI Model Recommendations

| Use Case | Model | Neurons/M Input | Neurons/M Output |
|----------|-------|-----------------|------------------|
| **Auto Verifikasi** (default) | `@cf/qwen/qwen3-30b-a3b-fp8` | 4,625 | 30,475 |
| **Draft Generation** (complex) | `@cf/meta/llama-3.1-8b-instruct-fp8-fast` | 4,119 | 34,868 |
| **Simple Tasks** (fast) | `@cf/meta/llama-3.2-1b-instruct` | 2,457 | 18,252 |

### 6.3 Kapasitas Free Tier

```
Free Tier: 10,000 Neurons/hari

Estimasi per Auto Verifikasi:
- Input: ~1,500 tokens = 6.9 neurons
- Output: ~800 tokens = 24.4 neurons
- Total: ~31 neurons per call

Kapasitas: 10,000 ÷ 31 = ~322 calls/hari
Dokumen (4 kategori): ~80 dokumen/hari

Cukup untuk volume SETDA! 🎉
```

### 6.4 LLM Route

File: `worker/src/routes/llm.ts` (atau tambahkan ke draft.ts)

```typescript
import { getLLMProvider } from '../llm/provider';

// POST /api/llm/generate
app.post('/api/llm/generate', async (c) => {
  const { prompt, model, responseJsonSchema } = await c.req.json();

  const provider = getLLMProvider({ AI: c.env.AI });

  try {
    const result = await provider.generate(prompt, {
      model,
      responseJsonSchema,
    });

    return c.json({ result });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});
```

### 6.5 Frontend LLM Hook

File: `frontend/src/hooks/useLLM.js`

```javascript
import { api } from '@/api/client';

export function useLLM() {
  const generate = async (prompt, options = {}) => {
    return api.request('/api/llm/generate', {
      method: 'POST',
      body: JSON.stringify({
        prompt,
        model: options.model,
        responseJsonSchema: options.responseJsonSchema,
      }),
    });
  };

  return { generate };
}
```

### 6.6 Update autoVerifikasi.js

```javascript
// BEFORE (Base44):
const resp = await base44.integrations.Core.InvokeLLM({
  prompt,
  file_urls: allFileUrls,
  response_json_schema: { ... },
});

// AFTER (Workers AI — GRATIS):
const { result: resp } = await api.request('/api/llm/generate', {
  method: 'POST',
  body: JSON.stringify({
    prompt,
    // file_urls tidak didukung Workers AI, extract text dulu
    responseJsonSchema: { ... },
  }),
});
```

> **Note**: Workers AI tidak support `file_urls` langsung. Perlu extract text dari dokumen terlebih dahulu di backend sebelum kirim ke LLM.

---

## 9. Phase 7: Frontend Migration

**Durasi: 3-5 hari**

### 7.1 File Changes Summary

| File | Action | Changes |
|------|--------|---------|
| `src/api/base44Client.js` | **REPLACE** | Ganti dengan `client.js` (new API client) |
| `src/lib/AuthContext.jsx` | **REWRITE** | Pakai custom JWT auth |
| `src/lib/autoVerifikasi.js` | **MODIFY** | Replace `base44.integrations.Core.InvokeLLM` |
| `src/pages/penyusunan/GenerateDraft.jsx` | **MODIFY** | Replace `base44.integrations.Core.InvokeLLM` |
| `src/pages/penyusunan/EditorDraft.jsx` | **MODIFY** | Replace `base44.integrations.Core.InvokeLLM` |
| `src/components/upload/FileUploader.jsx` | **MODIFY** | Replace `base44.integrations.Core.UploadFile` |
| `src/pages/UploadRenja.jsx` | **MODIFY** | Replace upload call |
| `src/pages/UploadRevisi.jsx` | **MODIFY** | Replace upload call |
| `src/pages/FileReferensi.jsx` | **MODIFY** | Replace upload call |
| `vite.config.js` | **MODIFY** | Remove `@base44/vite-plugin` |
| `package.json` | **MODIFY** | Remove `@base44/sdk`, `@base44/vite-plugin` |
| `src/lib/app-params.js` | **DELETE** | Tidak diperlukan lagi |
| `src/components/ProtectedRoute.jsx` | **MODIFY** | Simplify auth check |
| Semua pages (17 files) | **MODIFY** | Replace `base44.entities.*` → `api.*` |

### 7.2 Pattern Replacement Guide

**Pattern 1: Data Fetching**

```javascript
// BEFORE (Base44 + React Query):
const { data } = useQuery({
  queryKey: ['dokumen', namaBiro, tahun],
  queryFn: () => base44.entities.DokumenRenja.filter(
    { nama_biro: namaBiro, periode_tahun: parseInt(tahun) },
    '-created_date',
    100
  ),
});

// AFTER (New API + React Query):
const { data } = useQuery({
  queryKey: ['dokumen', namaBiro, tahun],
  queryFn: () => api.list('dokumen', {
    nama_biro: namaBiro,
    tahun: tahun,
    limit: 100,
  }),
});
```

**Pattern 2: Create/Update**

```javascript
// BEFORE:
await base44.entities.DokumenRenja.create({ ... });
await base44.entities.DokumenRenja.update(id, { ... });

// AFTER:
await api.create('dokumen', { ... });
await api.update('dokumen', id, { ... });
```

**Pattern 3: Bulk Create**

```javascript
// BEFORE:
await base44.entities.HasilPemeriksaan.bulkCreate(items);

// AFTER:
await api.bulkCreate('pemeriksaan', items);
```

**Pattern 4: LLM Call**

```javascript
// BEFORE:
const result = await base44.integrations.Core.InvokeLLM({
  prompt,
  file_urls: urls,
  model: 'claude_sonnet_4_6',
  response_json_schema: schema,
});

// AFTER:
const { result } = await api.request('/api/llm/generate', {
  method: 'POST',
  body: JSON.stringify({
    prompt,
    fileUrls: urls,
    responseJsonSchema: schema,
  }),
});
```

**Pattern 5: File Upload**

```javascript
// BEFORE:
const { file_url } = await base44.integrations.Core.UploadFile({ file });

// AFTER:
const { upload } = useUpload();
const { file_url, file_key } = await upload(file, 'dokumen');
```

### 7.3 New AuthContext

File: `frontend/src/lib/AuthContext.jsx`

```jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import { api } from '@/api/client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setIsLoadingAuth(false);
      return;
    }

    try {
      const userData = await api.me();
      setUser(userData);
      setIsAuthenticated(true);
    } catch (error) {
      localStorage.removeItem('auth_token');
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const login = async (email, password) => {
    const { token, user: userData } = await api.login(email, password);
    api.setToken(token);
    setUser(userData);
    setIsAuthenticated(true);
    return userData;
  };

  const register = async (data) => {
    return api.register(data);
  };

  const logout = () => {
    api.setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      login,
      register,
      logout,
      checkAuth,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
```

### 7.4 Updated vite.config.js

```javascript
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  logLevel: 'error',
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8787', // Workers dev server
        changeOrigin: true,
      },
    },
  },
});
```

---

## 10. Phase 8: Testing & Deployment

**Durasi: 2-3 hari**

### 8.1 Local Development Setup

```bash
# Terminal 1: Workers dev server
cd worker
wrangler dev --local
# Running di http://localhost:8787

# Terminal 2: Frontend dev server
cd frontend
npm run dev
# Running di http://localhost:5173
```

### 8.2 Testing Checklist

```
□ Auth
  □ Register user baru
  □ Login dengan email/password
  □ Logout
  □ Protected routes redirect ke login
  □ Role-based access (admin, verifikator, biro_pengusul)

□ Dokumen
  □ List dokumen per biro
  □ Upload dokumen (PDF, DOCX, XLSX)
  □ Update status dokumen
  □ Download file dari R2

□ Pemeriksaan
  □ List hasil pemeriksaan
  □ Filter by biro, kategori, tahun
  □ Update catatan verifikator
  □ Bulk create hasil auto verifikasi

□ Auto Verifikasi (LLM)
  □ Jalankan auto verifikasi 1 kategori
  □ Jalankan auto verifikasi semua kategori
  □ Hasil tersimpan ke D1
  □ Error handling jika LLM gagal

□ Draft Renja
  □ Generate draft baru (5 BAB + ringkasan)
  □ Edit BAB manual
  □ Regenerate BAB individual
  □ Export DOCX
  □ Export PDF

□ Dashboard
  □ Stat cards tampil dengan data benar
  □ Charts render dengan data benar
  □ Biro progress table tampil

□ File Referensi
  □ Upload file referensi
  □ List file referensi aktif
  □ Delete file referensi
```

### 8.3 Deployment

**Frontend (Cloudflare Pages):**

```bash
cd frontend
npm run build

# Deploy via Wrangler
wrangler pages deploy dist --project-name=si-verena

# Atau via Git (auto-deploy)
# Hubungkan repo ke Cloudflare Pages dashboard
```

**Backend (Cloudflare Workers):**

```bash
cd worker

# Run migrations
wrangler d1 migrations apply si-verena-db --remote

# Seed data
wrangler d1 execute si-verena-db --file=./src/db/seed.sql --remote

# Deploy
wrangler deploy
```

### 8.4 Environment Variables

**Workers (wrangler.toml):**
```toml
[ai]
binding = "AI"

[vars]
JWT_SECRET = "production-secret-change-me"
FRONTEND_URL = "https://si-verena.pages.dev"
# LLM menggunakan Workers AI (GRATIS) — tidak perlu API key!
```

**Frontend (.env.production):**
```
VITE_API_URL=https://si-verena-api.your-subdomain.workers.dev
```

---

## 11. Timeline & Estimasi

```
Week 1:
├── Day 1-2: Phase 1 — Setup & Foundation
├── Day 3-5: Phase 2 — Database Migration (D1)
└── Day 5-7: Phase 3 — Backend API (Workers) [mulai]

Week 2:
├── Day 1-3: Phase 3 — Backend API (Workers) [selesai]
├── Day 3-4: Phase 4 — Auth System
├── Day 4-5: Phase 5 — File Storage (R2)
└── Day 5-7: Phase 6 — LLM Integration

Week 3:
├── Day 1-4: Phase 7 — Frontend Migration
├── Day 4-5: Phase 8 — Testing
└── Day 5-7: Phase 8 — Deployment & Debugging
```

**Total: ~3 minggu (1 developer)**

---

## 12. Risk & Mitigasi

| Risk | Impact | Mitigation |
|------|--------|------------|
| D1 query limit (complex joins) | Medium | Denormalize data, gunakan indexes |
| Workers CPU time limit (10ms free) | Medium | Optimize queries, gunakan D1 batch |
| Workers AI daily limit (10K neurons) | Medium | Monitor usage, fallback ke model lebih kecil |
| LLM response timeout | High | Set timeout, retry dengan model lebih kecil |
| File size limit R2 (unlimited) | Low | Compress files sebelum upload |
| JWT secret exposure | High | Gunakan Cloudflare Secrets (`wrangler secret put`) |
| D1 free tier write limit (100K/day) | Low | Volume project ini sangat di bawah limit |
| Workers AI model unavailable | Low | Fallback ke model lain (`@cf/meta/llama-3.2-3b-instruct`) |

---

## 13. Checklist

### Pre-Migration
- [ ] Cloudflare account created
- [ ] D1 database created
- [ ] R2 bucket created
- [ ] Wrangler CLI installed
- [ ] ~~DeepSeek API key obtained~~ — Tidak perlu! Pakai Workers AI
- [ ] Existing project backed up

### Phase 1: Setup
- [ ] Monorepo structure created
- [ ] Worker project initialized
- [ ] Frontend project initialized (tanpa base44)
- [ ] wrangler.toml configured

### Phase 2: Database
- [ ] D1 schema executed
- [ ] Seed data inserted
- [ ] Indexes created
- [ ] Test queries work

### Phase 3: Backend
- [ ] Hono router setup
- [ ] All 10 route files created
- [ ] CORS configured
- [ ] Error handling implemented

### Phase 4: Auth
- [ ] Login endpoint works
- [ ] Register endpoint works
- [ ] JWT generation works
- [ ] JWT verification middleware works
- [ ] Role-based access works

### Phase 5: Storage
- [ ] R2 upload works
- [ ] File serving works
- [ ] File deletion works

### Phase 6: LLM
- [ ] Workers AI binding configured (`[ai]` di wrangler.toml)
- [ ] WorkersAIProvider implemented
- [ ] Prompt templates migrated
- [ ] JSON response parsing works
- [ ] Model fallback logic works
- [ ] Monitor neuron usage di dashboard

### Phase 7: Frontend
- [ ] All `base44.entities.*` calls replaced
- [ ] All `base44.integrations.*` calls replaced
- [ ] AuthContext rewritten
- [ ] FileUploader updated
- [ ] All pages tested

### Phase 8: Deploy
- [ ] Workers deployed
- [ ] D1 migrations applied remotely
- [ ] Seed data inserted remotely
- [ ] Pages deployed
- [ ] Custom domain configured
- [ ] All features tested in production

---

## 📎 Referensi

- [Cloudflare D1 Docs](https://developers.cloudflare.com/d1/)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Cloudflare R2 Docs](https://developers.cloudflare.com/r2/)
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Hono.js Docs](https://hono.dev/)
- [Drizzle ORM + D1](https://orm.drizzle.team/docs/get-started/d1)
- [Workers AI Docs](https://developers.cloudflare.com/workers-ai/)
- [Workers AI Pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/)
- [DeepSeek API Docs](https://platform.deepseek.com/api-docs) — Fallback jika perlu
