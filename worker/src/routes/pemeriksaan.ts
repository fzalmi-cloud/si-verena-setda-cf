import { Hono } from 'hono';
import type { Bindings } from '../index';

export const pemeriksaanRoutes = new Hono<{ Bindings: Bindings }>();

// GET /api/pemeriksaan — list dengan filter
pemeriksaanRoutes.get('/', async (c) => {
  const namaBiro = c.req.query('nama_biro');
  const tahun = c.req.query('tahun');
  const kategori = c.req.query('kategori');
  const status = c.req.query('status');
  const limit = parseInt(c.req.query('limit') || '100');
  const offset = parseInt(c.req.query('offset') || '0');

  let query = 'SELECT * FROM hasil_pemeriksaan WHERE 1=1';
  const params: any[] = [];

  if (namaBiro) {
    query += ' AND nama_biro = ?';
    params.push(namaBiro);
  }
  if (tahun) {
    query += ' AND periode_tahun = ?';
    params.push(parseInt(tahun));
  }
  if (kategori) {
    query += ' AND kategori = ?';
    params.push(kategori);
  }
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const { results } = await c.env.DB.prepare(query).bind(...params).all();
  
  return c.json({ data: results });
});

// GET /api/pemeriksaan/:id — get single hasil
pemeriksaanRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  
  const hasil = await c.env.DB.prepare(
    'SELECT * FROM hasil_pemeriksaan WHERE id = ?'
  ).bind(id).first();

  if (!hasil) {
    return c.json({ error: 'Hasil pemeriksaan tidak ditemukan' }, 404);
  }

  return c.json(hasil);
});

// POST /api/pemeriksaan — create hasil pemeriksaan
pemeriksaanRoutes.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();

    await c.env.DB.prepare(
      `INSERT INTO hasil_pemeriksaan (id, dokumen_renja_id, biro_id, nama_biro, periode_tahun, kategori, sub_kategori, item_pemeriksaan, status, halaman, kutipan_dokumen, catatan_otomatis, catatan_verifikator)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id,
      body.dokumen_renja_id || null,
      body.biro_id || null,
      body.nama_biro || '',
      body.periode_tahun || new Date().getFullYear(),
      body.kategori || '',
      body.sub_kategori || '',
      body.item_pemeriksaan || '',
      body.status || 'perlu_review_manual',
      body.halaman || '',
      body.kutipan_dokumen || '',
      body.catatan_otomatis || '',
      body.catatan_verifikator || ''
    ).run();

    return c.json({ id, ...body }, 201);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// POST /api/pemeriksaan/bulk — bulk create hasil pemeriksaan
pemeriksaanRoutes.post('/bulk', async (c) => {
  try {
    const { items } = await c.req.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return c.json({ error: 'Items array diperlukan' }, 400);
    }

    const createdIds: string[] = [];

    for (const item of items) {
      const id = crypto.randomUUID();
      await c.env.DB.prepare(
        `INSERT INTO hasil_pemeriksaan (id, dokumen_renja_id, biro_id, nama_biro, periode_tahun, kategori, sub_kategori, item_pemeriksaan, status, halaman, kutipan_dokumen, catatan_otomatis, status_validasi)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        id,
        item.dokumen_renja_id || null,
        item.biro_id || null,
        item.nama_biro || '',
        item.periode_tahun || new Date().getFullYear(),
        item.kategori || '',
        item.sub_kategori || '',
        item.item_pemeriksaan || '',
        item.status || 'perlu_review_manual',
        item.halaman || '',
        item.kutipan_dokumen || '',
        item.catatan_otomatis || '',
        item.status_validasi || 'belum_divalidasi'
      ).run();
      createdIds.push(id);
    }

    return c.json({ 
      message: `${createdIds.length} hasil pemeriksaan berhasil dibuat`,
      ids: createdIds 
    }, 201);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// PUT /api/pemeriksaan/:id — update hasil pemeriksaan
pemeriksaanRoutes.put('/:id', async (c) => {
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

  sets.push("updated_at = datetime('now')");
  params.push(id);

  await c.env.DB.prepare(
    `UPDATE hasil_pemeriksaan SET ${sets.join(', ')} WHERE id = ?`
  ).bind(...params).run();

  return c.json({ id, ...body });
});

// POST /api/pemeriksaan/:id/validate — validasi hasil pemeriksaan
pemeriksaanRoutes.post('/:id/validate', async (c) => {
  const id = c.req.param('id');
  const { status_validasi, catatan_verifikator, divalidasi_oleh } = await c.req.json();

  await c.env.DB.prepare(`
    UPDATE hasil_pemeriksaan 
    SET status_validasi = ?, 
        catatan_verifikator = ?, 
        divalidasi_oleh = ?,
        tanggal_validasi = datetime('now'),
        updated_at = datetime('now')
    WHERE id = ?
  `).bind(status_validasi, catatan_verifikator, divalidasi_oleh, id).run();

  return c.json({ message: 'Hasil pemeriksaan berhasil divalidasi' });
});

// GET /api/pemeriksaan/stats — statistik pemeriksaan
pemeriksaanRoutes.get('/stats/summary', async (c) => {
  const tahun = c.req.query('tahun') || new Date().getFullYear().toString();

  const stats = await c.env.DB.prepare(`
    SELECT 
      COUNT(*) as total_item,
      SUM(CASE WHEN status = 'sesuai' THEN 1 ELSE 0 END) as sesuai,
      SUM(CASE WHEN status = 'tidak_sesuai' THEN 1 ELSE 0 END) as tidak_sesuai,
      SUM(CASE WHEN status = 'perlu_review_manual' THEN 1 ELSE 0 END) as perlu_review,
      SUM(CASE WHEN status_validasi = 'divalidasi' THEN 1 ELSE 0 END) as sudah_divalidasi,
      COUNT(DISTINCT nama_biro) as total_biro
    FROM hasil_pemeriksaan 
    WHERE periode_tahun = ?
  `).bind(parseInt(tahun)).first();

  return c.json(stats);
});
