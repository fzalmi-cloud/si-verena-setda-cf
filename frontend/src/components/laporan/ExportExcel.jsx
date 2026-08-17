import { utils, writeFile } from 'xlsx';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

const LEVEL_LABELS = {
  sangat_siap: 'Sangat Siap',
  siap_perbaikan_kecil: 'Siap (Perbaikan Kecil)',
  perlu_perbaikan_sedang: 'Perlu Perbaikan Sedang',
  belum_layak: 'Belum Layak',
};

const STATUS_FINAL_LABELS = {
  draft: 'Draft',
  sedang_diperiksa: 'Sedang Diperiksa',
  perlu_revisi: 'Perlu Revisi',
  layak_kirim: 'Layak Kirim',
  sudah_dikirim: 'Sudah Dikirim',
};

const KATEGORI_LABELS = {
  kelengkapan_dokumen: 'Kelengkapan Dokumen',
  sistematika_dokumen: 'Sistematika Dokumen',
  tabel_wajib: 'Tabel Wajib',
  matriks_renja: 'Matriks Renja',
  urgensi_prioritas: 'Urgensi & Prioritas',
  konsistensi_angka: 'Konsistensi Angka',
  substansi_bab: 'Substansi Bab',
};

const STATUS_ITEM_LABELS = {
  sesuai: 'Sesuai',
  perlu_perbaikan: 'Perlu Perbaikan',
  tidak_ditemukan: 'Tidak Ditemukan',
  perlu_review_manual: 'Perlu Review Manual',
  tidak_berlaku: 'Tidak Berlaku',
};

const VALIDASI_LABELS = {
  belum_divalidasi: 'Belum Divalidasi',
  divalidasi: 'Divalidasi',
  ditolak: 'Ditolak',
};

function formatTanggal(val) {
  if (!val) return '-';
  try { return format(new Date(val), 'd MMM yyyy HH:mm', { locale: idLocale }); } catch { return val; }
}

function applyHeaderStyle(ws, range) {
  // Basic column widths — xlsl CE mode
  return ws;
}

export function exportVerifikasiExcel({ selectedBiro, tahun, skor, results, allSkorBiro = [] }) {
  const wb = utils.book_new();

  // ── Sheet 1: Ringkasan ──────────────────────────────────────────────────────
  const summary = {
    sesuai: results.filter(r => r.status === 'sesuai').length,
    perlu_perbaikan: results.filter(r => r.status === 'perlu_perbaikan').length,
    tidak_ditemukan: results.filter(r => r.status === 'tidak_ditemukan').length,
    perlu_review_manual: results.filter(r => r.status === 'perlu_review_manual').length,
  };

  const ringkasanData = [
    ['Nama Biro', skor?.nama_biro || selectedBiro],
    ['Tahun Renja', tahun],
    ['Tanggal Pemeriksaan', formatTanggal(skor?.tanggal_pemeriksaan)],
    ['Skor Total', skor?.skor_total ?? '-'],
    ['Level Kesiapan', LEVEL_LABELS[skor?.level_kesiapan] || (skor?.level_kesiapan ?? '-')],
    ['Status Final', STATUS_FINAL_LABELS[skor?.status_final] || (skor?.status_final ?? '-')],
    ['Jumlah Item Sesuai', summary.sesuai],
    ['Jumlah Item Perlu Perbaikan', summary.perlu_perbaikan],
    ['Jumlah Item Tidak Ditemukan', summary.tidak_ditemukan],
    ['Jumlah Item Perlu Review Manual', summary.perlu_review_manual],
  ];

  const ws1 = utils.aoa_to_sheet(ringkasanData);
  ws1['!cols'] = [{ wch: 32 }, { wch: 40 }];
  utils.book_append_sheet(wb, ws1, 'Ringkasan');

  // ── Sheet 2: Detail Pemeriksaan ─────────────────────────────────────────────
  const detailHeader = [
    'Kategori', 'Sub Kategori', 'Item Pemeriksaan', 'Status',
    'Catatan Otomatis', 'Catatan Verifikator', 'Status Validasi',
    'Divalidasi Oleh', 'Tanggal Validasi',
  ];

  const detailRows = results.map(r => [
    KATEGORI_LABELS[r.kategori] || r.kategori || '-',
    r.sub_kategori || '-',
    r.item_pemeriksaan || '-',
    STATUS_ITEM_LABELS[r.status] || r.status || '-',
    r.catatan_otomatis || '-',
    r.catatan_verifikator || '-',
    VALIDASI_LABELS[r.status_validasi] || r.status_validasi || '-',
    r.divalidasi_oleh || '-',
    formatTanggal(r.tanggal_validasi),
  ]);

  const ws2 = utils.aoa_to_sheet([detailHeader, ...detailRows]);
  ws2['!cols'] = [
    { wch: 24 }, { wch: 22 }, { wch: 48 }, { wch: 22 },
    { wch: 44 }, { wch: 44 }, { wch: 20 }, { wch: 24 }, { wch: 20 },
  ];
  utils.book_append_sheet(wb, ws2, 'Detail Pemeriksaan');

  // ── Sheet 3: Rekap Biro ─────────────────────────────────────────────────────
  const rekapHeader = [
    'Nama Biro', 'Tahun', 'Skor Kelengkapan', 'Skor Sistematika',
    'Skor Tabel', 'Skor Matriks', 'Skor Konsistensi', 'Skor Substansi',
    'Skor Total', 'Level Kesiapan', 'Status Final',
  ];

  const rekapSource = allSkorBiro.length > 0 ? allSkorBiro : (skor ? [skor] : []);
  const rekapRows = rekapSource.map(s => [
    s.nama_biro || '-',
    s.periode_tahun ?? tahun,
    s.skor_kelengkapan ?? '-',
    s.skor_sistematika ?? '-',
    s.skor_tabel ?? '-',
    s.skor_matriks ?? '-',
    s.skor_konsistensi ?? '-',
    s.skor_substansi ?? '-',
    s.skor_total ?? '-',
    LEVEL_LABELS[s.level_kesiapan] || (s.level_kesiapan ?? '-'),
    STATUS_FINAL_LABELS[s.status_final] || (s.status_final ?? '-'),
  ]);

  const ws3 = utils.aoa_to_sheet([rekapHeader, ...rekapRows]);
  ws3['!cols'] = [
    { wch: 28 }, { wch: 8 }, { wch: 18 }, { wch: 18 },
    { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 16 },
    { wch: 12 }, { wch: 26 }, { wch: 20 },
  ];
  utils.book_append_sheet(wb, ws3, 'Rekap Biro');

  // ── Download ────────────────────────────────────────────────────────────────
  const safeBiro = (selectedBiro || 'Semua').replace(/\s+/g, '_');
  const fileName = `Laporan_Verifikasi_Renja_${safeBiro}_${tahun}.xlsx`;
  writeFile(wb, fileName);
}