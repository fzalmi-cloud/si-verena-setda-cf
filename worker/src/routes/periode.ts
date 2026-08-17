import { Hono } from 'hono';
import type { Bindings } from '../index';

// CRUD Periode / Tahun Renja (tabel periode_renja)
// Sebelumnya tabel ini menganggur & tahun di-hardcode di frontend.
export const periodeRoutes = new Hono<{ Bindings: Bindings }>();

// GET /api/periode — list periode (filter jenis/status/tahun)
// jenis: 'murni' (default, Renja biasa) | 'perubahan' (Renja Perubahan)
periodeRoutes.get('/', async (c) => {
  const status = c.req.query('status');
  const tahun = c.req.query('tahun');
  const jenis = c.req.query('jenis') || 'murni';

  let query = 'SELECT * FROM periode_renja WHERE jenis = ?';
  const params: any[] = [jenis];

  if (status) { query += ' AND status = ?'; params.push(status); }
  if (tahun) { query += ' AND tahun = ?'; params.push(parseInt(tahun)); }

  query += ' ORDER BY tahun DESC';

  const { results } = await c.env.DB.prepare(query).bind(...params).all();
  return c.json({ data: results });
});

// GET /api/periode/:id
periodeRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  const periode = await c.env.DB.prepare(
    'SELECT * FROM periode_renja WHERE id = ?'
  ).bind(id).first();
  if (!periode) return c.json({ error: 'Periode tidak ditemukan' }, 404);
  return c.json(periode);
});

// POST /api/periode — buka periode tahun baru (jenis: murni/perubahan)
periodeRoutes.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const tahun = parseInt(body.tahun);
    if (!tahun || isNaN(tahun)) {
      return c.json({ error: 'Tahun wajib diisi' }, 400);
    }
    const jenis = body.jenis || 'murni';

    // Cek duplikat tahun (per jenis)
    const existing = await c.env.DB.prepare(
      'SELECT id FROM periode_renja WHERE tahun = ? AND jenis = ?'
    ).bind(tahun, jenis).first();
    if (existing) {
      return c.json({ error: `Periode ${jenis} tahun ${tahun} sudah ada` }, 409);
    }

    const id = crypto.randomUUID();
    await c.env.DB.prepare(
      `INSERT INTO periode_renja (id, tahun, status, tanggal_mulai, tanggal_selesai, jenis)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(
      id,
      tahun,
      body.status || 'aktif',
      body.tanggal_mulai || null,
      body.tanggal_selesai || null,
      jenis
    ).run();

    return c.json({ id, ...body, tahun, jenis }, 201);
  } catch (error: any) {
    return c.json({ error: 'Gagal membuat periode', detail: error.message }, 500);
  }
});

// PUT /api/periode/:id — ubah status/tanggal
periodeRoutes.put('/:id', async (c) => {
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
  params.push(id);

  await c.env.DB.prepare(
    `UPDATE periode_renja SET ${sets.join(', ')} WHERE id = ?`
  ).bind(...params).run();
  return c.json({ id, ...body });
});

// DELETE /api/periode/:id — hapus periode (blokir jika sudah ada dokumen pada tahun itu)
periodeRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const periode: any = await c.env.DB.prepare(
    'SELECT * FROM periode_renja WHERE id = ?'
  ).bind(id).first();
  if (!periode) return c.json({ error: 'Periode tidak ditemukan' }, 404);

  // Cek dokumen pada tahun tersebut
  const docCount: any = await c.env.DB.prepare(
    'SELECT COUNT(*) as total FROM dokumen_renja WHERE periode_tahun = ?'
  ).bind(periode.tahun).first();
  if (docCount?.total > 0) {
    return c.json({
      error: `Periode tahun ${periode.tahun} tidak bisa dihapus — masih ada ${docCount.total} dokumen`,
      total_dokumen: docCount.total,
    }, 409);
  }

  await c.env.DB.prepare('DELETE FROM periode_renja WHERE id = ?').bind(id).run();
  return c.json({ message: 'Periode berhasil dihapus' });
});
