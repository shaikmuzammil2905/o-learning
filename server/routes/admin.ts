import { Router } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { dbAll, dbGet, dbRun, runSafeDemoCleanup } from '../db.js';
import { asyncHandler, hashPassword, requireAuth, requireRole } from '../auth.js';
import { createS3PresignedUpload, isS3Configured, uploadBufferToS3 } from '../s3.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));

function calcMonthlyDelta(thisMonth: number, prevMonth: number): number | null {
  // Handle division by zero cleanly: return 0 when both are zero, null when prior baseline is absent (never fake +100%)
  if (prevMonth === 0) return thisMonth === 0 ? 0 : null;
  return Math.round(((thisMonth - prevMonth) / prevMonth) * 100);
}

// 1. Analytics & Dashboard Overview (100% live DB metrics & monthly comparison)
router.get('/dashboard', asyncHandler(async (_req, res) => {
  const totalCourses = ((await dbGet('SELECT COUNT(*) as c FROM courses')) as { c: number }).c;
  const totalCoursesThisMonth = ((await dbGet("SELECT COUNT(*) as c FROM courses WHERE to_char(created_at, 'YYYY-MM') = to_char(NOW(), 'YYYY-MM')")) as { c: number }).c;
  const totalCoursesPrevMonth = ((await dbGet("SELECT COUNT(*) as c FROM courses WHERE to_char(created_at, 'YYYY-MM') = to_char(NOW() - INTERVAL '1 month', 'YYYY-MM')")) as { c: number }).c;

  const publishedCourses = ((await dbGet('SELECT COUNT(*) as c FROM courses WHERE is_published = 1')) as { c: number }).c;
  const publishedThisMonth = ((await dbGet("SELECT COUNT(*) as c FROM courses WHERE is_published = 1 AND to_char(created_at, 'YYYY-MM') = to_char(NOW(), 'YYYY-MM')")) as { c: number }).c;
  const publishedPrevMonth = ((await dbGet("SELECT COUNT(*) as c FROM courses WHERE is_published = 1 AND to_char(created_at, 'YYYY-MM') = to_char(NOW() - INTERVAL '1 month', 'YYYY-MM')")) as { c: number }).c;

  // Exclude root/bootstrap admin accounts so user KPI honestly starts at 0 before customers register
  const totalUsers = ((await dbGet("SELECT COUNT(*) as c FROM users WHERE role != 'admin'")) as { c: number }).c;
  const totalStudents = ((await dbGet("SELECT COUNT(*) as c FROM users WHERE role = 'student'")) as { c: number }).c;
  const usersThisMonth = ((await dbGet("SELECT COUNT(*) as c FROM users WHERE role != 'admin' AND to_char(created_at, 'YYYY-MM') = to_char(NOW(), 'YYYY-MM')")) as { c: number }).c;
  const usersPrevMonth = ((await dbGet("SELECT COUNT(*) as c FROM users WHERE role != 'admin' AND to_char(created_at, 'YYYY-MM') = to_char(NOW() - INTERVAL '1 month', 'YYYY-MM')")) as { c: number }).c;

  // ONLY verified successful payments contribute to revenue
  const totalRevenue = ((await dbGet("SELECT COALESCE(SUM(final_amount), 0) as s FROM payments WHERE status = 'successful'")) as { s: number }).s;
  const revenueThisMonth = ((await dbGet("SELECT COALESCE(SUM(final_amount), 0) as s FROM payments WHERE status = 'successful' AND to_char(created_at, 'YYYY-MM') = to_char(NOW(), 'YYYY-MM')")) as { s: number }).s;
  const revenuePrevMonth = ((await dbGet("SELECT COALESCE(SUM(final_amount), 0) as s FROM payments WHERE status = 'successful' AND to_char(created_at, 'YYYY-MM') = to_char(NOW() - INTERVAL '1 month', 'YYYY-MM')")) as { s: number }).s;

  const enrollmentsCount = ((await dbGet('SELECT COUNT(*) as c FROM enrollments')) as { c: number }).c;
  const successfulPaymentsCount = ((await dbGet("SELECT COUNT(*) as c FROM payments WHERE status = 'successful'")) as { c: number }).c;
  const pendingPayments = ((await dbGet("SELECT COUNT(*) as c FROM payments WHERE status IN ('pending', 'processing')")) as { c: number }).c;
  const failedPaymentsCount = ((await dbGet("SELECT COUNT(*) as c FROM payments WHERE status = 'failed'")) as { c: number }).c;
  const cancelledPaymentsCount = ((await dbGet("SELECT COUNT(*) as c FROM payments WHERE status = 'cancelled'")) as { c: number }).c;
  const refundedPaymentsCount = ((await dbGet("SELECT COUNT(*) as c FROM payments WHERE status = 'refunded'")) as { c: number }).c;
  const referralsCount =
    ((await dbGet('SELECT COUNT(*) as c FROM course_referral_links')) as { c: number }).c +
    ((await dbGet('SELECT COUNT(*) as c FROM referrals')) as { c: number }).c;
  const certificatesCount = ((await dbGet('SELECT COUNT(*) as c FROM certificates')) as { c: number }).c;
  const quizAttemptsCount = ((await dbGet('SELECT COUNT(*) as c FROM test_attempts')) as { c: number }).c;
  const redemptionRequestsCount = ((await dbGet('SELECT COUNT(*) as c FROM redemptions')) as { c: number }).c;

  const todaysEnrollments = ((await dbGet("SELECT COUNT(*) as c FROM enrollments WHERE enrolled_at::date = CURRENT_DATE")) as { c: number }).c;
  const liveClassesCount = ((await dbGet("SELECT COUNT(*) as c FROM live_classes WHERE status IN ('live', 'upcoming')")) as { c: number }).c;

  const coursePerformance = (await dbAll(`
      SELECT c.id, c.title, c.is_published,
             (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) as enrollments,
             (SELECT COALESCE(ROUND(AVG(e.progress_percent)::numeric, 0), 0) FROM enrollments e WHERE e.course_id = c.id) as avg_progress,
             (SELECT COALESCE(SUM(p.final_amount), 0) FROM payments p WHERE p.item_type = 'course' AND p.item_id = c.id AND p.status = 'successful') as revenue
      FROM courses c
      ORDER BY enrollments DESC, c.id ASC
      LIMIT 8
    `));

  const recentPayments = (await dbAll(`
      SELECT p.*, u.full_name as student_name, u.email as student_email
      FROM payments p
      JOIN users u ON u.id = p.student_id
      ORDER BY p.created_at DESC
      LIMIT 8
    `));

  const recentActivity = (await dbAll(`
      SELECT e.enrolled_at as ts, u.full_name as student_name, c.title as course_title, e.progress_percent
      FROM enrollments e
      JOIN users u ON u.id = e.student_id
      JOIN courses c ON c.id = e.course_id
      ORDER BY e.enrolled_at DESC
      LIMIT 8
    `));

  const rawMethodRows = (await dbAll(`
      SELECT method, COUNT(*) as count, COUNT(*) as txns, COALESCE(SUM(final_amount), 0) as total
      FROM payments WHERE status = 'successful'
      GROUP BY method
    `)) as Array<{ method: string; count: number; txns: number; total: number }>;

  const methodMap = new Map(rawMethodRows.map((r) => [r.method, r]));
  const revenueByMethod = ['UPI', 'Card', 'NetBanking', 'Wallet'].map((method) => {
    const found = methodMap.get(method);
    return found || { method, count: 0, txns: 0, total: 0 };
  });

  // Monthly Revenue breakdown for the Revenue Overview chart (matching reference screenshot)
  const monthlyRevenueRows = (await dbAll(`
      SELECT to_char(created_at, 'YYYY-MM') as month_key,
             COUNT(*) as count,
             COALESCE(SUM(final_amount), 0) as total
      FROM payments
      WHERE status = 'successful' AND created_at >= date_trunc('month', NOW() - INTERVAL '11 months')
      GROUP BY month_key
      ORDER BY month_key ASC
    `)) as Array<{ month_key: string; count: number; total: number }>;

  const monthlyRevMap = new Map(monthlyRevenueRows.map((r) => [r.month_key, r]));
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyRevenue: Array<{
    key: string;
    month: string;
    year: number;
    label: string;
    total: number;
    count: number;
  }> = [];

  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const key = `${y}-${m}`;
    const shortYear = String(y).slice(-2);
    const label = `${monthNames[d.getMonth()]} '${shortYear}`;
    const row = monthlyRevMap.get(key);
    monthlyRevenue.push({
      key,
      month: monthNames[d.getMonth()],
      year: y,
      label,
      total: row ? Number(row.total) : 0,
      count: row ? Number(row.count) : 0,
    });
  }

  res.json({
    metrics: {
      totalCourses,
      coursesCount: totalCourses,
      coursesThisMonth: totalCoursesThisMonth,
      totalCoursesThisMonth,
      totalCoursesPrevMonth,
      totalCoursesChangePct: calcMonthlyDelta(totalCoursesThisMonth, totalCoursesPrevMonth),
      publishedCourses,
      publishedCoursesCount: publishedCourses,
      publishedThisMonth,
      publishedPrevMonth,
      publishedChangePct: calcMonthlyDelta(publishedThisMonth, publishedPrevMonth),
      totalUsers,
      totalUsersCount: totalUsers,
      totalStudents,
      studentsCount: totalStudents,
      usersThisMonth,
      usersPrevMonth,
      usersChangePct: calcMonthlyDelta(usersThisMonth, usersPrevMonth),
      totalRevenue,
      revenueThisMonth,
      revenuePrevMonth,
      revenueChangePct: calcMonthlyDelta(revenueThisMonth, revenuePrevMonth),
      activeCourses: publishedCourses,
      enrollmentsCount,
      successfulPaymentsCount,
      pendingPayments,
      failedPaymentsCount,
      cancelledPaymentsCount,
      refundedPaymentsCount,
      referralsCount,
      certificatesCount,
      quizAttemptsCount,
      redemptionRequestsCount,
      todaysEnrollments,
      liveClassesCount,
    },
    coursePerformance,
    recentPayments,
    recentActivity,
    revenueByMethod,
    monthlyRevenue,
  });
}));

