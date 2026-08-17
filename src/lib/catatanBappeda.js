/**
 * Catatan koreksi/verifikasi Bappeda per biro — hasil ekstrasi dari kisi-kisi xlsx.
 * Setiap biro hanya memuat catatan SPESIFIK miliknya sendiri.
 * Tanggal verifikasi sesuai kisi-kisi masing-masing.
 */

export const CATATAN_BAPPEDA = {
  "Biro Hukum": {
    nama_biro: "Biro Hukum",
    tanggal_verifikasi: "18 Mei 2026",
    catatan: [
      {
        bab: "Kelengkapan Dokumen",
        item: "SK Tim Penyusunan Renja",
        status: "sesuai",
        catatan: "SK Tim Penyusunan Renja Setda (sudah ada). Tgl perbaikan: 21 Mei 2026."
      },
      {
        bab: "Kelengkapan Dokumen",
        item: "Orientasi Penyusunan Renja",
        status: "sesuai",
        catatan: "Orientasi Penyusunan Renja Setda (sudah ada). Tgl perbaikan: 21 Mei 2026."
      },
      {
        bab: "Kelengkapan Dokumen",
        item: "Forum OPD",
        status: "sesuai",
        catatan: "Forum OPD Biro Hukum Setda Provinsi (sudah ada). Tgl perbaikan: 21 Mei 2026."
      },
      {
        bab: "BAB I – 1.1 Latar Belakang",
        item: "Keterkaitan Renja K/L",
        status: "perlu_perbaikan",
        catatan: "Sudah ada hal. 5 namun perlu diperjelas keterkaitan dengan Renja K/L. Tgl perbaikan: 22 Mei 2026."
      },
      {
        bab: "BAB I – 1.2 Landasan Hukum",
        item: "Dasar hukum Renstra Kementerian",
        status: "perlu_perbaikan",
        catatan: "Perlu menambahkan dasar hukum Renstra KemenHum, KemenHAM, dan Kemendagri."
      },
      {
        bab: "BAB I – 1.2 Landasan Hukum",
        item: "Pergub Renstra BPSDM",
        status: "perlu_perbaikan",
        catatan: "Perlu menambahkan dasar hukum Pergub No. 20 tentang Renstra BPSDM 2025-2029. (sdh ada, nomor 20)"
      },
      {
        bab: "BAB I – 1.2 Landasan Hukum",
        item: "Klasifikasi, Kodefikasi, Nomenklatur",
        status: "perlu_perbaikan",
        catatan: "Perlu menambahkan Kepmendagri terbaru tahun 2025 tentang klasifikasi, kodefikasi, dan nomenklatur."
      },
      {
        bab: "BAB I – 1.4 Sistematika Penulisan",
        item: "Sistematika",
        status: "sesuai",
        catatan: "Agar mempedomani Permendagri 86/2017. Sudah sesuai. Tgl perbaikan: 22 Mei 2026."
      },
      {
        bab: "BAB II – 2.1 Evaluasi Pelaksanaan Renja",
        item: "Evaluasi capaian kinerja 2025",
        status: "perlu_perbaikan",
        catatan: "Agar dilengkapi dengan evaluasi capaian kinerja tahun 2025, tidak hanya evaluasi capaian keuangan. (sudah ditambah tabel capaian fisik dari Simbangda Des 2025). Tgl: 22 Mei 2026."
      },
      {
        bab: "BAB II – 2.1 Evaluasi Pelaksanaan Renja",
        item: "Perkiraan capaian 2026 – Tabel T-C.29",
        status: "perlu_perbaikan",
        catatan: "Supaya dilengkapi pada tabel T-C.29 (masih terdapat data yang kosong untuk sub kegiatan tanpa alokasi anggaran 2026). Tgl: 22 Mei 2026."
      },
      {
        bab: "BAB II – 2.1 Evaluasi Pelaksanaan Renja",
        item: "Analisis SWOT pada narasi evaluasi",
        status: "perlu_perbaikan",
        catatan: "Analisis terhadap capaian tidak hanya yang tidak tercapai, tetapi juga yang tercapai/melebihi. Disarankan menggunakan analisis SWOT. (sudah ada semua, kecuali analisis SWOT). Tgl: 22 Mei 2026."
      },
      {
        bab: "BAB II – 2.2 Analisis Kinerja",
        item: "Tabel T-C.30",
        status: "sesuai",
        catatan: "Tabel TC.30 belum sepenuhnya menyesuaikan Permendagri 86/2017 → sudah diperbaiki. Tabel 2.2.2 bersifat pengulang, disarankan tidak ditampilkan. Tgl: 22 Mei 2026."
      },
      {
        bab: "BAB II – 2.5 Penelaahan Usulan Masyarakat",
        item: "Narasi dan tabel T-C.32",
        status: "perlu_perbaikan",
        catatan: "Biro Hukum Nihil — disempurnakan narasi dan dibuatkan tabel. Tabel yang disajikan belum mengikuti format T-C.32 Permendagri 86/2017. Tgl: 22 Mei 2026."
      },
      {
        bab: "BAB III – 3.1 Kebijakan Nasional",
        item: "Telaahan kebijakan nasional",
        status: "sesuai",
        catatan: "Agar mengacu ke RPJMN 2025-2029 dan Renstra K/L dan tambahkan narasinya. (sudah ditambahkan). Tgl: 22 Mei 2026."
      },
      {
        bab: "BAB III – 3.2 Tujuan dan Sasaran",
        item: "Tujuan & Sasaran",
        status: "sesuai",
        catatan: "Disesuaikan dengan Renstra PD dan tambahkan narasinya. (sudah ditambahkan). Tgl: 22 Mei 2026."
      },
      {
        bab: "BAB III – 3.3 Program dan Kegiatan",
        item: "Tabel T-C.33",
        status: "sesuai",
        catatan: "Disesuaikan dengan TC.33 dan ditambahkan narasinya. Mengacu pada Renstra PD 2025-2029. Tgl: 22 Mei 2026."
      },
      {
        bab: "BAB IV – Rencana Kerja dan Pendanaan",
        item: "Format tabel SIPD",
        status: "perlu_perbaikan",
        catatan: "Renja di Bab IV disamakan dengan Renstra pada Tahap 1. Format tabel disesuaikan dengan SIPD. Tgl: 22 Mei 2026."
      }
    ]
  },

  "Biro Kesejahteraan Rakyat": {
    nama_biro: "Biro Kesejahteraan Rakyat",
    tanggal_verifikasi: "19 Mei 2026",
    catatan: [
      {
        bab: "Kelengkapan Dokumen",
        item: "SK Tim Penyusunan Renja",
        status: "sesuai",
        catatan: "Tim Kerja Penyusunan Renja Setda Provinsi (sudah ada). Disertai undangan, absensi, notulen, dokumentasi."
      },
      {
        bab: "BAB I – 1.1 Latar Belakang",
        item: "Proses penyusunan Renja SKPD",
        status: "perlu_perbaikan",
        catatan: "Agar ditambahkan proses penyusunan Renja (belum ada)."
      },
      {
        bab: "BAB I – 1.1 Latar Belakang",
        item: "Keterkaitan Renja K/L dan Renja Kab/Kota",
        status: "perlu_perbaikan",
        catatan: "Perlu ditambahkan keterkaitan dengan Renja K/L dan Renja Kab/Kota."
      },
      {
        bab: "BAB I – 1.1 Latar Belakang",
        item: "Tindak lanjut proses penyusunan RAPBD",
        status: "perlu_perbaikan",
        catatan: "Perlu ditambahkan tindak lanjut dengan proses penyusunan RAPBD."
      },
      {
        bab: "BAB I – 1.2 Landasan Hukum",
        item: "Urutan dan kelengkapan landasan hukum",
        status: "perlu_perbaikan",
        catatan: "Agar diurutkan dari peraturan tertinggi ke terendah. Tambahkan: RPJPN, RPJMN, Perda RPJPD 2025-2029, RPJMD Provinsi, RKPD Provinsi, Renstra PD. Samakan dengan dasar hukum di Renstra. Disesuaikan dengan SOTK. Tambahkan peraturan perundang-undangan yang baru."
      },
      {
        bab: "BAB I – 1.3 Maksud dan Tujuan",
        item: "Maksud dan Tujuan",
        status: "perlu_perbaikan",
        catatan: "Maksud dan tujuan belum dimuat (belum ada)."
      },
      {
        bab: "BAB I – 1.4 Sistematika Penulisan",
        item: "Sistematika penulisan",
        status: "perlu_perbaikan",
        catatan: "Agar mempedomani Permendagri 86/2017 (belum ada)."
      },
      {
        bab: "BAB II – 2.1 Evaluasi Pelaksanaan Renja",
        item: "Evaluasi Renja 2025 – seluruh sub bab 2.1 s.d 2.5",
        status: "perlu_perbaikan",
        catatan: "Agar mempedomani Permendagri 86/2017. Perkiraan capaian 2026, keterkaitan Renstra, review evaluasi belum ada."
      },
      {
        bab: "BAB II – 2.2 Analisis Kinerja",
        item: "Tabel T-C.30",
        status: "perlu_perbaikan",
        catatan: "Capaian kinerja pelayanan, indikator, dan tabel T-C.30 belum tersedia."
      },
      {
        bab: "BAB II – 2.5 Penelaahan Usulan Masyarakat",
        item: "Tabel T-C.32",
        status: "perlu_perbaikan",
        catatan: "Disarankan apabila terdapat usulan program dan kegiatan masyarakat, agar dimasukkan dalam tabel T-C.32 mempedomani Permendagri 86/2017."
      },
      {
        bab: "BAB III – 3.1 Kebijakan Nasional",
        item: "Telaahan kebijakan Nasional",
        status: "perlu_perbaikan",
        catatan: "Mengacu ke Renstra K/L (belum ada)."
      },
      {
        bab: "BAB III – 3.2 Tujuan dan Sasaran",
        item: "Tujuan dan Sasaran",
        status: "perlu_perbaikan",
        catatan: "Disesuaikan dengan Renstra PD (belum ada). Tujuan, sasaran, program dan kegiatan merupakan turunan Renstra 2025-2029."
      },
      {
        bab: "BAB III – 3.3 Program dan Kegiatan",
        item: "Tabel T-C.33 dan narasi",
        status: "perlu_perbaikan",
        catatan: "Disesuaikan dengan TC.33 dan ditambahkan narasinya."
      },
      {
        bab: "BAB IV – Rencana Kerja dan Pendanaan",
        item: "Format SIPD dan pagu RPJMD",
        status: "perlu_perbaikan",
        catatan: "Mempedomani pagu dana dengan yang akan ditetapkan dalam RPJMD 2025-2029. Renja di Bab IV disamakan dengan Renstra Tahap 1. Format tabel disesuaikan SIPD."
      },
      {
        bab: "BAB V – Penutup",
        item: "Kaidah dan Rencana Tindak Lanjut",
        status: "perlu_perbaikan",
        catatan: "Kaidah-kaidah pelaksanaan dan rencana tindak lanjut belum ada."
      }
    ]
  },

  "Biro Pemerintahan dan Otonomi Daerah": {
    nama_biro: "Biro Pemerintahan dan Otonomi Daerah",
    tanggal_verifikasi: "20 Mei 2026",
    catatan: [
      {
        bab: "Kelengkapan Dokumen",
        item: "SK Tim, Orientasi, Forum OPD",
        status: "tidak_ditemukan",
        catatan: "Ketika pembahasan, semua kelengkapan dokumen (SK Tim, Orientasi, Forum OPD) belum ada."
      },
      {
        bab: "BAB I – Seluruh isi BAB I",
        item: "BAB I Pendahuluan",
        status: "tidak_ditemukan",
        catatan: "Ketika pembahasan Renja belum ada. Agar mempedomani Permendagri 86/2017. Perlu ditambahkan: proses penyusunan Renja, keterkaitan dengan Renja K/L dan Renja Kab/Kota, tindak lanjut proses penyusunan RAPBD. Landasan hukum: urutkan dari tertinggi ke terendah, tambahkan RPJPN, RPJMN, Perda RPJPD, RPJMD, RKPD, Renstra PD; sesuaikan SOTK; tambahkan peraturan terbaru."
      },
      {
        bab: "BAB II – Seluruh isi BAB II",
        item: "BAB II Evaluasi",
        status: "tidak_ditemukan",
        catatan: "Ketika pembahasan Renja belum ada. Agar mempedomani Permendagri 86/2017. Sub bab 2.1 s.d 2.5 belum ada semua."
      },
      {
        bab: "BAB III – Tujuan, Sasaran, Program",
        item: "BAB III",
        status: "tidak_ditemukan",
        catatan: "Ketika pembahasan Renja belum ada. Mengacu ke Renstra K/L. Disesuaikan dengan Renstra PD. Disesuaikan dengan TC.33 dan ditambahkan narasinya. Tujuan, sasaran, program, dan kegiatan Renja 2027 merupakan turunan Renstra 2025-2029."
      },
      {
        bab: "BAB IV – Rencana Kerja dan Pendanaan",
        item: "BAB IV",
        status: "tidak_ditemukan",
        catatan: "Ketika pembahasan dokumen Renja belum ada. Mempedomani pagu dana dengan yang akan ditetapkan dalam RPJMD 2025-2029. Renja di Bab IV disamakan dengan Renstra Tahap 1. Format tabel disesuaikan SIPD."
      }
    ]
  },

  "Biro Administrasi Pembangunan": {
    nama_biro: "Biro Administrasi Pembangunan",
    tanggal_verifikasi: "13 Mei 2026",
    catatan: [
      {
        bab: "Kelengkapan Dokumen",
        item: "SK Tim Penyusunan Renja",
        status: "perlu_perbaikan",
        catatan: "Agar diupload SK Tim Penyusun Renja PD di Sakato Plan."
      },
      {
        bab: "Kelengkapan Dokumen",
        item: "Orientasi Penyusunan Renja",
        status: "perlu_perbaikan",
        catatan: "Agar diupload di Sakato Plan bukti dukung pelaksanaan orientasi berupa surat undangan, dokumentasi, notulen, absensi, dan jadwal penyusunan Renja PD."
      },
      {
        bab: "Kelengkapan Dokumen",
        item: "Forum OPD",
        status: "perlu_perbaikan",
        catatan: "Agar diupload di Sakato Plan bukti dukung pelaksanaan Forum PD berupa surat undangan, berita acara, dan dokumentasi."
      },
      {
        bab: "BAB I – 1.1 Latar Belakang",
        item: "Proses penyusunan Renja",
        status: "perlu_perbaikan",
        catatan: "Agar dimuat urutan proses penyusunan Renja mulai dari ranwal Renja s.d penetapan Renja. Agar dilengkapi data Tim Penyusun Renja pada hal. 3."
      },
      {
        bab: "BAB I – 1.1 Latar Belakang",
        item: "Keterkaitan dokumen perencanaan",
        status: "perlu_perbaikan",
        catatan: "Bagan keterkaitan sudah ada namun disarankan agar dijelaskan satu persatu keterkaitan dengan dokumen-dokumen perencanaan (RKPD, Renstra, Renja K/L, Renja Kab/Kota)."
      },
      {
        bab: "BAB I – 1.1 Latar Belakang",
        item: "Tindak lanjut RAPBD",
        status: "perlu_perbaikan",
        catatan: "Agar dimuat tindak lanjut terhadap proses perencanaan daerah setelah penyusunan Renja OPD."
      },
      {
        bab: "BAB I – 1.2 Landasan Hukum",
        item: "Update landasan hukum",
        status: "perlu_perbaikan",
        catatan: "Agar diperhatikan updating peraturan. Tambahkan: Permendagri 90/2019 (Klasifikasi, Kodefikasi…), Kepmendagri 900.1-2850/2025 (Hasil verifikasi dan validasi…), SE Gubernur 030/237.a/BPKAD-PAP/2024 (Efisiensi dan penghematan belanja…), SE Gub. 050/1/I/P2EPD/Bappeda-2026 (Penyusunan Ranwal Renja PD 2027), serta RPJPN, RPJMN, Perda RPJPD Provinsi, RPJMD Provinsi, RKPD Provinsi, Renstra PD."
      },
      {
        bab: "BAB I – 1.3 Maksud dan Tujuan",
        item: "Tujuan",
        status: "perlu_perbaikan",
        catatan: "Pada tujuan, agar ditambahkan: untuk menjamin kesesuaian antara program, kegiatan, lokasi kegiatan, kelompok sasaran serta prakiraan maju (sesuai Permendagri 86/2017)."
      },
      {
        bab: "BAB I – 1.4 Sistematika Penulisan",
        item: "Sistematika",
        status: "perlu_perbaikan",
        catatan: "Pada sistematika 3.3 Program dan Kegiatan, agar ditambahkan faktor-faktor yang menjadi pertimbangan (visi misi kepala daerah, SDG's, NSPK, SPM, dsb)."
      },
      {
        bab: "BAB II – 2.1 Evaluasi Pelaksanaan Renja",
        item: "Penomoran sub bab BAB II",
        status: "perlu_perbaikan",
        catatan: "Agar penomoran pembahasan sub bab 2 mengacu pada sistematika penulisan di Bab I (Permendagri 86/2017): sub 2.1 Evaluasi Pelaksanaan Renja Tahun Lalu dan Capaian Renstra, dst s.d sub 2.5."
      },
      {
        bab: "BAB II – 2.1 Evaluasi Pelaksanaan Renja",
        item: "Perkiraan capaian 2026 – kolom Tabel T-C.29",
        status: "perlu_perbaikan",
        catatan: "Agar dilengkapi isian kolom Perkiraan Realisasi Capaian Target Renstra PD s.d tahun berjalan."
      },
      {
        bab: "BAB II – 2.1 Evaluasi Pelaksanaan Renja",
        item: "Keterkaitan pencapaian target Renstra",
        status: "perlu_perbaikan",
        catatan: "Agar dilengkapi keterkaitan dengan pencapaian target Renstra SKPD."
      },
      {
        bab: "BAB II – 2.1 Evaluasi Pelaksanaan Renja",
        item: "Implikasi dan kebijakan tindakan",
        status: "perlu_perbaikan",
        catatan: "Agar ditambahkan implikasi yang timbul terhadap target Renstra SKPD, serta kebijakan/tindakan yang perlu diambil."
      },
      {
        bab: "BAB II – 2.3 Isu-isu Penting",
        item: "Koordinasi dan sinergi",
        status: "perlu_perbaikan",
        catatan: "Agar ditambahkan uraian tentang koordinasi dan sinergi dengan SKPD Kab/Kota, K/L."
      },
      {
        bab: "BAB II – 2.3 Isu-isu Penting",
        item: "Dampak terhadap visi misi",
        status: "perlu_perbaikan",
        catatan: "Agar ditambahkan dampak permasalahan dan hambatan terhadap pelayanan publik yang efektif."
      },
      {
        bab: "BAB II – 2.3 Isu-isu Penting",
        item: "Tantangan dan peluang",
        status: "perlu_perbaikan",
        catatan: "Agar ditambahkan tantangan dan peluang dalam meningkatkan pelayanan SKPD."
      },
      {
        bab: "BAB II – 2.3 Isu-isu Penting",
        item: "Formulasi isu penting",
        status: "perlu_perbaikan",
        catatan: "Agar ditambahkan rumusan program dan kegiatan terkait isu-isu penting yang dikemukakan."
      },
      {
        bab: "BAB II – 2.4 Review RKPD",
        item: "Alasan proses review RKPD",
        status: "perlu_perbaikan",
        catatan: "Agar ditambahkan alasan dimaksud."
      },
      {
        bab: "BAB II – 2.5 Penelaahan Usulan Masyarakat",
        item: "Narasi dan tabel",
        status: "perlu_perbaikan",
        catatan: "Agar disempurnakan narasi dan dibuatkan tabel terkait usulan-usulan dari para pemangku kepentingan."
      },
      {
        bab: "BAB III – 3.1 Kebijakan Nasional",
        item: "Penggabungan sub bab kebijakan",
        status: "perlu_perbaikan",
        catatan: "Terdapat sub bab Telaahan Kebijakan Daerah, sebaiknya uraiannya digabungkan dengan sub bab 3.1 agar sesuai sistematika penulisan. Telaahan mengacu kepada Renstra K/L yang terkait dengan arah kebijakan dan prioritas pembangunan daerah dan tupoksi OPD."
      },
      {
        bab: "BAB III – 3.2 Tujuan dan Sasaran",
        item: "Nomenklatur tabel Tujuan dan Sasaran",
        status: "perlu_perbaikan",
        catatan: "Mengacu kepada Renstra SKPD. Nomenklatur tabel Tujuan dan Sasaran agar disesuaikan tahun yang bersangkutan."
      },
      {
        bab: "BAB III – 3.3 Program dan Kegiatan",
        item: "Faktor-faktor pertimbangan",
        status: "perlu_perbaikan",
        catatan: "Agar ditambahkan apa saja faktor-faktor dimaksud seperti visi misi kepala daerah, SDG's, NSPK, SPM, dsb."
      },
      {
        bab: "BAB III – 3.3 Program dan Kegiatan",
        item: "Sifat penyebaran lokasi",
        status: "perlu_perbaikan",
        catatan: "Agar diuraikan sifat penyebaran lokasi program dan kegiatan."
      },
      {
        bab: "BAB III – 3.3 Program dan Kegiatan",
        item: "Nomenklatur Tabel T-C.33",
        status: "perlu_perbaikan",
        catatan: "Agar disesuaikan nomenklatur tabel T-C.33 dengan Permendagri 86/2017. Tahun judul kolom matrik Prakiraan Maju seharusnya tahun 2027."
      },
      {
        bab: "BAB IV – Rencana Kerja dan Pendanaan",
        item: "Format tabel SIPD",
        status: "perlu_perbaikan",
        catatan: "Mempedomani pagu dana dengan yang akan ditetapkan dalam RPJMD 2025-2029. Renja di Bab IV disamakan dengan Renstra Tahap 1. Format tabel disesuaikan dengan format tabel di SIPD RI."
      },
      {
        bab: "BAB V – Penutup",
        item: "Kaidah pelaksanaan",
        status: "perlu_perbaikan",
        catatan: "Agar ditambahkan kaidah pelaksanaan Renja (siapa pelaksana, bagaimana monitoring dan evaluasi, dll)."
      },
      {
        bab: "BAB V – Penutup",
        item: "Rencana tindak lanjut",
        status: "perlu_perbaikan",
        catatan: "Agar ditambahkan rencana tindak lanjut dari Renja OPD terkait proses penyusunan dokumen perencanaan pembangunan ke depan."
      }
    ]
  },

  "Biro Pengadaan Barang dan Jasa": {
    nama_biro: "Biro Pengadaan Barang dan Jasa",
    tanggal_verifikasi: "12 Mei 2026",
    catatan: [
      {
        bab: "Kelengkapan Dokumen",
        item: "SK Tim Penyusunan Renja",
        status: "perlu_perbaikan",
        catatan: "SK Gubernur tentang Tim Penyusunan Renja sebaiknya dibentuk sebelum pelaksanaan orientasi penyusunan Renja."
      },
      {
        bab: "Kelengkapan Dokumen",
        item: "Orientasi Penyusunan Renja",
        status: "tidak_ditemukan",
        catatan: "Rapat orientasi penyusunan Renja tahun 2027 belum dilaksanakan. Yang ada hanya rapat persiapan Forum OPD tahun 2027 (dengan dokumen surat undangan dan notulen rapat)."
      },
      {
        bab: "Kelengkapan Dokumen",
        item: "Forum OPD / Berita Acara",
        status: "tidak_ditemukan",
        catatan: "Berita Acara Forum Perangkat Daerah tahun 2026 agar dilengkapi."
      },
      {
        bab: "BAB I – 1.2 Landasan Hukum",
        item: "Update landasan hukum",
        status: "perlu_perbaikan",
        catatan: "Agar diurutkan berdasarkan peraturan yang tertinggi ke terendah. Tambahkan: peraturan perundang-undangan terbaru (RPJPN, RPJMN, RPJPD Provinsi), Kepmendagri No. 900.1-2850 Tahun 2025, SE Gubernur Sumbar No. 050/1/I/P2EPD/Bappeda-2026 tentang Penyusunan Rancangan Awal Renja PD 2027."
      },
      {
        bab: "BAB I – 1.3 Maksud dan Tujuan",
        item: "Narasi tujuan",
        status: "perlu_perbaikan",
        catatan: "Narasi 'RAPBD Tahun Anggaran 2027 setelah diverifikasi oleh BAPPEDA Provinsi Sumatera Barat' agar diganti dengan 'diverifikasi oleh TAPD'."
      },
      {
        bab: "BAB I – 1.4 Sistematika Penulisan",
        item: "Jumlah Bab",
        status: "perlu_perbaikan",
        catatan: "Tertulis 4 bab. Agar mempedomani sistematika Renja OPD sesuai Permendagri 86/2027 sebanyak 5 bab."
      },
      {
        bab: "BAB II – 2.1 Evaluasi Pelaksanaan Renja",
        item: "Perkiraan capaian 2026",
        status: "perlu_perbaikan",
        catatan: "Agar perkiraan capaian tahun 2026 dijelaskan dalam bentuk narasi."
      },
      {
        bab: "BAB II – 2.2 Analisis Kinerja",
        item: "Tabel T-C.30",
        status: "perlu_perbaikan",
        catatan: "Analisis pencapaian kinerja pelayanan Perangkat Daerah belum berdasarkan analisis Tabel T-C.30. Agar disempurnakan narasinya."
      },
      {
        bab: "BAB II – 2.4 Review RKPD",
        item: "Narasi review RKPD",
        status: "perlu_perbaikan",
        catatan: "Proses perbandingan rancangan awal RKPD dengan analisis kebutuhan, alasan proses, dan temuan-temuan agar diuraikan dalam bentuk narasi."
      },
      {
        bab: "BAB II – 2.5 Penelaahan Usulan Masyarakat",
        item: "Tabel T-C.32",
        status: "perlu_perbaikan",
        catatan: "Usulan Program dan Kegiatan dari Para Pemangku Kepentingan Tahun 2027 belum ada. Kalau ada, disebutkan program/kegiatan/sub kegiatan seperti Tabel T-C.32."
      },
      {
        bab: "BAB III – 3.1 Judul Bab III",
        item: "Judul Bab III",
        status: "perlu_perbaikan",
        catatan: "Judul Bab III tertulis 'Tujuan, Sasaran, Program, Kegiatan', agar diganti menjadi 'Tujuan, Sasaran Program Perangkat Daerah'."
      },
      {
        bab: "BAB III – 3.3 Program dan Kegiatan",
        item: "Jumlah program dan kegiatan",
        status: "perlu_perbaikan",
        catatan: "Jumlah program dan kegiatan tidak terlihat dalam uraian."
      },
      {
        bab: "BAB III – 3.3 Program dan Kegiatan",
        item: "Tabel T-C.33 – distribusi pagu",
        status: "perlu_perbaikan",
        catatan: "Pagu dana pada Tabel C.33 sudah sesuai RPJMD sebesar Rp.1.297.791.942, namun proporsi pendistribusian antara program penunjang dengan program urusan tidak sesuai RPJMD."
      },
      {
        bab: "BAB IV – Rencana Kerja dan Pendanaan",
        item: "Konsistensi matrik SIPD dan distribusi pagu",
        status: "perlu_perbaikan",
        catatan: "Matrik yang ditampilkan belum sesuai dengan yang ada di SIPD RI. Total pagu sesuai RPJMD namun pendistribusian ke Program Penunjang dan Program Urusan berbeda dengan RPJMD. Pendistribusian pagu antara Bab III dan Bab IV juga berbeda."
      }
    ]
  },

  "Biro Perekonomian": {
    nama_biro: "Biro Perekonomian",
    tanggal_verifikasi: "25 Mei 2026",
    catatan: [
      {
        bab: "Kelengkapan Dokumen",
        item: "SK Tim Penyusunan Renja",
        status: "perlu_perbaikan",
        catatan: "SK Tim Penyusun Renja belum dilampirkan dalam dokumen Renja. Agar dilengkapi dengan lampiran SK Tim Penyusunan."
      },
      {
        bab: "Kelengkapan Dokumen",
        item: "Orientasi dan Forum OPD",
        status: "perlu_perbaikan",
        catatan: "Agar melengkapi bukti dukung pelaksanaan orientasi dan forum OPD berupa: undangan, notulen, dokumentasi."
      },
      {
        bab: "BAB I – 1.1 Latar Belakang",
        item: "Keterkaitan Renja K/L",
        status: "perlu_perbaikan",
        catatan: "Keterkaitan dengan Renja Kementerian/Lembaga belum dicantumkan. Agar ditambahkan penjelasan keterkaitan dengan Renja K/L yang relevan dengan tupoksi Biro Perekonomian."
      },
      {
        bab: "BAB I – 1.1 Latar Belakang",
        item: "Keterkaitan Renja Kab/Kota",
        status: "perlu_perbaikan",
        catatan: "Keterkaitan dengan Renja Kab/Kota belum dicantumkan. Agar ditambahkan penjelasan keterkaitan dengan Renja Kabupaten/Kota."
      },
      {
        bab: "BAB I – 1.4 Sistematika Penulisan",
        item: "Redaksional tahun Bab III",
        status: "perlu_perbaikan",
        catatan: "Pada uraian Bab III Sistematika Penulisan tertulis 'Tujuan dan Sasaran Renja OPD yang akan dilaksanakan tahun 2025' seharusnya tahun 2027."
      },
      {
        bab: "BAB II – 2.1 Evaluasi Pelaksanaan Renja",
        item: "Perkiraan capaian 2026",
        status: "tidak_ditemukan",
        catatan: "Perkiraan capaian tahun 2026 (tahun berjalan) belum dimuat dalam dokumen Renja. Agar dilengkapi."
      },
      {
        bab: "BAB II – 2.1 Evaluasi Pelaksanaan Renja",
        item: "Faktor penyebab tidak tercapai/melebihi target",
        status: "perlu_perbaikan",
        catatan: "Faktor-faktor penyebab tidak tercapai/terpenuhi/melebihi target belum diuraikan secara spesifik per program/kegiatan. Narasi hanya menyampaikan angka realisasi belum diikuti analisis faktor penyebab."
      },
      {
        bab: "BAB II – 2.1 Evaluasi Pelaksanaan Renja",
        item: "Implikasi terhadap target Renstra",
        status: "perlu_perbaikan",
        catatan: "Implikasi yang timbul terhadap target capaian program Renstra SKPD belum diuraikan secara eksplisit. Agar ditambahkan."
      },
      {
        bab: "BAB II – 2.3 Isu-isu Penting",
        item: "Dampak terhadap SDGs",
        status: "perlu_perbaikan",
        catatan: "Dampak terhadap program nasional/internasional seperti SPM dan SDGs belum diuraikan secara eksplisit. Perlu ditambahkan keterkaitan isu-isu penting Biro Perekonomian dengan target SDGs yang relevan."
      },
      {
        bab: "BAB II – 2.3 Isu-isu Penting",
        item: "Peluang meningkatkan pelayanan",
        status: "perlu_perbaikan",
        catatan: "Peluang dalam meningkatkan pelayanan belum diuraikan secara eksplisit. Agar ditambahkan."
      },
      {
        bab: "BAB II – 2.3 Isu-isu Penting",
        item: "Rekomendasi strategis",
        status: "perlu_perbaikan",
        catatan: "Formulasi isu-isu penting berupa rekomendasi dan catatan strategis untuk ditindaklanjuti dalam perumusan program dan kegiatan prioritas tahun 2027 belum disajikan. Agar ditambahkan."
      },
      {
        bab: "BAB III – 3.3 Program dan Kegiatan",
        item: "Konsistensi jumlah sub kegiatan",
        status: "perlu_perbaikan",
        catatan: "Inkonsistensi nyata: BAB III hal. 33 menyebut 23 Sub Kegiatan, sementara BAB IV hal. 39 menyebut 19 sub kegiatan. Agar konsisten."
      },
      {
        bab: "BAB III – 3.3 Program dan Kegiatan",
        item: "Total pagu",
        status: "perlu_perbaikan",
        catatan: "Agar total pagu diperiksa kembali."
      },
      {
        bab: "BAB IV – Rencana Kerja dan Pendanaan",
        item: "Inkonsistensi sub kegiatan dan selisih pagu",
        status: "perlu_perbaikan",
        catatan: "Inkonsistensi jumlah sub kegiatan antara narasi BAB III (23 sub kegiatan) dengan BAB IV (19 sub kegiatan). Terdapat selisih antara total pagu program dalam tabel (Rp806.441.230 + Rp370.077.000 = Rp1.176.518.230) dengan total belanja yang tercantum (Rp1.169.190.750). Agar diperiksa kembali."
      },
      {
        bab: "BAB V – Penutup",
        item: "Rencana tindak lanjut",
        status: "perlu_perbaikan",
        catatan: "Rencana tindak lanjut (pasca penetapan Renja, langkah implementasi, mekanisme pemantauan) belum dimuat secara eksplisit dalam BAB V Penutup. Uraian penutup hanya bersifat umum. Perlu ditambahkan rencana tindak lanjut yang konkret."
      }
    ]
  },

  "Biro Administrasi Pimpinan": {
    nama_biro: "Biro Administrasi Pimpinan",
    tanggal_verifikasi: "12 Mei 2026",
    catatan: [
      {
        bab: "Kelengkapan Dokumen",
        item: "SK Tim Penyusunan Renja",
        status: "sesuai",
        catatan: "Dengan SK Gubernur Sumatera Barat No.489-115-2026 tentang Tim Penyusunan Renja Setda Provinsi Sumbar Tahun 2027."
      },
      {
        bab: "Kelengkapan Dokumen",
        item: "Orientasi Penyusunan Renja",
        status: "perlu_perbaikan",
        catatan: "Belum mengupload dokumentasi undangan, notulen, dokumentasi, dan absensi orientasi penyusunan Renja tahun 2027, serta jadwal penyusunan Renja tahun 2027 di Sakatoplan. Orientasi dilaksanakan pada tanggal 10 Februari 2026 namun belum ada bukti pendukung (notulen, daftar hadir, foto) yang dilampirkan."
      },
      {
        bab: "Kelengkapan Dokumen",
        item: "Forum OPD",
        status: "sesuai",
        catatan: "Berita Acara Forum OPD sudah ada."
      },
      {
        bab: "BAB I – 1.1 Latar Belakang",
        item: "Keterkaitan Renja K/L dan Renja Kab/Kota",
        status: "tidak_ditemukan",
        catatan: "Keterkaitan dengan Renja K/L dan Renja Kab/Kota belum ada."
      },
      {
        bab: "BAB I – 1.1 Latar Belakang",
        item: "Tindak lanjut proses penyusunan RAPBD",
        status: "tidak_ditemukan",
        catatan: "Tindak lanjut dengan proses penyusunan RAPBD belum ada."
      },
      {
        bab: "BAB II – 2.1 Evaluasi Pelaksanaan Renja",
        item: "Faktor penyebab tidak tercapainya target",
        status: "perlu_perbaikan",
        catatan: "Sudah melampirkan Tabel TC.29 Permendagri 86/2017 dengan penjelasan kajian. Namun faktor penyebab tidak tercapainya target tidak dijelaskan secara eksplisit."
      },
      {
        bab: "BAB II – 2.4 Review RKPD",
        item: "Alasan review dan temuan perbedaan",
        status: "perlu_perbaikan",
        catatan: "Penjelasan mengenai alasan proses review RKPD dilakukan serta temuan-temuan/catatan penting terhadap perbedaan rancangan awal RKPD belum ada."
      },
      {
        bab: "BAB III – 3.3 Program dan Kegiatan",
        item: "Tabel T-C.33",
        status: "perlu_perbaikan",
        catatan: "Tabel T-C.33 belum dilampirkan. Renstra PD 2025-2029 menjadi pedoman perangkat daerah menyusun Renja 2027."
      },
      {
        bab: "BAB IV – Rencana Kerja dan Pendanaan",
        item: "Format tabel SIPD dan pagu RPJMD",
        status: "perlu_perbaikan",
        catatan: "Mempedomani pagu dana Biro Adpim dalam RPJMD 2025-2029 untuk tahun 2027. Rincian program/kegiatan Renja 2027 disesuaikan Renstra 2025-2029. Agar mengganti format tabel usulan Renja Tahun 2027 sesuai format usulan Renja di SIPD RI."
      }
    ]
  },

  "Biro Organisasi": {
    nama_biro: "Biro Organisasi",
    tanggal_verifikasi: "25 Mei 2026",
    catatan: [
      {
        bab: "Kelengkapan Dokumen",
        item: "SK Tim Penyusunan Renja",
        status: "tidak_ditemukan",
        catatan: "Belum tersedia. Agar diupload di Sakatoplan. SK Gubernur tentang Tim Penyusunan Renja dibentuk sebelum pelaksanaan orientasi penyusunan Renja."
      },
      {
        bab: "Kelengkapan Dokumen",
        item: "Orientasi Penyusunan Renja",
        status: "tidak_ditemukan",
        catatan: "Belum tersedia. Agar diupload."
      },
      {
        bab: "Kelengkapan Dokumen",
        item: "Forum OPD",
        status: "tidak_ditemukan",
        catatan: "Belum tersedia. Agar diupload."
      },
      {
        bab: "BAB I – Seluruh isi BAB I",
        item: "BAB I Pendahuluan (semua sub bab)",
        status: "tidak_ditemukan",
        catatan: "Belum tersedia, agar diupload. Seluruh sub bab 1.1 s.d 1.4 belum ada. Mengemukakan pengertian ringkas tentang Renja PD, proses penyusunan, keterkaitan dengan RKPD, Renstra PD, Renja K/L, Renja Prov/Kab/Kota, serta tindak lanjut dengan proses penyusunan RAPBD. Landasan hukum: SOTK, kewenangan PD, pedoman penyusunan. Sistematika: sesuai Permendagri 86/2017."
      },
      {
        bab: "BAB II – Seluruh isi BAB II",
        item: "BAB II Evaluasi (semua sub bab)",
        status: "tidak_ditemukan",
        catatan: "Belum tersedia, agar diupload. Sub bab 2.1 s.d 2.5 belum ada. Analisis pencapaian kinerja pelayanan PD belum berdasarkan Tabel T-C.30. Review RKPD belum ada (Tabel TC-31 agar disajikan). Usulan Program dan Kegiatan dari Para Pemangku Kepentingan belum ada."
      },
      {
        bab: "BAB III – Tujuan, Sasaran, Program",
        item: "BAB III",
        status: "tidak_ditemukan",
        catatan: "Belum tersedia, agar diupload. Harus mengacu pada RPJMD 2025-2029 dan Renstra PD 2025-2029 dan menyajikan tabel TC."
      },
      {
        bab: "BAB IV – Rencana Kerja dan Pendanaan",
        item: "Matrik SIPD",
        status: "sesuai",
        catatan: "Matrik yang ditampilkan sudah sesuai dengan yang ada di SIPD RI."
      },
      {
        bab: "BAB V – Penutup",
        item: "BAB V Penutup",
        status: "tidak_ditemukan",
        catatan: "Belum ada. Agar dilengkapi dengan catatan penting, kaidah-kaidah pelaksanaan, dan rencana tindak lanjut."
      }
    ]
  },

  "Biro Umum": {
    nama_biro: "Biro Umum",
    tanggal_verifikasi: "18 Mei 2026",
    catatan: [
      {
        bab: "Kelengkapan Dokumen",
        item: "SK Tim, Orientasi, Forum OPD",
        status: "sesuai",
        catatan: "Semua kelengkapan dokumen (SK Tim, Orientasi, Forum OPD) sudah ada."
      },
      {
        bab: "BAB I – 1.1 Latar Belakang",
        item: "Proses penyusunan Renja",
        status: "perlu_perbaikan",
        catatan: "Agar dimuat urutan proses penyusunan Renja mulai dari ranwal Renja s.d penetapan Renja."
      },
      {
        bab: "BAB I – 1.1 Latar Belakang",
        item: "Keterkaitan Renja K/L",
        status: "perlu_perbaikan",
        catatan: "Agar ditambahkan keterkaitan dengan dokumen Renja K/L jika ada."
      },
      {
        bab: "BAB I – 1.1 Latar Belakang",
        item: "Tindak lanjut RAPBD",
        status: "perlu_perbaikan",
        catatan: "Agar dimuat tindak lanjut terhadap proses perencanaan daerah (penyusunan RAPBD) setelah penyusunan Renja OPD."
      },
      {
        bab: "BAB I – 1.2 Landasan Hukum",
        item: "Update landasan hukum",
        status: "perlu_perbaikan",
        catatan: "Tambahkan: Kepmendagri 900.1-2850/2025 (Hasil verifikasi dan validasi…), SE Gubernur 030/237.a/BPKAD-PAP/2024 (Efisiensi dan penghematan belanja…), SE Gub. 050/1/I/P2EPD/Bappeda-2026 (Penyusunan Ranwal Renja PD 2027), RPJPN, RPJMN, Perda RPJPD Provinsi, RPJMD Provinsi, RKPD Provinsi, Renstra PD. SOTK: PermenPAN-RB No. 25 Tahun 2021 tentang Penyederhanaan Birokrasi. Kewenangan: Pergub No. 29 Tahun 2023."
      },
      {
        bab: "BAB I – 1.3 Maksud dan Tujuan",
        item: "Tujuan",
        status: "perlu_perbaikan",
        catatan: "Pada tujuan, agar ditambahkan: untuk menjamin kesesuaian antara program, kegiatan, lokasi kegiatan, kelompok sasaran serta prakiraan maju (sesuai Permendagri 86/2017)."
      },
      {
        bab: "BAB I – 1.4 Sistematika Penulisan",
        item: "Bab IV dalam sistematika",
        status: "perlu_perbaikan",
        catatan: "Agar mempedomani Permendagri 86/2017 dengan menambahkan Bab IV: Rencana Kerja dan Pendanaan Perangkat Daerah."
      },
      {
        bab: "BAB II – 2.1 Evaluasi Pelaksanaan Renja",
        item: "Tabel T-C.29 dan realisasi anggaran TA 2024",
        status: "perlu_perbaikan",
        catatan: "Rekap evaluasi hasil pelaksanaan Renja PD agar mengacu pada tabel T-C.29 Permendagri 86/2017. Realisasi anggaran belanja TA 2024 (Tabel 2.1) sebaiknya tidak dimuat karena tidak sesuai dengan Permendagri 86/2017 Sub Bab 2.1."
      },
      {
        bab: "BAB II – 2.1 Evaluasi Pelaksanaan Renja",
        item: "Perkiraan capaian 2026",
        status: "perlu_perbaikan",
        catatan: "Agar dinarasikan isian kolom Perkiraan Realisasi Capaian Target Renstra PD s.d tahun berjalan pada Tabel T-C.29."
      },
      {
        bab: "BAB II – 2.1 Evaluasi Pelaksanaan Renja",
        item: "Faktor penyebab melebihi target",
        status: "perlu_perbaikan",
        catatan: "Agar dilengkapi faktor-faktor penyebab realisasi program/kegiatan melebihi target kinerja."
      },
      {
        bab: "BAB II – 2.1 Evaluasi Pelaksanaan Renja",
        item: "Tabel T-C.29 – isian yang kosong",
        status: "perlu_perbaikan",
        catatan: "Agar dilengkapi isian tabel yang masih kosong."
      },
      {
        bab: "BAB II – 2.2 Analisis Kinerja",
        item: "Referensi PP kinerja",
        status: "perlu_perbaikan",
        catatan: "PP 6/2008 telah dicabut dan diganti dengan PP 13/2019 tentang Laporan dan Evaluasi Penyelenggaraan PD."
      },
      {
        bab: "BAB II – 2.2 Analisis Kinerja",
        item: "Format Tabel T-C.30",
        status: "perlu_perbaikan",
        catatan: "Jumlah kolom yang disajikan agar disesuaikan dengan Tabel T-C.30 Permendagri 86/2017."
      },
      {
        bab: "BAB II – 2.3 Isu-isu Penting",
        item: "Koordinasi sinergi",
        status: "perlu_perbaikan",
        catatan: "Agar ditambahkan uraian tentang koordinasi dan sinergi dengan SKPD Kab/Kota, K/L jika ada."
      },
      {
        bab: "BAB II – 2.3 Isu-isu Penting",
        item: "Dampak terhadap visi misi",
        status: "perlu_perbaikan",
        catatan: "Dampak secara langsung terhadap pencapaian visi dan misi Kepala Daerah tidak ada karena Biro Umum adalah unit kerja supporting."
      },
      {
        bab: "BAB II – 2.3 Isu-isu Penting",
        item: "Rumusan isu penting",
        status: "perlu_perbaikan",
        catatan: "Agar ditambahkan rumusan program dan kegiatan terkait isu-isu penting yang dikemukakan."
      },
      {
        bab: "BAB II – 2.4 Review RKPD",
        item: "Catatan penting perbedaan RKPD vs analisis kebutuhan",
        status: "perlu_perbaikan",
        catatan: "Analisis kebutuhan berdasarkan Tabel T-C.31 lebih besar dari rancangan awal RKPD. Hanya 1 kegiatan yang sesuai: Administrasi Pendapatan Daerah Kewenangan Perangkat Daerah. Agar dijelaskan temuan dan catatan penting terhadap perbedaan rancangan awal dengan analisa kebutuhan."
      },
      {
        bab: "BAB II – 2.5 Penelaahan Usulan Masyarakat",
        item: "Penjelasan ketiadaan usulan",
        status: "perlu_perbaikan",
        catatan: "Meskipun tidak terdapat program/kegiatan yang berasal dari usulan pemangku kepentingan, sebaiknya juga dijelaskan sebab ketiadaan program/kegiatan tersebut."
      },
      {
        bab: "BAB III – 3.1 Kebijakan Nasional",
        item: "Konteks Biro Umum",
        status: "perlu_perbaikan",
        catatan: "Biro Umum Setda tidak memiliki program yang berkaitan dengan kebijakan nasional, karena fungsi Biro Umum merupakan fungsi penunjang/supporting unit pada sekretariat daerah dan bukan Perangkat Daerah teknis."
      },
      {
        bab: "BAB III – 3.2 Tujuan dan Sasaran",
        item: "Narasi tujuan",
        status: "perlu_perbaikan",
        catatan: "Agar dinarasikan tujuan dari SKPD sesuai tabel yang disajikan. Mengacu kepada Renstra SKPD."
      },
      {
        bab: "BAB III – 3.3 Program dan Kegiatan",
        item: "Faktor-faktor pertimbangan",
        status: "perlu_perbaikan",
        catatan: "Agar ditambahkan faktor-faktor lain seperti SDG's, NSPK, SPM, dsb."
      },
      {
        bab: "BAB III – 3.3 Program dan Kegiatan",
        item: "Jumlah sub kegiatan",
        status: "perlu_perbaikan",
        catatan: "Jumlah program/kegiatan sudah sesuai dengan tabel T-C.33, namun jumlah sub kegiatan berbeda yaitu 49 sub kegiatan (bukan 41)."
      },
      {
        bab: "BAB III – 3.3 Program dan Kegiatan",
        item: "Sifat penyebaran lokasi",
        status: "perlu_perbaikan",
        catatan: "Hampir semua lokasi pelaksanaan program/kegiatan di kota Padang, namun sebagian pekerjaan fisik (pemeliharaan/rehabilitasi gedung) ada yang berada di Kab. Padang Pariaman (VIP Room BIM) dan Kota Bukittinggi (Istana Bung Hatta)."
      },
      {
        bab: "BAB III – 3.3 Program dan Kegiatan",
        item: "Nomenklatur Tabel T-C.33",
        status: "perlu_perbaikan",
        catatan: "Agar pada nomenklatur tabel T-C.33 ditambahkan nama SKPD yang bersangkutan."
      },
      {
        bab: "BAB IV – Rencana Kerja dan Pendanaan",
        item: "Pagu prakiraan maju 2028",
        status: "perlu_perbaikan",
        catatan: "Pagu indikatif prakiraan maju rencana th 2028 (kolom 16) pada data di SIPD RI berbeda dengan data Bab IV yang diupload. Agar disesuaikan."
      },
      {
        bab: "BAB V – Penutup",
        item: "Catatan penting",
        status: "perlu_perbaikan",
        catatan: "Agar ditambahkan catatan penting lain seperti keterkaitan dengan Renstra OPD dan RKPD, serta pertimbangan-pertimbangan dalam penyusunan Renstra OPD."
      },
      {
        bab: "BAB V – Penutup",
        item: "Kaidah pelaksanaan",
        status: "perlu_perbaikan",
        catatan: "Agar ditambahkan kaidah pelaksanaan Renja (siapa pelaksana, bagaimana monitoring dan evaluasi pelaksanaan Renja, dll)."
      },
      {
        bab: "BAB V – Penutup",
        item: "Rencana tindak lanjut",
        status: "perlu_perbaikan",
        catatan: "Agar ditambahkan rencana tindak lanjut dari Renja OPD terkait proses penyusunan dokumen perencanaan pembangunan selanjutnya."
      }
    ]
  }
};