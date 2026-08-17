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
    if (key !== 'id') {
      sets.push(`${key} = ?`);
      params.push(value);
    }
  }

  params.push(id);

  await c.env.DB.prepare(
    `UPDATE biro SET ${sets.join(', ')} WHERE id = ?`
  ).bind(...params).run();

  return c.json({ id, ...body });
});
