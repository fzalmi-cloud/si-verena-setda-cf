import { Hono } from 'hono';
import { uploadToR2, getFromR2, deleteFromR2 } from '../storage/r2';
import type { Bindings } from '../index';

export const uploadRoutes = new Hono<{ Bindings: Bindings }>();

// POST /api/upload — upload file ke R2
uploadRoutes.post('/', async (c) => {
  const formData = await c.req.formData();
  const file = formData.get('file') as unknown as File;
  const folder = (formData.get('folder') as string) || 'dokumen';

  if (!file) {
    return c.json({ error: 'File tidak ditemukan' }, 400);
  }

  // Validate file size (max 50MB)
  const maxSize = 50 * 1024 * 1024;
  if (file.size > maxSize) {
    return c.json({ error: 'Ukuran file melebihi 50MB' }, 400);
  }

  // Validate file type
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/gif'
  ];

  if (!allowedTypes.includes(file.type)) {
    return c.json({ error: 'Tipe file tidak diizinkan' }, 400);
  }

  try {
    const result = await uploadToR2(c.env.R2, file, folder);
    return c.json(result, 201);
  } catch (error: any) {
    return c.json({ 
      error: 'Gagal upload file',
      detail: error.message 
    }, 500);
  }
});

// DELETE /api/upload/files/:key — delete file dari R2
uploadRoutes.delete('/files/*', async (c) => {
  // Route ini ter-mount di /api/upload, jadi path lengkap: /api/upload/files/{key}
  const key = c.req.path.replace('/api/upload/files/', '');

  try {
    await deleteFromR2(c.env.R2, key);
    return c.json({ message: 'File berhasil dihapus' });
  } catch (error: any) {
    return c.json({ 
      error: 'Gagal menghapus file',
      detail: error.message 
    }, 500);
  }
});

// POST /api/upload/multiple — upload multiple files
uploadRoutes.post('/multiple', async (c) => {
  const formData = await c.req.formData();
  const files = formData.getAll('files') as unknown as File[];
  const folder = (formData.get('folder') as string) || 'dokumen';

  if (!files || files.length === 0) {
    return c.json({ error: 'File tidak ditemukan' }, 400);
  }

  const results = [];
  const errors = [];

  for (const file of files) {
    try {
      const result = await uploadToR2(c.env.R2, file, folder);
      results.push(result);
    } catch (error: any) {
      errors.push({
        filename: file.name,
        error: error.message
      });
    }
  }

  return c.json({
    message: `${results.length} file berhasil di-upload`,
    uploaded: results,
    errors: errors.length > 0 ? errors : undefined
  }, results.length > 0 ? 201 : 500);
});
