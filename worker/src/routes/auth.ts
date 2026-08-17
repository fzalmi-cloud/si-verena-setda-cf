import { Hono } from 'hono';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import type { Bindings } from '../index';
import { authMiddleware, requireRole } from '../middleware/auth';

export const authRoutes = new Hono<{ Bindings: Bindings }>();

// Helper: pastikan JWT_SECRET sudah dikonfigurasi dengan aman.
// JWT_SECRET default lama (ada di wrangler.toml) TIDAK BOLEH dipakai di production.
const DEFAULT_SECRET = 'your-jwt-secret-change-this-in-production';
function getSecret(c: any): string | null {
  const secret = c.env?.JWT_SECRET as string | undefined;
  if (!secret || secret === DEFAULT_SECRET) return null;
  return secret;
}

// POST /api/auth/login
authRoutes.post('/login', async (c) => {
  const { email, password } = await c.req.json();

  const secret = getSecret(c);
  if (!secret) {
    return c.json({ error: 'JWT_SECRET belum dikonfigurasi. Jalankan: wrangler secret put JWT_SECRET' }, 503);
  }

  const user = await c.env.DB.prepare(
    'SELECT * FROM users WHERE email = ? AND is_active = 1'
  ).bind(email).first();

  if (!user) {
    return c.json({ error: 'Email atau password salah' }, 401);
  }

  // Verifikasi password:
  // - hash bcrypt ($2a/$2b/...) -> bandingkan dengan bcrypt
  // - legacy plaintext (data seed lama) -> bandingkan langsung, lalu upgrade ke bcrypt
  let validPassword = false;
  const storedHash = String(user.password_hash || '');
  if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$') || storedHash.startsWith('$2y$')) {
    validPassword = await bcrypt.compare(password, storedHash);
  } else {
    validPassword = password === storedHash;
    if (validPassword) {
      // Upgrade hash plaintext -> bcrypt agar password tidak tersimpan mentah
      try {
        const newHash = await bcrypt.hash(password, 10);
        await c.env.DB.prepare(
          'UPDATE users SET password_hash = ?, updated_at = datetime(\'now\') WHERE id = ?'
        ).bind(newHash, user.id).run();
      } catch (_) { /* upgrade gagal tidak memblokir login */ }
    }
  }

  if (!validPassword) {
    return c.json({ error: 'Email atau password salah' }, 401);
  }

  const token = jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      biro_id: user.biro_id,
      nama_biro: user.nama_biro,
    },
    secret,
    { expiresIn: '7d' }
  );

  return c.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      biro_id: user.biro_id,
      nama_biro: user.nama_biro,
    },
  });
});

