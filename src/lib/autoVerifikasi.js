import { base44 } from '@/api/base44Client';
import { CHECKLIST_ITEMS } from './pemeriksaanRules';

/**
 * Jalankan otomatisasi AI untuk 6 kategori non-kelengkapan.
 * Kelengkapan dokumen tetap manual karena membutuhkan cek fisik lampiran.
 * Setiap kategori dianalisis LLM berdasarkan daftar item checklist dan konteks dokumen.
 * Hasilnya disimpan ke HasilPemeriksaan dengan status AI, lalu item yang ambigu
 * diberi status 'perlu_review_manual' untuk keputusan akhir verifikator.
 */

const KATEGORI_AUTO = [
  'sistematika_dokumen',
  'tabel_wajib',
  'matriks_renja',
  'urgensi_prioritas',
  'konsistensi_angka',
  'substansi_bab',
];

export async function jalankanAutoVerifikasi({ namaBiro, periodeTeahun, dokumenUrl, fileReferensiUrls = [], onProgress }) {
  const tahun = parseInt(periodeTeahun);
  const allResults = [];

  for (let i = 0; i < KATEGORI_AUTO.length; i++) {
    const kategori = KATEGORI_AUTO[i];
    const items = CHECKLIST_ITEMS[kategori];
    onProgress?.({ step: i + 1, total: KATEGORI_AUTO.length, kategori });

    const itemList = items.map((it, idx) => `${idx + 1}. ${it.item}`).join('\n');

    const allFileUrls = [
      ...(dokumenUrl ? [dokumenUrl] : []),
      ...fileReferensiUrls,
    ];

    const isTabelWajib = kategori === 'tabel_wajib';
    const prompt = `Kamu adalah sistem pemeriksa otomatis dokumen Renja (Rencana Kerja) Perangkat Daerah Pemerintah Indonesia.

Tugas: Periksa dokumen Renja Biro "${namaBiro}" Tahun ${tahun} untuk kategori "${kategori}".

${fileReferensiUrls.length > 0 ? `PENTING: Gunakan file referensi/pedoman yang dilampirkan sebagai STANDAR ACUAN UTAMA pemeriksaan. Semua penilaian harus mengacu pada pedoman tersebut.` : ''}

Daftar item yang harus diperiksa:
${itemList}

Untuk setiap item, tentukan statusnya berdasarkan isi dokumen Renja yang diunggah:
- "sesuai": item BENAR-BENAR ditemukan dan sesuai standar pedoman. HANYA gunakan ini jika bukti nyata ada dalam dokumen.
- "perlu_perbaikan": item ditemukan tapi kurang lengkap/ada kesalahan minor
- "tidak_ditemukan": item sama sekali tidak ada dalam dokumen
- "perlu_review_manual": tidak bisa dipastikan secara otomatis, perlu dicek manusia

${dokumenUrl ? `Dokumen Renja tersedia di lampiran. Baca dan analisis isinya secara mendetail.` : 'Dokumen belum diunggah. Tandai semua item sebagai perlu_review_manual.'}

${isTabelWajib ? `PERINGATAN KHUSUS untuk pemeriksaan tabel wajib (T-C.29 s.d. T-C.33 dan matriks):
- Kamu HARUS mencari secara eksplisit label/judul tabel tersebut dalam dokumen (contoh: "Tabel T-C.29", "T-C.30", "T-C.31" dll).
- Jika TIDAK ada halaman/bagian yang secara NYATA menampilkan tabel dengan label tersebut, wajib tandai "tidak_ditemukan".
- DILARANG KERAS menebak atau mengasumsikan tabel ada hanya karena ada data serupa. Keberadaan tabel harus dibuktikan dari judul/label eksplisit dalam dokumen.
- Jangan tandai "sesuai" kecuali tabel dengan label persis tersebut ditemukan dan memuat data yang relevan.` : ''}

Berikan penilaian yang KONSERVATIF dan berdasarkan BUKTI NYATA dari dokumen. Jika ragu, gunakan "perlu_review_manual" bukan "sesuai".

PENTING — DETAIL TEMUAN WAJIB (JANGAN UMUM/GENERIK):
Untuk setiap item, isi SEMUA field berikut secara spesifik dan konkret:
- "halaman": Nomor halaman/lokasi persis di dokumen (mis. "12", "8-9", "BAB III hal. 5", "Lampiran hal. 20"). Baca nomor halaman dari dokumen yang dilampirkan. String kosong "" HANYA jika benar-benar tidak ditemukan di seluruh dokumen.
- "kutipan_dokumen": Kutipan TEKS PERSIS dari dokumen Renja yang menunjukkan titik perbaikan (judul tabel, kalimat, angka, atau label). WAJIB di dalam tanda kutip. Jangan mengarang — hanya kutip yang benar-benar ada di dokumen. Jika item tidak ditemukan, isi string kosong "".
- "catatan": Penjelasan memuat 3 bagian dipisah " | ":
  1. Temuan: jelaskan secara spesifik apa yang ditemukan/kurang/salah (DILARANG kalimat generik seperti "perlu dilengkapi" atau "belum sesuai" tanpa penjelasan konkret).
  2. Lokasi: sebutkan halaman/bab/lampiran.
  3. Rekomendasi: tindakan perbaikan konkret untuk penyusun.

Contoh "kutipan_dokumen": "Tabel T-C.29 Program dan Kegiatan Tahun 2027"
Contoh "catatan": "Temuan: Tabel T-C.29 hanya berisi 3 program, padahal matriks memuat 5 program | Lokasi: Hal. 34 | Rekomendasi: Tambahkan 2 program yang hilang ke Tabel T-C.29 agar konsisten dengan matriks."

Format respons JSON:
{
  "hasil": [
    {"item": "nama item persis sesuai daftar", "status": "sesuai|perlu_perbaikan|tidak_ditemukan|perlu_review_manual", "halaman": "nomor halaman atau kosong", "kutipan_dokumen": "kutipan teks persis dari dokumen atau kosong", "catatan": "Temuan: ... | Lokasi: ... | Rekomendasi: ..."},
    ...
  ]
}`;

    let hasilKategori;
    try {
      const resp = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: allFileUrls.length > 0 ? allFileUrls : undefined,
        response_json_schema: {
          type: 'object',
          properties: {
            hasil: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  item: { type: 'string' },
                  status: { type: 'string' },
                  halaman: { type: 'string' },
                  kutipan_dokumen: { type: 'string' },
                  catatan: { type: 'string' },
                },
              },
            },
          },
        },
      });
      hasilKategori = resp.hasil || [];
    } catch {
      // Fallback: semua perlu_review_manual
      hasilKategori = items.map(it => ({ item: it.item, status: 'perlu_review_manual', catatan: 'Gagal diproses AI' }));
    }

    // Map hasil AI ke format HasilPemeriksaan
    for (const item of items) {
      const aiResult = hasilKategori.find(h =>
        h.item?.toLowerCase().includes(item.item.toLowerCase().slice(0, 20))
      ) || { status: 'perlu_review_manual', catatan: '' };

      const catatanAI = aiResult.catatan
        ? `[AI] ${aiResult.catatan}`
        : (item.catatan_auto || '');
      allResults.push({
        nama_biro: namaBiro,
        periode_tahun: tahun,
        kategori,
        sub_kategori: item.sub || '',
        item_pemeriksaan: item.item,
        status: aiResult.status || 'perlu_review_manual',
        halaman: aiResult.halaman || '',
        kutipan_dokumen: aiResult.kutipan_dokumen || '',
        catatan_otomatis: catatanAI,
        status_validasi: 'belum_divalidasi',
      });
    }
  }

  return allResults;
}

export async function simpanHasilAutoVerifikasi({ namaBiro, periodeTeahun, hasilAuto, existingResults, queryClient }) {
  const tahun = parseInt(periodeTeahun);
  const toCreate = [];
  const toUpdate = [];

  for (const hasil of hasilAuto) {
    const existing = existingResults.find(
      r => r.item_pemeriksaan === hasil.item_pemeriksaan && r.kategori === hasil.kategori
    );
    if (existing?.id) {
      toUpdate.push({ id: existing.id, data: { status: hasil.status, halaman: hasil.halaman || '', kutipan_dokumen: hasil.kutipan_dokumen || '', catatan_otomatis: hasil.catatan_otomatis, status_validasi: 'belum_divalidasi' } });
    } else {
      toCreate.push(hasil);
    }
  }

  if (toCreate.length > 0) {
    await base44.entities.HasilPemeriksaan.bulkCreate(toCreate);
  }
  for (const u of toUpdate) {
    await base44.entities.HasilPemeriksaan.update(u.id, u.data);
  }
}