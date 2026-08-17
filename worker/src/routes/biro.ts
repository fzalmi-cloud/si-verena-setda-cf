import { Hono } from 'hono';
import type { Bindings } from '../index';

export const biroRoutes = new Hono<{ Bindings: Bindings }>();

// GET /api/biro — list semua biro
biroRoutes.get('/', async (c) => {
  const status = c.req.query('status') || 'aktif';

  const { results } = await c.env.DB.prepare(
    'SELECT * FROM biro WHERE status = ? ORDER BY nama_biro ASC'
  ).bind(status).all();

  return c.json({ data: results });
});

// GET /api/biro/:id — get single biro
biroRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');

  const biro = await c.env.DB.prepare(
    'SELECT * FROM biro WHERE id = ?'
  ).bind(id).first();

  if (!biro) {
    return c.json({ error: 'Biro tidak ditemukan' }, 404);
  }

  return c.json(biro);
});

// POST /api/biro — create biro
biroRoutes.post('/', async (c) => {
  const body = await c.req.json();
  const id = crypto.randomUUID();

  await c.env.DB.prepare(
    `INSERT INTO biro (id, nama_biro, kode_biro, kepala_biro, status)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(
    id,
    body.nama_biro,
    body.kode_biro,
    body.kepala_biro,
    body.status || 'aktif'
  ).run();

  return c.json({ id, ...body }, 201);
});

// PUT /api/biro/:id — update biro
biroRoutes.put('/:id', async (c) => {
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
    `UPDATE biro SET ${sets.join(', ')} WHERE id = ?`
  ).bind(...params).run();

  return c.json({ id, ...body });
});

// DELETE /api/biro/:id — hapus biro (BLOKIR jika masih ada data terkait)
biroRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const biro: any = await c.env.DB.prepare(
    'SELECT * FROM biro WHERE id = ?'
  ).bind(id).first();
  if (!biro) return c.json({ error: 'Biro tidak ditemukan' }, 404);

  // Cek data terkait (dokumen, skor, riwayat) berdasarkan nama_biro
  const checks: [string, string][] = [
    ['dokumen', 'SELECT COUNT(*) AS t FROM dokumen_renja WHERE nama_biro = ?'],
    ['skor', 'SELECT COUNT(*) AS t FROM skor_dokumen WHERE nama_biro = ?'],
    ['riwayat_revisi', 'SELECT COUNT(*) AS t FROM riwayat_revisi WHERE nama_biro = ?'],
    ['hasil_pemeriksaan', 'SELECT COUNT(*) AS t FROM hasil_pemeriksaan WHERE nama_biro = ?'],
  ];
  const terkait: Record<string, number> = {};
  for (const [label, sql] of checks) {
    const r: any = await c.env.DB.prepare(sql).bind(biro.nama_biro).first();
    terkait[label] = r?.t || 0;
  }
  const total = Object.values(terkait).reduce((a, b) => a + b, 0);
  if (total > 0) {
    return c.json({
      error: `Biro tidak bisa dihapus — masih ada data terkait (dokumen: ${terkait.dokumen}, skor: ${terkait.skor}, riwayat: ${terkait.riwayat_revisi}, hasil: ${terkait.hasil_pemeriksaan})`,
      terkait,
    }, 409);
  }

  await c.env.DB.prepare('DELETE FROM biro WHERE id = ?').bind(id).run();
  return c.json({ message: 'Biro berhasil dihapus' });
});
