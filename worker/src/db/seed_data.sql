-- Seed data untuk SI-VERENA SETDA (sesuai schema asli)

-- Biro (upsert)
INSERT OR REPLACE INTO biro (id, nama_biro, kode_biro, kepala_biro, status) VALUES
('biro-001', 'Biro Pemerintahan dan Otonomi Daerah', 'PEM-OTDA', 'Drs. Ahmad Fauzi, M.Si', 'aktif'),
('biro-002', 'Biro Kesejahteraan Rakyat', 'KESRA', 'Dra. Sri Mulyani, M.Pd', 'aktif'),
('biro-003', 'Biro Hukum', 'HUKUM', 'Dr. Hendra Kusuma, S.H., M.H', 'aktif'),
('biro-004', 'Biro Pengadaan Barang dan Jasa', 'PBJ', 'Ir. Bambang Sutrisno, M.T', 'aktif'),
('biro-005', 'Biro Perekonomian', 'EKON', 'Dra. Ratna Sari, M.M', 'aktif'),
('biro-006', 'Biro Administrasi Pembangunan', 'ADM-BANG', 'Ir. Dedi Kuswanto, M.Eng', 'aktif'),
('biro-007', 'Biro Administrasi Pimpinan', 'ADPIM', 'Drs. Eko Prasetyo, M.Si', 'aktif'),
('biro-008', 'Biro Umum', 'UMUM', 'Dra. Nurhayati, M.M', 'aktif'),
('biro-009', 'Biro Organisasi', 'ORG', 'Dr. Rizal Fadillah, S.STP., M.Si', 'aktif');

-- Users
INSERT OR REPLACE INTO users (id, email, full_name, password_hash, role, biro_id, nama_biro, is_active) VALUES
('user-admin', 'admin@setda-sumbar.id', 'Administrator', 'admin123', 'admin', NULL, NULL, 1),
('user-kabag', 'kabag@setda-sumbar.id', 'Kepala Bagian Verifikasi', 'admin123', 'kabag', NULL, NULL, 1),
('user-verif1', 'verifikator1@setda-sumbar.id', 'Verifikator 1', 'admin123', 'verifikator_1', NULL, NULL, 1),
('user-verif2', 'verifikator2@setda-sumbar.id', 'Verifikator 2', 'admin123', 'verifikator_2', NULL, NULL, 1),
('user-verif3', 'verifikator3@setda-sumbar.id', 'Verifikator 3', 'admin123', 'verifikator_3', NULL, NULL, 1),
('user-pimpinan', 'pimpinan@setda-sumbar.id', 'Pimpinan SETDA', 'admin123', 'pimpinan', NULL, NULL, 1),
('user-biro001', 'pemotda@setda-sumbar.id', 'Admin Biro PEM-OTDA', 'admin123', 'biro_pemerintahan', 'biro-001', 'Biro Pemerintahan dan Otonomi Daerah', 1),
('user-biro002', 'kesra@setda-sumbar.id', 'Admin Biro KESRA', 'admin123', 'biro_kesra', 'biro-002', 'Biro Kesejahteraan Rakyat', 1),
('user-biro003', 'hukum@setda-sumbar.id', 'Admin Biro Hukum', 'admin123', 'biro_hukum', 'biro-003', 'Biro Hukum', 1),
('user-biro004', 'pbj@setda-sumbar.id', 'Admin Biro PBJ', 'admin123', 'biro_pbj', 'biro-004', 'Biro Pengadaan Barang dan Jasa', 1),
('user-biro005', 'ekon@setda-sumbar.id', 'Admin Biro Perekonomian', 'admin123', 'biro_perekonomian', 'biro-005', 'Biro Perekonomian', 1),
('user-biro006', 'admbang@setda-sumbar.id', 'Admin Biro ADM-BANG', 'admin123', 'biro_adpem', 'biro-006', 'Biro Administrasi Pembangunan', 1),
('user-biro007', 'adpim@setda-sumbar.id', 'Admin Biro ADPIM', 'admin123', 'biro_adpim', 'biro-007', 'Biro Administrasi Pimpinan', 1),
('user-biro008', 'umum@setda-sumbar.id', 'Admin Biro Umum', 'admin123', 'biro_umum', 'biro-008', 'Biro Umum', 1),
('user-biro009', 'organisasi@setda-sumbar.id', 'Admin Biro Organisasi', 'admin123', 'biro_organisasi', 'biro-009', 'Biro Organisasi', 1);

-- Periode Renja
INSERT OR REPLACE INTO periode_renja (id, tahun, status, tanggal_mulai, tanggal_selesai, created_at) VALUES
('periode-2027', 2027, 'aktif', '2026-07-01', '2027-06-30', datetime('now')),
('periode-2026', 2026, 'selesai', '2025-07-01', '2026-06-30', datetime('now', '-1 year'));


-- ─────────────────────────────────────────────────────────────────────────────
-- DATA DOKUMEN / HASIL / SKOR / REVISI / FILE REFERENSI: TIDAK DI-SEED.
-- Versi sebelumnya mengisi tabel-tabel ini dengan DATA MOCK (dokumen & URL
-- palsu di si-verena-files.r2.dev yang tidak pernah diunggah, status tidak
-- konsisten, dan file_referensi aktif=0). Hal itu membuat dashboard terlihat
-- "sudah ada data" padahal data palsu.
--
-- Mulai sekarang tabel tersebut dikosongkan; isi hanya lewat upload asli
-- lewat aplikasi. Untuk membersihkan database yang sudah terlanjur ter-seed,
-- jalankan:  wrangler d1 execute si-verena-db --file=./src/db/cleanup_demo_data.sql
-- ─────────────────────────────────────────────────────────────────────────────