// AWS S3 Presigned Upload URL (for direct browser-to-S3 uploads, including large videos)
router.post('/s3-presign', async (req, res) => {
  const { filename = 'file.bin', contentType = 'application/octet-stream', folder = 'o-learning' } = req.body || {};
  if (!isS3Configured()) {
    res.json({ configured: false });
    return;
  }
  try {
    const presigned = await createS3PresignedUpload({
      filename: String(filename),
      contentType: String(contentType),
      folder: String(folder),
    });
    res.json({ configured: true, ...presigned });
  } catch (err) {
    console.error('[S3 Presign Error]', err);
    res.status(500).json({ error: 'Failed to generate S3 upload URL.' });
  }
});

// AWS S3 Server-Side Upload (handles images, PDFs, and media up to 15 MB without browser CORS)
router.post('/upload-s3', async (req, res) => {
  const { filename = 'upload.png', dataUrl, contentType, folder = 'o-learning' } = req.body || {};
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.includes(';base64,')) {
    res.status(400).json({ error: 'Valid base64 dataUrl is required.' });
    return;
  }

  const parts = dataUrl.split(';base64,');
  const mime = String(contentType || parts[0].replace('data:', '') || 'application/octet-stream');
  const buf = Buffer.from(parts[1], 'base64');
  if (buf.length > 15 * 1024 * 1024) {
    res.status(400).json({ error: 'File exceeds 15 MB server upload limit. Use presigned S3 upload.' });
    return;
  }

  if (isS3Configured()) {
    try {
      const uploaded = await uploadBufferToS3({
        buffer: buf,
        filename: String(filename),
        contentType: mime,
        folder: String(folder),
      });
      res.status(201).json({ url: uploaded.url, key: uploaded.key, bucket: uploaded.bucket, provider: 's3' });
      return;
    } catch (err) {
      console.error('[S3 Upload Error]', err);
      res.status(500).json({ error: 'Failed to upload file to AWS S3.' });
      return;
    }
  }

  // Local disk fallback when AWS S3 credentials are not configured in local dev
  const uploadDir = process.env.VERCEL
    ? path.join('/tmp', 'olearning-uploads')
    : path.resolve(process.cwd(), 'public', 'uploads');
  fs.mkdirSync(uploadDir, { recursive: true });
  const safeName = String(filename).replace(/[^a-zA-Z0-9._-]/g, '_').slice(-60) || 'file';
  const outName = `${Date.now()}-${safeName}`;
  fs.writeFileSync(path.join(uploadDir, outName), buf);
  res.status(201).json({ url: `/uploads/${outName}`, provider: 'local' });
});

// Local/Fallback Secure Image Upload Endpoint
router.post('/upload', asyncHandler(async (req, res) => {
  const { filename = 'upload.png', dataUrl } = req.body || {};
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
    res.status(400).json({ error: 'Valid image data is required.' });
    return;
  }
  const match = dataUrl.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
  if (!match) {
    res.status(400).json({ error: 'Unsupported image encoding.' });
    return;
  }
  const extRaw = match[1].toLowerCase().replace('jpeg', 'jpg').replace('svg+xml', 'svg');
  const ext = ['png', 'jpg', 'webp', 'gif', 'svg'].includes(extRaw) ? extRaw : 'png';
  const buf = Buffer.from(match[2], 'base64');
  if (buf.length > 5 * 1024 * 1024) {
    res.status(400).json({ error: 'Image size exceeds 5 MB limit.' });
    return;
  }

  const uploadDir = process.env.VERCEL
    ? path.join('/tmp', 'olearning-uploads')
    : path.resolve(process.cwd(), 'public', 'uploads');
  fs.mkdirSync(uploadDir, { recursive: true });
  const safeBase = String(filename).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24) || 'img';
  const outName = `${safeBase}-${Date.now()}.${ext}`;
  fs.writeFileSync(path.join(uploadDir, outName), buf);
  res.status(201).json({ url: `/uploads/${outName}` });
}));

// 2. Students Management
router.get('/students', asyncHandler(async (req, res) => {
  const { search = '', status = 'all' } = req.query;
  let sql = `
    SELECT u.id, u.full_name, u.email, u.mobile, u.referral_code, u.is_active, u.created_at,
           (SELECT COUNT(*) FROM enrollments e WHERE e.student_id = u.id) as enrollments_count,
           (SELECT COUNT(*) FROM certificates cert WHERE cert.student_id = u.id) as certificates_count,
           (SELECT COALESCE(SUM(p.final_amount), 0) FROM payments p WHERE p.student_id = u.id AND p.status = 'successful') as total_spent
    FROM users u
    WHERE u.role = 'student'
  `;
  const params: Array<string | number> = [];
  if (search) {
    sql += ' AND (LOWER(u.full_name) LIKE ? OR LOWER(u.email) LIKE ? OR u.mobile LIKE ?)';
    const q = `%${String(search).toLowerCase()}%`;
    params.push(q, q, `%${search}%`);
  }
  if (status === 'active') sql += ' AND u.is_active = 1';
  if (status === 'inactive') sql += ' AND u.is_active = 0';
  sql += ' ORDER BY u.created_at DESC';
  res.json((await dbAll(sql, params)));
}));

router.get('/students/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const student = (await dbGet('SELECT id, full_name, email, mobile, referral_code, is_active, created_at FROM users WHERE id = ? AND role = ?', [id, 'student']));
  if (!student) {
    res.status(404).json({ error: 'Student not found.' });
    return;
  }
  const enrollments = (await dbAll('SELECT e.*, c.title as course_title FROM enrollments e JOIN courses c ON c.id = e.course_id WHERE e.student_id = ?', [id]));
  const payments = (await dbAll('SELECT * FROM payments WHERE student_id = ? ORDER BY created_at DESC', [id]));
  const certificates = (await dbAll('SELECT * FROM certificates WHERE student_id = ?', [id]));
  res.json({ student, enrollments, payments, certificates });
}));

router.patch('/students/:id/status', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { is_active } = req.body || {};
  (await dbRun("UPDATE users SET is_active = ? WHERE id = ? AND role = 'student'", [is_active ? 1 : 0, id]));
  res.json({ ok: true });
}));

// 2b. Unified Users Management (Students, Faculty, Admins)
const mapRoleToDb = (r?: string): string | null => {
  if (!r) return null;
  const up = r.toUpperCase();
  if (up === 'USER' || up === 'STUDENT') return 'student';
  if (up === 'ADMIN') return 'admin';
  if (up === 'FACULTY') return 'faculty';
  return null;
};

router.get('/users', asyncHandler(async (req, res) => {
  const { search = '', role = 'all', status = 'all', include_admins = 'false' } = req.query;
  let sql = `
    SELECT u.id, u.full_name, u.email, u.mobile, u.role, u.referral_code,
           COALESCE(u.credits, 0) as credits, u.is_active, u.created_at,
           (SELECT COUNT(*) FROM enrollments e WHERE e.student_id = u.id) as enrollments_count,
           (SELECT COUNT(*) FROM certificates cert WHERE cert.student_id = u.id) as certificates_count,
           (SELECT COALESCE(SUM(p.final_amount), 0) FROM payments p WHERE p.student_id = u.id AND p.status = 'successful') as total_spent
    FROM users u
    WHERE 1=1
  `;
  const params: Array<string | number> = [];
  if (role === 'all' && include_admins !== 'true') {
    sql += " AND u.role != 'admin'";
  }
  if (search) {
    sql += ' AND (LOWER(u.full_name) LIKE ? OR LOWER(u.email) LIKE ? OR u.mobile LIKE ?)';
    const q = `%${String(search).toLowerCase()}%`;
    params.push(q, q, `%${search}%`);
  }
  if (role && role !== 'all') {
    const dbRole = mapRoleToDb(String(role));
    if (dbRole) {
      sql += ' AND u.role = ?';
      params.push(dbRole);
    }
  }
  if (status === 'active') sql += ' AND u.is_active = 1';
  if (status === 'inactive') sql += ' AND u.is_active = 0';
  sql += ' ORDER BY u.created_at DESC';
  res.json((await dbAll(sql, params)));
}));

