-- ============================================
-- SI-VERENA Seed Data
-- ============================================

-- Seed 9 Biro SETDA
INSERT OR IGNORE INTO biro (id, nama_biro, kode_biro, status) VALUES
  ('biro-001', 'Biro Pemerintahan dan Otonomi Daerah', 'PEM-OTDA', 'aktif'),
  ('biro-002', 'Biro Kesejahteraan Rakyat', 'KESRA', 'aktif'),
  ('biro-003', 'Biro Hukum', 'HUKUM', 'aktif'),
  ('biro-004', 'Biro Pengadaan Barang dan Jasa', 'PBJ', 'aktif'),
  ('biro-005', 'Biro Perekonomian', 'EKON', 'aktif'),
  ('biro-006', 'Biro Administrasi Pembangunan', 'ADM-BANG', 'aktif'),
  ('biro-007', 'Biro Administrasi Pimpinan', 'ADPIM', 'aktif'),
  ('biro-008', 'Biro Umum', 'UMUM', 'aktif'),
  ('biro-009', 'Biro Organisasi', 'ORG', 'aktif');

-- Seed Admin user (password: admin123 - hash akan di-generate saat runtime)
-- Password hash untuk 'admin123' menggunakan bcrypt
INSERT OR IGNORE INTO users (id, email, full_name, password_hash, role) VALUES
  ('user-admin', 'admin@setda-sumbar.id', 'Administrator', '$2a$10$8K1p/a0dL1LXMIgoEDFrwOfMQkW.gFqJyqSu3A8tUnSzUe.DGFCmO', 'admin');

-- Seed Verifikator user
INSERT OR IGNORE INTO users (id, email, full_name, password_hash, role, biro_id, nama_biro) VALUES
  ('user-verif', 'verifikator@setda-sumbar.id', 'Verifikator Utama', '$2a$10$8K1p/a0dL1LXMIgoEDFrwOfMQkW.gFqJyqSu3A8tUnSzUe.DGFCmO', 'verifikator', NULL, NULL);

-- Seed Biro Pengusul users
INSERT OR IGNORE INTO users (id, email, full_name, password_hash, role, biro_id, nama_biro) VALUES
  ('user-biro-001', 'pemotda@setda-sumbar.id', 'Admin Biro PEM-OTDA', '$2a$10$8K1p/a0dL1LXMIgoEDFrwOfMQkW.gFqJyqSu3A8tUnSzUe.DGFCmO', 'biro_pengusul', 'biro-001', 'Biro Pemerintahan dan Otonomi Daerah'),
  ('user-biro-002', 'kesra@setda-sumbar.id', 'Admin Biro KESRA', '$2a$10$8K1p/a0dL1LXMIgoEDFrwOfMQkW.gFqJyqSu3A8tUnSzUe.DGFCmO', 'biro_pengusul', 'biro-002', 'Biro Kesejahteraan Rakyat'),
  ('user-biro-003', 'hukum@setda-sumbar.id', 'Admin Biro Hukum', '$2a$10$8K1p/a0dL1LXMIgoEDFrwOfMQkW.gFqJyqSu3A8tUnSzUe.DGFCmO', 'biro_pengusul', 'biro-003', 'Biro Hukum'),
  ('user-biro-004', 'pbj@setda-sumbar.id', 'Admin Biro PBJ', '$2a$10$8K1p/a0dL1LXMIgoEDFrwOfMQkW.gFqJyqSu3A8tUnSzUe.DGFCmO', 'biro_pengusul', 'biro-004', 'Biro Pengadaan Barang dan Jasa'),
  ('user-biro-005', 'ekon@setda-sumbar.id', 'Admin Biro Perekonomian', '$2a$10$8K1p/a0dL1LXMIgoEDFrwOfMQkW.gFqJyqSu3A8tUnSzUe.DGFCmO', 'biro_pengusul', 'biro-005', 'Biro Perekonomian'),
  ('user-biro-006', 'admbang@setda-sumbar.id', 'Admin Biro ADM-BANG', '$2a$10$8K1p/a0dL1LXMIgoEDFrwOfMQkW.gFqJyqSu3A8tUnSzUe.DGFCmO', 'biro_pengusul', 'biro-006', 'Biro Administrasi Pembangunan'),
  ('user-biro-007', 'adpim@setda-sumbar.id', 'Admin Biro ADPIM', '$2a$10$8K1p/a0dL1LXMIgoEDFrwOfMQkW.gFqJyqSu3A8tUnSzUe.DGFCmO', 'biro_pengusul', 'biro-007', 'Biro Administrasi Pimpinan'),
  ('user-biro-008', 'umum@setda-sumbar.id', 'Admin Biro Umum', '$2a$10$8K1p/a0dL1LXMIgoEDFrwOfMQkW.gFqJyqSu3A8tUnSzUe.DGFCmO', 'biro_pengusul', 'biro-008', 'Biro Umum'),
  ('user-biro-009', 'organisasi@setda-sumbar.id', 'Admin Biro Organisasi', '$2a$10$8K1p/a0dL1LXMIgoEDFrwOfMQkW.gFqJyqSu3A8tUnSzUe.DGFCmO', 'biro_pengusul', 'biro-009', 'Biro Organisasi');

-- Seed periode aktif 2027
INSERT OR IGNORE INTO periode_renja (id, tahun, status) VALUES
  ('periode-2027', 2027, 'aktif');

-- Seed periode sebelumnya 2026
INSERT OR IGNORE INTO periode_renja (id, tahun, status) VALUES
  ('periode-2026', 2026, 'selesai');
