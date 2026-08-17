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

// POST /api/dokumen/bulk — buat banyak dokumen sekaligus (batch upload)
dokumenRoutes.post('/bulk', async (c) => {
  try {
    const { items } = await c.req.json();
    if (!Array.isArray(items) || items.length === 0) {
      return c.json({ error: 'items wajib berupa array non-kosong' }, 400);
    }

    let created = 0;
    const ids: string[] = [];
    const failed: { nama?: string; error: string }[] = [];

    for (const body of items) {
      const id = crypto.randomUUID();
      try {
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
        created++;
        ids.push(id);
      } catch (e: any) {
        failed.push({ nama: body.nama_file || body.nama_biro, error: e.message });
      }
    }

    return c.json({
      message: `${created} dokumen dibuat${failed.length ? `, ${failed.length} gagal` : ''}`,
      created,
      ids,
      failed: failed.length > 0 ? failed : undefined,
    }, created > 0 ? 201 : 500);
  } catch (error: any) {
    return c.json({ error: 'Gagal bulk create', detail: error.message }, 500);
  }
});

// POST /api/dokumen/bulk-delete — hapus banyak dokumen sekaligus (+ file R2 + hasil pemeriksaan)
dokumenRoutes.post('/bulk-delete', async (c) => {
  try {
    const { ids } = await c.req.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return c.json({ error: 'ids wajib berupa array non-kosong' }, 400);
    }

    let deleted = 0;
    const notFound: string[] = [];

    for (const id of ids) {
      const dok: any = await c.env.DB.prepare(
        'SELECT id, file_key FROM dokumen_renja WHERE id = ?'
      ).bind(id).first();
      if (!dok) { notFound.push(id); continue; }

      // Hapus dependensi DULU (FK constraint): hasil pemeriksaan + referensi parent
      await c.env.DB.prepare('DELETE FROM hasil_pemeriksaan WHERE dokumen_renja_id = ?').bind(id).run();
      await c.env.DB.prepare('UPDATE dokumen_renja SET parent_document_id = NULL WHERE parent_document_id = ?').bind(id).run();
      // Lalu hapus dokumen
      await c.env.DB.prepare('DELETE FROM dokumen_renja WHERE id = ?').bind(id).run();
      // Hapus file fisik dari R2 bila ada
      if (dok.file_key && c.env.R2) {
        try { await c.env.R2.delete(dok.file_key); } catch { /* file sudah tidak ada */ }
      }
      deleted++;
    }

    return c.json({
      message: `${deleted} dokumen dihapus${notFound.length ? `, ${notFound.length} tidak ditemukan` : ''}`,
      deleted,
      notFound: notFound.length > 0 ? notFound : undefined,
    });
  } catch (error: any) {
    return c.json({ error: 'Gagal bulk delete', detail: error.message }, 500);
  }
});

// PUT /api/dokumen/bulk — update banyak dokumen sekaligus dengan field yang sama
dokumenRoutes.put('/bulk', async (c) => {
  try {
    const { ids, data } = await c.req.json();
    if (!Array.isArray(ids) || ids.length === 0 || !data || typeof data !== 'object') {
      return c.json({ error: 'ids dan data wajib diisi' }, 400);
    }

    const sets: string[] = ["updated_at = datetime('now')"];
    const params: any[] = [];
    for (const [key, value] of Object.entries(data)) {
      if (key === 'id' || value === undefined) continue;
      sets.push(`${key} = ?`);
      params.push(value);
    }
    if (sets.length === 1) {
      return c.json({ error: 'Tidak ada field yang diupdate' }, 400);
    }

    let updated = 0;
    for (const id of ids) {
      await c.env.DB.prepare(
        `UPDATE dokumen_renja SET ${sets.join(', ')} WHERE id = ?`
      ).bind(...params, id).run();
      updated++;
    }

    return c.json({ message: `${updated} dokumen diperbarui`, updated });
  } catch (error: any) {
    return c.json({ error: 'Gagal bulk update', detail: error.message }, 500);
  }
});

// PUT /api/dokumen/:id — update dokumen
dokumenRoutes.put('/:id', async (c) => {
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

  if (sets.length === 0) {
    return c.json({ error: 'Tidak ada field yang diupdate' }, 400);
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

  // Hapus dependensi DULU (FK constraint), lalu dokumen
  await c.env.DB.prepare('DELETE FROM hasil_pemeriksaan WHERE dokumen_renja_id = ?').bind(id).run();
  await c.env.DB.prepare('UPDATE dokumen_renja SET parent_document_id = NULL WHERE parent_document_id = ?').bind(id).run();
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