router.get('/users/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const user = (await dbGet('SELECT id, full_name, email, mobile, role, referral_code, COALESCE(credits, 0) as credits, is_active, created_at FROM users WHERE id = ?', [id]));
  if (!user) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }
  const enrollments = (await dbAll('SELECT e.*, c.title as course_title FROM enrollments e JOIN courses c ON c.id = e.course_id WHERE e.student_id = ?', [id]));
  const payments = (await dbAll('SELECT * FROM payments WHERE student_id = ? ORDER BY created_at DESC', [id]));
  const certificates = (await dbAll('SELECT * FROM certificates WHERE student_id = ? ORDER BY issued_at DESC', [id]));
  const referrals = (await dbAll(`
      SELECT cra.*, c.title as course_title, u2.full_name as referred_name
      FROM course_referral_attributions cra
      JOIN courses c ON c.id = cra.course_id
      LEFT JOIN users u2 ON u2.id = cra.referred_user_id
      WHERE cra.referrer_id = ?
      ORDER BY cra.created_at DESC
    `, [id]));
  res.json({ user, enrollments, payments, certificates, referrals });
}));

router.put('/users/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const b = req.body || {};
  const existing = (await dbGet('SELECT id, role FROM users WHERE id = ?', [id])) as { id: number; role: string } | undefined;
  if (!existing) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }
  const nextRole = b.role ? mapRoleToDb(String(b.role)) : null;
  (await dbRun(`
    UPDATE users
    SET full_name = COALESCE(?, full_name),
        mobile = COALESCE(?, mobile),
        role = COALESCE(?, role),
        credits = COALESCE(?, credits),
        is_active = COALESCE(?, is_active)
    WHERE id = ?
  `, [b.full_name ?? null,
  b.mobile ?? null,
    nextRole,
  b.credits !== undefined ? Number(b.credits) : null,
  b.is_active !== undefined ? (b.is_active ? 1 : 0) : null,
    id]));
  res.json(
    (await dbGet('SELECT id, full_name, email, mobile, role, referral_code, COALESCE(credits, 0) as credits, is_active, created_at FROM users WHERE id = ?', [id]))
  );
}));

router.delete('/users/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user!.id) {
    res.status(400).json({ error: 'You cannot delete your own active admin account.' });
    return;
  }
  const target = (await dbGet('SELECT id FROM users WHERE id = ?', [id]));
  if (!target) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }
  (await dbRun('DELETE FROM users WHERE id = ?', [id]));
  res.json({ ok: true });
}));

// 3. Faculty Management
router.get('/faculty', asyncHandler(async (_req, res) => {
  const rows = (await dbAll(`
      SELECT u.id, u.full_name, u.email, u.mobile, u.is_active, u.created_at,
             fp.title, fp.bio, fp.specialization, fp.experience_years, fp.qualifications, fp.permissions_json,
             (SELECT COUNT(*) FROM courses c WHERE c.faculty_id = u.id) as courses_count,
             (SELECT COUNT(*) FROM batches b WHERE b.faculty_id = u.id) as batches_count
      FROM users u
      LEFT JOIN faculty_profiles fp ON fp.user_id = u.id
      WHERE u.role = 'faculty'
      ORDER BY u.id ASC
    `)) as Array<Record<string, unknown>>;
  res.json(
    rows.map((r) => ({
      ...r,
      permissions: JSON.parse(String(r.permissions_json || '{}')),
    }))
  );
}));

router.post('/faculty', asyncHandler(async (req, res) => {
  const { full_name, email, mobile, password, title = 'Instructor', bio = '', specialization = '', experience_years = 5, qualifications = '', permissions } = req.body || {};
  if (!full_name || !email || !mobile || !password) {
    res.status(400).json({ error: 'Name, email, mobile, and password are required.' });
    return;
  }
  const cleanEmail = String(email).trim().toLowerCase();
  const cleanMobile = String(mobile).replace(/\D/g, '');
  const exists = (await dbGet('SELECT id FROM users WHERE email = ? OR mobile = ?', [cleanEmail, cleanMobile]));
  if (exists) {
    res.status(409).json({ error: 'Email or mobile already registered.' });
    return;
  }
  const code = `FAC-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const r = (await dbRun("INSERT INTO users (full_name, email, mobile, password_hash, role, referral_code, is_active) VALUES (?, ?, ?, ?, 'faculty', ?, 1) RETURNING id", [String(full_name).trim(), cleanEmail, cleanMobile, hashPassword(String(password)), code]));
  const fid = Number(r.lastInsertRowid);
  (await dbRun(`
    INSERT INTO faculty_profiles (user_id, title, bio, specialization, experience_years, qualifications, permissions_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [fid,
    title,
    bio,
    specialization,
    Number(experience_years) || 5,
    qualifications,
    JSON.stringify(
      permissions || {
        can_manage_lessons: true,
        can_schedule_live: true,
        can_manage_tests: true,
        can_upload_materials: true,
      }
    )]));
  res.status(201).json({ id: fid, full_name, email: cleanEmail });
}));

router.put('/faculty/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { full_name, title, bio, specialization, experience_years, qualifications, is_active, permissions } = req.body || {};
  if (full_name !== undefined || is_active !== undefined) {
    (await dbRun(`
      UPDATE users SET full_name = COALESCE(?, full_name), is_active = COALESCE(?, is_active)
      WHERE id = ? AND role = 'faculty'
    `, [full_name ?? null, is_active !== undefined ? (is_active ? 1 : 0) : null, id]));
  }
  (await dbRun(`
    UPDATE faculty_profiles
    SET title = COALESCE(?, title),
        bio = COALESCE(?, bio),
        specialization = COALESCE(?, specialization),
        experience_years = COALESCE(?, experience_years),
        qualifications = COALESCE(?, qualifications),
        permissions_json = COALESCE(?, permissions_json)
    WHERE user_id = ?
  `, [title ?? null,
  bio ?? null,
  specialization ?? null,
  experience_years !== undefined ? Number(experience_years) : null,
  qualifications ?? null,
  permissions ? JSON.stringify(permissions) : null,
    id]));
  res.json({ ok: true });
}));

// 4. Categories Management (with courses count & full edit + image)
router.get('/categories', asyncHandler(async (_req, res) => {
  res.json(
    (await dbAll(`
        SELECT cat.*,
               (SELECT COUNT(*) FROM courses c WHERE c.category_id = cat.id) as courses_count
        FROM categories cat
        ORDER BY cat.id ASC
      `))
  );
}));

router.post('/categories', asyncHandler(async (req, res) => {
  const { name, slug: customSlug, description = '', image = '', icon_name = 'BookOpen', is_active = 1 } = req.body || {};
  if (!name || !String(name).trim()) {
    res.status(400).json({ error: 'Category name is required.' });
    return;
  }
  const cleanName = String(name).trim();
  const rawSlug = customSlug && String(customSlug).trim() ? String(customSlug) : cleanName;
  const slug = rawSlug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `cat-${Date.now()}`;

  const existing = await dbGet('SELECT id FROM categories WHERE LOWER(name) = LOWER(?) OR LOWER(slug) = LOWER(?)', [cleanName, slug]);
  if (existing) {
    res.status(409).json({ error: 'A category with this name or slug already exists.' });
    return;
  }

  const r = (await dbRun(
    'INSERT INTO categories (name, slug, description, image, icon_name, is_active) VALUES (?, ?, ?, ?, ?, ?) RETURNING id',
    [cleanName, slug, description, image, icon_name, is_active ? 1 : 0]
  ));
  res.status(201).json((await dbGet('SELECT * FROM categories WHERE id = ?', [Number(r.lastInsertRowid)])));
}));

const handleUpdateCategory = asyncHandler(async (req: any, res: any) => {
  const rawId = req.params.id || req.body.id;
  const id = Number(rawId);
  if (isNaN(id) || id <= 0 || id > 2147483647) {
    res.status(400).json({ error: 'Invalid category ID' });
    return;
  }
  const b = req.body || {};
  const cleanName = b.name ? String(b.name).trim() : null;
  const cleanSlug = b.slug ? String(b.slug).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : null;

  if (cleanName || cleanSlug) {
    const existing = await dbGet(
      'SELECT id FROM categories WHERE (LOWER(name) = LOWER(?) OR LOWER(slug) = LOWER(?)) AND id != ?',
      [cleanName || '', cleanSlug || '', id]
    );
    if (existing) {
      res.status(409).json({ error: 'Another category with this name or slug already exists.' });
      return;
    }
  }

  (await dbRun(`
    UPDATE categories
    SET name = COALESCE(?, name),
        slug = COALESCE(?, slug),
        description = COALESCE(?, description),
        image = COALESCE(?, image),
        is_active = COALESCE(?, is_active)
    WHERE id = ?
  `, [cleanName,
    cleanSlug,
    b.description ?? null,
    b.image ?? null,
    b.is_active !== undefined ? (b.is_active ? 1 : 0) : null,
    id]));
  res.json((await dbGet('SELECT * FROM categories WHERE id = ?', [id])));
});
router.put('/categories/:id', handleUpdateCategory);
router.put('/categories', handleUpdateCategory);

const handleDeleteCategory = asyncHandler(async (req: any, res: any) => {
  const rawId = req.params.id || req.query.id || req.body.id;
  const id = Number(rawId);
  if (isNaN(id) || id <= 0 || id > 2147483647) {
    // Gracefully handle client-side temporary timestamps or invalid IDs without DB integer overflow
    res.json({ ok: true, deleted: false, reason: 'Invalid or local-only category ID' });
    return;
  }
  await dbRun('UPDATE courses SET category_id = NULL WHERE category_id = ?', [id]);
  await dbRun('UPDATE tests SET category_id = NULL WHERE category_id = ?', [id]);
  const r = await dbRun('DELETE FROM categories WHERE id = ?', [id]);
  res.json({ ok: true, deleted: (r.changes ?? 0) > 0 });
});
router.delete('/categories/:id', handleDeleteCategory);
router.delete('/categories', handleDeleteCategory);

