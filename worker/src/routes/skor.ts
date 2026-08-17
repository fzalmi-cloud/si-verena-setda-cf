import { Hono } from 'hono';
import type { Bindings } from '../index';

export const skorRoutes = new Hono<{ Bindings: Bindings }>();

// GET /api/skor — list skor dengan filter
skorRoutes.get('/', async (c) => {
  const namaBiro = c.req.query('nama_biro');
  const tahun = c.req.query('tahun');
  const status = c.req.query('status_final');
  const limit = parseInt(c.req.query('limit') || '100');
  const offset = parseInt(c.req.query('offset') || '0');

  let query = 'SELECT * FROM skor_dokumen WHERE 1=1';
  const params: any[] = [];

  if (namaBiro) {
    query += ' AND nama_biro = ?';
    params.push(namaBiro);
  }
  if (tahun) {
    query += ' AND periode_tahun = ?';
    params.push(parseInt(tahun));
  }
  if (status) {
    query += ' AND status_final = ?';
    params.push(status);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const { results } = await c.env.DB.prepare(query).bind(...params).all();
  
  return c.json({ data: results });
});

// GET /api/skor/:id — get single skor
skorRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');

  const skor = await c.env.DB.prepare(
    'SELECT * FROM skor_dokumen WHERE id = ?'
  ).bind(id).first();

  if (!skor) {
    return c.json({ error: 'Skor tidak ditemukan' }, 404);
  }

  return c.json(skor);
});

// POST /api/skor — create skor
skorRoutes.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();

    // Gunakan skor total dari frontend jika ada (berdasarkan bobot yang benar),
    // atau hitung rata-rata jika tidak ada.
    let skorTotal = body.skor_total;
    if (skorTotal === undefined) {
      skorTotal = (
        (body.skor_kelengkapan || 0) +
        (body.skor_sistematika || 0) +
        (body.skor_tabel || 0) +
        (body.skor_matriks || 0) +
        (body.skor_konsistensi || 0) +
        (body.skor_substansi || 0)
      ) / 6;
    }

    // Gunakan level_kesiapan dari frontend jika ada
    let levelKesiapan = body.level_kesiapan;
    if (!levelKesiapan) {
      if (skorTotal >= 80) levelKesiapan = 'siap';
      else if (skorTotal >= 60) levelKesiapan = 'perlu_perbaikan';
      else levelKesiapan = 'belum_siap';
    }

    await c.env.DB.prepare(
      `INSERT INTO skor_dokumen (id, biro_id, nama_biro, periode_tahun, skor_kelengkapan, skor_sistematika, skor_tabel, skor_matriks, skor_konsistensi, skor_substansi, skor_total, level_kesiapan, status_final, tanggal_pemeriksaan)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      id,
      body.biro_id || null,
      body.nama_biro || '',
      body.periode_tahun || new Date().getFullYear(),
      body.skor_kelengkapan || 0,
      body.skor_sistematika || 0,
      body.skor_tabel || 0,
      body.skor_matriks || 0,
      body.skor_konsistensi || 0,
      body.skor_substansi || 0,
      skorTotal,
      levelKesiapan,
      body.status_final || 'draft'
    ).run();

    return c.json({ 
      id, 
      ...body, 
      skor_total: skorTotal,
      level_kesiapan: levelKesiapan 
    }, 201);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// PUT /api/skor/:id — update skor
skorRoutes.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();

  const sets: string[] = [];
  const params: any[] = [];

  for (const [key, value] of Object.entries(body)) {
    if (key !== 'id') {
      sets.push(`${key} = ?`);
      params.push(value);
    }
  }

  // Recalculate if scores are updated
  if (body.skor_kelengkapan !== undefined || body.skor_sistematika !== undefined) {
    const existing = await c.env.DB.prepare(
      'SELECT * FROM skor_dokumen WHERE id = ?'
    ).bind(id).first();

    if (existing) {
      const skorKelengkapan = body.skor_kelengkapan ?? existing.skor_kelengkapan;
      const skorSistematika = body.skor_sistematika ?? existing.skor_sistematika;
      const skorTabel = body.skor_tabel ?? existing.skor_tabel;
      const skorMatriks = body.skor_matriks ?? existing.skor_matriks;
      const skorKonsistensi = body.skor_konsistensi ?? existing.skor_konsistensi;
      const skorSubstansi = body.skor_substansi ?? existing.skor_substansi;

      const skorTotal = (
        skorKelengkapan + skorSistematika + skorTabel +
        skorMatriks + skorKonsistensi + skorSubstansi
      ) / 6;

      let levelKesiapan = 'belum_siap';
      if (skorTotal >= 80) levelKesiapan = 'siap';
      else if (skorTotal >= 60) levelKesiapan = 'perlu_perbaikan';

      sets.push('skor_total = ?');
      params.push(skorTotal);
      sets.push('level_kesiapan = ?');
      params.push(levelKesiapan);
    }
  }

  sets.push("updated_at = datetime('now')");
  params.push(id);

  await c.env.DB.prepare(
    `UPDATE skor_dokumen SET ${sets.join(', ')} WHERE id = ?`
  ).bind(...params).run();

  return c.json({ id, ...body });
});

// DELETE /api/skor/:id — hapus skor
skorRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const existing: any = await c.env.DB.prepare(
    'SELECT id FROM skor_dokumen WHERE id = ?'
  ).bind(id).first();
  if (!existing) return c.json({ error: 'Skor tidak ditemukan' }, 404);
  await c.env.DB.prepare('DELETE FROM skor_dokumen WHERE id = ?').bind(id).run();
  return c.json({ message: 'Skor berhasil dihapus' });
});

// POST /api/skor/bulk-delete — hapus banyak skor
skorRoutes.post('/bulk-delete', async (c) => {
  try {
    const { ids } = await c.req.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return c.json({ error: 'ids wajib berupa array non-kosong' }, 400);
    }
    let deleted = 0;
    for (const id of ids) {
      await c.env.DB.prepare('DELETE FROM skor_dokumen WHERE id = ?').bind(id).run();
      deleted++;
    }
    return c.json({ message: `${deleted} skor dihapus`, deleted });
  } catch (error: any) {
    return c.json({ error: 'Gagal bulk delete', detail: error.message }, 500);
  }
});

// POST /api/skor/reset — RESET skor untuk biro+tahun (re-pemeriksaan)
skorRoutes.post('/reset', async (c) => {
  try {
    const { nama_biro, tahun } = await c.req.json();
    if (!nama_biro || !tahun) {
      return c.json({ error: 'nama_biro dan tahun wajib diisi' }, 400);
    }
    const r: any = await c.env.DB.prepare(
      'DELETE FROM skor_dokumen WHERE nama_biro = ? AND periode_tahun = ?'
    ).bind(nama_biro, parseInt(tahun)).run();
    return c.json({ message: `Skor ${nama_biro} ${tahun} direset`, deleted: r?.meta?.changes || 0 });
  } catch (error: any) {
    return c.json({ error: 'Gagal reset', detail: error.message }, 500);
  }
});

// GET /api/skor/stats/ranking — ranking biro berdasarkan skor
skorRoutes.get('/stats/ranking', async (c) => {
  const tahun = c.req.query('tahun') || new Date().getFullYear().toString();

  const { results } = await c.env.DB.prepare(`
    SELECT 
      nama_biro,
      skor_total,
      level_kesiapan,
      tanggal_pemeriksaan
    FROM skor_dokumen 
    WHERE periode_tahun = ?
    ORDER BY skor_total DESC
  `).bind(parseInt(tahun)).all();

  return c.json({ data: results });
});
