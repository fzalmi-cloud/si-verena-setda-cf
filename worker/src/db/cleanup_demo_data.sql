-- ============================================
-- Pembersihan DATA DEMO/MOCK dari database production
-- Jalankan:  wrangler d1 execute si-verena-db --file=./src/db/cleanup_demo_data.sql
--
-- Hanya menghapus data operasional yang sebelumnya diisi seed_data.sql (versi
-- lama) dengan data dummy. Data master (biro, users, periode_renja) TIDAK
-- dihapus.
-- ============================================

-- File referensi mock (dummy URL di r2.dev, file fisik tidak pernah ada)
DELETE FROM file_referensi WHERE file_url LIKE 'https://si-verena-files.r2.dev/%';

-- Dokumen Renja mock (semua yang file_url-nya menunjuk bucket dummy)
DELETE FROM dokumen_renja WHERE file_url LIKE 'https://si-verena-files.r2.dev/%';

-- Hasil pemeriksaan & skor yang terkait dokumen mock di atas
DELETE FROM hasil_pemeriksaan WHERE dokumen_renja_id IN (
  SELECT id FROM dokumen_renja WHERE file_url LIKE 'https://si-verena-files.r2.dev/%'
);
DELETE FROM skor_dokumen WHERE nama_biro IS NOT NULL AND id LIKE 'skor-%';

-- Riwayat revisi mock
DELETE FROM riwayat_revisi WHERE file_url LIKE 'https://si-verena-files.r2.dev/%';

-- Verifikasi hasil pembersihan
SELECT 'file_referensi' AS tabel, COUNT(*) AS sisa FROM file_referensi
UNION ALL SELECT 'dokumen_renja', COUNT(*) FROM dokumen_renja
UNION ALL SELECT 'hasil_pemeriksaan', COUNT(*) FROM hasil_pemeriksaan
UNION ALL SELECT 'skor_dokumen', COUNT(*) FROM skor_dokumen
UNION ALL SELECT 'riwayat_revisi', COUNT(*) FROM riwayat_revisi;
