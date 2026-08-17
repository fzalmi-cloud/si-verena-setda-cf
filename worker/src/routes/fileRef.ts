import { Hono } from 'hono';
import type { Bindings } from '../index';

export const fileRefRoutes = new Hono<{ Bindings: Bindings }>();

// GET /api/file-ref — list file referensi
fileRefRoutes.get('/', async (c) => {
  const aktif = c.req.query('aktif');
  const jenis = c.req.query('jenis');
  const limit = parseInt(c.req.query('limit') || '100');
  const offset = parseInt(c.req.query('offset') || '0');

  let query = 'SELECT * FROM file_referensi WHERE 1=1';
  const params: any[] = [];

  if (aktif !== undefined) {
    query += ' AND aktif = ?';
    params.push(aktif === 'true' ? 1 : 0);
  }
  if (jenis) {
    query += ' AND jenis = ?';
    params.push(jenis);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const { results } = await c.env.DB.prepare(query).bind(...params).all();
  
  return c.json({ data: results });
});

// GET /api/file-ref/:id — get single file referensi
fileRefRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');

  const fileRef = await c.env.DB.prepare(
    'SELECT * FROM file_referensi WHERE id = ?'
  ).bind(id).first();

  if (!fileRef) {
    return c.json({ error: 'File referensi tidak ditemukan' }, 404);
  }

  return c.json(fileRef);
});

// POST /api/file-ref — create file referensi
fileRefRoutes.post('/', async (c) => {
  const body = await c.req.json();
  const id = crypto.randomUUID();

  // Field opsional WAJIB di-default-kan (?? null). Tanpa ini, saat field tidak
  // dikirim frontend, D1 .bind(undefined) melempar error -> 500 Internal Server Error.
  await c.env.DB.prepare(
    `INSERT INTO file_referensi (id, judul, deskripsi, jenis, nama_file, file_url, file_key, diunggah_oleh, aktif)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id,
    body.judul,
    body.deskripsi ?? null,
    body.jenis || 'pedoman_renja',
    body.nama_file,
    body.file_url,
    body.file_key ?? null,
    body.diunggah_oleh ?? null,
    body.aktif !== false ? 1 : 0
  ).run();

  return c.json({ id, ...body }, 201);
});

// POST /api/file-ref/bulk — buat banyak file referensi sekaligus (batch upload)
fileRefRoutes.post('/bulk', async (c) => {
  const { items } = await c.req.json();
  if (!Array.isArray(items) || items.length === 0) {
    return c.json({ error: 'items wajib berupa array non-kosong' }, 400);
  }

  let created = 0;
  const failed: { judul?: string; error: string }[] = [];

  for (const item of items) {
    const id = crypto.randomUUID();
    try {
      await c.env.DB.prepare(
        `INSERT INTO file_referensi (id, judul, deskripsi, jenis, nama_file, file_url, file_key, diunggah_oleh, aktif)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        id,
        item.judul,
        item.deskripsi ?? null,
        item.jenis || 'pedoman_renja',
        item.nama_file,
        item.file_url,
        item.file_key ?? null,
        item.diunggah_oleh ?? null,
        item.aktif !== false ? 1 : 0
      ).run();
      created++;
    } catch (error: any) {
      failed.push({ judul: item.judul || item.nama_file, error: error.message });
    }
  }

  return c.json({
    message: `${created} file referensi ditambahkan${failed.length ? `, ${failed.length} gagal` : ''}`,
    created,
    failed: failed.length > 0 ? failed : undefined,
  }, created > 0 ? 201 : 500);
});

// PUT /api/file-ref/:id — update file referensi
fileRefRoutes.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();

  const sets: string[] = [];
  const params: any[] = [];

  for (const [key, value] of Object.entries(body)) {
    if (key !== 'id' && value !== undefined) {
      if (key === 'aktif') {
        sets.push(`${key} = ?`);
        params.push(value ? 1 : 0);
      } else {
        sets.push(`${key} = ?`);
        params.push(value);
      }
    }
  }

  params.push(id);

  await c.env.DB.prepare(
    `UPDATE file_referensi SET ${sets.join(', ')} WHERE id = ?`
  ).bind(...params).run();

  return c.json({ id, ...body });
});

// DELETE /api/file-ref/:id — delete file referensi (soft delete)
fileRefRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id');

  // Soft delete - set aktif to 0
  await c.env.DB.prepare(
    'UPDATE file_referensi SET aktif = 0 WHERE id = ?'
  ).bind(id).run();

  return c.json({ message: 'File referensi berhasil dihapus' });
});

// GET /api/file-ref/stats — statistik file referensi
fileRefRoutes.get('/stats/summary', async (c) => {
  const stats = await c.env.DB.prepare(`
    SELECT 
      COUNT(*) as total_file,
      SUM(CASE WHEN aktif = 1 THEN 1 ELSE 0 END) as aktif,
      SUM(CASE WHEN aktif = 0 THEN 1 ELSE 0 END) as nonaktif,
      COUNT(DISTINCT jenis) as total_jenis
    FROM file_referensi
  `).first();

  return c.json(stats);
});
