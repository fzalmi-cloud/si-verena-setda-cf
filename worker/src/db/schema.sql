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
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Biro table
CREATE TABLE IF NOT EXISTS biro (
  id TEXT PRIMARY KEY,
  nama_biro TEXT NOT NULL,
  kode_biro TEXT,
  kepala_biro TEXT,
  status TEXT DEFAULT 'aktif',
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_biro_status ON biro(status);

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
CREATE INDEX IF NOT EXISTS idx_dokumen_nama_biro ON dokumen_renja(nama_biro);
CREATE INDEX IF NOT EXISTS idx_dokumen_tahun ON dokumen_renja(periode_tahun);
CREATE INDEX IF NOT EXISTS idx_dokumen_jenis ON dokumen_renja(jenis_dokumen);
CREATE INDEX IF NOT EXISTS idx_dokumen_status ON dokumen_renja(status_upload);

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
CREATE INDEX IF NOT EXISTS idx_hasil_biro ON hasil_pemeriksaan(nama_biro);
CREATE INDEX IF NOT EXISTS idx_hasil_tahun ON hasil_pemeriksaan(periode_tahun);
CREATE INDEX IF NOT EXISTS idx_hasil_kategori ON hasil_pemeriksaan(kategori);
CREATE INDEX IF NOT EXISTS idx_hasil_status ON hasil_pemeriksaan(status);

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
CREATE INDEX IF NOT EXISTS idx_skor_biro ON skor_dokumen(nama_biro);
CREATE INDEX IF NOT EXISTS idx_skor_tahun ON skor_dokumen(periode_tahun);

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
CREATE INDEX IF NOT EXISTS idx_draft_tahun ON draft_renja_setda(tahun);
CREATE INDEX IF NOT EXISTS idx_draft_status ON draft_renja_setda(status);

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
CREATE INDEX IF NOT EXISTS idx_bab_draft ON draft_renja_bab(draft_id);

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
CREATE INDEX IF NOT EXISTS idx_revisi_biro ON riwayat_revisi(nama_biro);
CREATE INDEX IF NOT EXISTS idx_revisi_tahun ON riwayat_revisi(periode_tahun);
