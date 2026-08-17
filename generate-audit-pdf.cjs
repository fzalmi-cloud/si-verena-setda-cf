// Generator PDF Laporan Audit CRUD — SI-VERENA SETDA
// Menghasilkan: LAPORAN_AUDIT_CRUD.pdf di root repo
const { jsPDF } = require('E:/CODING/si-verena-deployed/frontend/node_modules/jspdf/dist/jspdf.umd.min.js');

const doc = new jsPDF({ unit: 'pt', format: 'a4' });
const W = doc.internal.pageSize.getWidth();
const H = doc.internal.pageSize.getHeight();
const M = 48;
let y = 0;

function ensureSpace(h) {
  if (y + h > H - 50) {
    doc.addPage();
    y = 50;
  }
}
function line() { y += 11; }
function gap(h) { y += h; }
function title(t) {
  ensureSpace(30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42);
  doc.text(t, M, y);
  y += 18;
}
function section(t) {
  ensureSpace(28);
  doc.setFillColor(235, 240, 255);
  doc.roundedRect(M - 6, y - 12, W - 2 * M + 12, 22, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(37, 99, 235);
  doc.text(t, M, y + 2);
  y += 24;
}
function para(t, size = 9.5, bold = false) {
  doc.setFont('helvetica', bold ? 'bold' : 'normal');
  doc.setFontSize(size);
  doc.setTextColor(30, 41, 59);
  const lines = doc.splitTextToSize(t, W - 2 * M);
  for (const l of lines) {
    ensureSpace(size + 4);
    doc.text(l, M, y);
    y += size + 4;
  }
  y += 3;
}
function bullet(t, size = 9.5) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(size);
  doc.setTextColor(30, 41, 59);
  const lines = doc.splitTextToSize(t, W - 2 * M - 14);
  for (let i = 0; i < lines.length; i++) {
    ensureSpace(size + 4);
    doc.text(i === 0 ? '•  ' + lines[i] : '    ' + lines[i], M, y);
    y += size + 4;
  }
  y += 2;
}
function row(cells, widths, bold = false, fill = null, textColor = [30, 41, 59]) {
  const hRow = Math.max(...cells.map((c, i) => doc.splitTextToSize(c, widths[i] - 10).length)) * 10 + 12;
  ensureSpace(hRow);
  if (fill) { doc.setFillColor(fill[0], fill[1], fill[2]); doc.rect(M, y - 10, W - 2 * M, hRow, 'F'); }
  doc.setFont('helvetica', bold ? 'bold' : 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  let cx = M;
  cells.forEach((c, i) => {
    const ls = doc.splitTextToSize(c, widths[i] - 10);
    ls.forEach((l, li) => doc.text(l, cx + 5, y + 3 + li * 10));
    cx += widths[i];
  });
  y += hRow + 1;
}
function tableHeader(cols, widths) {
  row(cols, widths, true, [30, 41, 59], [255, 255, 255]);
}

// ── Cover / Header ──────────────────────────────────────────────
doc.setFillColor(37, 99, 235);
doc.rect(0, 0, W, 90, 'F');
doc.setTextColor(255, 255, 255);
doc.setFont('helvetica', 'bold');
doc.setFontSize(20);
doc.text('LAPORAN AUDIT', M, 40);
doc.setFontSize(13);
doc.text('Komponen yang Harus Punya Kemampuan CRUD', M, 60);
doc.setFontSize(9);
doc.setFont('helvetica', 'normal');
doc.text('Aplikasi: SI-VERENA SETDA  |  Frontend: siverena.id  |  Backend: Worker si-verena-api', M, 78);

y = 110;
para('Tanggal audit: 17 Agustus 2026. Status: LAPORAN SAJA — belum ada perubahan kode yang dilakukan.', 9.5, true);
gap(8);

// ── Section 1: Peta entity ──────────────────────────────────────
section('1. PETA ENTITY - STATUS CRUD');
const widths = [150, 90, 70, 90, 90, 85];
tableHeader(['Entity (Tabel)', 'Route API', 'CRUD', 'UI Admin', 'Status', 'Keterangan'], widths);
const rows1 = [
  ['periode_renja (Tahun Renja)', 'TIDAK ADA', 'TIDAK ADA', 'TIDAK ADA', '[KRITIS]', 'GAP UTAMA: tabel ada, tahun di-hardcode di frontend'],
  ['users', '/api/user', 'Lengkap', 'KelolaPengguna', '[OK]', 'Tidak ada ubah/reset password'],
  ['biro', '/api/biro', 'Lengkap', 'MasterBiro', '[SEDANG]', 'Hapus tanpa cek relasi -> data yatim'],
  ['dokumen_renja', '/api/dokumen', 'Lengkap + bulk', 'DokumenDiunggah, Upload*', '[OK]', 'Termasuk batch CRUD'],
  ['hasil_pemeriksaan', '/api/pemeriksaan', 'R/C/U - no DELETE', 'Pemeriksaan', '[SEDANG]', 'Tidak bisa reset/hapus item hasil'],
  ['skor_dokumen', '/api/skor', 'R/C/U - no DELETE', '(read only)', '[SEDANG]', 'Skor tidak bisa direset'],
  ['file_referensi', '/api/file-ref', 'Lengkap + bulk', 'FileReferensi', '[OK]', 'Termasuk batch upload'],
  ['draft_renja_setda', '/api/draft', 'Lengkap', 'Penyusunan', '[OK]', ''],
  ['draft_renja_bab', '/api/draft/bab', 'Lengkap', 'EditorDraft', '[OK]', ''],
  ['draft_renja_rekap_biro', 'TIDAK ADA', 'TIDAK ADA', 'TIDAK ADA', '[KRITIS]', 'Tabel yatim, tidak pernah dipakai'],
  ['draft_renja_validasi', 'TIDAK ADA', 'TIDAK ADA', 'TIDAK ADA', '[KRITIS]', 'Tabel yatim, tidak pernah dipakai'],
  ['riwayat_revisi', '/api/revisi', 'R/C - no U/D', 'RiwayatRevisi (read only)', '[SEDANG]', 'Frontend tidak pernah mencatat riwayat'],
];
rows1.forEach(r => row(r, widths));

// ── Section 2: Temuan detail ────────────────────────────────────
section('2. TEMUAN DETAIL PER KOMPONEN');

title('A. PERIODE / TAHUN RENJA (periode_renja) - PRIORITAS TERTINGGI');
para('Tabel periode_renja (id, tahun UNIQUE, status, tanggal_mulai, tanggal_selesai) ada di database, TETAPI tidak ada route API dan tidak ada halaman admin. Satu-satunya referensi kode: worker/src/types.ts.', 9.5);
para('Tahun renja di-HARDCODE di frontend dengan daftar berbeda tiap halaman:', 9.5, true);
row(['Halaman', 'Tahun yang ditampilkan'], [200, 260], true);
row(['Pemeriksaan.jsx, HasilVerifikasi.jsx', 'hanya 2026, 2027'], [200, 260]);
row(['UploadDokumen.jsx, GenerateDraft.jsx', '2025 - 2028'], [200, 260]);
row(['DashboardPenyusunan.jsx', 'konstanta TAHUN = 2027 (tidak bisa diganti)'], [200, 260]);
row(['Halaman lain', 'default "2027"'], [200, 260]);
gap(4);
para('CRUD yang seharusnya ada:', 9.5, true);
bullet('Create - buka periode tahun baru (admin)');
bullet('Read - daftar tahun untuk SEMUA dropdown (pengganti hardcode)');
bullet('Update - ubah status (aktif / terkunci / selesai) dan tanggal mulai-selesai');
bullet('Delete - hapus periode yang salah buat');
bullet('Integrasi - jika periode terkunci, blokir upload dokumen');

title('B. TABEL YATIM (sudah di DB, tidak pernah dipakai)');
bullet('draft_renja_rekap_biro - tidak ada route & UI. Halaman KompilasiRenjaBiro menghitung langsung di memori, tidak menyimpan ke tabel ini.');
bullet('draft_renja_validasi - sama. ValidasiDataSumber menghitung live, tidak menyimpan.');
para('Keputusan yang perlu diambil: implementasikan CRUD-nya (agar rekap/validasi tersimpan dan bisa diaudit) ATAU hapus tabelnya.', 9.5);

title('C. riwayat_revisi - PENCATATAN REVISI TIDAK PERNAH TERJADI');
bullet('Endpoint POST /api/revisi ada, tapi frontend TIDAK PERNAH memanggilnya - UploadRevisi.jsx hanya membuat dokumen_renja baru, tidak mencatat riwayat.');
bullet('Halaman RiwayatRevisi.jsx menampilkan gabungan dokumen + riwayat, tapi tabel riwayat kosong.');
para('CRUD yang seharusnya: CREATE otomatis saat upload/revisi (back-end), READ riwayat, DELETE/rollback versi.', 9.5);

title('D. hasil_pemeriksaan - TIDAK BISA RESET/HAPUS');
para('API punya list/create/update/validate, TIDAK ADA DELETE. Verifikator tidak bisa menghapus item hasil yang salah atau mereset pemeriksaan untuk diulang.', 9.5);

title('E. skor_dokumen - TIDAK BISA DIRESET');
para('Tidak ada DELETE. Saat dokumen direvisi, skor lama tidak bisa dihapus (hanya ditimpa).', 9.5);

title('F. users - SUDAH LENGKAP, KECUALI');
bullet('Tidak ada ubah password sendiri (halaman profil).');
bullet('Tidak ada reset password dari admin (hanya edit role).');

title('G. biro - LENGKAP TAPI PERLU CEK RELASI');
bullet('Hapus biro langsung eksekusi tanpa cek relasi - dokumen/skor yang memakai nama_biro (string) jadi yatim.');
bullet('Sebaiknya blokir hapus jika masih ada dokumen terkait.');

title('H. SUDAH LENGKAP (tidak perlu ditambah)');
bullet('dokumen_renja (+ bulk CRUD), file_referensi (+ bulk), draft_renja_setda, draft_renja_bab.');

// ── Section 3: Rekomendasi prioritas ────────────────────────────
section('3. REKOMENDASI PRIORITAS');
row(['Prioritas', 'Komponen', 'Aksi'], [70, 140, 250], true);
const rows3 = [
  ['1', 'Periode / Tahun Renja', 'Buat route CRUD /api/periode + halaman admin + semua dropdown tahun ambil dari API'],
  ['2', 'Riwayat revisi', 'Catat otomatis saat upload/revisi + kelola (hapus versi)'],
  ['3', 'Reset pemeriksaan', 'Tambah DELETE hasil_pemeriksaan & skor_dokumen (untuk re-pemeriksaan)'],
  ['4', 'Tabel yatim', 'Putuskan: implement CRUD rekap/validasi ATAU hapus tabel'],
  ['5', 'Profil pengguna', 'Tambah ubah/reset password'],
  ['6', 'Biro', 'Blokir hapus biro bila masih ada data terkait'],
];
rows3.forEach(r => row(r, [70, 140, 250], false, r[0] === '1' ? [254, 242, 242] : null));

gap(8);
para('Catatan: laporan ini bersifat audit - BELUM ADA PERUBAHAN KODE. Eksekusi menunggu persetujuan.', 9.5, true);

const pages = doc.getNumberOfPages();
doc.setPage(pages);
doc.setFont('helvetica', 'normal');
doc.setFontSize(8);
doc.setTextColor(100, 116, 139);
doc.text(`SI-VERENA SETDA - Laporan Audit CRUD  |  Halaman ${pages}`, M, H - 30);

const fs = require('fs');
const out = doc.output('arraybuffer');
fs.writeFileSync('E:/CODING/si-verena-deployed/LAPORAN_AUDIT_CRUD.pdf', Buffer.from(out));
console.log('PDF dibuat. Jumlah halaman:', doc.getNumberOfPages());
