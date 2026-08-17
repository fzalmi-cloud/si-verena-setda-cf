import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authMiddleware } from './middleware/auth';
import { authRoutes, userRoutes } from './routes/auth';
import { dokumenRoutes } from './routes/dokumen';
import { pemeriksaanRoutes } from './routes/pemeriksaan';
import { draftRoutes } from './routes/draft';
import { uploadRoutes } from './routes/upload';
import { biroRoutes } from './routes/biro';
import { skorRoutes } from './routes/skor';
import { revisiRoutes } from './routes/revisi';
import { fileRefRoutes } from './routes/fileRef';
import { llmRoutes } from './routes/llm';
import { getFromR2 } from './storage/r2';

export type Bindings = {
  DB: D1Database;
  R2: R2Bucket;
  AI: Ai;
  JWT_SECRET: string;
  FRONTEND_URL: string;
  DEEPSEEK_API_KEY?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// CORS — izinkan origin frontend baru + preview Pages + localhost dev
app.use('/api/*', cors({
  origin: (origin) => {
    if (!origin) return 'https://si-verena-setda-web.pages.dev';
    const allowed = [
      'http://localhost:5173',
      'https://si-verena-setda-web.pages.dev',
    ];
    if (allowed.includes(origin)) return origin;
    // Preview deployment Pages: <hash>.si-verena-setda-web.pages.dev
    if (origin.endsWith('.si-verena-setda-web.pages.dev')) return origin;
    return null; // origin lain ditolak (CORS header tidak dikirim)
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Public routes
app.route('/api/auth', authRoutes);

// Public route untuk serve file dari R2 (agar bisa diakses img/iframe tanpa token)
app.get('/api/files/*', async (c) => {
  const key = c.req.path.replace('/api/files/', '');
  try {
    const object = await getFromR2(c.env.R2, key);
    if (!object) {
      return new Response('File belum diunggah secara fisik ke server (hanya data dummy/seed).', {
        status: 404,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
    const headers = new Headers();
    headers.set('Content-Type', object.httpMetadata?.contentType || 'application/octet-stream');
    headers.set('Content-Disposition', object.httpMetadata?.contentDisposition || 'inline');
    headers.set('Cache-Control', 'public, max-age=31536000');
    return new Response(object.body, { headers });
  } catch (error: any) {
    return c.json({ error: 'Gagal mengambil file', detail: error.message }, 500);
  }
});

// Protected routes — WAJIB auth (semua route di bawah sini)
app.use('/api/*', authMiddleware);
app.route('/api/dokumen', dokumenRoutes);
app.route('/api/dokumenrenja', dokumenRoutes);     // alias frontend
app.route('/api/pemeriksaan', pemeriksaanRoutes);
app.route('/api/draft', draftRoutes);
app.route('/api/draftrenjasetda', draftRoutes);   // alias frontend
app.route('/api/draftrenjabab', draftRoutes);     // alias frontend
app.route('/api/upload', uploadRoutes);
app.route('/api/biro', biroRoutes);
app.route('/api/skor', skorRoutes);
app.route('/api/skordokumen', skorRoutes);         // alias frontend
app.route('/api/revisi', revisiRoutes);
app.route('/api/riwayatrevisi', revisiRoutes);    // alias frontend
app.route('/api/file-ref', fileRefRoutes);
app.route('/api/llm', llmRoutes);

// User management — HANYA admin (requireRole di dalam userRoutes)
app.route('/api/user', userRoutes);

// Health check
app.get('/api/health', (c) => c.json({ 
  status: 'ok', 
  timestamp: new Date().toISOString(),
  version: '1.0.0'
}));

// Root
app.get('/', (c) => c.json({ 
  name: 'SI-VERENA API',
  description: 'Sistem Verifikasi Renja Sekretariat Daerah',
  docs: '/api/health'
}));

export default {
  fetch: app.fetch,
};
