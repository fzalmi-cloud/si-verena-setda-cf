import { Context, Next } from 'hono';
import jwt from 'jsonwebtoken';
import type { Bindings } from '../index';

// JWT_SECRET bawaan lama (pernah ada di wrangler.toml & repo publik).
// Tidak boleh dipakai di production — token bisa dipalsukan siapa saja.
const DEFAULT_SECRET = 'your-jwt-secret-change-this-in-production';

export const authMiddleware = async (c: Context<{ Bindings: Bindings }>, next: Next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Token tidak ditemukan' }, 401);
  }

  const token = authHeader.replace('Bearer ', '');

  if (!c.env.JWT_SECRET || c.env.JWT_SECRET === DEFAULT_SECRET) {
    return c.json({ error: 'JWT_SECRET belum dikonfigurasi. Jalankan: wrangler secret put JWT_SECRET' }, 503);
  }

  try {
    const payload = jwt.verify(token, c.env.JWT_SECRET);
    (c as any).set('jwtPayload', payload);
    await next();
  } catch (err) {
    return c.json({ error: 'Token tidak valid atau expired' }, 401);
  }
};

// Role-based access control
export const requireRole = (...roles: string[]) => {
  return async (c: Context<{ Bindings: Bindings }>, next: Next) => {
    const payload = (c as any).get('jwtPayload') as any;
    
    if (!payload || !roles.includes(payload.role)) {
      return c.json({ error: 'Akses ditolak' }, 403);
    }
    
    await next();
  };
};
