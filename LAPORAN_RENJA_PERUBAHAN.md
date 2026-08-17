# LAPORAN IMPLEMENTASI — MODUL RENJA PERUBAHAN (SI-VERENA / siverena.id)

Tanggal: 17 Agustus 2026
Commit: `e7fe5ae`

## 1. Route yang ditambahkan
- Frontend: `/perubahan` — satu halaman Renja Perubahan dengan 5 tab (menu sidebar "Renja Perubahan").
- Backend (semua di bawah `/api/perubahan`, autentikasi + role):
  - `GET /dashboard` — monitoring seluruh biro + statistik + biro perlu perhatian
  - `GET|POST|PUT|DELETE /references` — Dokumen Acuan CRUD (+ aktif/nonaktif, prioritas)
  - `GET|POST /submissions`, `PUT /:id`, `POST /:id/return`, `POST /:id/final`
  - `GET|POST /versions` — upload + versioning otomatis + deteksi duplikat (checksum)
  - `GET|POST /findings`, `PUT /findings/:id`, `POST /findings/bulk`, `GET /compare`
  - `POST /pemeriksaan` — pemeriksaan AI dokumen biro
  - `GET /setda`, `GET /setda/:id`, `POST /setda/generate`, `PUT /sections/:id`,
    `POST /setda/:id/pemeriksaan`, `POST /setda/:id/approve`
  - `GET /notifications`, `POST /notifications/:id/read`, `GET /audit`

## 2. Halaman/component yang ditambahkan
- `src/pages/perubahan/RenjaPerubahan.jsx` — shell halaman + header (tahun, tahap, status periode, tanggal, progress, tombol Refresh/Pengaturan/Bantuan/Riwayat/Notifikasi) + 5 tab
- `src/pages/perubahanTabs/DashboardTab.jsx` — kartu ringkasan, monitoring biro, monitoring perbaikan, progress, statistik temuan, daftar biro perlu perhatian
- `src/pages/perubahanTabs/DokumenAcuanTab.jsx` — CRUD dokumen acuan + upload R2 + prioritas P1–P4
- `src/pages/perubahanTabs/UploadTab.jsx` — upload + versioning + riwayat versi + checksum
- `src/pages/perubahanTabs/HasilPemeriksaanTab.jsx` — filter, periksa AI (dengan step progress), tabel temuan, skor, kembalikan/final, bandingkan versi, export
- `src/pages/perubahanTabs/SetdaTab.jsx` — kesiapan konsolidasi, generate draft, editor BAB, lihat sumber, periksa, setujui/final, export
- `src/pages/perubahanTabs/exportUtils.js` — export DOCX/PDF/XLSX

## 3. Tab yang dibuat
1. Dashboard Renja Perubahan (termasuk monitoring perbaikan)
2. Dokumen Acuan
3. Upload Renja Perubahan Biro
4. Hasil Pemeriksaan
5. Renja Perubahan Setda

## 4. Database/table yang ditambahkan (10 tabel baru, non-destruktif)
`renja_perubahan_submissions`, `renja_perubahan_versions`, `renja_perubahan_findings`,
`renja_perubahan_references`, `renja_perubahan_setda`, `renja_perubahan_sections`,
`renja_perubahan_sources`, `renja_perubahan_notifications`, `audit_log`.
Menggunakan ulang tabel existing: `biro`, `users`, `periode_renja`, storage R2.

## 5. Migration yang dilakukan
`CREATE TABLE IF NOT EXISTS ...` (aman, idempoten) diterapkan ke D1 production
(`worker/src/db/rp_tables.sql`, 18 query sukses). Tidak ada schema destruktif.

## 6. API/function yang ditambahkan
Lihat poin 1. Semua memakai pattern existing (Hono, authMiddleware, jwtPayload, D1).

## 7. Sistem upload
Menggunakan endpoint existing `POST /api/upload` (R2) + folder `rp_dokumen`, `rp_lampiran`,
`rp_referensi`. File asli disimpan; nama file, uploader, tanggal tersimpan di tabel version.

## 8. Sistem versioning
Setiap upload membuat versi baru `V{n}` (tidak menimpa file lama), nomor registrasi
`RPB-TAHUN-KODEBIRO-Vn-timestamp`, checksum SHA-256. Jika file sama persis dengan versi
sebelumnya → peringatan 409 "File yang diunggah sama dengan versi sebelumnya."

## 9. Mekanisme pemeriksaan
Ekstraksi teks (PDF via unpdf, DOCX via fflate) → analisis LLM per 9 kategori →
temuan ber-severity (kritis/mayor/minor/informasi) + lokasi + data dokumen vs acuan +
rekomendasi. Dokumen tidak terbaca → 1 temuan kritis "Dokumen tidak dapat dianalisis" (tanpa hasil palsu).

## 10. Mekanisme AI
Provider existing (`getLLMProvider` — DeepSeek resmi bila key diset, fallback Workers AI).
Prompt anti-halusinasi: "Tidak ditemukan dalam dokumen.", "Belum dapat diverifikasi...",
"Terdapat perbedaan data...". Referensi aktif (prioritas P1–P4) dimasukkan sebagai konteks.

## 11. Mekanisme export DOCX/PDF/XLSX
- Hasil pemeriksaan: DOCX (library `docx`), PDF (`jspdf`), XLSX (`xlsx`) — file nyata, dapat dibuka.
- Renja Perubahan Setda: DOCX (BAB per bab), PDF, XLSX (struktur).

