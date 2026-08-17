import { Hono } from 'hono';
import type { Bindings } from '../index';

export const dokumenRoutes = new Hono<{ Bindings: Bindings }>();

// GET /api/dokumen — list dengan filter
dokumenRoutes.get('/', async (c) => {
  const namaBiro = c.req.query('nama_biro');
  const tahun = c.req.query('tahun');
  const jenis = c.req.query('jenis_dokumen');
  const status = c.req.query('status_upload');
  const limit = parseInt(c.req.query('limit') || '100');
  const offset = parseInt(c.req.query('offset') || '0');

  let query = 'SELECT * FROM dokumen_renja WHERE 1=1';
  const params: any[] = [];

  if (namaBiro) {
    query += ' AND nama_biro = ?';
    params.push(namaBiro);
  }
  if (tahun) {
    query += ' AND periode_tahun = ?';
    params.push(parseInt(tahun));
  }
  if (jenis) {
    query += ' AND jenis_dokumen = ?';
    params.push(jenis);
  }
  if (status) {
    query += ' AND status_upload = ?';
    params.push(status);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const { results } = await c.env.DB.prepare(query).bind(...params).all();
  
  // Get total count
  let countQuery = 'SELECT COUNT(*) as total FROM dokumen_renja WHERE 1=1';
  const countParams: any[] = [];
  
  if (namaBiro) {
    countQuery += ' AND nama_biro = ?';
    countParams.push(namaBiro);
  }
  if (tahun) {
    countQuery += ' AND periode_tahun = ?';
    countParams.push(parseInt(tahun));
  }
  if (jenis) {
    countQuery += ' AND jenis_dokumen = ?';
    countParams.push(jenis);
  }
  if (status) {
    countQuery += ' AND status_upload = ?';
    countParams.push(status);
  }

  const countResult = await c.env.DB.prepare(countQuery).bind(...countParams).first();
  
  return c.json({
    data: results,
    total: countResult?.total || 0,
    limit,
    offset
  });
});

// GET /api/dokumen/:id — get single dokumen
dokumenRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  
  const dokumen = await c.env.DB.prepare(
    'SELECT * FROM dokumen_renja WHERE id = ?'
  ).bind(id).first();

  if (!dokumen) {
    return c.json({ error: 'Dokumen tidak ditemukan' }, 404);
  }

  return c.json(dokumen);
});

// POST /api/dokumen — create dokumen
dokumenRoutes.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();

    await c.env.DB.prepare(
      `INSERT INTO dokumen_renja (id, biro_id, nama_biro, periode_tahun, level_unit, jenis_dokumen, sub_jenis, nama_file, file_url, file_key, file_size, status_upload, catatan_upload)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id, 
      body.biro_id || null, 
      body.nama_biro, 
      body.periode_tahun,
      body.level_unit || 'biro', 
      body.jenis_dokumen, 
      body.sub_jenis || null,
      body.nama_file, 
      body.file_url || null, 
      body.file_key || null,
      body.file_size || 0,
      body.status_upload || 'diunggah', 
      body.catatan_upload || null
    ).run();

    return c.json({ id, ...body }, 201);
  } catch (error: any) {
    return c.json({ error: 'Gagal membuat dokumen', detail: error.message }, 500);
  }
});

// PUT /api/dokumen/:id — update dokumen
dokumenRoutes.put('/:id', async (c) => {
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
    `UPDATE dokumen_renja SET ${sets.join(', ')} WHERE id = ?`
  ).bind(...params).run();

  return c.json({ id, ...body });
});

// DELETE /api/dokumen/:id — delete dokumen
dokumenRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id');

  // Check if dokumen exists
  const existing = await c.env.DB.prepare(
    'SELECT id FROM dokumen_renja WHERE id = ?'
  ).bind(id).first();

  if (!existing) {
    return c.json({ error: 'Dokumen tidak ditemukan' }, 404);
  }

  await c.env.DB.prepare(
    'DELETE FROM dokumen_renja WHERE id = ?'
  ).bind(id).run();

  return c.json({ message: 'Dokumen berhasil dihapus' });
});

// GET /api/dokumen/stats — statistik dokumen
dokumenRoutes.get('/stats/summary', async (c) => {
  const tahun = c.req.query('tahun') || new Date().getFullYear().toString();

  const stats = await c.env.DB.prepare(`
    SELECT 
      COUNT(*) as total_dokumen,
      COUNT(DISTINCT nama_biro) as total_biro,
      SUM(CASE WHEN status_upload = 'diunggah' THEN 1 ELSE 0 END) as belum_diverifikasi,
      SUM(CASE WHEN status_upload = 'diverifikasi' THEN 1 ELSE 0 END) as sudah_diverifikasi,
      SUM(CASE WHEN status_upload = 'ditolak' THEN 1 ELSE 0 END) as ditolak
    FROM dokumen_renja 
    WHERE periode_tahun = ?
  `).bind(parseInt(tahun)).first();

  return c.json(stats);
});
