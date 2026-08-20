-- ============================================================================
-- SI-VERENA — Pastikan akun seed SELALU ADA & AKTIF di database (aman utk deploy).
-- Strategi:
--   1) INSERT OR IGNORE  -> user yang BELUM ada dibuat (tidak mengubah user lama).
--   2) UPDATE is_active=1 -> akun seed yang sengaja/tidak sengaja dinonaktifkan
--                            diaktifkan kembali (password user lama TIDAK diubah).
--   3) Password hash bcrypt 'admin123' hanya dipakai utk INSERT (user baru).
-- Akun non-seed / password yang sudah diubah oleh admin TIDAK tersentuh.
-- ============================================================================

-- Admin & Kabag
INSERT OR IGNORE INTO users (id, email, full_name, password_hash, role, biro_id, nama_biro, is_active) VALUES
('user-admin', 'admin@setda-sumbar.id', 'Administrator', '$2a$10$Ywmx/3LaitJ15q6BUju1leuzlxxETcGMe5npSxcjldQJBwkPu.X0m', 'admin', NULL, NULL, 1),
('user-kabag', 'kabag@setda-sumbar.id', 'Kepala Bagian Verifikasi', '$2a$10$Ywmx/3LaitJ15q6BUju1leuzlxxETcGMe5npSxcjldQJBwkPu.X0m', 'kabag', NULL, NULL, 1);

-- Verifikator (utama + pembagian wilayah biro)
INSERT OR IGNORE INTO users (id, email, full_name, password_hash, role, biro_id, nama_biro, is_active) VALUES
('user-verif',  'verifikator@setda-sumbar.id',  'Verifikator Utama', '$2a$10$Ywmx/3LaitJ15q6BUju1leuzlxxETcGMe5npSxcjldQJBwkPu.X0m', 'verifikator', NULL, NULL, 1),
('user-verif1', 'verifikator1@setda-sumbar.id', 'Verifikator 1', '$2a$10$Ywmx/3LaitJ15q6BUju1leuzlxxETcGMe5npSxcjldQJBwkPu.X0m', 'verifikator_1', NULL, NULL, 1),
('user-verif2', 'verifikator2@setda-sumbar.id', 'Verifikator 2', '$2a$10$Ywmx/3LaitJ15q6BUju1leuzlxxETcGMe5npSxcjldQJBwkPu.X0m', 'verifikator_2', NULL, NULL, 1),
('user-verif3', 'verifikator3@setda-sumbar.id', 'Verifikator 3', '$2a$10$Ywmx/3LaitJ15q6BUju1leuzlxxETcGMe5npSxcjldQJBwkPu.X0m', 'verifikator_3', NULL, NULL, 1);

-- Pimpinan
INSERT OR IGNORE INTO users (id, email, full_name, password_hash, role, biro_id, nama_biro, is_active) VALUES
('user-pimpinan', 'pimpinan@setda-sumbar.id', 'Pimpinan SETDA', '$2a$10$Ywmx/3LaitJ15q6BUju1leuzlxxETcGMe5npSxcjldQJBwkPu.X0m', 'pimpinan', NULL, NULL, 1);

-- Admin biro (9 biro)
INSERT OR IGNORE INTO users (id, email, full_name, password_hash, role, biro_id, nama_biro, is_active) VALUES
('user-biro001', 'pemotda@setda-sumbar.id', 'Admin Biro PEM-OTDA', '$2a$10$Ywmx/3LaitJ15q6BUju1leuzlxxETcGMe5npSxcjldQJBwkPu.X0m', 'biro_pemerintahan', 'biro-001', 'Biro Pemerintahan dan Otonomi Daerah', 1),
('user-biro002', 'kesra@setda-sumbar.id', 'Admin Biro KESRA', '$2a$10$Ywmx/3LaitJ15q6BUju1leuzlxxETcGMe5npSxcjldQJBwkPu.X0m', 'biro_kesra', 'biro-002', 'Biro Kesejahteraan Rakyat', 1),
('user-biro003', 'hukum@setda-sumbar.id', 'Admin Biro Hukum', '$2a$10$Ywmx/3LaitJ15q6BUju1leuzlxxETcGMe5npSxcjldQJBwkPu.X0m', 'biro_hukum', 'biro-003', 'Biro Hukum', 1),
('user-biro004', 'pbj@setda-sumbar.id', 'Admin Biro PBJ', '$2a$10$Ywmx/3LaitJ15q6BUju1leuzlxxETcGMe5npSxcjldQJBwkPu.X0m', 'biro_pbj', 'biro-004', 'Biro Pengadaan Barang dan Jasa', 1),
('user-biro005', 'ekon@setda-sumbar.id', 'Admin Biro Perekonomian', '$2a$10$Ywmx/3LaitJ15q6BUju1leuzlxxETcGMe5npSxcjldQJBwkPu.X0m', 'biro_perekonomian', 'biro-005', 'Biro Perekonomian', 1),
('user-biro006', 'admbang@setda-sumbar.id', 'Admin Biro ADM-BANG', '$2a$10$Ywmx/3LaitJ15q6BUju1leuzlxxETcGMe5npSxcjldQJBwkPu.X0m', 'biro_adpem', 'biro-006', 'Biro Administrasi Pembangunan', 1),
('user-biro007', 'adpim@setda-sumbar.id', 'Admin Biro ADPIM', '$2a$10$Ywmx/3LaitJ15q6BUju1leuzlxxETcGMe5npSxcjldQJBwkPu.X0m', 'biro_adpim', 'biro-007', 'Biro Administrasi Pimpinan', 1),
('user-biro008', 'umum@setda-sumbar.id', 'Admin Biro Umum', '$2a$10$Ywmx/3LaitJ15q6BUju1leuzlxxETcGMe5npSxcjldQJBwkPu.X0m', 'biro_umum', 'biro-008', 'Biro Umum', 1),
('user-biro009', 'organisasi@setda-sumbar.id', 'Admin Biro Organisasi', '$2a$10$Ywmx/3LaitJ15q6BUju1leuzlxxETcGMe5npSxcjldQJBwkPu.X0m', 'biro_organisasi', 'biro-009', 'Biro Organisasi', 1);

-- Re-aktifkan akun seed jika pernah dinonaktifkan (tanpa mengubah password).
UPDATE users SET is_active = 1, updated_at = datetime('now')
WHERE email IN (
  'admin@setda-sumbar.id', 'kabag@setda-sumbar.id',
  'verifikator@setda-sumbar.id', 'verifikator1@setda-sumbar.id', 'verifikator2@setda-sumbar.id', 'verifikator3@setda-sumbar.id',
  'pimpinan@setda-sumbar.id',
  'pemotda@setda-sumbar.id', 'kesra@setda-sumbar.id', 'hukum@setda-sumbar.id', 'pbj@setda-sumbar.id',
  'ekon@setda-sumbar.id', 'admbang@setda-sumbar.id', 'adpim@setda-sumbar.id', 'umum@setda-sumbar.id', 'organisasi@setda-sumbar.id'
);
