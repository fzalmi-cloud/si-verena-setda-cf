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

-- Dokumen Renja (untuk setiap biro)
INSERT OR REPLACE INTO dokumen_renja (id, biro_id, nama_biro, periode_tahun, level_unit, jenis_dokumen, nama_file, file_url, file_size, status_upload, status_dokumen, versi, catatan_upload, created_at) VALUES
('doc-001-2027', 'biro-001', 'Biro Pemerintahan dan Otonomi Daerah', 2027, 'biro', 'renja_biro', 'Renja_PEM-OTDA_2027.pdf', 'https://si-verena-files.r2.dev/dokumen/Renja_PEM-OTDA_2027.pdf', 245760, 'diunggah', 'sudah_diverifikasi', 2, 'Upload awal, revisi anggaran', datetime('now', '-30 days')),
('doc-002-2027', 'biro-002', 'Biro Kesejahteraan Rakyat', 2027, 'biro', 'renja_biro', 'Renja_KESRA_2027.pdf', 'https://si-verena-files.r2.dev/dokumen/Renja_KESRA_2027.pdf', 198400, 'diunggah', 'sedang_diperiksa', 1, 'Upload awal', datetime('now', '-28 days')),
('doc-003-2027', 'biro-003', 'Biro Hukum', 2027, 'biro', 'renja_biro', 'Renja_HUKUM_2027.pdf', 'https://si-verena-files.r2.dev/dokumen/Renja_HUKUM_2027.pdf', 167800, 'diunggah', 'layak_kirim', 1, 'Upload awal', datetime('now', '-25 days')),
('doc-004-2027', 'biro-004', 'Biro Pengadaan Barang dan Jasa', 2027, 'biro', 'renja_biro', 'Renja_PBJ_2027.pdf', 'https://si-verena-files.r2.dev/dokumen/Renja_PBJ_2027.pdf', 213500, 'diunggah', 'diunggah', 1, 'Upload awal', datetime('now', '-22 days')),
('doc-005-2027', 'biro-005', 'Biro Perekonomian', 2027, 'biro', 'renja_biro', 'Renja_EKON_2027.pdf', 'https://si-verena-files.r2.dev/dokumen/Renja_EKON_2027.pdf', 189200, 'diunggah', 'diunggah', 1, 'Upload awal', datetime('now', '-20 days')),
('doc-006-2027', 'biro-006', 'Biro Administrasi Pembangunan', 2027, 'biro', 'renja_biro', 'Renja_ADM-BANG_2027.pdf', 'https://si-verena-files.r2.dev/dokumen/Renja_ADM-BANG_2027.pdf', 234100, 'diunggah', 'diunggah', 1, 'Upload awal', datetime('now', '-18 days')),
('doc-007-2027', 'biro-007', 'Biro Administrasi Pimpinan', 2027, 'biro', 'renja_biro', 'Renja_ADPIM_2027.pdf', 'https://si-verena-files.r2.dev/dokumen/Renja_ADPIM_2027.pdf', 156800, 'diunggah', 'diunggah', 1, 'Upload awal', datetime('now', '-15 days')),
('doc-008-2027', 'biro-008', 'Biro Umum', 2027, 'biro', 'renja_biro', 'Renja_UMUM_2027.pdf', 'https://si-verena-files.r2.dev/dokumen/Renja_UMUM_2027.pdf', 178900, 'diunggah', 'diunggah', 1, 'Upload awal', datetime('now', '-12 days')),
('doc-009-2027', 'biro-009', 'Biro Organisasi', 2027, 'biro', 'renja_biro', 'Renja_ORG_2027.pdf', 'https://si-verena-files.r2.dev/dokumen/Renja_ORG_2027.pdf', 201300, 'diunggah', 'diunggah', 1, 'Upload awal', datetime('now', '-10 days')),
('doc-setda-2027', NULL, 'SETDA', 2027, 'setda', 'draft_renja_setda', 'Draft_Renja_SETDA_2027.pdf', 'https://si-verena-files.r2.dev/dokumen/Draft_Renja_SETDA_2027.pdf', 567800, 'diunggah', 'diunggah', 1, 'Draft SETDA', datetime('now', '-5 days'));

