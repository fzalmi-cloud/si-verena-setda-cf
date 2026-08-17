import { Hono } from 'hono';
import type { Bindings } from '../index';

export const revisiRoutes = new Hono<{ Bindings: Bindings }>();

// GET /api/revisi — list riwayat revisi dengan filter
revisiRoutes.get('/', async (c) => {
  const namaBiro = c.req.query('nama_biro');
  const tahun = c.req.query('tahun');
  const limit = parseInt(c.req.query('limit') || '100');
  const offset = parseInt(c.req.query('offset') || '0');

  let query = 'SELECT * FROM riwayat_revisi WHERE 1=1';
  const params: any[] = [];

  if (namaBiro) {
    query += ' AND nama_biro = ?';
    params.push(namaBiro);
  }
  if (tahun) {
    query += ' AND periode_tahun = ?';
    params.push(parseInt(tahun));
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const { results } = await c.env.DB.prepare(query).bind(...params).all();
  
  return c.json({ data: results });
});

// GET /api/revisi/:id — get single revisi
revisiRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');

  const revisi = await c.env.DB.prepare(
    'SELECT * FROM riwayat_revisi WHERE id = ?'
  ).bind(id).first();

  if (!revisi) {
    return c.json({ error: 'Riwayat revisi tidak ditemukan' }, 404);
  }

  return c.json(revisi);
});

// POST /api/revisi — create riwayat revisi
revisiRoutes.post('/', async (c) => {
  const body = await c.req.json();
  const id = crypto.randomUUID();

  await c.env.DB.prepare(
    `INSERT INTO riwayat_revisi (id, biro_id, nama_biro, periode_tahun, versi, jenis_dokumen, file_url, file_key, catatan_revisi, diunggah_oleh)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id,
    body.biro_id,
    body.nama_biro,
    body.periode_tahun,
    body.versi || 1,
    body.jenis_dokumen,
    body.file_url,
    body.file_key,
    body.catatan_revisi,
    body.diunggah_oleh
  ).run();

  return c.json({ id, ...body }, 201);
});

// GET /api/revisi/biro/:biro_id — get revisi by biro
revisiRoutes.get('/biro/:biro_id', async (c) => {
  const biroId = c.req.param('biro_id');
  const tahun = c.req.query('tahun');
  const limit = parseInt(c.req.query('limit') || '50');

  let query = 'SELECT * FROM riwayat_revisi WHERE biro_id = ?';
  const params: any[] = [biroId];

  if (tahun) {
    query += ' AND periode_tahun = ?';
    params.push(parseInt(tahun));
  }

  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(limit);

  const { results } = await c.env.DB.prepare(query).bind(...params).all();
  
  return c.json({ data: results });
});

// GET /api/revisi/stats — statistik revisi
revisiRoutes.get('/stats/summary', async (c) => {
  const tahun = c.req.query('tahun') || new Date().getFullYear().toString();

  const stats = await c.env.DB.prepare(`
    SELECT 
      COUNT(*) as total_revisi,
      COUNT(DISTINCT nama_biro) as total_biro,
      COUNT(DISTINCT versi) as total_versi
    FROM riwayat_revisi 
    WHERE periode_tahun = ?
  `).bind(parseInt(tahun)).first();

  return c.json(stats);
});
