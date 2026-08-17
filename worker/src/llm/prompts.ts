// ============================================
// SI-VERENA LLM Prompt Templates
// ============================================

export const PROMPTS = {
  // Auto Verifikasi - Kelengkapan Dokumen
  kelengkapan: `Analisis kelengkapan dokumen Renja berikut ini.

Dokumen: {{nama_dokumen}}
Biro: {{nama_biro}}
Tahun: {{tahun}}

Konten dokumen:
{{konten}}

Periksa kelengkapan komponen berikut:
1. Visi dan Misi
2. Tujuan dan Sasaran
3. Program/Kegiatan
4. Indikator Kinerja
5. Target Kinerja
6. Pagu Anggaran

Berikan analisis dalam format JSON:
{
  "status": "lengkap" | "tidak_lengkap" | "perlu_review_manual",
  "komponen_ditemukan": ["visi_misi", "tujuan_sasaran", ...],
  "komponen_kurang": ["indikator_kinerja", ...],
  "catatan": "Detail analisis...",
  "rekomensi": ["Saran perbaikan 1", ...]
}`,

  // Auto Verifikasi - Sistematika
  sistematika: `Analisis sistematika penulisan dokumen Renja berikut ini.

Dokumen: {{nama_dokumen}}
Biro: {{nama_biro}}

Konten:
{{konten}}

Periksa sistematika:
1. Struktur BAB (Pendahuluan, Analisis, Program, Penutup)
2. Penomoran yang konsisten
3. Hierarki yang jelas
4. Keterkaitan antar bagian

Berikan analisis dalam format JSON:
{
  "status": "sesuai" | "tidak_sesuai" | "perlu_review_manual",
  "struktur_ditemukan": ["bab_1_pendahuluan", "bab_2_analisis", ...],
  "struktur_kurang": ["bab_4_penutup"],
  "catatan": "Detail analisis...",
  "rekomendasi": ["Saran perbaikan 1", ...]
}`,

  // Auto Verifikasi - Tabel dan Data
  tabel_data: `Analisis kelengkapan tabel dan data dalam dokumen Renja berikut.

Dokumen: {{nama_dokumen}}
Biro: {{nama_biro}}

Konten:
{{konten}}

Periksa:
1. Tabel program/kegiatan
2. Tabel anggaran
3. Tabel indikator kinerja
4. Format dan konsistensi data

Berikan analisis dalam format JSON:
{
  "status": "lengkap" | "tidak_lengkap" | "perlu_review_manual",
  "tabel_ditemukan": ["program_kegiatan", "anggaran", ...],
  "tabel_kurang": ["indikator_kinerja"],
  "catatan": "Detail analisis...",
  "rekomendasi": ["Saran perbaikan 1", ...]
}`,

  // Auto Verifikasi - Konsistensi Data
  konsistensi: `Analisis konsistensi data dalam dokumen Renja berikut.

Dokumen: {{nama_dokumen}}
Biro: {{nama_biro}}

Konten:
{{konten}}

Periksa konsistensi:
1. Angka antar tabel
2. Target vs realisasi sebelumnya
3. Pagu anggaran vs program
4. Indikator vs target

Berikan analisis dalam format JSON:
{
  "status": "konsisten" | "tidak_konsisten" | "perlu_review_manual",
  "temuan_ketidakkonsistenan": [
    {"lokasi": "Tabel 1 vs Tabel 3", "detail": "Jumlah program berbeda"},
    ...
  ],
  "catatan": "Detail analisis...",
  "rekomendasi": ["Saran perbaikan 1", ...]
}`,

  // Generate Draft Renja
  generate_draft: `Buat draft Renja SETDA berdasarkan data dari {{jumlah_biro}} biro.

Data Biro:
{{data_biro}}

Buat draft dengan struktur:
1. Ringkasan Eksekutif
2. BAB I - Pendahuluan
3. BAB II - Analisis Kondisi
4. BAB III - Program dan Kegiatan
5. BAB IV - Anggaran
6. BAB V - Penutup

Format output JSON:
{
  "judul": "Draft Renja SETDA {{tahun}}",
  "ringkasan_eksekutif": "...",
  "bab": [
    {"nomor": "I", "judul": "Pendahuluan", "isi": "..."},
    {"nomor": "II", "judul": "Analisis Kondisi", "isi": "..."},
    ...
  ],
  "rekap_biro": [
    {"nama_biro": "...", "jumlah_program": 5, "total_pagu": 1000000000},
    ...
  ]
}`,

  // Regenerate BAB individual
  regenerate_bab: `Perbaiki dan perbarui BAB {{nomor_bab}} dari draft Renja SETDA.

Judul BAB: {{judul_bab}}
Isi BAB saat ini:
{{isi_bab}}

Catatan verifikator:
{{catatan}}

Data pendukung:
{{data_pendukung}}

Perbaiki BAB sesuai catatan verifikator. Pertahankan format dan gaya penulisan yang konsisten.

Output dalam format JSON:
{
  "isi_bab": "Isi BAB yang sudah diperbaiki...",
  "perubahan": ["Perubahan 1", "Perubahan 2", ...]
}`
};

// Helper function to fill prompt template
export function fillPrompt(template: string, variables: Record<string, any>): string {
  let filled = template;
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    filled = filled.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), 
      typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value));
  }
  return filled;
}
