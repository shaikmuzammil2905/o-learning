import { Router } from 'express';
import crypto from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import { dbGet, dbRun } from '../db.js';
import { sendOtpEmail } from '../mailer.js';
import {
  asyncHandler,
  clearAuthCookie,
  hashPassword,
  requireAuth,
  setAuthCookie,
  signToken,
  verifyPassword,
  verifyToken,
} from '../auth.js';

const router = Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function generateReferralCode(name: string): string {
  const clean = name.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 5) || 'LEARN';
  const rand = crypto.randomInt(100, 999);
  return `OLR-${clean}${rand}`;
}

function hashOtp(email: string, purpose: string, otp: string): string {
  return crypto.createHash('sha256').update(`${email}:${purpose}:${otp}`).digest('hex');
}

async function createStudentAccount(params: {
  fullName: string;
  email: string;
  mobile: string;
  passwordHash: string;
  referralCode?: string | null;
  authProvider: 'local' | 'google';
  googleId?: string | null;
  avatarUrl?: string | null;
}) {
  let referrerId: number | null = null;
  const cleanRef = params.referralCode ? String(params.referralCode).trim().toUpperCase() : '';
  if (cleanRef) {
    const refUser = await dbGet<{ id: number }>(
      'SELECT id FROM users WHERE UPPER(referral_code) = ?',
      [cleanRef]
    );
    if (!refUser) {
      throw Object.assign(new Error('Invalid referral code. Please check or leave blank.'), { status: 400 });
    }
    referrerId = refUser.id;
  }

  let myCode = generateReferralCode(params.fullName);
  while (await dbGet('SELECT id FROM users WHERE referral_code = ?', [myCode])) {
    myCode = generateReferralCode(params.fullName);
  }

  const result = await dbRun(
    `INSERT INTO users (full_name, email, mobile, password_hash, role, avatar_url, referral_code, referred_by, is_active, auth_provider, google_id, email_verified, profile_completed)
     VALUES (?, ?, ?, ?, 'student', ?, ?, ?, 1, ?, ?, 1, 1) RETURNING id`,
    [
      params.fullName,
      params.email,
      params.mobile,
      params.passwordHash,
      params.avatarUrl ?? null,
      myCode,
      referrerId,
      params.authProvider,
      params.googleId ?? null,
    ]
  );

  const newUserId = result.lastInsertRowid;

  if (referrerId) {
    const cmsRef = await dbGet<{ value_json: string }>(
      "SELECT value_json FROM cms_settings WHERE key = 'referral'"
    );
    const rewardAmount = cmsRef ? JSON.parse(cmsRef.value_json).rewardAmount ?? 250 : 250;
    await dbRun(
      `INSERT INTO referrals (referrer_id, referred_user_id, referral_code, status, reward_amount)
       VALUES (?, ?, ?, 'successful', ?)`,
      [referrerId, newUserId, cleanRef, rewardAmount]
    );
    await dbRun(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES (?, 'Referral Reward Credited!', ?, 'success')`,
      [referrerId, `${params.fullName} joined using your referral code. You earned ₹${rewardAmount} reward!`]
    );
  }

  await dbRun(
    `INSERT INTO notifications (user_id, title, message, type)
     VALUES (?, 'Welcome to O-LEARNING PLATFORM!', 'Explore courses, live classes, and mock tests to start learning today.', 'info')`,
    [newUserId]
  );

  const user = await dbGet(
    'SELECT id, full_name, email, mobile, role, avatar_url, referral_code, is_active FROM users WHERE id = ?',
    [newUserId]
  );

  const token = signToken({ userId: newUserId, role: 'student' }, 60 * 60 * 24 * 14);
  return { user, token };
}

// Step 1 of Signup: Validate fields & send 6-digit OTP to email
router.post(
  '/register/send-otp',
  asyncHandler(async (req, res) => {
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

    const emailConflict = await dbGet('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (emailConflict) {
      res.status(409).json({ error: 'This email address is already registered. Please use a different email or log in.', field: 'email' });
      return;
    }
    const mobileConflict = await dbGet('SELECT id FROM users WHERE mobile = ?', [cleanMobile]);
    if (mobileConflict) {
      res.status(409).json({ error: 'This mobile number is already registered. Please use a different number or log in.', field: 'mobile' });
      return;
    }

    const cleanRef = referral_code ? String(referral_code).trim().toUpperCase() : '';
    if (cleanRef) {
      const refUser = await dbGet('SELECT id FROM users WHERE UPPER(referral_code) = ?', [cleanRef]);
      if (!refUser) {
        res.status(400).json({ error: 'Invalid referral code. Please check or leave blank.' });
        return;
      }
    }

    const otp = String(crypto.randomInt(100000, 999999));
    const otpHash = hashOtp(cleanEmail, 'signup', otp);
    const pendingPayload = JSON.stringify({
      full_name: full_name.trim(),
      mobile: cleanMobile,
      email: cleanEmail,
      password_hash: hashPassword(String(password)),
      referral_code: cleanRef || null,
    });

    await dbRun(
      `INSERT INTO email_otps (email, otp_hash, purpose, payload_json, expires_at, attempts)
       VALUES (?, ?, 'signup', ?, NOW() + INTERVAL '10 minutes', 0)
       ON CONFLICT (email, purpose) DO UPDATE SET
         otp_hash = EXCLUDED.otp_hash,
         payload_json = EXCLUDED.payload_json,
         expires_at = EXCLUDED.expires_at,
         attempts = 0,
         created_at = NOW()`,
      [cleanEmail, otpHash, pendingPayload]
    );

    await sendOtpEmail({ to: cleanEmail, otp, purpose: 'signup', name: full_name.trim() });
    res.json({ ok: true, message: `Verification OTP sent to ${cleanEmail}.` });
  })
);

// Step 2 of Signup: Verify OTP and create the account ONLY after verification
router.post(
  '/register/verify-otp',
  asyncHandler(async (req, res) => {
    const { email, otp } = req.body || {};
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanOtp = String(otp || '').trim();
    if (!cleanEmail || !/^\d{6}$/.test(cleanOtp)) {
      res.status(400).json({ error: 'Please enter a valid 6-digit OTP.' });
      return;
    }

    const row = await dbGet<{
      id: number;
      otp_hash: string;
      payload_json: string;
      expires_at: string;
      attempts: number;
    }>("SELECT * FROM email_otps WHERE email = ? AND purpose = 'signup'", [cleanEmail]);

    if (!row) {
      res.status(400).json({ error: 'No pending verification found. Please request a new OTP.' });
      return;
    }
    if (new Date(row.expires_at).getTime() < Date.now()) {
      await dbRun('DELETE FROM email_otps WHERE id = ?', [row.id]);
      res.status(400).json({ error: 'OTP has expired. Please request a new OTP.' });
      return;
    }
    if (row.attempts >= 5) {
      await dbRun('DELETE FROM email_otps WHERE id = ?', [row.id]);
      res.status(429).json({ error: 'Too many invalid attempts. Please request a new OTP.' });
      return;
    }

    if (hashOtp(cleanEmail, 'signup', cleanOtp) !== row.otp_hash) {
      await dbRun('UPDATE email_otps SET attempts = attempts + 1 WHERE id = ?', [row.id]);
      res.status(400).json({ error: 'Invalid OTP. Please check your email and try again.' });
      return;
    }

    const pending = JSON.parse(row.payload_json) as {
      full_name: string;
      mobile: string;
      email: string;
      password_hash: string;
      referral_code: string | null;
    };

    const emailConflict2 = await dbGet('SELECT id FROM users WHERE email = ?', [pending.email]);
    if (emailConflict2) {
      await dbRun('DELETE FROM email_otps WHERE id = ?', [row.id]);
      res.status(409).json({ error: 'This email address is already registered. Please log in instead.', field: 'email' });
      return;
    }
    const mobileConflict2 = await dbGet('SELECT id FROM users WHERE mobile = ?', [pending.mobile]);
    if (mobileConflict2) {
      await dbRun('DELETE FROM email_otps WHERE id = ?', [row.id]);
      res.status(409).json({ error: 'This mobile number is already registered. Please log in instead.', field: 'mobile' });
      return;
    }

    try {
      const { user, token } = await createStudentAccount({
        fullName: pending.full_name,
        email: pending.email,
        mobile: pending.mobile,
        passwordHash: pending.password_hash,
        referralCode: pending.referral_code,
        authProvider: 'local',
      });
      await dbRun('DELETE FROM email_otps WHERE id = ?', [row.id]);
      setAuthCookie(res, token, true);
      res.status(201).json({ user, token });
    } catch (err: any) {
      res.status(err?.status || 400).json({ error: err?.message || 'Registration failed.' });
    }
  })
);

router.post('/register', (_req, res) => {
  res.status(400).json({ error: 'Email OTP verification is required to complete registration.' });
});

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { identifier, password, rememberMe = true } = req.body || {};
    if (!identifier || !password) {
      res.status(400).json({ error: 'Please enter your email/mobile and password.' });
      return;
    }

    const raw = String(identifier).trim();
    const cleanEmail = raw.toLowerCase();
    const cleanMobile = raw.replace(/\D/g, '');

    const userRow = await dbGet<{
      id: number;
      full_name: string;
      email: string;
      mobile: string;
      password_hash: string;
      role: 'student' | 'faculty' | 'admin';
      avatar_url: string | null;
      referral_code: string;
      is_active: number;
    }>('SELECT * FROM users WHERE email = ? OR mobile = ?', [cleanEmail, cleanMobile || raw]);

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
  })
);

// Google OAuth: Verify Google ID Token & either sign in or prompt for missing profile details
router.post(
  '/google',
  asyncHandler(async (req, res) => {
    const { credential } = req.body || {};
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      res.status(500).json({ error: 'Google OAuth is not configured on the server.' });
      return;
    }
    if (!credential || typeof credential !== 'string') {
      res.status(400).json({ error: 'Google credential token is required.' });
      return;
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: clientId,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email || !payload.email_verified) {
      res.status(401).json({ error: 'Google account email could not be verified.' });
      return;
    }

    const cleanEmail = payload.email.trim().toLowerCase();
    const googleId = payload.sub;
    const fullName = (payload.name || cleanEmail.split('@')[0]).trim();
    const avatarUrl = payload.picture || null;

    const existing = await dbGet<{
      id: number;
      full_name: string;
      email: string;
      mobile: string;
      role: 'student' | 'faculty' | 'admin';
      avatar_url: string | null;
      referral_code: string;
      is_active: number;
      google_id: string | null;
      profile_completed: number;
    }>('SELECT * FROM users WHERE google_id = ? OR email = ?', [googleId, cleanEmail]);

    if (existing) {
      if (existing.is_active !== 1) {
        res.status(403).json({ error: 'Your account is currently deactivated. Please contact support.' });
        return;
      }
      if (!existing.google_id || existing.avatar_url === null) {
        await dbRun(
          'UPDATE users SET google_id = COALESCE(google_id, ?), avatar_url = COALESCE(avatar_url, ?), email_verified = 1 WHERE id = ?',
          [googleId, avatarUrl, existing.id]
        );
      }
      const token = signToken({ userId: existing.id, role: existing.role }, 60 * 60 * 24 * 14);
      setAuthCookie(res, token, true);
      const safeUser = {
        id: existing.id,
        full_name: existing.full_name,
        email: existing.email,
        mobile: existing.mobile,
        role: existing.role,
        avatar_url: existing.avatar_url || avatarUrl,
        referral_code: existing.referral_code,
        is_active: existing.is_active,
      };
      res.json({ needsProfileCompletion: false, user: safeUser, token });
      return;
    }

    // New user (whether via Login with Google or Sign up with Google) -> require profile details
    const pendingToken = signToken(
      {
        type: 'google_pending',
        googleId,
        email: cleanEmail,
        fullName,
        avatarUrl,
      },
      60 * 15
    );

    res.json({
      needsProfileCompletion: true,
      pendingToken,
      profile: {
        email: cleanEmail,
        full_name: fullName,
        avatar_url: avatarUrl,
      },
    });
  })
);

// Complete profile for new Google-verified users (name, mobile, referral, optional password; email is locked from Google)
router.post(
  '/google/complete-profile',
  asyncHandler(async (req, res) => {
    const { pendingToken, full_name, mobile, password, referral_code } = req.body || {};
    if (!pendingToken || typeof pendingToken !== 'string') {
      res.status(400).json({ error: 'Google session expired. Please verify with Google again.' });
      return;
    }

    const decoded = verifyToken<{
      type: string;
      googleId: string;
      email: string;
      fullName: string;
      avatarUrl: string | null;
    }>(pendingToken);

    if (!decoded || decoded.type !== 'google_pending' || !decoded.email || !decoded.googleId) {
      res.status(401).json({ error: 'Google verification session expired. Please sign in with Google again.' });
      return;
    }

    if (!full_name || typeof full_name !== 'string' || full_name.trim().length < 2) {
      res.status(400).json({ error: 'Please enter your full name (at least 2 characters).' });
      return;
    }
    const cleanMobile = String(mobile || '').replace(/\D/g, '');
    if (cleanMobile.length < 10 || cleanMobile.length > 13) {
      res.status(400).json({ error: 'Please enter a valid 10-digit mobile number.' });
      return;
    }
    if (password && String(password).length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long (or leave blank).' });
      return;
    }

    const googleEmailConflict = await dbGet('SELECT id FROM users WHERE email = ? AND (google_id IS NULL OR google_id != ?)', [decoded.email, decoded.googleId]);
    if (googleEmailConflict) {
      res.status(409).json({ error: 'This Google email is already registered with a different account. Please log in instead.', field: 'email' });
      return;
    }
    const googleMobileConflict = await dbGet('SELECT id FROM users WHERE mobile = ?', [cleanMobile]);
    if (googleMobileConflict) {
      res.status(409).json({ error: 'This mobile number is already registered. Please use a different number.', field: 'mobile' });
      return;
    }

    const pwHash = password
      ? hashPassword(String(password))
      : hashPassword(crypto.randomBytes(24).toString('hex'));

    try {
      const { user, token } = await createStudentAccount({
        fullName: full_name.trim(),
        email: decoded.email,
        mobile: cleanMobile,
        passwordHash: pwHash,
        referralCode: referral_code,
        authProvider: 'google',
        googleId: decoded.googleId,
        avatarUrl: decoded.avatarUrl,
      });
      setAuthCookie(res, token, true);
      res.status(201).json({ user, token });
    } catch (err: any) {
      res.status(err?.status || 400).json({ error: err?.message || 'Could not complete registration.' });
    }
  })
);

router.post('/logout', (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    let extra: Record<string, unknown> = {};
    if (user.role === 'faculty') {
      const fp = await dbGet('SELECT * FROM faculty_profiles WHERE user_id = ?', [user.id]);
      extra = { facultyProfile: fp || null };
    }
    res.json({ user, ...extra });
  })
);

router.put(
  '/profile',
  requireAuth,
  asyncHandler(async (req, res) => {
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
    const conflict = await dbGet('SELECT id FROM users WHERE mobile = ? AND id != ?', [
      cleanMobile,
      req.user!.id,
    ]);
    if (conflict) {
      res.status(409).json({ error: 'This mobile number is already used by another account.' });
      return;
    }

    await dbRun('UPDATE users SET full_name = ?, mobile = ?, avatar_url = ? WHERE id = ?', [
      String(full_name).trim(),
      cleanMobile,
      avatar_url ?? req.user!.avatar_url,
      req.user!.id,
    ]);
    const updated = await dbGet(
      'SELECT id, full_name, email, mobile, role, avatar_url, referral_code, is_active FROM users WHERE id = ?',
      [req.user!.id]
    );
    res.json({ user: updated });
  })
);

router.post(
  '/change-password',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { current_password, new_password } = req.body || {};
    if (!current_password || !new_password || String(new_password).length < 6) {
      res.status(400).json({ error: 'New password must be at least 6 characters.' });
      return;
    }
    const row = await dbGet<{ password_hash: string }>(
      'SELECT password_hash FROM users WHERE id = ?',
      [req.user!.id]
    );
    if (!row || !verifyPassword(String(current_password), row.password_hash)) {
      res.status(400).json({ error: 'Current password is incorrect.' });
      return;
    }
    await dbRun('UPDATE users SET password_hash = ? WHERE id = ?', [
      hashPassword(String(new_password)),
      req.user!.id,
    ]);
    res.json({ ok: true, message: 'Password updated successfully.' });
  })
);

// Step 1 of Forgot Password: Send 6-digit OTP to registered email
router.post(
  '/forgot-password/send-otp',
  asyncHandler(async (req, res) => {
    const { email } = req.body || {};
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      res.status(400).json({ error: 'Please enter a valid registered email address.' });
      return;
    }

    const user = await dbGet<{ id: number; full_name: string; role: string }>(
      'SELECT id, full_name, role FROM users WHERE email = ?',
      [cleanEmail]
    );

    if (!user || user.role === 'admin') {
      res.status(404).json({ error: 'No learner or faculty account found with this email.' });
      return;
    }

    const otp = String(crypto.randomInt(100000, 999999));
    const otpHash = hashOtp(cleanEmail, 'forgot_password', otp);

    await dbRun(
      `INSERT INTO email_otps (email, otp_hash, purpose, payload_json, expires_at, attempts)
       VALUES (?, ?, 'forgot_password', ?, NOW() + INTERVAL '10 minutes', 0)
       ON CONFLICT (email, purpose) DO UPDATE SET
         otp_hash = EXCLUDED.otp_hash,
         payload_json = EXCLUDED.payload_json,
         expires_at = EXCLUDED.expires_at,
         attempts = 0,
         created_at = NOW()`,
      [cleanEmail, otpHash, JSON.stringify({ userId: user.id })]
    );

    await sendOtpEmail({
      to: cleanEmail,
      otp,
      purpose: 'forgot_password',
      name: user.full_name,
    });

    res.json({ ok: true, message: `Password reset OTP sent to ${cleanEmail}.` });
  })
);

// Step 2 of Forgot Password: Verify OTP + New Password + Confirm Password & Update
router.post(
  '/forgot-password/reset',
  asyncHandler(async (req, res) => {
    const { email, otp, new_password, confirm_password } = req.body || {};
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanOtp = String(otp || '').trim();

    if (!cleanEmail || !/^\d{6}$/.test(cleanOtp)) {
      res.status(400).json({ error: 'Please enter your email and a valid 6-digit OTP.' });
      return;
    }
    if (!new_password || String(new_password).length < 6) {
      res.status(400).json({ error: 'New password must be at least 6 characters long.' });
      return;
    }
    if (new_password !== confirm_password) {
      res.status(400).json({ error: 'New password and re-entered password do not match.' });
      return;
    }

    const row = await dbGet<{
      id: number;
      otp_hash: string;
      expires_at: string;
      attempts: number;
    }>("SELECT * FROM email_otps WHERE email = ? AND purpose = 'forgot_password'", [cleanEmail]);

    if (!row) {
      res.status(400).json({ error: 'No password reset OTP found. Please request a new OTP.' });
      return;
    }
    if (new Date(row.expires_at).getTime() < Date.now()) {
      await dbRun('DELETE FROM email_otps WHERE id = ?', [row.id]);
      res.status(400).json({ error: 'OTP has expired. Please request a new OTP.' });
      return;
    }
    if (row.attempts >= 5) {
      await dbRun('DELETE FROM email_otps WHERE id = ?', [row.id]);
      res.status(429).json({ error: 'Too many invalid attempts. Please request a new OTP.' });
      return;
    }

    if (hashOtp(cleanEmail, 'forgot_password', cleanOtp) !== row.otp_hash) {
      await dbRun('UPDATE email_otps SET attempts = attempts + 1 WHERE id = ?', [row.id]);
      res.status(400).json({ error: 'Invalid OTP. Please check your email and try again.' });
      return;
    }

    const user = await dbGet<{ id: number; role: string }>(
      'SELECT id, role FROM users WHERE email = ?',
      [cleanEmail]
    );
    if (!user || user.role === 'admin') {
      res.status(404).json({ error: 'Account not found.' });
      return;
    }

    await dbRun('UPDATE users SET password_hash = ?, email_verified = 1 WHERE id = ?', [
      hashPassword(String(new_password)),
      user.id,
    ]);
    await dbRun('DELETE FROM email_otps WHERE id = ?', [row.id]);

    res.json({ ok: true, message: 'Password updated successfully! You can now log in with your new password.' });
  })
);

export default router;