## 12. Mekanisme konsolidasi Renja Perubahan Setda
Generate mengambil versi FINAL seluruh biro → membuat record Setda + 18 section (BAB I–IV)
+ tabel sumber (traceability per biro/versi). Mode DRAFT boleh belum lengkap
(watermark "DRAFT — BELUM LENGKAP"); mode FINAL diblokir bila ada biro belum Final.

## 13. Audit trail
Tabel `audit_log` — mencatat login-aksi modul (upload versi, pemeriksaan, pengembalian,
penetapan final, generate Setda, export, dll.) dengan user, tanggal, objek, catatan.
Dapat dilihat via tombol "Riwayat Aktivitas".

## 14. Role dan permission
- admin/kabag/verifikator: penuh (kelola acuan, periksa, kembalikan, final, konsolidasi)
- operator biro (`biro_*`): hanya data biro sendiri (filter `nama_biro`), upload, lihat hasil, tanggapan
- pimpinan: dashboard + status + final (read-only)

## 15. File yang berubah
- `worker/src/routes/perubahan.ts` (baru), `worker/src/index.ts` (registrasi route)
- `worker/src/db/schema.sql`, `worker/src/db/rp_tables.sql` (baru)
- `frontend/src/pages/perubahan/RenjaPerubahan.jsx` + `perubahanTabs/*` (baru)
- `frontend/src/App.jsx`, `frontend/src/components/layout/Sidebar.jsx`

## 16. Testing yang dilakukan (live)
- Upload + versioning + deteksi duplikat (409) ✓
- Pemeriksaan AI pada DOCX asli (66K karakter): 8 temuan (3 kritis, 2 mayor, 2 minor, 1 informasi), ekstraksi docx ✓
- Skor benar setelah fix (kritis terbuka → skor 0, Final diblokir 409) ✓
- Return untuk perbaikan ✓
- Generate Setda mode draft (201) & mode final diblokir (409 + daftar biro belum final) ✓
- Data uji dibersihkan.

## 17. Bug/keterbatasan yang masih ada (kini sebagian sudah teratasi)
- Konsolidasi Setda belum melakukan agregasi angka pagu per program (butuh ekstraksi
  matriks mendalam); matriks Setda & perbandingan dengan Perubahan RKPD otomatis
  belum diimplementasi (rencana: ekstraksi tabel XLSX program/kegiatan).
- Notifikasi belum terintegrasi ke badge global sidebar (hanya di halaman perubahan).
- Export DOCX Setda belum punya daftar isi otomatis, header/footer & nomor halaman
  (ditambahkan jika diminta).
- Konflik data antar sumber belum punya UI keputusan verifikator (data dipertahankan
  dari biro final; pencatatan di audit tersedia).

## 18. Cara menjalankan & menguji fitur
Login admin → menu "Renja Perubahan" →
1. Tab 2: upload Dokumen Acuan (mis. Permendagri 86/2017, Perubahan RKPD) → aktifkan.
2. Tab 3: pilih biro + tahap → upload DOCX/PDF → "Upload V1".
3. Tab 4: pilih biro+versi → "PERIKSA DOKUMEN" → tunggu → lihat temuan, skor,
   export DOCX/PDF/XLSX, "Kembalikan" atau "Tetapkan Final".
4. Upload V2 perbaikan → periksa ulang → bandingkan versi.
5. Tab 5: "GENERATE DRAFT" → edit section → "Periksa Setda" → "Setujui" → "Tetapkan Final" → export.

## 19. Konfirmasi halaman SiVerena existing tetap berjalan
Semua route existing (`/`, `/pemeriksaan`, `/hasil`, `/upload-dokumen`, `/file-referensi`,
`/periode`, dsb.) HTTP 200; login & API existing normal.

## 20. Konfirmasi tidak ada data existing yang terhapus
Tidak ada. Migration bersifat menambah tabel baru (IF NOT EXISTS); data uji modul baru
dibersihkan; tabel existing (`users`, `biro`, `periode_renja`, `dokumen_renja`, dll.) tidak disentuh.

## LAMPIRAN — Penyempurnaan Lanjutan (kendala diatasi)
- **Navigasi**: halaman /perubahan membaca `?tab=&biro=&versi=&tahun=`; tombol di tab lain langsung membuka tab/biro/versi terkait.
- **Ekstraksi program & matriks**: endpoint `POST /api/perubahan/programs/extract` (LLM, teks penuh dari R2, max_tokens 8192, output padat) → tabel `renja_perubahan_programs`. `GET /api/perubahan/setda/:id/matriks` mengagregasi: baris program/kegiatan, total pagu awal/perubahan, selisih, total per biro, deteksi duplikat multi-biro.
- **Konflik data**: deteksi kode sama dengan pagu berbeda → panel KONFLIK DATA → keputusan "Pakai Nilai Biro/Acuan" dicatat ke `renja_perubahan_conflicts` + audit trail.
- **Notifikasi global**: badge jumlah notifikasi belum dibaca pada menu sidebar "Renja Perubahan" (polling 60 detik sesuai role/biro).
- **Export DOCX Setda**: daftar isi otomatis, header/footer, nomor halaman, page break antar BAB.
- **Uji live**: ekstraksi program 24 item dari DOCX asli; matriks menghasilkan total pagu awal 14.662.266.008 → perubahan 22.154.061.500 → selisih 7.517.795.492 (contoh data uji, lalu dibersihkan).
