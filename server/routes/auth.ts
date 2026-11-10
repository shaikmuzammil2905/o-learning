import { Router } from 'express';
import crypto from 'node:crypto';
import db from '../db.js';
import {
  clearAuthCookie,
  hashPassword,
  requireAuth,
  setAuthCookie,
  signToken,
  verifyPassword,
} from '../auth.js';

const router = Router();

function generateReferralCode(name: string): string {
  const clean = name.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 5) || 'LEARN';
  const rand = crypto.randomInt(100, 999);
  return `OLR-${clean}${rand}`;
}

router.post('/register', (req, res) => {
  const { full_name, mobile, email, password, confirm_password, referral_code } = req.body || {};
  if (!full_name || typeof full_name !== 'string' || full_name.trim().length < 2) {
    res.status(400).json({ error: 'Please enter your full name (at least 2 characters).' });
    return;
  }
  const cleanMobile = String(mobile || '').replace(/\D/g, '');
  if (cleanMobile.length < 10 || cleanMobile.length > 13) {
    res.status(400).json({ error: 'Please enter a valid 10-digit mobile number.' });
    return;
  }
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    res.status(400).json({ error: 'Please enter a valid email address.' });
    return;
  }
  if (!password || String(password).length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    return;
  }
  if (confirm_password !== undefined && password !== confirm_password) {
    res.status(400).json({ error: 'Passwords do not match.' });
    return;
  }

  const existing = db
    .prepare('SELECT id FROM users WHERE email = ? OR mobile = ?')
    .get(cleanEmail, cleanMobile);
  if (existing) {
    res.status(409).json({ error: 'An account with this email or mobile number already exists.' });
    return;
  }

  let referrerId: number | null = null;
  if (referral_code && String(referral_code).trim()) {
    const refUser = db
      .prepare('SELECT id FROM users WHERE UPPER(referral_code) = ?')
      .get(String(referral_code).trim().toUpperCase()) as { id: number } | undefined;
    if (!refUser) {
      res.status(400).json({ error: 'Invalid referral code. Please check or leave blank.' });
      return;
    }
    referrerId = refUser.id;
  }

  let myCode = generateReferralCode(full_name);
  while (db.prepare('SELECT id FROM users WHERE referral_code = ?').get(myCode)) {
    myCode = generateReferralCode(full_name);
  }

  const pwHash = hashPassword(String(password));
  const result = db
    .prepare(`
      INSERT INTO users (full_name, email, mobile, password_hash, role, referral_code, referred_by, is_active)
      VALUES (?, ?, ?, ?, 'student', ?, ?, 1)
    `)
    .run(full_name.trim(), cleanEmail, cleanMobile, pwHash, myCode, referrerId);

  const newUserId = Number(result.lastInsertRowid);

  if (referrerId) {
    const cmsRef = db.prepare("SELECT value_json FROM cms_settings WHERE key = 'referral'").get() as
      | { value_json: string }
      | undefined;
    const rewardAmount = cmsRef ? JSON.parse(cmsRef.value_json).rewardAmount ?? 250 : 250;
    db.prepare(`
      INSERT INTO referrals (referrer_id, referred_user_id, referral_code, status, reward_amount)
      VALUES (?, ?, ?, 'successful', ?)
    `).run(referrerId, newUserId, String(referral_code).trim().toUpperCase(), rewardAmount);

    db.prepare(`
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (?, 'Referral Reward Credited!', ?, 'success')
    `).run(referrerId, `${full_name.trim()} joined using your referral code. You earned ₹${rewardAmount} reward!`);
  }

  db.prepare(`
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (?, 'Welcome to O-LEARNING PLATFORM!', 'Explore courses, live classes, and mock tests to start learning today.', 'info')
  `).run(newUserId);

  const user = db
    .prepare('SELECT id, full_name, email, mobile, role, avatar_url, referral_code, is_active FROM users WHERE id = ?')
    .get(newUserId);

  const token = signToken({ userId: newUserId, role: 'student' }, 60 * 60 * 24 * 14);
  setAuthCookie(res, token, true);
  res.status(201).json({ user, token });
});

