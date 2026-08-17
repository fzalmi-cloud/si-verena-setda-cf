// Master checklist rules for automated verification

export const KATEGORI_LABELS = {
  kelengkapan_dokumen: 'Kelengkapan Dokumen Pendukung',
  sistematika_dokumen: 'Sistematika Dokumen Renja',
  tabel_wajib: 'Tabel Wajib',
  matriks_renja: 'Matriks Renja Excel',
  urgensi_prioritas: 'Urgensi & Prioritas',
  konsistensi_angka: 'Konsistensi Angka & Narasi',
  substansi_bab: 'Substansi Per Bab',
};

export const STATUS_LABELS = {
  sesuai: 'Sesuai',
  perlu_perbaikan: 'Perlu Perbaikan',
  tidak_ditemukan: 'Tidak Ditemukan',
  perlu_review_manual: 'Perlu Review Manual',
  tidak_berlaku: 'Tidak Berlaku',
};

export const STATUS_COLORS = {
  sesuai: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  perlu_perbaikan: 'bg-amber-50 text-amber-700 border-amber-200',
  tidak_ditemukan: 'bg-red-50 text-red-700 border-red-200',
  perlu_review_manual: 'bg-blue-50 text-blue-700 border-blue-200',
  tidak_berlaku: 'bg-muted text-muted-foreground border-border',
};

