import { Hono } from 'hono';
import { getLLMProvider } from '../llm/provider';
import type { Bindings } from '../index';

export const llmRoutes = new Hono<{ Bindings: Bindings }>();

// POST /api/llm/generate — generate text dengan LLM
llmRoutes.post('/generate', async (c) => {
  const { prompt, model, responseJsonSchema } = await c.req.json();

  if (!prompt) {
    return c.json({ error: 'Prompt diperlukan' }, 400);
  }

  const provider = getLLMProvider(c.env);

  try {
    const result = await provider.generate(prompt, {
      model,
      responseJsonSchema,
    });

    return c.json({ result });
  } catch (error: any) {
    return c.json({ 
      error: 'Gagal generate text',
      detail: error.message 
    }, 500);
  }
});

// POST /api/llm/auto-verifikasi — jalankan semua kategori secara PARALLEL di server
// Pakai waitUntil agar tidak timeout, langsung return 202 Accepted
llmRoutes.post('/auto-verifikasi', async (c) => {
  const { dokumen_id, nama_biro, periode_tahun, dokumen_url, file_referensi_urls = [] } = await c.req.json();

  if (!nama_biro || !periode_tahun) {
    return c.json({ error: 'nama_biro dan periode_tahun diperlukan' }, 400);
  }

  const env = c.env;
  const ctx = c.executionCtx;

  // Set status dokumen jadi sedang_diproses SEKARANG (sinkron)
  if (dokumen_id) {
    await env.DB.prepare(
      `UPDATE dokumen_renja SET status_upload = 'sedang_diproses', updated_at = datetime('now') WHERE id = ?`
    ).bind(dokumen_id).run();
  }

  // Jalankan AI di background dengan waitUntil (tidak block response)
  ctx.waitUntil(
    runAutoVerifikasiBackground({ env, dokumen_id, nama_biro, periode_tahun, dokumen_url, file_referensi_urls })
  );

  // Langsung return 202 ke frontend - tidak perlu tunggu AI
  return c.json({
    success: true,
    status: 'processing',
    message: 'Auto verifikasi sedang berjalan di background. Cek status dokumen beberapa saat lagi.',
    dokumen_id,
  }, 202);
});

async function runAutoVerifikasiBackground({ env, dokumen_id, nama_biro, periode_tahun, dokumen_url, file_referensi_urls }: any) {
  const provider = getLLMProvider(env);

  const KATEGORI_AUTO = [
    'sistematika_dokumen',
    'tabel_wajib',
    'matriks_renja',
    'urgensi_prioritas',
    'konsistensi_angka',
    'substansi_bab',
  ];

  try {
    // Jalankan semua kategori PARALLEL
    const hasilPerKategori = await Promise.allSettled(
      KATEGORI_AUTO.map(async (kategori) => {
        const prompt = `Kamu adalah sistem pemeriksa otomatis dokumen Renja (Rencana Kerja) Perangkat Daerah Pemerintah Indonesia.

Tugas: Periksa dokumen Renja Biro "${nama_biro}" Tahun ${periode_tahun} untuk kategori "${kategori}".

${file_referensi_urls.length > 0 ? `PENTING: Gunakan file referensi/pedoman sebagai standar acuan utama pemeriksaan.` : ''}

Untuk kategori "${kategori}", periksa 3-5 aspek utama yang lazim dalam dokumen Renja pemerintah daerah Indonesia.

${dokumen_url ? `Dokumen Renja: ${dokumen_url}` : 'Dokumen belum diunggah, tandai semua perlu_review_manual.'}

${kategori === 'tabel_wajib' ? `PERINGATAN: Cari label eksplisit tabel T-C.29 s.d. T-C.33. Tanpa label eksplisit = tidak_ditemukan.` : ''}

Berikan penilaian KONSERVATIF. Jika ragu gunakan "perlu_review_manual".

Format JSON:
{"kategori": "${kategori}", "hasil": [{"item": "nama aspek", "status": "sesuai|perlu_perbaikan|tidak_ditemukan|perlu_review_manual", "halaman": "", "kutipan_dokumen": "", "catatan": "Temuan: ... | Lokasi: ... | Rekomendasi: ..."}]}`;

        try {
          const resp = await provider.generate(prompt, { responseJsonSchema: { type: 'object' } });
          let parsed: any;
          try { parsed = typeof resp === 'string' ? JSON.parse(resp) : resp; } catch { parsed = { kategori, hasil: [] }; }
          return { kategori, hasil: parsed.hasil || [] };
        } catch (err: any) {
          return { kategori, hasil: [{ item: `Pemeriksaan ${kategori}`, status: 'perlu_review_manual', halaman: '', kutipan_dokumen: '', catatan: `Gagal: ${err.message}` }] };
        }
      })
    );

    // Simpan ke DB
    const { results: existingResults } = await env.DB.prepare(
      'SELECT id, item_pemeriksaan, kategori FROM hasil_pemeriksaan WHERE nama_biro = ? AND periode_tahun = ?'
    ).bind(nama_biro, parseInt(periode_tahun)).all();

    for (const result of hasilPerKategori) {
      if (result.status !== 'fulfilled') continue;
      const { kategori, hasil } = result.value;
      for (const item of hasil) {
        const existing = (existingResults as any[]).find(
          (r: any) => r.item_pemeriksaan === item.item && r.kategori === kategori
        );
        if (existing?.id) {
          await env.DB.prepare(
            `UPDATE hasil_pemeriksaan SET status=?, halaman=?, kutipan_dokumen=?, catatan_otomatis=?, status_validasi='belum_divalidasi', updated_at=datetime('now') WHERE id=?`
          ).bind(item.status, item.halaman || '', item.kutipan_dokumen || '', `[AI] ${item.catatan || ''}`, existing.id).run();
        } else {
          const id = crypto.randomUUID();
          await env.DB.prepare(
            `INSERT INTO hasil_pemeriksaan (id, nama_biro, periode_tahun, kategori, sub_kategori, item_pemeriksaan, status, halaman, kutipan_dokumen, catatan_otomatis, status_validasi) VALUES (?, ?, ?, ?, '', ?, ?, ?, ?, ?, 'belum_divalidasi')`
          ).bind(id, nama_biro, parseInt(periode_tahun), kategori, item.item, item.status, item.halaman || '', item.kutipan_dokumen || '', `[AI] ${item.catatan || ''}`).run();
        }
      }
    }

    // Update status dokumen selesai
    if (dokumen_id) {
      await env.DB.prepare(
        `UPDATE dokumen_renja SET status_upload = 'selesai_diproses', updated_at = datetime('now') WHERE id = ?`
      ).bind(dokumen_id).run();
    }
  } catch (err: any) {
    // Jika error, set status gagal
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
      {
        id: 'deepseek-ai/DeepSeek-V4-Flash-0731',
        name: 'DeepSeek V4 Flash',
        description: 'DeepSeek Model from HuggingFace TGI',
      }
    ],
    default: 'deepseek-ai/DeepSeek-V4-Flash-0731',
  });
});