// 5. Courses, Modules & Lessons Management
router.get('/courses', asyncHandler(async (_req, res) => {
  const courses = (await dbAll(`
      SELECT c.*, cat.name as category_name, u.full_name as faculty_name,
             (SELECT COUNT(*) FROM modules m WHERE m.course_id = c.id) as modules_count,
             (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id) as lessons_count,
             (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) as enrolled_count
      FROM courses c
      LEFT JOIN categories cat ON cat.id = c.category_id
      LEFT JOIN users u ON u.id = c.faculty_id
      ORDER BY c.display_order ASC, c.id ASC
    `)) as Array<Record<string, unknown>>;
  res.json(
    courses.map((c) => ({
      ...c,
      what_you_learn: JSON.parse(String(c.what_you_learn_json || '[]')),
      faqs: JSON.parse(String(c.faqs_json || '[]')),
    }))
  );
}));

router.post('/courses', asyncHandler(async (req, res) => {
  const {
    title,
    slug: customSlug,
    category_id,
    short_description,
    description,
    thumbnail_url = '/images/courses/it-programming.png',
    banner_image = '',
    preview_image = '',
    instructor_image = '',
    level = 'Beginner to Advanced',
    duration = '12 Weeks',
    language = 'English / Hindi',
    prerequisites = 'None',
    price = 1999,
    discount_price = null,
    is_free = 0,
    featured = 0,
    faculty_id = null,
    what_you_learn = [],
    faqs = [],
    is_published = 1,
  } = req.body || {};

  if (!title || !short_description) {
    res.status(400).json({ error: 'Course title and short description are required.' });
    return;
  }
  const slug =
    customSlug && String(customSlug).trim()
      ? String(customSlug).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      : String(title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') +
      '-' +
      crypto.randomInt(10, 99);

  const r = (await dbRun(`
      INSERT INTO courses (
        slug, category_id, title, short_description, description,
        thumbnail_url, banner_image, preview_image, instructor_image,
        level, duration, language, prerequisites,
        price, discount_price, is_free, featured, faculty_id,
        what_you_learn_json, faqs_json, is_published, display_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 99)
     RETURNING id`, [slug,
      category_id ? Number(category_id) : null,
      String(title).trim(),
      String(short_description).trim(),
      String(description || short_description).trim(),
      thumbnail_url,
      banner_image,
      preview_image,
      instructor_image,
      level,
      duration,
      language,
      prerequisites,
      Number(price) || 0,
      discount_price !== null && discount_price !== '' ? Number(discount_price) : null,
      is_free ? 1 : 0,
      featured ? 1 : 0,
      faculty_id ? Number(faculty_id) : null,
      JSON.stringify(what_you_learn),
      JSON.stringify(faqs),
      is_published !== undefined && is_published !== null ? (is_published ? 1 : 0) : 1]));

  const cid = Number(r.lastInsertRowid);
  (await dbRun("INSERT INTO modules (course_id, title, description, sort_order) VALUES (?, 'Module 1: Getting Started', '', 1)", [cid]));
  res.status(201).json((await dbGet('SELECT * FROM courses WHERE id = ?', [cid])));
}));

const handleUpdateCourse = asyncHandler(async (req: any, res: any) => {
  const id = Number(req.params.id || req.body.id);
  const b = req.body || {};
  (await dbRun(`
    UPDATE courses
    SET title = COALESCE(?, title),
        slug = COALESCE(?, slug),
        category_id = COALESCE(?, category_id),
        short_description = COALESCE(?, short_description),
        description = COALESCE(?, description),
        thumbnail_url = COALESCE(?, thumbnail_url),
        banner_image = COALESCE(?, banner_image),
        preview_image = COALESCE(?, preview_image),
        instructor_image = COALESCE(?, instructor_image),
        level = COALESCE(?, level),
        duration = COALESCE(?, duration),
        language = COALESCE(?, language),
        prerequisites = COALESCE(?, prerequisites),
        price = COALESCE(?, price),
        discount_price = ?,
        is_free = COALESCE(?, is_free),
        featured = COALESCE(?, featured),
        faculty_id = COALESCE(?, faculty_id),
        what_you_learn_json = COALESCE(?, what_you_learn_json),
        faqs_json = COALESCE(?, faqs_json),
        is_published = COALESCE(?, is_published)
    WHERE id = ?
  `, [b.title ?? null,
    b.slug ? String(b.slug).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : null,
    b.category_id !== undefined ? (b.category_id ? Number(b.category_id) : null) : null,
    b.short_description ?? null,
    b.description ?? null,
    b.thumbnail_url ?? null,
    b.banner_image ?? null,
    b.preview_image ?? null,
    b.instructor_image ?? null,
    b.level ?? null,
    b.duration ?? null,
    b.language ?? null,
    b.prerequisites ?? null,
    b.price !== undefined ? Number(b.price) : null,
    b.discount_price !== undefined && b.discount_price !== '' && b.discount_price !== null
      ? Number(b.discount_price)
      : null,
    b.is_free !== undefined ? (b.is_free ? 1 : 0) : null,
    b.featured !== undefined ? (b.featured ? 1 : 0) : null,
    b.faculty_id !== undefined ? (b.faculty_id ? Number(b.faculty_id) : null) : null,
    b.what_you_learn ? JSON.stringify(b.what_you_learn) : null,
    b.faqs ? JSON.stringify(b.faqs) : null,
    b.is_published !== undefined ? (b.is_published ? 1 : 0) : null,
    id]));
  res.json((await dbGet('SELECT * FROM courses WHERE id = ?', [id])));
});
router.put('/courses/:id', handleUpdateCourse);
router.put('/courses', handleUpdateCourse);

router.post('/courses/:id/duplicate', asyncHandler(async (req, res) => {
  const srcId = Number(req.params.id);
  const src = (await dbGet('SELECT * FROM courses WHERE id = ?', [srcId])) as Record<string, any> | undefined;
  if (!src) {
    res.status(404).json({ error: 'Course not found.' });
    return;
  }
  const newSlug = `${src.slug}-copy-${crypto.randomInt(100, 999)}`;
  const r = (await dbRun(`
      INSERT INTO courses (
        slug, category_id, title, short_description, description,
        thumbnail_url, banner_image, preview_image, instructor_image,
        level, duration, language, prerequisites,
        price, discount_price, is_free, featured, faculty_id,
        what_you_learn_json, faqs_json, is_published, display_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 99)
     RETURNING id`, [newSlug,
      src.category_id,
      `${src.title} (Copy)`,
      src.short_description,
      src.description,
      src.thumbnail_url,
      src.banner_image || '',
      src.preview_image || '',
      src.instructor_image || '',
      src.level,
      src.duration,
      src.language || 'English / Hindi',
      src.prerequisites || 'None',
      src.price,
      src.discount_price,
      src.is_free,
      0,
      src.faculty_id,
      src.what_you_learn_json,
      src.faqs_json]));
  const newId = Number(r.lastInsertRowid);
  const mods = (await dbAll('SELECT * FROM modules WHERE course_id = ?', [srcId])) as Array<Record<string, any>>;
  for (const m of mods) {
    const nm = (await dbRun('INSERT INTO modules (course_id, title, description, sort_order) VALUES (?, ?, ?, ?) RETURNING id', [newId, m.title, m.description, m.sort_order]));
    const newModId = Number(nm.lastInsertRowid);
    const lessons = (await dbAll('SELECT * FROM lessons WHERE module_id = ?', [m.id])) as Array<Record<string, any>>;
    for (const l of lessons) {
      (await dbRun(`
        INSERT INTO lessons (module_id, course_id, title, lesson_type, video_url, material_url, duration_minutes, content_text, is_preview, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [newModId, newId, l.title, l.lesson_type, l.video_url, l.material_url, l.duration_minutes, l.content_text, l.is_preview, l.sort_order]));
    }
  }
  res.status(201).json((await dbGet('SELECT * FROM courses WHERE id = ?', [newId])));
}));

const handleDeleteCourse = asyncHandler(async (req: any, res: any) => {
  const id = Number(req.params.id || req.query.id || req.body.id);
  (await dbRun('DELETE FROM courses WHERE id = ?', [id]));
  res.json({ ok: true });
});
router.delete('/courses/:id', handleDeleteCourse);
router.delete('/courses', handleDeleteCourse);

router.get('/courses/:id/curriculum', asyncHandler(async (req, res) => {
  const cid = Number(req.params.id);
  const modules = (await dbAll('SELECT * FROM modules WHERE course_id = ? ORDER BY sort_order ASC, id ASC', [cid]));
  const lessons = (await dbAll('SELECT * FROM lessons WHERE course_id = ? ORDER BY sort_order ASC, id ASC', [cid]));
  res.json({ modules, lessons });
}));

router.post('/courses/:id/modules', asyncHandler(async (req, res) => {
  const cid = Number(req.params.id);
  const { title, description = '' } = req.body || {};
  if (!title) {
    res.status(400).json({ error: 'Module title is required.' });
    return;
  }
  const r = (await dbRun('INSERT INTO modules (course_id, title, description, sort_order) VALUES (?, ?, ?, 99) RETURNING id', [cid, String(title).trim(), description]));
  res.status(201).json((await dbGet('SELECT * FROM modules WHERE id = ?', [Number(r.lastInsertRowid)])));
}));

router.post('/courses/:id/lessons', asyncHandler(async (req, res) => {
  const cid = Number(req.params.id);
  const { module_id, title, lesson_type = 'video', video_url = '', material_url = '', duration_minutes = 20, content_text = '', is_preview = 0 } = req.body || {};
  if (!module_id || !title) {
    res.status(400).json({ error: 'Module and lesson title are required.' });
    return;
  }
  const r = (await dbRun(`
      INSERT INTO lessons (module_id, course_id, title, lesson_type, video_url, material_url, duration_minutes, content_text, is_preview, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 99)
     RETURNING id`, [Number(module_id), cid, String(title).trim(), lesson_type, video_url, material_url, Number(duration_minutes) || 20, content_text, is_preview ? 1 : 0]));
  res.status(201).json((await dbGet('SELECT * FROM lessons WHERE id = ?', [Number(r.lastInsertRowid)])));
}));

router.delete('/lessons/:lessonId', asyncHandler(async (req, res) => {
  (await dbRun('DELETE FROM lessons WHERE id = ?', [Number(req.params.lessonId)]));
  res.json({ ok: true });
}));

// PDF Notes Management
router.get('/courses/:id/notes', asyncHandler(async (req, res) => {
  const cid = Number(req.params.id);
  const notes = (await dbAll('SELECT * FROM course_notes WHERE course_id = ? ORDER BY id DESC', [cid]));
  res.json(notes);
}));

router.post('/courses/:id/notes', asyncHandler(async (req, res) => {
  const cid = Number(req.params.id);
  const { title, description = '', file_url = '', file_size_text = '2.4 MB', is_published = 1 } = req.body || {};
  if (!title) {
    res.status(400).json({ error: 'Note title is required.' });
    return;
  }
  const r = (await dbRun(`
      INSERT INTO course_notes (course_id, title, description, file_url, file_size_text, is_published)
      VALUES (?, ?, ?, ?, ?, ?)
     RETURNING id`, [cid, String(title).trim(), String(description).trim(), String(file_url).trim(), String(file_size_text).trim(), is_published ? 1 : 0]));
  res.status(201).json((await dbGet('SELECT * FROM course_notes WHERE id = ?', [Number(r.lastInsertRowid)])));
}));

router.put('/notes/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { title, description, file_url, file_size_text, is_published } = req.body || {};
  (await dbRun(`
    UPDATE course_notes
    SET title = COALESCE(?, title),
        description = COALESCE(?, description),
        file_url = COALESCE(?, file_url),
        file_size_text = COALESCE(?, file_size_text),
        is_published = COALESCE(?, is_published),
        updated_at = NOW()
    WHERE id = ?
  `, [title !== undefined ? String(title).trim() : null,
  description !== undefined ? String(description).trim() : null,
  file_url !== undefined ? String(file_url).trim() : null,
  file_size_text !== undefined ? String(file_size_text).trim() : null,
  is_published !== undefined ? (is_published ? 1 : 0) : null,
    id]));
  res.json((await dbGet('SELECT * FROM course_notes WHERE id = ?', [id])));
}));

router.delete('/notes/:id', asyncHandler(async (req, res) => {
  (await dbRun('DELETE FROM course_notes WHERE id = ?', [Number(req.params.id)]));
  res.json({ ok: true });
}));

// PDF Management (Master Prompt Requirement)
router.get('/pdfs', asyncHandler(async (_req, res) => {
  const rows = (await dbAll('SELECT * FROM pdfs ORDER BY display_order ASC, id DESC'));
  res.json(rows);
}));

router.post('/pdfs', asyncHandler(async (req, res) => {
  const {
    title,
    description = '',
    category = 'Worksheets & Notes',
    file_url,
    thumbnail_url = '',
    display_order = 1,
    is_published = 1,
  } = req.body || {};
  const file_size_text = req.body?.file_size_text || req.body?.file_size || '118 KB';

  if (!title || !file_url) {
    res.status(400).json({ error: 'Title and PDF file URL are required.' });
    return;
  }

  const r = (await dbRun(`
      INSERT INTO pdfs (title, description, category, file_url, thumbnail_url, file_size_text, display_order, is_published)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     RETURNING id`, [String(title).trim(),
      String(description).trim(),
      String(category).trim(),
      String(file_url).trim(),
      String(thumbnail_url).trim(),
      String(file_size_text).trim(),
      Number(display_order) || 1,
      is_published ? 1 : 0]));

  res.status(201).json((await dbGet('SELECT * FROM pdfs WHERE id = ?', [Number(r.lastInsertRowid)])));
}));

const handleUpdatePdf = asyncHandler(async (req: any, res: any) => {
  const id = Number(req.params.id || req.body.id);
  const { title, description, category, file_url, thumbnail_url, display_order, is_published } = req.body || {};
  const file_size_text = req.body?.file_size_text || req.body?.file_size;
  (await dbRun(`
    UPDATE pdfs
    SET title = COALESCE(?, title),
        description = COALESCE(?, description),
        category = COALESCE(?, category),
        file_url = COALESCE(?, file_url),
        thumbnail_url = COALESCE(?, thumbnail_url),
        file_size_text = COALESCE(?, file_size_text),
        display_order = COALESCE(?, display_order),
        is_published = COALESCE(?, is_published),
        updated_at = NOW()
    WHERE id = ?
  `, [title !== undefined ? String(title).trim() : null,
    description !== undefined ? String(description).trim() : null,
    category !== undefined ? String(category).trim() : null,
    file_url !== undefined ? String(file_url).trim() : null,
    thumbnail_url !== undefined ? String(thumbnail_url).trim() : null,
    file_size_text !== undefined ? String(file_size_text).trim() : null,
    display_order !== undefined ? Number(display_order) : null,
    is_published !== undefined ? (is_published ? 1 : 0) : null,
    id]));
  res.json((await dbGet('SELECT * FROM pdfs WHERE id = ?', [id])));
});
router.put('/pdfs/:id', handleUpdatePdf);
router.put('/pdfs', handleUpdatePdf);

const handleDeletePdf = asyncHandler(async (req: any, res: any) => {
  const id = Number(req.params.id || req.query.id || req.body.id);
  (await dbRun('DELETE FROM pdfs WHERE id = ?', [id]));
  res.json({ ok: true });
});
router.delete('/pdfs/:id', handleDeletePdf);
router.delete('/pdfs', handleDeletePdf);

// Video Management (Master Prompt Requirement)
router.get('/videos', asyncHandler(async (_req, res) => {
  const rows = (await dbAll('SELECT * FROM videos ORDER BY display_order ASC, id DESC'));
  res.json(rows);
}));

router.post('/videos', asyncHandler(async (req, res) => {
  const {
    title,
    description = '',
    video_url,
    thumbnail_url = '',
    category = 'Featured Overview',
    placement = 'homepage_featured',
    display_order = 1,
    is_published = 1,
  } = req.body || {};
  const duration_text = req.body?.duration_text || req.body?.duration || '02:15';

  if (!title || !video_url) {
    res.status(400).json({ error: 'Title and Video URL are required.' });
    return;
  }

  const r = (await dbRun(`
      INSERT INTO videos (title, description, video_url, thumbnail_url, category, placement, duration_text, display_order, is_published)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     RETURNING id`, [String(title).trim(),
      String(description).trim(),
      String(video_url).trim(),
      String(thumbnail_url).trim(),
      String(category).trim(),
      String(placement).trim(),
      String(duration_text).trim(),
      Number(display_order) || 1,
      is_published ? 1 : 0]));

  res.status(201).json((await dbGet('SELECT * FROM videos WHERE id = ?', [Number(r.lastInsertRowid)])));
}));

const handleUpdateVideo = asyncHandler(async (req: any, res: any) => {
  const id = Number(req.params.id || req.body.id);
  const { title, description, video_url, thumbnail_url, category, placement, display_order, is_published } = req.body || {};
  const duration_text = req.body?.duration_text || req.body?.duration;
  (await dbRun(`
    UPDATE videos
    SET title = COALESCE(?, title),
        description = COALESCE(?, description),
        video_url = COALESCE(?, video_url),
        thumbnail_url = COALESCE(?, thumbnail_url),
        category = COALESCE(?, category),
        placement = COALESCE(?, placement),
        duration_text = COALESCE(?, duration_text),
        display_order = COALESCE(?, display_order),
        is_published = COALESCE(?, is_published),
        updated_at = NOW()
    WHERE id = ?
  `, [title !== undefined ? String(title).trim() : null,
    description !== undefined ? String(description).trim() : null,
    video_url !== undefined ? String(video_url).trim() : null,
    thumbnail_url !== undefined ? String(thumbnail_url).trim() : null,
    category !== undefined ? String(category).trim() : null,
    placement !== undefined ? String(placement).trim() : null,
    duration_text !== undefined ? String(duration_text).trim() : null,
    display_order !== undefined ? Number(display_order) : null,
    is_published !== undefined ? (is_published ? 1 : 0) : null,
    id]));
  res.json((await dbGet('SELECT * FROM videos WHERE id = ?', [id])));
});
router.put('/videos/:id', handleUpdateVideo);
router.put('/videos', handleUpdateVideo);

const handleDeleteVideo = asyncHandler(async (req: any, res: any) => {
  const id = Number(req.params.id || req.query.id || req.body.id);
  (await dbRun('DELETE FROM videos WHERE id = ?', [id]));
  res.json({ ok: true });
});
router.delete('/videos/:id', handleDeleteVideo);
router.delete('/videos', handleDeleteVideo);

// 6. Batches Management
router.get('/batches', asyncHandler(async (_req, res) => {
  res.json(
    (await dbAll(`
        SELECT b.*, c.title as course_title, u.full_name as faculty_name
        FROM batches b
        JOIN courses c ON c.id = b.course_id
        LEFT JOIN users u ON u.id = b.faculty_id
        ORDER BY b.id DESC
      `))
  );
}));

router.post('/batches', asyncHandler(async (req, res) => {
  const { name, course_id, faculty_id, start_date, end_date, timings, total_seats = 60, status = 'upcoming' } = req.body || {};
  if (!name || !course_id || !start_date || !end_date || !timings) {
    res.status(400).json({ error: 'All batch fields are required.' });
    return;
  }
  const r = (await dbRun(`
      INSERT INTO batches (name, course_id, faculty_id, start_date, end_date, timings, total_seats, enrolled_seats, status, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 1)
     RETURNING id`, [name, Number(course_id), faculty_id ? Number(faculty_id) : null, start_date, end_date, timings, Number(total_seats), status]));
  res.status(201).json((await dbGet('SELECT * FROM batches WHERE id = ?', [Number(r.lastInsertRowid)])));
}));

router.put('/batches/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const b = req.body || {};
  (await dbRun(`
    UPDATE batches
    SET name = COALESCE(?, name),
        course_id = COALESCE(?, course_id),
        faculty_id = COALESCE(?, faculty_id),
        start_date = COALESCE(?, start_date),
        end_date = COALESCE(?, end_date),
        timings = COALESCE(?, timings),
        total_seats = COALESCE(?, total_seats),
        status = COALESCE(?, status),
        is_active = COALESCE(?, is_active)
    WHERE id = ?
  `, [b.name ?? null,
  b.course_id ? Number(b.course_id) : null,
  b.faculty_id ? Number(b.faculty_id) : null,
  b.start_date ?? null,
  b.end_date ?? null,
  b.timings ?? null,
  b.total_seats ? Number(b.total_seats) : null,
  b.status ?? null,
  b.is_active !== undefined ? (b.is_active ? 1 : 0) : null,
    id]));
  res.json((await dbGet('SELECT * FROM batches WHERE id = ?', [id])));
}));

router.delete('/batches/:id', asyncHandler(async (req, res) => {
  (await dbRun('DELETE FROM batches WHERE id = ?', [Number(req.params.id)]));
  res.json({ ok: true });
}));

// 7. Live Classes Management
router.get('/live-classes', asyncHandler(async (_req, res) => {
  res.json(
    (await dbAll(`
        SELECT lc.*, c.title as course_title, u.full_name as faculty_name
        FROM live_classes lc
        JOIN courses c ON c.id = lc.course_id
        LEFT JOIN users u ON u.id = lc.faculty_id
        ORDER BY lc.scheduled_at DESC
      `))
  );
}));

router.post('/live-classes', asyncHandler(async (req, res) => {
  const { title, course_id, faculty_id, scheduled_at, duration_minutes = 60, meeting_url, status = 'upcoming', recording_url = '', description = '' } = req.body || {};
  if (!title || !course_id || !scheduled_at || !meeting_url) {
    res.status(400).json({ error: 'Title, course, scheduled time, and meeting URL are required.' });
    return;
  }
  const r = (await dbRun(`
      INSERT INTO live_classes (title, course_id, faculty_id, scheduled_at, duration_minutes, meeting_url, status, recording_url, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     RETURNING id`, [title, Number(course_id), faculty_id ? Number(faculty_id) : null, scheduled_at, Number(duration_minutes), meeting_url, status, recording_url, description]));
  res.status(201).json((await dbGet('SELECT * FROM live_classes WHERE id = ?', [Number(r.lastInsertRowid)])));
}));

router.put('/live-classes/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const b = req.body || {};
  (await dbRun(`
    UPDATE live_classes
    SET title = COALESCE(?, title),
        course_id = COALESCE(?, course_id),
        faculty_id = COALESCE(?, faculty_id),
        scheduled_at = COALESCE(?, scheduled_at),
        duration_minutes = COALESCE(?, duration_minutes),
        meeting_url = COALESCE(?, meeting_url),
        status = COALESCE(?, status),
        recording_url = COALESCE(?, recording_url),
        description = COALESCE(?, description)
    WHERE id = ?
  `, [b.title ?? null,
  b.course_id ? Number(b.course_id) : null,
  b.faculty_id ? Number(b.faculty_id) : null,
  b.scheduled_at ?? null,
  b.duration_minutes ? Number(b.duration_minutes) : null,
  b.meeting_url ?? null,
  b.status ?? null,
  b.recording_url ?? null,
  b.description ?? null,
    id]));
  res.json((await dbGet('SELECT * FROM live_classes WHERE id = ?', [id])));
}));

router.delete('/live-classes/:id', asyncHandler(async (req, res) => {
  (await dbRun('DELETE FROM live_classes WHERE id = ?', [Number(req.params.id)]));
  res.json({ ok: true });
}));

// 8. Tests & Quizzes Management
router.get('/tests', asyncHandler(async (_req, res) => {
  res.json(
    (await dbAll(`
        SELECT t.*, c.title as course_title, cat.name as category_name,
               (SELECT COUNT(*) FROM questions q WHERE q.test_id = t.id) as questions_count,
               (SELECT COUNT(*) FROM test_attempts ta WHERE ta.test_id = t.id) as attempts_count
        FROM tests t
        LEFT JOIN courses c ON c.id = t.course_id
        LEFT JOIN categories cat ON cat.id = c.category_id
        ORDER BY t.id DESC
      `))
  );
}));

router.post('/tests', asyncHandler(async (req, res) => {
  const {
    title,
    course_id,
    description = '',
    duration_minutes = 20,
    total_marks = 10,
    pass_marks = 5,
    negative_marks = 0,
    difficulty = 'Medium',
    is_published = 1,
    price = 0,
    certificate_enabled = 0,
    expiry_date = '',
  } = req.body || {};
  if (!title) {
    res.status(400).json({ error: 'Quiz title is required.' });
    return;
  }
  const r = (await dbRun(`
      INSERT INTO tests (title, course_id, description, duration_minutes, total_marks, pass_marks, negative_marks, difficulty, is_published, price, certificate_enabled, expiry_date, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     RETURNING id`, [title,
      course_id ? Number(course_id) : null,
      description,
      Number(duration_minutes),
      Number(total_marks),
      Number(pass_marks),
      Number(negative_marks),
      difficulty,
      is_published !== undefined && is_published !== null ? (is_published ? 1 : 0) : 1,
      Number(price || 0),
      certificate_enabled ? 1 : 0,
      String(expiry_date || ''),
      req.user!.id]));
  res.status(201).json((await dbGet('SELECT * FROM tests WHERE id = ?', [Number(r.lastInsertRowid)])));
}));

router.put('/tests/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const b = req.body || {};
  (await dbRun(`
    UPDATE tests
    SET title = COALESCE(?, title),
        course_id = COALESCE(?, course_id),
        description = COALESCE(?, description),
        duration_minutes = COALESCE(?, duration_minutes),
        total_marks = COALESCE(?, total_marks),
        pass_marks = COALESCE(?, pass_marks),
        negative_marks = COALESCE(?, negative_marks),
        difficulty = COALESCE(?, difficulty),
        is_published = COALESCE(?, is_published),
        price = COALESCE(?, price),
        certificate_enabled = COALESCE(?, certificate_enabled),
        expiry_date = COALESCE(?, expiry_date)
    WHERE id = ?
  `, [b.title ?? null,
  b.course_id !== undefined ? (b.course_id ? Number(b.course_id) : null) : null,
  b.description ?? null,
  b.duration_minutes !== undefined ? Number(b.duration_minutes) : null,
  b.total_marks !== undefined ? Number(b.total_marks) : null,
  b.pass_marks !== undefined ? Number(b.pass_marks) : null,
  b.negative_marks !== undefined ? Number(b.negative_marks) : null,
  b.difficulty ?? null,
  b.is_published !== undefined ? (b.is_published ? 1 : 0) : null,
  b.price !== undefined ? Number(b.price) : null,
  b.certificate_enabled !== undefined ? (b.certificate_enabled ? 1 : 0) : null,
  b.expiry_date !== undefined ? String(b.expiry_date) : null,
    id]));
  res.json((await dbGet('SELECT * FROM tests WHERE id = ?', [id])));
}));

router.delete('/tests/:id', asyncHandler(async (req, res) => {
  (await dbRun('DELETE FROM tests WHERE id = ?', [Number(req.params.id)]));
  res.json({ ok: true });
}));

router.get('/tests/:id/questions', asyncHandler(async (req, res) => {
  const qs = (await dbAll('SELECT * FROM questions WHERE test_id = ? ORDER BY sort_order ASC, id ASC', [Number(req.params.id)])) as Array<Record<string, unknown>>;
  res.json(qs.map((q) => ({ ...q, options: JSON.parse(String(q.options_json || '[]')) })));
}));

router.post('/tests/:id/questions', asyncHandler(async (req, res) => {
  const testId = Number(req.params.id);
  const { question_text, options, correct_index = 0, marks = 2, explanation = '' } = req.body || {};
  if (!question_text || !Array.isArray(options) || options.length < 2) {
    res.status(400).json({ error: 'Question text and at least 2 options are required.' });
    return;
  }
  const r = (await dbRun('INSERT INTO questions (test_id, question_text, options_json, correct_index, marks, explanation, sort_order) VALUES (?, ?, ?, ?, ?, ?, 99) RETURNING id', [testId, question_text, JSON.stringify(options), Number(correct_index), Number(marks), explanation]));
  res.status(201).json((await dbGet('SELECT * FROM questions WHERE id = ?', [Number(r.lastInsertRowid)])));
}));

router.delete('/questions/:qid', asyncHandler(async (req, res) => {
  (await dbRun('DELETE FROM questions WHERE id = ?', [Number(req.params.qid)]));
  res.json({ ok: true });
}));

// 9. Subscriptions Management
router.get('/plans', asyncHandler(async (_req, res) => {
  const rows = (await dbAll('SELECT * FROM subscription_plans ORDER BY price ASC')) as Array<Record<string, unknown>>;
  res.json(rows.map((p) => ({ ...p, features: JSON.parse(String(p.features_json || '[]')) })));
}));

router.post('/plans', asyncHandler(async (req, res) => {
  const { name, price, duration_months, badge = '', features = [], is_popular = 0, is_active = 1 } = req.body || {};
  if (!name || price === undefined || !duration_months) {
    res.status(400).json({ error: 'Plan name, price, and duration are required.' });
    return;
  }
  const slug = String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + crypto.randomInt(10, 99);
  const r = (await dbRun('INSERT INTO subscription_plans (name, slug, price, duration_months, badge, features_json, is_popular, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id', [name, slug, Number(price), Number(duration_months), badge, JSON.stringify(features), is_popular ? 1 : 0, is_active ? 1 : 0]));
  res.status(201).json((await dbGet('SELECT * FROM subscription_plans WHERE id = ?', [Number(r.lastInsertRowid)])));
}));

router.put('/plans/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const b = req.body || {};
  (await dbRun(`
    UPDATE subscription_plans
    SET name = COALESCE(?, name),
        price = COALESCE(?, price),
        duration_months = COALESCE(?, duration_months),
        badge = COALESCE(?, badge),
        features_json = COALESCE(?, features_json),
        is_popular = COALESCE(?, is_popular),
        is_active = COALESCE(?, is_active)
    WHERE id = ?
  `, [b.name ?? null,
  b.price !== undefined ? Number(b.price) : null,
  b.duration_months !== undefined ? Number(b.duration_months) : null,
  b.badge ?? null,
  b.features ? JSON.stringify(b.features) : null,
  b.is_popular !== undefined ? (b.is_popular ? 1 : 0) : null,
  b.is_active !== undefined ? (b.is_active ? 1 : 0) : null,
    id]));
  res.json((await dbGet('SELECT * FROM subscription_plans WHERE id = ?', [id])));
}));

router.delete('/plans/:id', asyncHandler(async (req, res) => {
  (await dbRun('DELETE FROM subscription_plans WHERE id = ?', [Number(req.params.id)]));
  res.json({ ok: true });
}));

// 10. Payments & Enrollments Management
const normalizePaymentStatus = (raw?: string): string | null => {
  if (!raw || raw === 'all') return null;
  const low = raw.toLowerCase();
  if (low === 'created' || low === 'pending') return 'pending';
  if (low === 'processing') return 'processing';
  if (low === 'success' || low === 'successful') return 'successful';
  if (low === 'failed') return 'failed';
  if (low === 'cancelled' || low === 'canceled') return 'cancelled';
  if (low === 'refunded') return 'refunded';
  return null;
};

const toDisplayPaymentStatus = (dbStatus: string): string => {
  switch (dbStatus) {
    case 'successful':
      return 'Success';
    case 'processing':
      return 'Processing';
    case 'pending':
      return 'Pending';
    case 'failed':
      return 'Failed';
    case 'cancelled':
      return 'Cancelled';
    case 'refunded':
      return 'Refunded';
    default:
      return dbStatus;
  }
};

router.get('/payments', asyncHandler(async (req, res) => {
  const { status = 'all' } = req.query;
  let sql = `
    SELECT p.*, u.full_name as student_name, u.email as student_email
    FROM payments p
    JOIN users u ON u.id = p.student_id
  `;
  const params: string[] = [];
  const norm = normalizePaymentStatus(String(status));
  if (norm) {
    sql += ' WHERE p.status = ?';
    params.push(norm);
  }
  sql += ' ORDER BY p.created_at DESC';
  const rows = (await dbAll(sql, params)) as Array<Record<string, unknown>>;
  res.json(
    rows.map((p) => ({
      ...p,
      display_status: toDisplayPaymentStatus(String(p.status || 'pending')),
    }))
  );
}));

router.patch('/payments/:id/status', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body || {};
  const norm = normalizePaymentStatus(String(status || ''));
  if (!norm) {
    res.status(400).json({ error: 'Invalid payment status.' });
    return;
  }
  const payment = (await dbGet('SELECT * FROM payments WHERE id = ?', [id])) as
    | { id: number; student_id: number; item_type: string; item_id: number; item_title: string; status: string }
    | undefined;
  if (!payment) {
    res.status(404).json({ error: 'Payment not found.' });
    return;
  }

  (await dbRun('UPDATE payments SET status = ? WHERE id = ?', [norm, id]));

  // Strict business rule: ONLY Success / successful activates course enrollment
  if (norm === 'successful' && payment.item_type === 'course') {
    const enrolled = (await dbGet('SELECT id FROM enrollments WHERE student_id = ? AND course_id = ?', [payment.student_id, payment.item_id]));
    if (!enrolled) {
      (await dbRun(`
        INSERT INTO enrollments (student_id, course_id, status, progress_percent, completed_lessons_json)
        VALUES (?, ?, 'active', 0, '[]')
      `, [payment.student_id, payment.item_id]));
      (await dbRun(`
        INSERT INTO notifications (user_id, title, message, type)
        VALUES (?, 'Payment Confirmed!', ?, 'success')
      `, [payment.student_id, `Your payment for "${payment.item_title}" is confirmed and course access is now active.`]));
    }
  }
  res.json({ ok: true, status: norm, display_status: toDisplayPaymentStatus(norm) });
}));

router.get('/enrollments', asyncHandler(async (_req, res) => {
  res.json(
    (await dbAll(`
        SELECT e.*, u.full_name as student_name, u.email as student_email, c.title as course_title
        FROM enrollments e
        JOIN users u ON u.id = e.student_id
        JOIN courses c ON c.id = e.course_id
        ORDER BY e.enrolled_at DESC
      `))
  );
}));

// 11. Referrals & Certificates Management
router.get('/referrals', asyncHandler(async (_req, res) => {
  const signupReferrals = (await dbAll(`
      SELECT r.id, r.referral_code, r.status, r.reward_amount, r.created_at,
             u1.full_name as referrer_name, u2.full_name as referred_name
      FROM referrals r
      JOIN users u1 ON u1.id = r.referrer_id
      JOIN users u2 ON u2.id = r.referred_user_id
      ORDER BY r.created_at DESC
    `));

  const courseReferrals = (await dbAll(`
      SELECT crl.id, crl.course_id, crl.referral_code, crl.clicks, crl.enrollments_count,
             crl.status, crl.created_at,
             c.title as course_title, c.slug as course_slug,
             COALESCE(u.full_name, 'Guest / Public Share') as referrer_name
      FROM course_referral_links crl
      JOIN courses c ON c.id = crl.course_id
      LEFT JOIN users u ON u.id = crl.referrer_id
      ORDER BY crl.clicks DESC, crl.created_at DESC
    `)) as Array<{ clicks: number; enrollments_count: number;[k: string]: unknown }>;

  const courseReferralsWithRates = courseReferrals.map((r) => ({
    ...r,
    conversion_rate:
      Number(r.clicks) > 0 ? Math.min(100, Math.round((Number(r.enrollments_count) / Number(r.clicks)) * 100)) : 0,
  }));

  const eventSummary = (await dbAll('SELECT event_type, COUNT(*) as count FROM referral_events GROUP BY event_type'));

  const attributions = (await dbAll(`
      SELECT cra.id, cra.referral_code, cra.created_at, c.title as course_title,
             COALESCE(c.discount_price, c.price, 0) as course_price,
             COALESCE(u1.full_name, 'Guest / Direct') as referrer_name,
             u2.full_name as referred_student_name,
             COALESCE(p.final_amount, 0) as paid_amount
      FROM course_referral_attributions cra
      JOIN courses c ON c.id = cra.course_id
      LEFT JOIN users u1 ON u1.id = cra.referrer_id
      JOIN users u2 ON u2.id = cra.referred_user_id
      LEFT JOIN payments p ON p.id = cra.payment_id AND p.status = 'successful'
      ORDER BY cra.created_at DESC
      LIMIT 50
    `)) as Array<{ paid_amount: number }>;

  const totalReferrals = signupReferrals.length + courseReferrals.length;
  const totalClicks = courseReferrals.reduce((acc, r) => acc + Number(r.clicks || 0), 0);
  const registeredLeads = signupReferrals.length + attributions.length;
  const successfulEnrollments = courseReferrals.reduce((acc, r) => acc + Number(r.enrollments_count || 0), 0);
  const referralRevenue = attributions.reduce((acc, a) => acc + Number(a.paid_amount || 0), 0);
  const signupRewards = signupReferrals.reduce(
    (acc, r) => acc + Number((r as Record<string, unknown>).reward_amount || 0),
    0
  );
  const redemptionRewardsRow = (await dbGet('SELECT COALESCE(SUM(amount), 0) as total FROM redemptions WHERE LOWER(status) != ?', ['rejected'])) as { total: number };

  const cmsRow = (await dbGet("SELECT value_json FROM cms_settings WHERE key = 'referral'")) as
    | { value_json: string }
    | undefined;
  const referralSettings = cmsRow ? (JSON.parse(cmsRow.value_json) as Record<string, unknown>) : {};
  const perEnrollReward = Number(referralSettings.rewardAmount ?? 150);
  const rewardsGenerated = Math.max(
    signupRewards + successfulEnrollments * perEnrollReward,
    Number(redemptionRewardsRow?.total || 0)
  );

  res.json({
    summary: {
      totalReferrals,
      totalClicks,
      registeredLeads,
      successfulEnrollments,
      referralRevenue,
      rewardsGenerated,
    },
    signupReferrals,
    courseReferrals: courseReferralsWithRates,
    eventSummary,
    attributions,
    referralSettings,
  });
}));

router.patch('/referrals/:id/status', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body || {};
  if (!['active', 'paused'].includes(status)) {
    res.status(400).json({ error: 'Invalid status.' });
    return;
  }
  (await dbRun('UPDATE course_referral_links SET status = ? WHERE id = ?', [status, id]));
  res.json({ ok: true });
}));

router.get('/certificates', asyncHandler(async (_req, res) => {
  res.json((await dbAll('SELECT * FROM certificates ORDER BY issued_at DESC')));
}));

router.post('/certificates', asyncHandler(async (req, res) => {
  const { student_id, course_id } = req.body || {};
  if (!student_id || !course_id) {
    res.status(400).json({ error: 'Student and course are required.' });
    return;
  }
  const student = (await dbGet('SELECT id, full_name FROM users WHERE id = ?', [Number(student_id)])) as
    | { id: number; full_name: string }
    | undefined;
  const course = (await dbGet('SELECT id, title FROM courses WHERE id = ?', [Number(course_id)])) as
    | { id: number; title: string }
    | undefined;
  if (!student || !course) {
    res.status(404).json({ error: 'Student or course not found.' });
    return;
  }
  const existing = (await dbGet('SELECT * FROM certificates WHERE student_id = ? AND course_id = ?', [student.id, course.id]));
  if (existing) {
    res.json(existing);
    return;
  }
  const certificateCode = `OLRN-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const r = (await dbRun(`
      INSERT INTO certificates (certificate_code, student_id, course_id, student_name, course_title, status)
      VALUES (?, ?, ?, ?, ?, 'valid')
     RETURNING id`, [certificateCode, student.id, course.id, student.full_name, course.title]));
  (await dbRun(`
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (?, 'Certificate Issued!', ?, 'success')
  `, [student.id, `Your completion certificate (${certificateCode}) for "${course.title}" is now available.`]));
  res.status(201).json((await dbGet('SELECT * FROM certificates WHERE id = ?', [Number(r.lastInsertRowid)])));
}));

router.patch('/certificates/:id/status', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body || {};
  if (!['valid', 'revoked'].includes(status)) {
    res.status(400).json({ error: 'Invalid status.' });
    return;
  }
  (await dbRun('UPDATE certificates SET status = ? WHERE id = ?', [status, id]));
  res.json({ ok: true });
}));

router.delete('/certificates/:id', asyncHandler(async (req, res) => {
  (await dbRun('DELETE FROM certificates WHERE id = ?', [Number(req.params.id)]));
  res.json({ ok: true });
}));

// 11b. Redemptions Management
const normalizeRedemptionStatus = (raw?: string): string | null => {
  if (!raw || raw === 'all') return null;
  const low = raw.toLowerCase();
  if (low === 'pending') return 'Pending';
  if (low === 'processing') return 'Processing';
  if (low === 'approved') return 'Approved';
  if (low === 'processed') return 'Processed';
  if (low === 'paid') return 'Paid';
  if (low === 'rejected') return 'Rejected';
  if (low === 'failed') return 'Failed';
  return null;
};

router.get('/redemptions', asyncHandler(async (req, res) => {
  const { status = 'all' } = req.query;
  let sql = `
    SELECT red.*, red.account_reference as account_details,
           u.full_name as user_name, u.email as user_email, COALESCE(u.credits, 0) as user_credits
    FROM redemptions red
    JOIN users u ON u.id = red.user_id
  `;
  const params: string[] = [];
  const norm = normalizeRedemptionStatus(String(status));
  if (norm) {
    sql += ' WHERE red.status = ?';
    params.push(norm);
  }
  sql += ' ORDER BY red.created_at DESC';
  res.json((await dbAll(sql, params)));
}));

router.post('/redemptions', asyncHandler(async (req, res) => {
  const { user_id, amount, method = 'UPI', account_reference, account_details = '', notes = '' } = req.body || {};
  if (!user_id || !amount || Number(amount) <= 0) {
    res.status(400).json({ error: 'Valid user and positive amount are required.' });
    return;
  }
  const ref = String(account_reference ?? account_details ?? '');
  const r = (await dbRun(`
      INSERT INTO redemptions (user_id, amount, method, account_reference, status, notes)
      VALUES (?, ?, ?, ?, 'Pending', ?)
     RETURNING id`, [Number(user_id), Number(amount), String(method), ref, String(notes)]));
  res.status(201).json((await dbGet('SELECT *, account_reference as account_details FROM redemptions WHERE id = ?', [Number(r.lastInsertRowid)])));
}));

router.patch('/redemptions/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { status, notes } = req.body || {};
  const norm = status ? normalizeRedemptionStatus(String(status)) : null;
  if (status && !norm) {
    res.status(400).json({ error: 'Invalid redemption status.' });
    return;
  }

  // Deduct credits from user wallet when admin marks redemption as Paid/Approved
  if (norm && (norm.toLowerCase() === 'paid' || norm.toLowerCase() === 'approved')) {
    const existing = (await dbGet('SELECT user_id, amount, status FROM redemptions WHERE id = ?', [id])) as
      | { user_id: number; amount: number; status: string }
      | undefined;
    if (existing && existing.status.toLowerCase() !== 'paid' && existing.status.toLowerCase() !== 'approved') {
      // Only deduct once — skip if already paid/approved
      (await dbRun(
        'UPDATE users SET credits = GREATEST(0, COALESCE(credits, 0) - ?) WHERE id = ?',
        [Number(existing.amount), existing.user_id]
      ));
      (await dbRun(
        `INSERT INTO notifications (user_id, title, message, type)
         VALUES (?, 'Reward Redemption Processed!', ?, 'success')`,
        [existing.user_id, `Your redemption request of ₹${existing.amount} has been ${norm}. Credits deducted from your wallet.`]
      ));
    }
  }

  (await dbRun(`
    UPDATE redemptions
    SET status = COALESCE(?, status),
        notes = COALESCE(?, notes),
        updated_at = NOW()
    WHERE id = ?
  `, [norm, notes ?? null, id]));
  res.json((await dbGet('SELECT *, account_reference as account_details FROM redemptions WHERE id = ?', [id])));
}));

// 12. Contact Enquiries Management
router.get('/enquiries', asyncHandler(async (_req, res) => {
  res.json((await dbAll('SELECT * FROM contact_enquiries ORDER BY created_at DESC')));
}));

router.patch('/enquiries/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { status, admin_notes } = req.body || {};
  (await dbRun('UPDATE contact_enquiries SET status = COALESCE(?, status), admin_notes = COALESCE(?, admin_notes) WHERE id = ?', [status ?? null,
  admin_notes ?? null,
    id]));
  res.json({ ok: true });
}));

// 13. Website CMS Management
router.put('/cms', asyncHandler(async (req, res) => {
  const payload = req.body || {};
  const upsertSql = `
    INSERT INTO cms_settings (key, value_json, updated_at)
    VALUES (?, ?, NOW())
    ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = NOW()
  `;
  for (const [k, v] of Object.entries(payload)) {
    await dbRun(upsertSql, [k, JSON.stringify(v)]);
  }
  const rows = (await dbAll('SELECT key, value_json FROM cms_settings')) as Array<{ key: string; value_json: string }>;
  const cms: Record<string, unknown> = {};
  for (const r of rows) cms[r.key] = JSON.parse(r.value_json);
  res.json(cms);
}));

// 14. Safe Demo Cleanup Endpoint (Section 39)
router.post('/cleanup-demo', asyncHandler(async (_req, res) => {
  const result = await runSafeDemoCleanup();
  res.json({ ok: true, ...result });
}));

export default router;

