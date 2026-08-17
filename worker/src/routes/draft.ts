import { Hono } from 'hono';
import { getLLMProvider } from '../llm/provider';
import { PROMPTS, fillPrompt } from '../llm/prompts';
import type { Bindings } from '../index';

export const draftRoutes = new Hono<{ Bindings: Bindings }>();

// GET /api/draft — list draft
draftRoutes.get('/', async (c) => {
  const tahun = c.req.query('tahun');
  const status = c.req.query('status');
  const limit = parseInt(c.req.query('limit') || '50');
  const offset = parseInt(c.req.query('offset') || '0');

  let query = 'SELECT * FROM draft_renja_setda WHERE 1=1';
  const params: any[] = [];

  if (tahun) {
    query += ' AND tahun = ?';
    params.push(parseInt(tahun));
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

// GET /api/draft/:id — get single draft
draftRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  
  const draft = await c.env.DB.prepare(
    'SELECT * FROM draft_renja_setda WHERE id = ?'
  ).bind(id).first();

  if (!draft) {
    return c.json({ error: 'Draft tidak ditemukan' }, 404);
  }

  // Get BAB list
  const { results: babList } = await c.env.DB.prepare(
    'SELECT * FROM draft_renja_bab WHERE draft_id = ? ORDER BY urutan ASC'
  ).bind(id).all();

  // Get rekap biro
  const { results: rekapBiro } = await c.env.DB.prepare(
    'SELECT * FROM draft_renja_rekap_biro WHERE draft_id = ?'
  ).bind(id).all();

  // Get validasi
  const { results: validasi } = await c.env.DB.prepare(
    'SELECT * FROM draft_renja_validasi WHERE draft_id = ?'
  ).bind(id).all();

  return c.json({
    ...draft,
    bab: babList,
    rekap_biro: rekapBiro,
    validasi: validasi
  });
});

// POST /api/draft — create draft manual
draftRoutes.post('/', async (c) => {
  const body = await c.req.json();
  const id = crypto.randomUUID();

  await c.env.DB.prepare(
    `INSERT INTO draft_renja_setda (id, tahun, versi, judul, status, generated_by, catatan_umum, jumlah_biro, biro_digunakan, ringkasan_eksekutif)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id,
    body.tahun,
    body.versi || 1,
    body.judul,
    body.status || 'draft_otomatis',
    body.generated_by,
    body.catatan_umum,
    body.jumlah_biro,
    body.biro_digunakan,
    body.ringkasan_eksekutif
  ).run();

  return c.json({ id, ...body }, 201);
});

// POST /api/draft/generate — generate draft dengan LLM
draftRoutes.post('/generate', async (c) => {
  const { tahun, generated_by } = await c.req.json();

  // Get all biro data
  const { results: biroList } = await c.env.DB.prepare(
    'SELECT * FROM biro WHERE status = ?'
  ).bind('aktif').all();

  // Get dokumen per biro
  const biroData = [];
  for (const biro of biroList) {
    const { results: dokumen } = await c.env.DB.prepare(
      'SELECT * FROM dokumen_renja WHERE biro_id = ? AND periode_tahun = ?'
    ).bind(biro.id, tahun).all();
    
    biroData.push({
      ...biro,
      dokumen: dokumen
    });
  }

  // Generate draft menggunakan LLM
  const provider = getLLMProvider({ AI: c.env.AI });
  
  const prompt = fillPrompt(PROMPTS.generate_draft, {
    jumlah_biro: biroList.length,
    data_biro: biroData,
    tahun: tahun
  });

  try {
    const result = await provider.generate(prompt, {
      responseJsonSchema: {
        type: 'object',
        properties: {
          judul: { type: 'string' },
          ringkasan_eksekutif: { type: 'string' },
          bab: { type: 'array' },
          rekap_biro: { type: 'array' }
        }
      }
    });

    const draftData = JSON.parse(result);
    const draftId = crypto.randomUUID();

    // Save draft
    await c.env.DB.prepare(
      `INSERT INTO draft_renja_setda (id, tahun, versi, judul, status, generated_by, generated_at, jumlah_biro, biro_digunakan, ringkasan_eksekutif)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?, ?, ?)`
    ).bind(
      draftId,
      tahun,
      1,
      draftData.judul || `Draft Renja SETDA ${tahun}`,
      'draft_otomatis',
      generated_by,
      biroList.length,
      biroList.map((b: any) => b.nama_biro).join(', '),
      draftData.ringkasan_eksekutif
    ).run();

    // Save BAB
    if (draftData.bab && Array.isArray(draftData.bab)) {
      for (let i = 0; i < draftData.bab.length; i++) {
        const bab = draftData.bab[i];
        await c.env.DB.prepare(
          `INSERT INTO draft_renja_bab (id, draft_id, nomor_bab, judul_bab, isi_bab, urutan)
           VALUES (?, ?, ?, ?, ?, ?)`
        ).bind(
          crypto.randomUUID(),
          draftId,
          bab.nomor,
          bab.judul,
          bab.isi,
          i + 1
        ).run();
      }
    }

    // Save rekap biro
    if (draftData.rekap_biro && Array.isArray(draftData.rekap_biro)) {
      for (const rekap of draftData.rekap_biro) {
        await c.env.DB.prepare(
          `INSERT INTO draft_renja_rekap_biro (id, draft_id, nama_biro, jumlah_program, jumlah_kegiatan, total_pagu)
           VALUES (?, ?, ?, ?, ?, ?)`
        ).bind(
          crypto.randomUUID(),
          draftId,
          rekap.nama_biro,
          rekap.jumlah_program || 0,
          rekap.jumlah_kegiatan || 0,
          rekap.total_pagu || 0
        ).run();
      }
    }

    return c.json({ 
      id: draftId,
      message: 'Draft berhasil di-generate',
      ...draftData 
    }, 201);

  } catch (error: any) {
    return c.json({ 
      error: 'Gagal generate draft',
      detail: error.message 
    }, 500);
  }
});

// GET /api/draft/:id/bab — list BAB
draftRoutes.get('/:id/bab', async (c) => {
  const draftId = c.req.param('id');

  const { results } = await c.env.DB.prepare(
    'SELECT * FROM draft_renja_bab WHERE draft_id = ? ORDER BY urutan ASC'
  ).bind(draftId).all();

  return c.json({ data: results });
});

// PUT /api/draft/bab/:id — update BAB
draftRoutes.put('/bab/:id', async (c) => {
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
  sets.push("status_bab = 'diedit_manual'");
  params.push(id);

  await c.env.DB.prepare(
    `UPDATE draft_renja_bab SET ${sets.join(', ')} WHERE id = ?`
  ).bind(...params).run();

  return c.json({ id, ...body });
});

// POST /api/draft/bab/:id/regen — regenerate BAB dengan LLM
draftRoutes.post('/bab/:id/regen', async (c) => {
  const babId = c.req.param('id');
  const { catatan, generated_by } = await c.req.json();

  // Get BAB data
  const bab = await c.env.DB.prepare(
    'SELECT * FROM draft_renja_bab WHERE id = ?'
  ).bind(babId).first();

  if (!bab) {
    return c.json({ error: 'BAB tidak ditemukan' }, 404);
  }

  // Get draft data
  const draft = await c.env.DB.prepare(
    'SELECT * FROM draft_renja_setda WHERE id = ?'
  ).bind(bab.draft_id).first();

  // Get biro data
  const { results: biroData } = await c.env.DB.prepare(
    'SELECT * FROM biro WHERE status = ?'
  ).bind('aktif').all();

  // Regenerate dengan LLM
  const provider = getLLMProvider({ AI: c.env.AI });
  
  const prompt = fillPrompt(PROMPTS.regenerate_bab, {
    nomor_bab: bab.nomor_bab,
    judul_bab: bab.judul_bab,
    isi_bab: bab.isi_bab,
    catatan: catatan || 'Perbaiki dan tingkatkan kualitas konten',
    data_pendukung: biroData
  });

  try {
    const result = await provider.generate(prompt, {
      responseJsonSchema: {
        type: 'object',
        properties: {
          isi_bab: { type: 'string' },
          perubahan: { type: 'array' }
        }
      }
    });

    const regenData = JSON.parse(result);

    // Update BAB
    await c.env.DB.prepare(`
      UPDATE draft_renja_bab 
      SET isi_bab = ?, 
          status_bab = 'draft_otomatis',
          catatan_verifikator = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).bind(regenData.isi_bab, catatan, babId).run();

    return c.json({
      message: 'BAB berhasil di-regenerate',
      perubahan: regenData.perubahan,
      isi_bab: regenData.isi_bab
    });

  } catch (error: any) {
    return c.json({ 
      error: 'Gagal regenerate BAB',
      detail: error.message 
    }, 500);
  }
});

// PUT /api/draft/:id — update draft
draftRoutes.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();

  const sets: string[] = [];
  const params: any[] = [];

  for (const [key, value] of Object.entries(body)) {
    if (key !== 'id' && key !== 'bab' && key !== 'rekap_biro') {
      sets.push(`${key} = ?`);
      params.push(value);
    }
  }

  sets.push("updated_at = datetime('now')");
  params.push(id);

  await c.env.DB.prepare(
    `UPDATE draft_renja_setda SET ${sets.join(', ')} WHERE id = ?`
  ).bind(...params).run();

  return c.json({ id, ...body });
});