// POST /api/auth/register — self-registration.
// Role TIDAK diterima dari client (anti privilege escalation): selalu 'biro_pengusul'.
// Pembuatan user dengan role lain dilakukan admin lewat POST /api/user (requireRole admin).
authRoutes.post('/register', async (c) => {
  const { email, password, full_name } = await c.req.json();

  if (!email || !password) {
    return c.json({ error: 'Email dan password wajib diisi' }, 400);
  }
  if (typeof password !== 'string' || password.length < 6) {
    return c.json({ error: 'Password minimal 6 karakter' }, 400);
  }

  const existing = await c.env.DB.prepare(
    'SELECT id FROM users WHERE email = ?'
  ).bind(email).first();

  if (existing) {
    return c.json({ error: 'Email sudah terdaftar' }, 400);
  }

  const id = `user-${Date.now()}`;
  const passwordHash = await bcrypt.hash(password, 10);

  await c.env.DB.prepare(
    'INSERT INTO users (id, email, full_name, password_hash, role, biro_id, nama_biro) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, email, full_name || email.split('@')[0], passwordHash, 'biro_pengusul', null, null).run();

  return c.json({ message: 'User berhasil didaftarkan', id });
});

// GET /api/auth/me
authRoutes.get('/me', authMiddleware, async (c) => {
  const payload = (c as any).get('jwtPayload') as any;

  if (!payload) {
    return c.json({ error: 'Token tidak valid' }, 401);
  }

  const user = await c.env.DB.prepare(
    'SELECT id, email, full_name, role, biro_id, nama_biro, avatar_url FROM users WHERE id = ?'
  ).bind(payload.sub).first();

  if (!user) {
    return c.json({ error: 'User tidak ditemukan' }, 404);
  }

  return c.json(user);
});

// POST /api/auth/change-password — ganti password sendiri (wajib login)
authRoutes.post('/change-password', authMiddleware, async (c) => {
  const payload = (c as any).get('jwtPayload') as any;
  const { old_password, new_password } = await c.req.json();

  if (!old_password || !new_password || String(new_password).length < 6) {
    return c.json({ error: 'Password baru minimal 6 karakter' }, 400);
  }

  const user: any = await c.env.DB.prepare(
    'SELECT id, password_hash FROM users WHERE id = ?'
  ).bind(payload?.sub).first();
  if (!user) return c.json({ error: 'User tidak ditemukan' }, 404);

  const hash = String(user.password_hash || '');
  let valid = false;
  if (hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$')) {
    valid = await bcrypt.compare(old_password, hash);
  } else {
    valid = old_password === hash; // legacy plaintext
  }
  if (!valid) return c.json({ error: 'Password lama salah' }, 401);

  const newHash = await bcrypt.hash(String(new_password), 10);
  await c.env.DB.prepare(
    "UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?"
  ).bind(newHash, user.id).run();
  return c.json({ message: 'Password berhasil diubah' });
});

// POST /api/auth/verify-token
authRoutes.post('/verify-token', async (c) => {
  const secret = getSecret(c);
  if (!secret) {
    return c.json({ valid: false, error: 'JWT_SECRET belum dikonfigurasi' });
  }
  const { token } = await c.req.json();

  try {
    const payload = jwt.verify(token, secret);
    return c.json({ valid: true, payload });
  } catch (err) {
    return c.json({ valid: false, error: 'Token tidak valid' });
  }
});

// ── User Management (mount di /api/user, WAJIB auth + role admin) ────────────

export const userRoutes = new Hono<{ Bindings: Bindings }>();

// Semua endpoint user hanya untuk admin
userRoutes.use('*', authMiddleware, requireRole('admin'));

// GET /api/user — list semua user
userRoutes.get('/', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT id, email, full_name, role, biro_id, nama_biro, is_active, created_at FROM users ORDER BY created_at DESC'
    ).all();
    return c.json({ data: results });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// GET /api/user/:id — get single user
userRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  try {
    const user = await c.env.DB.prepare(
      'SELECT id, email, full_name, role, biro_id, nama_biro, is_active FROM users WHERE id = ?'
    ).bind(id).first();
    if (!user) return c.json({ error: 'User tidak ditemukan' }, 404);
    return c.json(user);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// POST /api/user — buat user dengan role tertentu (admin)
userRoutes.post('/', async (c) => {
  const { email, password, full_name, role, biro_id, nama_biro } = await c.req.json();

  if (!email || !password) {
    return c.json({ error: 'Email dan password wajib diisi' }, 400);
  }

  const existing = await c.env.DB.prepare(
    'SELECT id FROM users WHERE email = ?'
  ).bind(email).first();
  if (existing) {
    return c.json({ error: 'Email sudah terdaftar' }, 400);
  }

  const id = `user-${Date.now()}`;
  const passwordHash = await bcrypt.hash(password, 10);

  await c.env.DB.prepare(
    'INSERT INTO users (id, email, full_name, password_hash, role, biro_id, nama_biro) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    id,
    email,
    full_name || email.split('@')[0],
    passwordHash,
    role || 'biro_pengusul',
    biro_id || null,
    nama_biro || null
  ).run();

  return c.json({ message: 'User berhasil dibuat', id });
});

// PUT /api/user/:id — update user (admin; dukung reset password)
userRoutes.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  try {
    const sets: string[] = [];
    const params: any[] = [];
    const allowed = ['email', 'full_name', 'role', 'biro_id', 'nama_biro', 'is_active'];
    for (const key of allowed) {
      if (key in body && body[key] !== undefined) {
        sets.push(`${key} = ?`);
        params.push(body[key]);
      }
    }
    // Reset password (dihash bcrypt, tidak disimpan plaintext)
    if (body.password !== undefined && body.password !== null && body.password !== '') {
      const hash = await bcrypt.hash(String(body.password), 10);
      sets.push('password_hash = ?');
      params.push(hash);
    }
    if (sets.length === 0) return c.json({ error: 'Tidak ada field yang diupdate' }, 400);
    params.push(id);
    await c.env.DB.prepare(
      `UPDATE users SET ${sets.join(', ')}, updated_at = datetime('now') WHERE id = ?`
    ).bind(...params).run();
    const { password, ...safe } = body;
    return c.json({ id, ...safe });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// DELETE /api/user/:id — hapus user (soft delete)
userRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id');
  try {
    await c.env.DB.prepare(
      `UPDATE users SET is_active = 0 WHERE id = ?`
    ).bind(id).run();
    return c.json({ message: 'User berhasil dinonaktifkan' });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});