router.post('/login', (req, res) => {
  const { identifier, password, rememberMe = true } = req.body || {};
  if (!identifier || !password) {
    res.status(400).json({ error: 'Please enter your email/mobile and password.' });
    return;
  }

  const raw = String(identifier).trim();
  const cleanEmail = raw.toLowerCase();
  const cleanMobile = raw.replace(/\D/g, '');

  const userRow = db
    .prepare('SELECT * FROM users WHERE email = ? OR mobile = ?')
    .get(cleanEmail, cleanMobile || raw) as
    | {
        id: number;
        full_name: string;
        email: string;
        mobile: string;
        password_hash: string;
        role: 'student' | 'faculty' | 'admin';
        avatar_url: string | null;
        referral_code: string;
        is_active: number;
      }
    | undefined;

  if (!userRow || !verifyPassword(String(password), userRow.password_hash)) {
    res.status(401).json({ error: 'Invalid credentials. Please check your email/mobile and password.' });
    return;
  }

  if (userRow.is_active !== 1) {
    res.status(403).json({ error: 'Your account is currently deactivated. Please contact support.' });
    return;
  }

  const token = signToken(
    { userId: userRow.id, role: userRow.role },
    rememberMe ? 60 * 60 * 24 * 14 : 60 * 60 * 12
  );
  setAuthCookie(res, token, Boolean(rememberMe));

  const { password_hash: _removed, ...safeUser } = userRow;
  res.json({ user: safeUser, token });
});

router.post('/logout', (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  const user = req.user!;
  let extra: Record<string, unknown> = {};
  if (user.role === 'faculty') {
    const fp = db.prepare('SELECT * FROM faculty_profiles WHERE user_id = ?').get(user.id);
    extra = { facultyProfile: fp || null };
  }
  res.json({ user, ...extra });
});

router.put('/profile', requireAuth, (req, res) => {
  const { full_name, mobile, avatar_url } = req.body || {};
  if (!full_name || String(full_name).trim().length < 2) {
    res.status(400).json({ error: 'Full name must be at least 2 characters.' });
    return;
  }
  const cleanMobile = String(mobile || '').replace(/\D/g, '');
  if (cleanMobile.length < 10 || cleanMobile.length > 13) {
    res.status(400).json({ error: 'Please provide a valid mobile number.' });
    return;
  }
  const conflict = db
    .prepare('SELECT id FROM users WHERE mobile = ? AND id != ?')
    .get(cleanMobile, req.user!.id);
  if (conflict) {
    res.status(409).json({ error: 'This mobile number is already used by another account.' });
    return;
  }

  db.prepare('UPDATE users SET full_name = ?, mobile = ?, avatar_url = ? WHERE id = ?').run(
    String(full_name).trim(),
    cleanMobile,
    avatar_url ?? req.user!.avatar_url,
    req.user!.id
  );
  const updated = db
    .prepare('SELECT id, full_name, email, mobile, role, avatar_url, referral_code, is_active FROM users WHERE id = ?')
    .get(req.user!.id);
  res.json({ user: updated });
});

router.post('/change-password', requireAuth, (req, res) => {
  const { current_password, new_password } = req.body || {};
  if (!current_password || !new_password || String(new_password).length < 6) {
    res.status(400).json({ error: 'New password must be at least 6 characters.' });
    return;
  }
  const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user!.id) as {
    password_hash: string;
  };
  if (!verifyPassword(String(current_password), row.password_hash)) {
    res.status(400).json({ error: 'Current password is incorrect.' });
    return;
  }
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(
    hashPassword(String(new_password)),
    req.user!.id
  );
  res.json({ ok: true, message: 'Password updated successfully.' });
});

router.post('/forgot-password', (req, res) => {
  const { email, mobile, new_password } = req.body || {};
  if (!email || !mobile || !new_password || String(new_password).length < 6) {
    res.status(400).json({ error: 'Provide registered email, mobile number, and a new password (min 6 chars).' });
    return;
  }
  const cleanEmail = String(email).trim().toLowerCase();
  const cleanMobile = String(mobile).replace(/\D/g, '');
  const user = db
    .prepare('SELECT id, role FROM users WHERE email = ? AND mobile = ?')
    .get(cleanEmail, cleanMobile) as { id: number; role: string } | undefined;

  if (!user || user.role === 'admin') {
    res.status(404).json({ error: 'No matching learner/faculty account found with that email and mobile.' });
    return;
  }
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(
    hashPassword(String(new_password)),
    user.id
  );
  res.json({ ok: true, message: 'Password reset successful. You can now log in with your new password.' });
});

export default router;
