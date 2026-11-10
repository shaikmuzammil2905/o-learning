import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import db from './db.js';

const JWT_SECRET =
  process.env.JWT_SECRET ||
  crypto.createHash('sha256').update('o-learning-platform-hyderabad-2026-secret').digest('hex');

export interface AuthUser {
  id: number;
  full_name: string;
  email: string;
  mobile: string;
  role: 'student' | 'faculty' | 'admin';
  avatar_url: string | null;
  referral_code: string;
  is_active: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, key] = storedHash.split(':');
  if (!salt || !key) return false;
  const keyBuf = Buffer.from(key, 'hex');
  const derivedBuf = crypto.scryptSync(password, salt, 64);
  if (keyBuf.length !== derivedBuf.length) return false;
  return crypto.timingSafeEqual(keyBuf, derivedBuf);
}

function base64UrlEncode(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((input.length + 3) % 4);
  return Buffer.from(padded, 'base64').toString('utf8');
}

export function signToken(payload: { userId: number; role: string }, expiresInSeconds = 60 * 60 * 24 * 7): string {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const body = base64UrlEncode(JSON.stringify({ ...payload, exp }));
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`)
    .digest();
  return `${header}.${body}.${base64UrlEncode(signature)}`;
}

export function verifyToken(token: string): { userId: number; role: string; exp: number } | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const expectedSig = base64UrlEncode(
    crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest()
  );
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(base64UrlDecode(body));
    if (!parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function extractToken(req: Request): string | null {
  const cookieToken = req.cookies?.olearn_token;
  if (cookieToken && typeof cookieToken === 'string') return cookieToken;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return null;
}

export function attachOptionalUser(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) return next();
  const decoded = verifyToken(token);
  if (!decoded) return next();
  const user = db
    .prepare(
      'SELECT id, full_name, email, mobile, role, avatar_url, referral_code, is_active FROM users WHERE id = ?'
    )
    .get(decoded.userId) as AuthUser | undefined;
  if (user && user.is_active === 1) {
    req.user = user;
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  attachOptionalUser(req, res, () => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required. Please log in to continue.' });
      return;
    }
    next();
  });
}

export function requireRole(...roles: Array<'student' | 'faculty' | 'admin'>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'You do not have permission to access this resource.' });
      return;
    }
    next();
  };
}

export function setAuthCookie(res: Response, token: string, rememberMe = true): void {
  res.cookie('olearn_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: rememberMe ? 1000 * 60 * 60 * 24 * 14 : 1000 * 60 * 60 * 12,
    path: '/',
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie('olearn_token', { path: '/' });
}