-- Hasil Pemeriksaan PEM-OTDA
INSERT OR REPLACE INTO hasil_pemeriksaan (id, dokumen_renja_id, biro_id, nama_biro, periode_tahun, kategori, item_pemeriksaan, status, catatan_otomatis, catatan_verifikator, status_validasi, created_at) VALUES
('hasil-001', 'doc-001-2027', 'biro-001', 'Biro Pemerintahan dan Otonomi Daerah', 2027, 'kesesuaian_renstra', 'Kesesuaian dengan Renstra Provinsi', 'sesuai', 'Sudah sesuai dengan Renstra', NULL, 'divalidasi', datetime('now', '-7 days')),
('hasil-002', 'doc-001-2027', 'biro-001', 'Biro Pemerintahan dan Otonomi Daerah', 2027, 'kesesuaian_renstra', 'Kesesuaian dengan RKPD', 'sesuai', 'Program tercantum dalam RKPD', NULL, 'divalidasi', datetime('now', '-7 days')),
('hasil-003', 'doc-001-2027', 'biro-001', 'Biro Pemerintahan dan Otonomi Daerah', 2027, 'kelengkapan_dokumen', 'Terdapat Dokumen Pendukung', 'sesuai', 'Lampiran lengkap', NULL, 'divalidasi', datetime('now', '-7 days')),
('hasil-004', 'doc-001-2027', 'biro-001', 'Biro Pemerintahan dan Otonomi Daerah', 2027, 'analisis_anggaran', 'Realistis dan Terukur', 'perlu_perbaikan', 'Anggaran perlu disesuaikan', 'Setuju, perlu revisi', 'divalidasi', datetime('now', '-7 days')),
('hasil-005', 'doc-001-2027', 'biro-001', 'Biro Pemerintahan dan Otonomi Daerah', 2027, 'indikator_kinerja', 'Target Terukur', 'sesuai', 'Indikator SMART terpenuhi', NULL, 'divalidasi', datetime('now', '-7 days')),
('hasil-006', 'doc-001-2027', 'biro-001', 'Biro Pemerintahan dan Otonomi Daerah', 2027, 'pagu_anggaran', 'Pagu Sesuai DIPA', 'sesuai', 'Pagu sesuai DIPA 2027', NULL, 'divalidasi', datetime('now', '-7 days')),
('hasil-007', 'doc-001-2027', 'biro-001', 'Biro Pemerintahan dan Otonomi Daerah', 2027, 'output_dan_capaian', 'Output Jelas', 'sesuai', 'Output terdefinisi', NULL, 'divalidasi', datetime('now', '-7 days')),
('hasil-008', 'doc-001-2027', 'biro-001', 'Biro Pemerintahan dan Otonomi Daerah', 2027, 'keterkaitan_program', 'Terkait Program Prioritas', 'perlu_perbaikan', 'Perlu tambah program prioritas', 'Perlu ditambahkan', 'divalidasi', datetime('now', '-7 days'));

-- Hasil Pemeriksaan KESRA
INSERT OR REPLACE INTO hasil_pemeriksaan (id, dokumen_renja_id, biro_id, nama_biro, periode_tahun, kategori, item_pemeriksaan, status, catatan_otomatis, status_validasi, created_at) VALUES
('hasil-k001', 'doc-002-2027', 'biro-002', 'Biro Kesejahteraan Rakyat', 2027, 'kesesuaian_renstra', 'Kesesuaian dengan Renstra Provinsi', 'sesuai', 'Sudah sesuai', 'divalidasi', datetime('now', '-6 days')),
('hasil-k002', 'doc-002-2027', 'biro-002', 'Biro Kesejahteraan Rakyat', 2027, 'kelengkapan_dokumen', 'Terdapat Dokumen Pendukung', 'perlu_perbaikan', 'Beberapa lampiran kurang lengkap', 'belum_divalidasi', datetime('now', '-6 days')),
('hasil-k003', 'doc-002-2027', 'biro-002', 'Biro Kesejahteraan Rakyat', 2027, 'analisis_anggaran', 'Realistis dan Terukur', 'sesuai', 'Anggaran realistis', 'divalidasi', datetime('now', '-6 days'));

-- Hasil Pemeriksaan Hukum
INSERT OR REPLACE INTO hasil_pemeriksaan (id, dokumen_renja_id, biro_id, nama_biro, periode_tahun, kategori, item_pemeriksaan, status, catatan_otomatis, status_validasi, created_at) VALUES
('hasil-h001', 'doc-003-2027', 'biro-003', 'Biro Hukum', 2027, 'kesesuaian_renstra', 'Kesesuaian dengan Renstra Provinsi', 'sesuai', 'Sesuai', 'divalidasi', datetime('now', '-5 days')),
('hasil-h002', 'doc-003-2027', 'biro-003', 'Biro Hukum', 2027, 'indikator_kinerja', 'Target Terukur', 'sesuai', 'Target SMART terpenuhi', 'divalidasi', datetime('now', '-5 days'));

