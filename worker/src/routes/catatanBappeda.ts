import { Hono } from 'hono';
import type { Bindings } from '../index';

// CRUD Catatan Bappeda — catatan koreksi hasil verifikasi Renja oleh Bappeda.
// Sebelumnya data statis di frontend; sekarang dikelola lewat database.
export const catatanBappedaRoutes = new Hono<{ Bindings: Bindings }>();

// GET /api/catatan-bappeda — list catatan (filter nama_biro/status/bab)
catatanBappedaRoutes.get('/', async (c) => {
  const namaBiro = c.req.query('nama_biro');
  const status = c.req.query('status');
  const bab = c.req.query('bab');
  const limit = parseInt(c.req.query('limit') || '200');
  const offset = parseInt(c.req.query('offset') || '0');

  let query = 'SELECT * FROM catatan_bappeda WHERE 1=1';
  const params: any[] = [];

  if (namaBiro) { query += ' AND nama_biro = ?'; params.push(namaBiro); }
  if (status) { query += ' AND status = ?'; params.push(status); }
  if (bab) { query += ' AND bab LIKE ?'; params.push(`%${bab}%`); }

  query += ' ORDER BY nama_biro ASC, created_at ASC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const { results } = await c.env.DB.prepare(query).bind(...params).all();

  // Ringkasan per biro
  const { results: summary } = await c.env.DB.prepare(`
    SELECT nama_biro,
           COUNT(*) AS total,
           SUM(CASE WHEN status = 'sesuai' THEN 1 ELSE 0 END) AS sesuai,
           SUM(CASE WHEN status = 'perlu_perbaikan' THEN 1 ELSE 0 END) AS perlu,
           SUM(CASE WHEN status = 'tidak_ditemukan' THEN 1 ELSE 0 END) AS tidak_ada,
           MAX(tanggal_verifikasi) AS tanggal_verifikasi
    FROM catatan_bappeda
    GROUP BY nama_biro
    ORDER BY nama_biro ASC
  `).all();

  return c.json({ data: results, summary, total: results.length });
});

// GET /api/catatan-bappeda/:id
catatanBappedaRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  const row = await c.env.DB.prepare(
    'SELECT * FROM catatan_bappeda WHERE id = ?'
  ).bind(id).first();
  if (!row) return c.json({ error: 'Catatan tidak ditemukan' }, 404);
  return c.json(row);
});

// POST /api/catatan-bappeda — tambah catatan
catatanBappedaRoutes.post('/', async (c) => {
  try {
    const body = await c.req.json();
    if (!body.nama_biro || !body.item) {
      return c.json({ error: 'nama_biro dan item wajib diisi' }, 400);
    }
    const id = crypto.randomUUID();
    await c.env.DB.prepare(
      `INSERT INTO catatan_bappeda (id, nama_biro, tanggal_verifikasi, bab, item, status, catatan)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id,
      body.nama_biro,
      body.tanggal_verifikasi ?? null,
      body.bab ?? null,
      body.item,
      body.status || 'perlu_perbaikan',
      body.catatan ?? null
    ).run();
    return c.json({ id, ...body }, 201);
  } catch (error: any) {
    return c.json({ error: 'Gagal membuat catatan', detail: error.message }, 500);
  }
});

// POST /api/catatan-bappeda/bulk — tambah banyak catatan sekaligus
catatanBappedaRoutes.post('/bulk', async (c) => {
  try {
    const { items } = await c.req.json();
    if (!Array.isArray(items) || items.length === 0) {
      return c.json({ error: 'items wajib berupa array non-kosong' }, 400);
    }
    let created = 0;
    for (const item of items) {
      if (!item.nama_biro || !item.item) continue;
      const id = crypto.randomUUID();
      await c.env.DB.prepare(
        `INSERT INTO catatan_bappeda (id, nama_biro, tanggal_verifikasi, bab, item, status, catatan)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        id,
        item.nama_biro,
        item.tanggal_verifikasi ?? null,
        item.bab ?? null,
        item.item,
        item.status || 'perlu_perbaikan',
        item.catatan ?? null
      ).run();
      created++;
    }
    return c.json({ message: `${created} catatan dibuat`, created }, created > 0 ? 201 : 400);
  } catch (error: any) {
    return c.json({ error: 'Gagal bulk create', detail: error.message }, 500);
  }
});

// PUT /api/catatan-bappeda/:id — ubah catatan
catatanBappedaRoutes.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();

  const sets: string[] = [];
  const params: any[] = [];
  for (const [key, value] of Object.entries(body)) {
    if (key !== 'id' && value !== undefined) {
      sets.push(`${key} = ?`);
      params.push(value);
    }
  }
  if (sets.length === 0) return c.json({ error: 'Tidak ada field yang diupdate' }, 400);
  sets.push("updated_at = datetime('now')");
  params.push(id);

  await c.env.DB.prepare(
    `UPDATE catatan_bappeda SET ${sets.join(', ')} WHERE id = ?`
  ).bind(...params).run();
  return c.json({ id, ...body });
});

// DELETE /api/catatan-bappeda/:id — hapus catatan
catatanBappedaRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const existing: any = await c.env.DB.prepare(
    'SELECT id FROM catatan_bappeda WHERE id = ?'
  ).bind(id).first();
  if (!existing) return c.json({ error: 'Catatan tidak ditemukan' }, 404);
  await c.env.DB.prepare('DELETE FROM catatan_bappeda WHERE id = ?').bind(id).run();
  return c.json({ message: 'Catatan berhasil dihapus' });
});
