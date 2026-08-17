import { Hono } from 'hono';
import { getLLMProvider } from '../llm/provider';
import { CHECKLIST_ITEMS, KATEGORI_AUTO } from '../llm/checklist';
import { extractTextFromR2 } from '../storage/extract';
import type { Bindings } from '../index';

export const llmRoutes = new Hono<{ Bindings: Bindings }>();

// POST /api/llm/generate — generate text dengan LLM (untuk Generate Draft dll)
llmRoutes.post('/generate', async (c) => {
  const { prompt, model } = await c.req.json();

  if (!prompt) {
    return c.json({ error: 'Prompt diperlukan' }, 400);
  }

  const provider = getLLMProvider(c.env);

  try {
    const result = await provider.generate(prompt, { model });
    return c.json({ result });
  } catch (error: any) {
    return c.json({ 
      error: 'Gagal generate text',
      detail: error.message 
    }, 500);
  }
});

// POST /api/llm/auto-verifikasi — jalankan semua kategori PARALLEL di server
llmRoutes.post('/auto-verifikasi', async (c) => {
  const { dokumen_id, nama_biro, periode_tahun, dokumen_url, file_referensi_urls = [] } = await c.req.json();

  if (!nama_biro || !periode_tahun) {
    return c.json({ error: 'nama_biro dan periode_tahun diperlukan' }, 400);
  }

  const env = c.env;
  const ctx = c.executionCtx;

  // Ambil record dokumen (untuk nama_file + file_url dari DB bila tidak dikirim)
  let namaFile: string | undefined;
  let fileUrl = dokumen_url;
  if (dokumen_id) {
    try {
      const dok: any = await env.DB.prepare(
        'SELECT id, nama_file, file_url FROM dokumen_renja WHERE id = ?'
      ).bind(dokumen_id).first();
      if (dok) {
        namaFile = dok.nama_file;
        if (!fileUrl) fileUrl = dok.file_url;
      }
    } catch { /* abaikan */ }
  }

  // Set status dokumen jadi sedang_diproses SEKARANG (sinkron)
  if (dokumen_id) {
    await env.DB.prepare(
      `UPDATE dokumen_renja SET status_upload = 'sedang_diproses', updated_at = datetime('now') WHERE id = ?`
    ).bind(dokumen_id).run();
  }

  // Jalankan AI di background dengan waitUntil (tidak block response)
  ctx.waitUntil(
    runAutoVerifikasiBackground({
      env, dokumen_id, nama_biro, periode_tahun, dokumen_url: fileUrl, nama_file: namaFile,
      file_referensi_urls,
    })
  );

  return c.json({
    success: true,
    status: 'processing',
    message: 'Auto verifikasi sedang berjalan di background. Cek status dokumen beberapa saat lagi.',
    dokumen_id,
  }, 202);
});

// Parser JSON yang toleran: hilangkan penanda markdown (```json ... ```) dan teks di luar objek
function parseJsonLoose(raw: string): any {
  if (!raw) return null;
  let s = String(raw).trim();
  s = s.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
  try { return JSON.parse(s); } catch { /* lanjut */ }
  const first = s.indexOf('{');
  const last = s.lastIndexOf('}');
  if (first !== -1 && last > first) {
    try { return JSON.parse(s.slice(first, last + 1)); } catch { /* lanjut */ }
  }
  // Terakhir: ambil array hasil saja
  const fa = s.indexOf('[');
  const la = s.lastIndexOf(']');
  if (fa !== -1 && la > fa) {
    try { return { hasil: JSON.parse(s.slice(fa, la + 1)) }; } catch { /* gagal */ }
  }
  return null;
}

