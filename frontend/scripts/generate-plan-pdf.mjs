// Script pembuat PDF: Rencana Optimasi Tab Renja Perubahan Setda
// Menghasilkan: E:/CODING/Rencana_Optimasi_SetdaTab.pdf
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const doc = new jsPDF({ unit: 'mm', format: 'a4' });
const W = 210;
const M = 16; // margin
const CW = W - M * 2;
const PURPLE = [88, 28, 135];
const DARK = [30, 41, 59];
const GRAY = [100, 116, 139];
const LIGHT = [241, 245, 249];

let y = 0;

function ensure(h = 20) {
  if (y + h > 285) { doc.addPage(); y = 18; }
}

function title(text, size = 18, color = PURPLE, spacing = 8) {
  ensure(size + spacing);
  doc.setTextColor(...color);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(size);
  doc.text(text, M, y);
  y += spacing;
}

function subTitle(text, size = 12, color = DARK, spacing = 5) {
  ensure(size + spacing);
  doc.setTextColor(...color);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(size);
  doc.text(text, M, y);
  y += spacing;
}

function body(text, size = 9.5, color = DARK, spacing = 4.2, indent = 0) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(size);
  doc.setTextColor(...color);
  const lines = doc.splitTextToSize(text, CW - indent);
  for (const l of lines) {
    ensure(size + 1);
    doc.text(l, M + indent, y);
    y += spacing;
  }
}