export const CHECKLIST_ITEMS = {
  kelengkapan_dokumen: [
    { id: 'kd_1', item: 'SK Tim Penyusun Renja', catatan_auto: 'Agar dilengkapi SK Tim Penyusun Renja.' },
    { id: 'kd_2', item: 'Bukti Pelaksanaan Orientasi Penyusunan Renja', catatan_auto: 'Agar melengkapi bukti dukung pelaksanaan orientasi penyusunan Renja berupa: undangan, notulen, dokumentasi.' },
    { id: 'kd_3', item: 'Bukti Pelaksanaan Forum Perangkat Daerah', catatan_auto: 'Agar melengkapi bukti dukung pelaksanaan Forum Perangkat Daerah.' },
    { id: 'kd_4', item: 'Berita Acara Forum Perangkat Daerah', catatan_auto: 'Agar ditambahkan Berita Acara Forum Perangkat Daerah.' },
    { id: 'kd_5', item: 'Notulen Rapat', catatan_auto: 'Notulen rapat belum dilampirkan.' },
    { id: 'kd_6', item: 'Dokumentasi Kegiatan', catatan_auto: 'Dokumentasi kegiatan belum dilampirkan.' },
    { id: 'kd_7', item: 'Lampiran Tabel Program/Kegiatan/Subkegiatan', catatan_auto: 'Lampiran tabel program/kegiatan/subkegiatan belum ditemukan.' },
    { id: 'kd_8', item: 'Dokumen Hasil Input SIPD / Matriks Renja', catatan_auto: 'Matriks Renja belum sesuai dengan format SIPD.' },
  ],
  sistematika_dokumen: [
    { id: 'sd_1', item: 'BAB I — Latar Belakang', bab: 'BAB I Pendahuluan', sub: 'Latar Belakang' },
    { id: 'sd_2', item: 'BAB I — Landasan Hukum', bab: 'BAB I Pendahuluan', sub: 'Landasan Hukum' },
    { id: 'sd_3', item: 'BAB I — Maksud dan Tujuan', bab: 'BAB I Pendahuluan', sub: 'Maksud dan Tujuan' },
    { id: 'sd_4', item: 'BAB I — Sistematika Penulisan', bab: 'BAB I Pendahuluan', sub: 'Sistematika Penulisan' },
    { id: 'sd_5', item: 'BAB II — Evaluasi Pelaksanaan Renja', bab: 'BAB II Hasil Evaluasi Renja Tahun Lalu', sub: 'Evaluasi Pelaksanaan Renja' },
    { id: 'sd_6', item: 'BAB II — Perkiraan Capaian Tahun Berjalan', bab: 'BAB II Hasil Evaluasi Renja Tahun Lalu', sub: 'Perkiraan Capaian Tahun Berjalan' },
    { id: 'sd_7', item: 'BAB II — Capaian Renstra', bab: 'BAB II Hasil Evaluasi Renja Tahun Lalu', sub: 'Capaian Renstra' },
    { id: 'sd_8', item: 'BAB II — Analisis Kinerja Pelayanan', bab: 'BAB II Hasil Evaluasi Renja Tahun Lalu', sub: 'Analisis Kinerja Pelayanan' },
    { id: 'sd_9', item: 'BAB II — Isu-isu Penting', bab: 'BAB II Hasil Evaluasi Renja Tahun Lalu', sub: 'Isu-isu Penting' },
    { id: 'sd_10', item: 'BAB II — Review Rancangan Awal RKPD', bab: 'BAB II Hasil Evaluasi Renja Tahun Lalu', sub: 'Review Rancangan Awal RKPD' },
    { id: 'sd_11', item: 'BAB II — Penelaahan Usulan Program Masyarakat', bab: 'BAB II Hasil Evaluasi Renja Tahun Lalu', sub: 'Penelaahan Usulan Program Masyarakat' },
    { id: 'sd_12', item: 'BAB III — Telaahan Kebijakan Nasional', bab: 'BAB III Tujuan, Sasaran, Program, Kegiatan', sub: 'Telaahan Kebijakan Nasional' },
    { id: 'sd_13', item: 'BAB III — Tujuan dan Sasaran Renja', bab: 'BAB III Tujuan, Sasaran, Program, Kegiatan', sub: 'Tujuan dan Sasaran Renja' },
    { id: 'sd_14', item: 'BAB III — Program dan Kegiatan', bab: 'BAB III Tujuan, Sasaran, Program, Kegiatan', sub: 'Program dan Kegiatan' },
    { id: 'sd_15', item: 'BAB IV — Lampiran Program/Kegiatan/Subkegiatan', bab: 'BAB IV Rencana Kerja dan Pendanaan', sub: 'Lampiran Program/Kegiatan/Subkegiatan' },
    { id: 'sd_16', item: 'BAB V — Catatan Penting', bab: 'BAB V Penutup', sub: 'Catatan Penting' },
    { id: 'sd_17', item: 'BAB V — Kaidah Pelaksanaan', bab: 'BAB V Penutup', sub: 'Kaidah Pelaksanaan' },
    { id: 'sd_18', item: 'BAB V — Rencana Tindak Lanjut', bab: 'BAB V Penutup', sub: 'Rencana Tindak Lanjut' },
  ],
  tabel_wajib: [
    { id: 'tw_1', item: 'Tabel T-C.29', catatan_auto: 'Tabel T-C.29 belum ditemukan.' },
    { id: 'tw_2', item: 'Tabel T-C.30', catatan_auto: 'Tabel T-C.30 belum ditemukan.' },
    { id: 'tw_3', item: 'Tabel T-C.31', catatan_auto: 'Tabel T-C.31 belum ditemukan.' },
    { id: 'tw_4', item: 'Tabel T-C.32', catatan_auto: 'Tabel T-C.32 belum ditemukan.' },
    { id: 'tw_5', item: 'Tabel T-C.33 / Matriks Program Kegiatan', catatan_auto: 'Tabel T-C.33 belum ditemukan.' },
    { id: 'tw_6', item: 'Matriks Rencana Program/Kegiatan/Subkegiatan', catatan_auto: 'Matriks rencana program belum ditemukan.' },
    { id: 'tw_7', item: 'Tabel Prioritas Nasional dan Daerah', catatan_auto: 'Tabel prioritas belum ditemukan.' },
    { id: 'tw_8', item: 'Tabel Pagu Indikatif', catatan_auto: 'Tabel pagu indikatif belum ditemukan.' },
    { id: 'tw_9', item: 'Tabel Prakiraan Maju', catatan_auto: 'Tabel prakiraan maju belum ditemukan.' },
  ],
  matriks_renja: [
    { id: 'mr_1', item: 'Kolom Urusan/Bidang Urusan/Program/Kegiatan/Subkegiatan' },
    { id: 'mr_2', item: 'Kolom Kode Program/Kegiatan/Subkegiatan' },
    { id: 'mr_3', item: 'Kolom Indikator Program/Kegiatan/Subkegiatan' },
    { id: 'mr_4', item: 'Kolom Target Akhir Periode Renstra' },
    { id: 'mr_5', item: 'Kolom Realisasi Capaian Renja Tahun Sebelumnya' },
    { id: 'mr_6', item: 'Kolom Prakiraan Capaian Tahun Berjalan' },
    { id: 'mr_7', item: 'Kolom Target Tahun Rencana' },
    { id: 'mr_8', item: 'Kolom Pagu Indikatif Tahun Rencana' },
    { id: 'mr_9', item: 'Kolom Lokasi' },
    { id: 'mr_10', item: 'Kolom Sumber Dana' },
    { id: 'mr_11', item: 'Kolom Prioritas Nasional' },
    { id: 'mr_12', item: 'Kolom Prioritas Daerah' },
    { id: 'mr_13', item: 'Kolom Kelompok Sasaran' },
    { id: 'mr_14', item: 'Kolom Target Prakiraan Maju' },
    { id: 'mr_15', item: 'Kolom Pagu Prakiraan Maju' },
    { id: 'mr_16', item: 'Kolom Urgensi' },
    { id: 'mr_17', item: 'Kolom Catatan Pembahasan Renja' },
  ],
  urgensi_prioritas: [
    { id: 'up_1', item: 'SPM' },
    { id: 'up_2', item: 'Penampung DAK' },
    { id: 'up_3', item: 'Pokir' },
    { id: 'up_4', item: 'Mandatori' },
    { id: 'up_5', item: 'Direktif' },
    { id: 'up_6', item: 'Nagari Creative Hub (NCH)' },
    { id: 'up_7', item: 'Kemiskinan' },
    { id: 'up_8', item: 'Stunting' },
    { id: 'up_9', item: 'Ekonomi Biru' },
    { id: 'up_10', item: 'Ekonomi Hijau' },
    { id: 'up_11', item: 'Inflasi' },
    { id: 'up_12', item: 'Kemudahan Perizinan' },
    { id: 'up_13', item: 'Ekonomi Syariah/Halal' },
    { id: 'up_14', item: 'IUP' },
    { id: 'up_15', item: 'IKU' },
    { id: 'up_16', item: 'IKK' },
    { id: 'up_17', item: 'PAD' },
    { id: 'up_18', item: 'Forum OPD' },
    { id: 'up_19', item: 'Dukungan Renstra K/L' },
    { id: 'up_20', item: 'Program Strategis Nasional' },
  ],
  konsistensi_angka: [
    { id: 'ka_1', item: 'Jumlah program Bab III = Bab IV', catatan_auto: 'Jumlah program pada Bab III dan Bab IV belum konsisten.' },
    { id: 'ka_2', item: 'Jumlah kegiatan narasi = matriks', catatan_auto: 'Jumlah kegiatan pada narasi dan matriks belum konsisten.' },
    { id: 'ka_3', item: 'Jumlah subkegiatan narasi = matriks', catatan_auto: 'Jumlah subkegiatan pada narasi dan matriks belum konsisten.' },
    { id: 'ka_4', item: 'Total pagu Bab III = Bab IV', catatan_auto: 'Total pagu pada Bab III dan Bab IV belum konsisten.' },
    { id: 'ka_5', item: 'Total pagu matriks = total pagu Renja', catatan_auto: 'Total pagu perlu diperiksa kembali.' },
    { id: 'ka_6', item: 'Pagu program penunjang dan urusan tidak tertukar' },
    { id: 'ka_7', item: 'Target tahun rencana tidak kosong', catatan_auto: 'Terdapat target tahun rencana yang kosong.' },
    { id: 'ka_8', item: 'Prakiraan maju tahun berikutnya tidak kosong', catatan_auto: 'Terdapat prakiraan maju yang kosong.' },
    { id: 'ka_9', item: 'Lokasi kegiatan tidak kosong', catatan_auto: 'Terdapat lokasi kegiatan yang kosong.' },
    { id: 'ka_10', item: 'Sumber dana tidak kosong', catatan_auto: 'Terdapat sumber dana yang kosong.' },
    { id: 'ka_11', item: 'Kelompok sasaran tidak kosong', catatan_auto: 'Terdapat kelompok sasaran yang kosong.' },
    { id: 'ka_12', item: 'Catatan pembahasan tidak kosong (jika ada perubahan)', catatan_auto: 'Catatan pembahasan kosong padahal terdapat perubahan/penyesuaian.' },
  ],
  substansi_bab: [
    { id: 'sb_1', item: 'Latar belakang memuat pengertian Renja' },
    { id: 'sb_2', item: 'Latar belakang memuat proses penyusunan Renja' },
    { id: 'sb_3', item: 'Keterkaitan dengan RKPD' },
    { id: 'sb_4', item: 'Keterkaitan dengan Renstra' },
    { id: 'sb_5', item: 'Keterkaitan dengan Renja K/L' },
    { id: 'sb_6', item: 'Keterkaitan dengan Renja Kabupaten/Kota' },
    { id: 'sb_7', item: 'Landasan hukum memuat regulasi terbaru' },
    { id: 'sb_8', item: 'Maksud dan tujuan penyusunan Renja jelas' },
    { id: 'sb_9', item: 'Sistematika penulisan sesuai bab' },
    { id: 'sb_10', item: 'Evaluasi Renja tahun sebelumnya disajikan' },
    { id: 'sb_11', item: 'Perkiraan capaian tahun berjalan disajikan' },
    { id: 'sb_12', item: 'Faktor penyebab tidak/tercapai/melebihi target diuraikan' },
    { id: 'sb_13', item: 'Implikasi terhadap capaian Renstra diuraikan' },
    { id: 'sb_14', item: 'Kebijakan/tindakan perencanaan dan penganggaran disajikan' },
    { id: 'sb_15', item: 'Isu-isu penting memuat permasalahan, hambatan, tantangan, peluang' },
    { id: 'sb_16', item: 'Review rancangan awal RKPD menjelaskan perbedaan dengan analisis kebutuhan' },
    { id: 'sb_17', item: 'Usulan pemangku kepentingan dijelaskan' },
    { id: 'sb_18', item: 'Tujuan dan sasaran mengacu Renstra' },
    { id: 'sb_19', item: 'Program dan kegiatan memuat faktor pertimbangan' },
    { id: 'sb_20', item: 'Penutup memuat rencana tindak lanjut' },
  ],
};