async function runAutoVerifikasiBackground({ env, dokumen_id, nama_biro, periode_tahun, dokumen_url, nama_file, file_referensi_urls }: any) {
  const provider = getLLMProvider(env);

  try {
    // 1. Ekstrak teks dokumen dari R2
    let konten = '';
    let extractInfo = '';
    if (dokumen_url && env.R2) {
      const ext = await extractTextFromR2(env.R2, dokumen_url, nama_file);
      konten = ext.text;
      extractInfo = ext.format;
    }
    const adaKonten = konten.trim().length > 0;

    // 2. Jalankan semua kategori PARALLEL
    const hasilPerKategori = await Promise.allSettled(
      KATEGORI_AUTO.map(async (kategori) => {
        const items = (CHECKLIST_ITEMS[kategori] || []).map(it => it.item);
        const itemList = items.map((it, idx) => `${idx + 1}. ${it}`).join('\n');

        const prompt = `Kamu adalah sistem pemeriksa otomatis dokumen Renja (Rencana Kerja) Perangkat Daerah Pemerintah Indonesia.

Tugas: Periksa dokumen Renja Biro "${nama_biro}" Tahun ${periode_tahun} untuk kategori "${kategori}".

${file_referensi_urls.length > 0 ? `PENTING: Gunakan file referensi/pedoman yang dilampirkan sebagai STANDAR ACUAN UTAMA pemeriksaan.` : ''}

Daftar item yang harus diperiksa (WAJIB nilai SEMUA item):
${itemList}

Untuk setiap item, tentukan status berdasarkan ISI DOKUMEN di bawah:
- "sesuai": item BENAR-BENAR ditemukan dan sesuai standar
- "perlu_perbaikan": item ditemukan tapi kurang lengkap/ada kesalahan
- "tidak_ditemukan": item sama sekali tidak ada
- "perlu_review_manual": tidak bisa dipastikan otomatis

${adaKonten ? 'Berikut ISI DOKUMEN (hasil ekstraksi):\n"""\n' + konten + '\n"""\n' : 'PERINGATAN: Dokumen tidak dapat dibaca/diekstrak. Tandai SEMUA item sebagai "perlu_review_manual" dengan catatan "Dokumen tidak dapat diekstrak otomatis. Perlu review manual".'}

${kategori === 'tabel_wajib' ? `PERINGATAN KHUSUS: Cari label eksplisit tabel T-C.29 s.d. T-C.33 dalam dokumen. Tanpa label eksplisit = "tidak_ditemukan". JANGAN menebak.` : ''}

Penilaian KONSERVATIF berdasarkan BUKTI NYATA dari isi dokumen. Jika ragu gunakan "perlu_review_manual".

Format respons JSON (hanya JSON, tanpa teks lain, tanpa markdown):
{
  "hasil": [
    {"item": "nama item PERSIS sesuai daftar", "status": "sesuai|perlu_perbaikan|tidak_ditemukan|perlu_review_manual", "halaman": "", "kutipan_dokumen": "", "catatan": "Temuan singkat (maks 50 kata) | Lokasi: ... | Rekomendasi: ..."}
  ]
}
WAJIB: jumlah objek hasil = jumlah item daftar (${items.length}), nama item harus persis sama.
- "halaman" & "kutipan_dokumen" diisi HANYA jika benar-benar ditemukan; jika tidak, isi string kosong.
- "catatan" singkat & konkret, maksimal 50 kata. Jangan gunakan penanda markdown (json).`;

        try {
          const resp = await provider.generate(prompt);
          let parsed: any = parseJsonLoose(resp);
          if (!parsed || !Array.isArray(parsed.hasil)) parsed = { hasil: [] };
          return { kategori, hasil: parsed.hasil };
        } catch (err: any) {
          // LLM gagal -> semua item perlu_review_manual
          return {
            kategori,
            hasil: items.map(it => ({
              item: it, status: 'perlu_review_manual', halaman: '', kutipan_dokumen: '',
              catatan: `Gagal diproses AI: ${err.message} | Perlu review manual`,
            })),
          };
        }
      })
    );

    // 3. Simpan ke DB — cocokkan dengan checklist item persis
    const { results: existingResults } = await env.DB.prepare(
      'SELECT id, item_pemeriksaan, kategori FROM hasil_pemeriksaan WHERE nama_biro = ? AND periode_tahun = ?'
    ).bind(nama_biro, parseInt(periode_tahun)).all();

    let savedCount = 0;
    for (const result of hasilPerKategori) {
      if (result.status !== 'fulfilled') continue;
      const { kategori, hasil } = result.value;
      const items = CHECKLIST_ITEMS[kategori] || [];

      // Map hasil AI ke checklist (nama item persis / fuzzy)
      const hasilMap = new Map<string, any>();
      for (const h of hasil || []) {
        const nama = (h.item || '').trim().toLowerCase();
        if (!nama) continue;
        const matched = items.find(it => it.item.toLowerCase() === nama || nama.includes(it.item.toLowerCase()) || it.item.toLowerCase().includes(nama.slice(0, 20)));
        hasilMap.set((matched ? matched.item : h.item), h);
      }

      for (const it of items) {
        const h = hasilMap.get(it.item) || hasilMap.get(it.item.toLowerCase());
        const status = h?.status && ['sesuai', 'perlu_perbaikan', 'tidak_ditemukan', 'perlu_review_manual'].includes(h.status) ? h.status : 'perlu_review_manual';
        const catatan = h?.catatan ? `[AI] ${h.catatan}` : (it.catatan_auto ? `[AI] ${it.catatan_auto}` : '');

        const existing = (existingResults as any[]).find(
          (r: any) => r.item_pemeriksaan === it.item && r.kategori === kategori
        );
        if (existing?.id) {
          await env.DB.prepare(
            `UPDATE hasil_pemeriksaan SET status=?, halaman=?, kutipan_dokumen=?, catatan_otomatis=?, status_validasi='belum_divalidasi', updated_at=datetime('now') WHERE id=?`
          ).bind(status, h?.halaman || '', h?.kutipan_dokumen || '', catatan, existing.id).run();
        } else {
          const id = crypto.randomUUID();
          await env.DB.prepare(
            `INSERT INTO hasil_pemeriksaan (id, nama_biro, periode_tahun, kategori, sub_kategori, item_pemeriksaan, status, halaman, kutipan_dokumen, catatan_otomatis, status_validasi) VALUES (?, ?, ?, ?, '', ?, ?, ?, ?, ?, 'belum_divalidasi')`
          ).bind(id, nama_biro, parseInt(periode_tahun), kategori, it.item, status, h?.halaman || '', h?.kutipan_dokumen || '', catatan).run();
        }
        savedCount++;
      }
    }

    // 4. Update status dokumen
    if (dokumen_id) {
      await env.DB.prepare(
        `UPDATE dokumen_renja SET status_upload = 'selesai_diproses', updated_at = datetime('now') WHERE id = ?`
      ).bind(dokumen_id).run();
    }

    console.log(`[auto-verifikasi] ${nama_biro} ${periode_tahun}: ${savedCount} item tersimpan (extract=${extractInfo})`);
  } catch (err: any) {
    console.error('[auto-verifikasi] gagal:', err.message);
    if (dokumen_id) {
      await env.DB.prepare(
        `UPDATE dokumen_renja SET status_upload = 'gagal', updated_at = datetime('now') WHERE id = ?`
      ).bind(dokumen_id).run();
    }
  }
}

// GET /api/llm/models — list available models
llmRoutes.get('/models', async (c) => {
  return c.json({
    models: [
      { id: '@cf/qwen/qwen3-30b-a3b-fp8', name: 'Qwen3 30B (Workers AI)', description: 'Workers AI — gratis, default' },
      { id: 'deepseek-ai/DeepSeek-V4-Flash-0731', name: 'DeepSeek V4 Flash', description: 'HuggingFace TGI (fallback bila DEEPSEEK_API_KEY diset)' },
    ],
    default: '@cf/qwen/qwen3-30b-a3b-fp8',
  });
});