function bullet(text, size = 9.5) {
  ensure(size + 1);
  const lines = doc.splitTextToSize(text, CW - 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(size);
  doc.setTextColor(...DARK);
  doc.text('•', M, y);
  doc.text(lines[0], M + 4, y);
  y += 4.2;
  for (let i = 1; i < lines.length; i++) {
    ensure(size + 1);
    doc.text(lines[i], M + 4, y);
    y += 4.2;
  }
}

function spacer(h = 4) { y += h; }

// ═══════════ HALAMAN JUDUL ═══════════
doc.setFillColor(...PURPLE);
doc.rect(0, 0, W, 100, 'F');
doc.setTextColor(255, 255, 255);
doc.setFont('helvetica', 'bold');
doc.setFontSize(24);
doc.text('RENCANA OPTIMASI', W / 2, 40, { align: 'center' });
doc.setFontSize(16);
doc.text('Tab Renja Perubahan Setda', W / 2, 50, { align: 'center' });
doc.setFont('helvetica', 'normal');
doc.setFontSize(11);
doc.text('Kompilasi Otomatis Data Biro Sesuai Dokumen Acuan', W / 2, 60, { align: 'center' });
doc.setFontSize(10);
doc.text('Menjadi Draft Renja Perubahan Setda yang Siap Pakai', W / 2, 67, { align: 'center' });

doc.setFillColor(255, 255, 255);
doc.rect(M, 118, CW, 1.5, 'F');
doc.setTextColor(...DARK);
doc.setFontSize(10);
doc.setFont('helvetica', 'bold');
doc.text('SI-VERENA SETDA', M, 128);
doc.setFont('helvetica', 'normal');
doc.setTextColor(...GRAY);
doc.setFontSize(9);
doc.text('Aplikasi: https://siverena.id/perubahan?tab=setda', M, 135);
doc.text('Repositori: github.com/fzalmi-cloud/si-verena-setda-cf', M, 141);
doc.text('Tanggal: 18 Agustus 2026 (revisi: keputusan kompilasi awal non-final)', M, 147);
doc.text('Status: DRAFT — belum ada perubahan kode yang dilakukan', M, 153);

doc.addPage();
y = 22;

// ═══════════ 1. TUJUAN ═══════════
title('1. Tujuan');
body('Tab "Renja Perubahan Setda" saat ini belum sesuai harapan: proses generate hanya membuat kerangka kosong, dan seluruh isi dokumen harus diketik manual oleh verifikator. Tujuan optimasi adalah agar seluruh data biro yang telah dinyatakan SESUAI dengan dokumen acuan (Tab 2) dapat dikompilasi secara otomatis ke dalam draft Renja Perubahan Setda, sehingga perencana Setda tinggal menggunakan draft tersebut (review ringan + export), tanpa menyusun dari nol.');
spacer(2);

// ═══════════ 2. ALUR SAAT INI ═══════════
title('2. Alur yang Berjalan Saat Ini');
const flow = [
  ['Tab 2 — Dokumen Acuan', 'Upload referensi (Permendagri 86/2017, Perubahan RKPD, SE) dengan status aktif + prioritas.'],
  ['Tab 3 — Upload Biro', 'Tiap biro mengunggah dokumen Renja Perubahan; otomatis dibuat versi (V1, V2, dst.).'],
  ['Tab 4 — Pemeriksaan', 'AI memeriksa tiap versi vs dokumen acuan (9 kategori) -> temuan + skor -> biro memperbaiki -> verifikator menetapkan FINAL (diblokir jika masih ada temuan kritis).'],
  ['Tab 5 — Setda: Generate', 'Membuat kerangka 18 section KOSONG (SETDA_TEMPLATE) + catatan sumber biro final.'],
  ['Tab 5 — Setda: Ekstrak', 'Klik manual "Ekstrak Program": AI mengekstrak program/kegiatan dari tiap dokumen biro final.'],
  ['Tab 5 — Setda: Matriks', 'Agregasi program antar biro (tabel + deteksi konflik pagu).'],
  ['Tab 5 — Setda: Editor', 'Verifikator mengetik manual isi 18 section satu per satu, lalu Approve/Final dan Export DOCX/PDF/XLSX.'],
];
autoTable(doc, {
  startY: y,
  head: [['Tahap', 'Keterangan']],
  body: flow,
  theme: 'grid',
  headStyles: { fillColor: PURPLE, fontSize: 9 },
  bodyStyles: { fontSize: 8.5, textColor: DARK },
  columnStyles: { 0: { fontStyle: 'bold', cellWidth: 52 }, 1: { cellWidth: 'auto' } },
  margin: { left: M, right: M },
});
y = doc.lastAutoTable.finalY + 8;

// ═══════════ 3. AKAR MASALAH ═══════════
title('3. Akar Masalah (Mengapa Belum Sesuai Harapan)');
const problems = [
  ['Generate hanya membuat kerangka kosong', 'Section dibuat dengan content = "" (perubahan.ts baris 800-806); tidak ada kompilasi data biro.'],
  ['Data biro tidak otomatis masuk draft', 'Hasil ekstraksi program hanya tampil sebagai tabel matriks; section 3.4 "Matriks Renja Perubahan Setda" tetap kosong.'],
  ['Ekstraksi program terpisah & manual', 'Harus klik "Ekstrak Program" per biro; tidak ada deteksi versi yang sudah diekstrak; biro baru final tidak otomatis masuk.'],
  ['Kriteria "sesuai dokumen acuan" tidak dipakai', 'Generate hanya cek status = "final"; temuan mayor/minor yang masih terbuka tetap ikut terkompilasi; skor/level kesiapan diabaikan.'],
  ['Keputusan konflik tidak dieksekusi', 'resolve-conflict hanya mencatat keputusan; angka matriks tidak berubah.'],
  ['Hasil pemeriksaan draft Setda tidak disimpan', 'Temuan hanya muncul di toast, tidak ada riwayat/persistensi.'],
  ['Tidak ada re-generate / update draft', 'Biro baru final tidak masuk ke draft lama; generate selalu membuat record baru.'],
];
autoTable(doc, {
  startY: y,
  head: [['Masalah', 'Detail / Bukti']],
  body: problems,
  theme: 'grid',
  headStyles: { fillColor: [190, 18, 60], fontSize: 9 },
  bodyStyles: { fontSize: 8.5, textColor: DARK },
  columnStyles: { 0: { fontStyle: 'bold', cellWidth: 62 }, 1: { cellWidth: 'auto' } },
  margin: { left: M, right: M },
});
y = doc.lastAutoTable.finalY + 8;

// ═══════════ 4. RENCANA OPTIMASI ═══════════
title('4. Rencana Optimasi');

subTitle('KEPUTUSAN PEMILIK PRODUK (18 Agustus 2026)', 11, [190, 18, 60]);
bullet('KOMPILASI AWAL: walaupun biro BELUM final, datanya TETAP dikompilasi ke draft terlebih dahulu — biro final ditandai "SAH", biro belum final ditandai "DRAFT — menunggu verifikasi".');
bullet('RE-GENERATE: setelah biro menjadi FINAL, klik "Generate Ulang" untuk memperbarui draft dengan data final (status tanda diperbarui otomatis).');
bullet('Dengan demikian perencana Setda dapat mulai menyusun sejak dini dari data yang sudah ada.');
spacer(4);

// Fase 1
subTitle('Fase 1 — Backend: Kompilasi Otomatis saat Generate (Inti)', 12, PURPLE);
bullet('Sumber kompilasi = SEMUA biro yang sudah mengunggah dokumen (current_version > 0), bukan hanya FINAL. Tiap sumber diberi tanda status biro: final / belum final (menunggu_verifikator, perlu_perbaikan, dll).');
bullet('Filter kualitas tetap ada namun TIDAK memblokir: biro dengan temuan kritis tetap ikut dikompilasi tetapi ditandai "PERLU PERBAIKAN — data sementara". Indikator keselarasan dihitung dari temuan kategori keselarasan_rkpd & sistematika_permendagri.');
bullet('Ekstraksi program otomatis dalam generate: hanya jika belum ada data untuk version_id tsb (hemat biaya AI); hasil langsung dipakai untuk menyusun section 3.4 dan rekap angka.');
bullet('Kompilasi isi section via AI per BAB (4 panggilan, bukan 18): prompt menyertakan template section, potongan teks relevan dari tiap biro, judul dokumen acuan aktif, dan data program hasil ekstraksi.');
bullet('Hasil AI ditulis ke renja_perubahan_sections.content dengan status "otomatis"; sumber biro + versi + status final dicatat di renja_perubahan_sources.data_value.');
bullet('Best-effort + fallback: jika AI gagal pada suatu BAB, section tetap kosong berstatus "perlu_review" + catatan; generate tidak gagal total.');
bullet('Simpan ringkasan angka: total_pagu_awal, total_pagu_perubahan, jumlah_biro_final (dan jumlah biro dikompilasi) diisi dari hasil agregasi.');
bullet('RE-GENERATE: tombol "Generate Ulang" memperbarui draft yang sama (section + sumber + matriks) dari data terbaru, bukan membuat draft baru bertumpuk; ringkasan mencatat waktu generate ulang.');
spacer(3);

// Fase 2
subTitle('Fase 2 — Backend: Matriks & Konflik Lebih Akurat', 12, PURPLE);
bullet('Matriks v2: tiap baris menyertakan sumber biro + versi + nomor registrasi, status temuan biro (skor), dan kolom pembanding nilai dari dokumen acuan (Perubahan RKPD) jika tersedia.');
bullet('Deteksi konflik diperluas: bukan hanya pagu_perubahan, tetapi juga pagu_awal, nama berbeda untuk kode sama, dan perbedaan target.');
bullet('Keputusan konflik benar-benar diterapkan: pilihan "pakai nilai acuan" atau "pakai nilai biro" mengubah angka matriks (bukan hanya catatan).');
spacer(3);

// Fase 3
subTitle('Fase 3 — Frontend: UX Tab Setda', 12, PURPLE);
bullet('Satu tombol "Kompilasi Draft" menggantikan Generate + Ekstrak terpisah; menampilkan checklist biro layak vs tidak layak beserta alasannya.');
bullet('Progress real-time per biro (ekstrak -> kompilasi BAB I-IV) dan tombol "Perbarui Draft" untuk re-generate tanpa duplikat berantakan.');
bullet('Editor section dipermudah: badge sumber per section ("Dari: Biro A V2, Biro B V3"), status otomatis/perlu_review/manual, diff saat re-generate.');
bullet('Matriks terintegrasi: tampil di section 3.4 dan dapat diekspor; kolom "Sesuai Acuan?".');
bullet('Hasil pemeriksaan Setda disimpan dan ditampilkan sebagai daftar temuan yang dapat ditindaklanjuti.');
spacer(3);

// Fase 4
subTitle('Fase 4 — Database & Migrasi', 12, PURPLE);
bullet('Tabel baru: renja_perubahan_setda_findings (persistensi hasil pemeriksaan draft Setda).');
bullet('Kolom tambahan di renja_perubahan_sections: status diperluas (otomatis/perlu_review) dan sumber_ringkas.');
bullet('Tidak ada perubahan destruktif; seluruh CREATE TABLE IF NOT EXISTS / ALTER aman.');
spacer(3);

// ═══════════ 5. KEPUTUSAN YANG DIPERLUKAN ═══════════
title('5. Keputusan yang Diperlukan Sebelum Implementasi');
const decisions = [
  ['Kompilasi biro belum final', 'DIPUTUSKAN: tetap dikompilasi dengan tanda DRAFT; re-generate saat final. (18 Agu 2026)'],
  ['Biaya AI kompilasi', 'Per BAB (4 panggilan, hemat) atau per section (18 panggilan, lebih detail)? Usulan: per BAB.'],
  ['Prioritas fase', 'Mulai dari Fase 1 (kompilasi otomatis) saja, atau sekalian Fase 2-3?'],
  ['Tahun default tab', 'Usulan: otomatis ke tahun dengan data terbaru (hindari tampilan kosong di 2027).'],
];
autoTable(doc, {
  startY: y,
  head: [['Keputusan', 'Opsi / Usulan']],
  body: decisions,
  theme: 'grid',
  headStyles: { fillColor: DARK, fontSize: 9 },
  bodyStyles: { fontSize: 8.5, textColor: DARK },
  columnStyles: { 0: { fontStyle: 'bold', cellWidth: 52 }, 1: { cellWidth: 'auto' } },
  margin: { left: M, right: M },
});
y = doc.lastAutoTable.finalY + 10;

// ═══════════ FOOTER setiap halaman ═══════════
const totalPages = doc.getNumberOfPages();
for (let i = 1; i <= totalPages; i++) {
  doc.setPage(i);
  doc.setFontSize(7);
  doc.setTextColor(...GRAY);
  doc.setFont('helvetica', 'normal');
  doc.text('SI-VERENA SETDA — Rencana Optimasi Tab Renja Perubahan Setda | Halaman ' + i + ' dari ' + totalPages, W / 2, 293, { align: 'center' });
}

const outPath = 'E:/CODING/Rencana_Optimasi_SetdaTab.pdf';
doc.save(outPath);
console.log('PDF tersimpan:', outPath);
console.log('Total halaman:', totalPages);