-- Skor Dokumen
INSERT OR REPLACE INTO skor_dokumen (id, biro_id, nama_biro, periode_tahun, skor_kelengkapan, skor_sistematika, skor_tabel, skor_matriks, skor_konsistensi, skor_substansi, skor_total, level_kesiapan, status_final, tanggal_pemeriksaan, created_at) VALUES
('skor-001-2027', 'biro-001', 'Biro Pemerintahan dan Otonomi Daerah', 2027, 80.0, 75.0, 70.0, 65.0, 80.0, 75.0, 75.0, 'siap', 'sedang_diperiksa', datetime('now', '-7 days'), datetime('now', '-7 days')),
('skor-002-2027', 'biro-002', 'Biro Kesejahteraan Rakyat', 2027, 70.0, 65.0, 60.0, 55.0, 70.0, 65.0, 64.0, 'perlu_perbaikan', 'sedang_diperiksa', datetime('now', '-6 days'), datetime('now', '-6 days')),
('skor-003-2027', 'biro-003', 'Biro Hukum', 2027, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 'sangat_siap', 'layak_kirim', datetime('now', '-5 days'), datetime('now', '-5 days')),
('skor-004-2027', 'biro-004', 'Biro Pengadaan Barang dan Jasa', 2027, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 'belum_ada', 'draft', datetime('now', '-4 days'), datetime('now', '-4 days')),
('skor-005-2027', 'biro-005', 'Biro Perekonomian', 2027, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 'belum_ada', 'draft', datetime('now', '-3 days'), datetime('now', '-3 days')),
('skor-006-2027', 'biro-006', 'Biro Administrasi Pembangunan', 2027, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 'belum_ada', 'draft', datetime('now', '-2 days'), datetime('now', '-2 days')),
('skor-007-2027', 'biro-007', 'Biro Administrasi Pimpinan', 2027, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 'belum_ada', 'draft', datetime('now', '-2 days'), datetime('now', '-2 days')),
('skor-008-2027', 'biro-008', 'Biro Umum', 2027, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 'belum_ada', 'draft', datetime('now', '-1 days'), datetime('now', '-1 days')),
('skor-009-2027', 'biro-009', 'Biro Organisasi', 2027, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 'belum_ada', 'draft', datetime('now'), datetime('now'));

-- Riwayat Revisi
INSERT OR REPLACE INTO riwayat_revisi (id, biro_id, nama_biro, periode_tahun, versi, jenis_dokumen, file_url, catatan_revisi, diunggah_oleh, created_at) VALUES
('revisi-001', 'biro-001', 'Biro Pemerintahan dan Otonomi Daerah', 2027, 1, 'renja_biro', 'https://si-verena-files.r2.dev/revisi/Renja_PEM-OTDA_v1.pdf', 'Upload awal', 'user-biro001', datetime('now', '-30 days')),
('revisi-002', 'biro-001', 'Biro Pemerintahan dan Otonomi Daerah', 2027, 2, 'renja_biro', 'https://si-verena-files.r2.dev/revisi/Renja_PEM-OTDA_v2.pdf', 'Revisi anggaran kegiatan', 'user-biro001', datetime('now', '-15 days')),
('revisi-003', 'biro-002', 'Biro Kesejahteraan Rakyat', 2027, 1, 'renja_biro', 'https://si-verena-files.r2.dev/revisi/Renja_KESRA_v1.pdf', 'Upload awal', 'user-biro002', datetime('now', '-28 days')),
('revisi-004', 'biro-003', 'Biro Hukum', 2027, 1, 'renja_biro', 'https://si-verena-files.r2.dev/revisi/Renja_HUKUM_v1.pdf', 'Upload awal', 'user-biro003', datetime('now', '-25 days'));

-- File Referensi
INSERT OR REPLACE INTO file_referensi (id, judul, deskripsi, jenis, nama_file, file_url, diunggah_oleh, aktif, created_at) VALUES
('fileref-001', 'Pedoman Penyusunan Renja 2027', 'Pedoman teknis penyusunan rencana kerja perangkat daerah', 'pedoman_renja', 'Pedoman_Renja_2027.pdf', 'https://si-verena-files.r2.dev/referensi/Pedoman_Renja_2027.pdf', 'user-admin', 1, datetime('now', '-60 days')),
('fileref-002', 'Peraturan Gubernur Renja', 'Pergub tentang penyusunan Renja', 'peraturan', 'Pergub_Renja_2026.pdf', 'https://si-verena-files.r2.dev/referensi/Pergub_Renja_2026.pdf', 'user-admin', 1, datetime('now', '-55 days')),
('fileref-003', 'Template Renja Biro', 'Template standar Renja untuk Biro', 'template', 'Template_Renja_Biro.docx', 'https://si-verena-files.r2.dev/referensi/Template_Renja_Biro.docx', 'user-admin', 1, datetime('now', '-50 days')),
('fileref-004', 'RKPD Sumatera Barat 2027', 'Rencana Kerja Pemerintah Daerah', 'referensi', 'RKPD_Sumbar_2027.pdf', 'https://si-verena-files.r2.dev/referensi/RKPD_Sumbar_2027.pdf', 'user-admin', 1, datetime('now', '-45 days')),
('fileref-005', 'Renstra SETDA 2024-2026', 'Rencana Strategis Sekretariat Daerah', 'referensi', 'Renstra_SETDA_2024-2026.pdf', 'https://si-verena-files.r2.dev/referensi/Renstra_SETDA_2024-2026.pdf', 'user-admin', 1, datetime('now', '-40 days'));