export function calculateScore(results) {
  const categories = {};
  const weights = {
    kelengkapan_dokumen: 15,
    sistematika_dokumen: 15,
    tabel_wajib: 15,
    matriks_renja: 15,
    konsistensi_angka: 15,
    substansi_bab: 15,
    urgensi_prioritas: 10,
  };

  Object.keys(CHECKLIST_ITEMS).forEach(cat => {
    const items = results.filter(r => r.kategori === cat);
    if (items.length === 0) {
      categories[cat] = 0;
      return;
    }
    const applicable = items.filter(r => r.status !== 'tidak_berlaku');
    if (applicable.length === 0) {
      categories[cat] = 100;
      return;
    }
    const sesuai = applicable.filter(r => r.status === 'sesuai').length;
    categories[cat] = Math.round((sesuai / applicable.length) * 100);
  });

  let totalWeight = 0;
  let totalScore = 0;
  Object.entries(weights).forEach(([cat, w]) => {
    if (categories[cat] !== undefined) {
      totalScore += categories[cat] * w;
      totalWeight += w;
    }
  });

  const total = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;

  return {
    skor_kelengkapan: categories.kelengkapan_dokumen || 0,
    skor_sistematika: categories.sistematika_dokumen || 0,
    skor_tabel: categories.tabel_wajib || 0,
    skor_matriks: categories.matriks_renja || 0,
    skor_konsistensi: categories.konsistensi_angka || 0,
    skor_substansi: categories.substansi_bab || 0,
    skor_total: total,
    level_kesiapan: total >= 90 ? 'sangat_siap' : total >= 75 ? 'siap_perbaikan_kecil' : total >= 60 ? 'perlu_perbaikan_sedang' : 'belum_layak',
  };
}