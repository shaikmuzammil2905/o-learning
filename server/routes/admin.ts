import { Router } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import db, { runSafeDemoCleanup } from '../db.js';
import { hashPassword, requireAuth, requireRole } from '../auth.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));

function calcMonthlyDelta(thisMonth: number, prevMonth: number): number | null {
  // Handle division by zero cleanly: return 0 when both are zero, null when prior baseline is absent (never fake +100%)
  if (prevMonth === 0) return thisMonth === 0 ? 0 : null;
  return Math.round(((thisMonth - prevMonth) / prevMonth) * 100);
}

// 1. Analytics & Dashboard Overview (100% live DB metrics & monthly comparison)
router.get('/dashboard', (_req, res) => {
  const totalCourses = (db.prepare('SELECT COUNT(*) as c FROM courses').get() as { c: number }).c;
  const totalCoursesThisMonth = (db.prepare("SELECT COUNT(*) as c FROM courses WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')").get() as { c: number }).c;
  const totalCoursesPrevMonth = (db.prepare("SELECT COUNT(*) as c FROM courses WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', date('now', '-1 month'))").get() as { c: number }).c;

  const publishedCourses = (db.prepare('SELECT COUNT(*) as c FROM courses WHERE is_published = 1').get() as { c: number }).c;
  const publishedThisMonth = (db.prepare("SELECT COUNT(*) as c FROM courses WHERE is_published = 1 AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')").get() as { c: number }).c;
  const publishedPrevMonth = (db.prepare("SELECT COUNT(*) as c FROM courses WHERE is_published = 1 AND strftime('%Y-%m', created_at) = strftime('%Y-%m', date('now', '-1 month'))").get() as { c: number }).c;

  // Exclude root/bootstrap admin accounts so user KPI honestly starts at 0 before customers register
  const totalUsers = (db.prepare("SELECT COUNT(*) as c FROM users WHERE role != 'admin'").get() as { c: number }).c;
  const totalStudents = (db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'student'").get() as { c: number }).c;
  const usersThisMonth = (db.prepare("SELECT COUNT(*) as c FROM users WHERE role != 'admin' AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')").get() as { c: number }).c;
  const usersPrevMonth = (db.prepare("SELECT COUNT(*) as c FROM users WHERE role != 'admin' AND strftime('%Y-%m', created_at) = strftime('%Y-%m', date('now', '-1 month'))").get() as { c: number }).c;

  // ONLY verified successful payments contribute to revenue
  const totalRevenue = (db.prepare("SELECT COALESCE(SUM(final_amount), 0) as s FROM payments WHERE status = 'successful'").get() as { s: number }).s;
  const revenueThisMonth = (db.prepare("SELECT COALESCE(SUM(final_amount), 0) as s FROM payments WHERE status = 'successful' AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')").get() as { s: number }).s;
  const revenuePrevMonth = (db.prepare("SELECT COALESCE(SUM(final_amount), 0) as s FROM payments WHERE status = 'successful' AND strftime('%Y-%m', created_at) = strftime('%Y-%m', date('now', '-1 month'))").get() as { s: number }).s;

  const enrollmentsCount = (db.prepare('SELECT COUNT(*) as c FROM enrollments').get() as { c: number }).c;
  const successfulPaymentsCount = (db.prepare("SELECT COUNT(*) as c FROM payments WHERE status = 'successful'").get() as { c: number }).c;
  const pendingPayments = (db.prepare("SELECT COUNT(*) as c FROM payments WHERE status IN ('pending', 'processing')").get() as { c: number }).c;
  const failedPaymentsCount = (db.prepare("SELECT COUNT(*) as c FROM payments WHERE status = 'failed'").get() as { c: number }).c;
  const cancelledPaymentsCount = (db.prepare("SELECT COUNT(*) as c FROM payments WHERE status = 'cancelled'").get() as { c: number }).c;
  const refundedPaymentsCount = (db.prepare("SELECT COUNT(*) as c FROM payments WHERE status = 'refunded'").get() as { c: number }).c;
  const referralsCount =
    (db.prepare('SELECT COUNT(*) as c FROM course_referral_links').get() as { c: number }).c +
    (db.prepare('SELECT COUNT(*) as c FROM referrals').get() as { c: number }).c;
  const certificatesCount = (db.prepare('SELECT COUNT(*) as c FROM certificates').get() as { c: number }).c;
  const quizAttemptsCount = (db.prepare('SELECT COUNT(*) as c FROM test_attempts').get() as { c: number }).c;
  const redemptionRequestsCount = (db.prepare('SELECT COUNT(*) as c FROM redemptions').get() as { c: number }).c;

  const todaysEnrollments = (db.prepare("SELECT COUNT(*) as c FROM enrollments WHERE date(enrolled_at) = date('now')").get() as { c: number }).c;
  const liveClassesCount = (db.prepare("SELECT COUNT(*) as c FROM live_classes WHERE status IN ('live', 'upcoming')").get() as { c: number }).c;

  const coursePerformance = db
    .prepare(`
      SELECT c.id, c.title, c.is_published,
             (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) as enrollments,
             (SELECT COALESCE(ROUND(AVG(e.progress_percent), 0), 0) FROM enrollments e WHERE e.course_id = c.id) as avg_progress,
             (SELECT COALESCE(SUM(p.final_amount), 0) FROM payments p WHERE p.item_type = 'course' AND p.item_id = c.id AND p.status = 'successful') as revenue
      FROM courses c
      ORDER BY enrollments DESC, c.id ASC
      LIMIT 8
    `)
    .all();

  const recentPayments = db
    .prepare(`
      SELECT p.*, u.full_name as student_name, u.email as student_email
      FROM payments p
      JOIN users u ON u.id = p.student_id
      ORDER BY p.created_at DESC
      LIMIT 8
    `)
    .all();

  const recentActivity = db
    .prepare(`
      SELECT e.enrolled_at as ts, u.full_name as student_name, c.title as course_title, e.progress_percent
      FROM enrollments e
      JOIN users u ON u.id = e.student_id
      JOIN courses c ON c.id = e.course_id
      ORDER BY e.enrolled_at DESC
      LIMIT 8
    `)
    .all();

  const rawMethodRows = db
    .prepare(`
      SELECT method, COUNT(*) as count, COUNT(*) as txns, COALESCE(SUM(final_amount), 0) as total
      FROM payments WHERE status = 'successful'
      GROUP BY method
    `)
    .all() as Array<{ method: string; count: number; txns: number; total: number }>;

  const methodMap = new Map(rawMethodRows.map((r) => [r.method, r]));
  const revenueByMethod = ['UPI', 'Card', 'NetBanking', 'Wallet'].map((method) => {
    const found = methodMap.get(method);
    return found || { method, count: 0, txns: 0, total: 0 };
  });

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
  });
});

// Cloudinary Upload Signature (signed only if secret is configured; never exposes keys to client)
router.post('/cloudinary-signature', (req, res) => {
  const apiKey = process.env.CLOUDINARY_API_KEY || '';
  const apiSecret = process.env.CLOUDINARY_API_SECRET || '';
  const preset = process.env.CLOUDINARY_UPLOAD_PRESET || process.env.VITE_CLOUDINARY_UPLOAD_PRESET || '';
  const folder = String(req.body?.folder || 'o-learning');

  if (!apiKey || !apiSecret) {
    res.json({ signed: false });
    return;
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const toSign = `folder=${folder}&timestamp=${timestamp}${preset ? `&upload_preset=${preset}` : ''}${apiSecret}`;
  const signature = crypto.createHash('sha1').update(toSign).digest('hex');
  res.json({ signed: true, signature, timestamp, apiKey });
});

// Local/Fallback Secure Image Upload Endpoint
router.post('/upload', (req, res) => {
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
});

// 2. Students Management
router.get('/students', (req, res) => {
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
  res.json(db.prepare(sql).all(...params));
});

router.get('/students/:id', (req, res) => {
  const id = Number(req.params.id);
  const student = db
    .prepare('SELECT id, full_name, email, mobile, referral_code, is_active, created_at FROM users WHERE id = ? AND role = ?')
    .get(id, 'student');
  if (!student) {
    res.status(404).json({ error: 'Student not found.' });
    return;
  }
  const enrollments = db
    .prepare('SELECT e.*, c.title as course_title FROM enrollments e JOIN courses c ON c.id = e.course_id WHERE e.student_id = ?')
    .all(id);
  const payments = db.prepare('SELECT * FROM payments WHERE student_id = ? ORDER BY created_at DESC').all(id);
  const certificates = db.prepare('SELECT * FROM certificates WHERE student_id = ?').all(id);
  res.json({ student, enrollments, payments, certificates });
});

router.patch('/students/:id/status', (req, res) => {
  const id = Number(req.params.id);
  const { is_active } = req.body || {};
  db.prepare("UPDATE users SET is_active = ? WHERE id = ? AND role = 'student'").run(is_active ? 1 : 0, id);
  res.json({ ok: true });
});

// 2b. Unified Users Management (Students, Faculty, Admins)
const mapRoleToDb = (r?: string): string | null => {
  if (!r) return null;
  const up = r.toUpperCase();
  if (up === 'USER' || up === 'STUDENT') return 'student';
  if (up === 'ADMIN') return 'admin';
  if (up === 'FACULTY') return 'faculty';
  return null;
};

router.get('/users', (req, res) => {
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
  res.json(db.prepare(sql).all(...params));
});

router.get('/users/:id', (req, res) => {
  const id = Number(req.params.id);
  const user = db
    .prepare('SELECT id, full_name, email, mobile, role, referral_code, COALESCE(credits, 0) as credits, is_active, created_at FROM users WHERE id = ?')
    .get(id);
  if (!user) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }
  const enrollments = db
    .prepare('SELECT e.*, c.title as course_title FROM enrollments e JOIN courses c ON c.id = e.course_id WHERE e.student_id = ?')
    .all(id);
  const payments = db.prepare('SELECT * FROM payments WHERE student_id = ? ORDER BY created_at DESC').all(id);
  const certificates = db.prepare('SELECT * FROM certificates WHERE student_id = ? ORDER BY issued_at DESC').all(id);
  const referrals = db
    .prepare(`
      SELECT cra.*, c.title as course_title, u2.full_name as referred_name
      FROM course_referral_attributions cra
      JOIN courses c ON c.id = cra.course_id
      LEFT JOIN users u2 ON u2.id = cra.referred_user_id
      WHERE cra.referrer_id = ?
      ORDER BY cra.created_at DESC
    `)
    .all(id);
  res.json({ user, enrollments, payments, certificates, referrals });
});

router.put('/users/:id', (req, res) => {
  const id = Number(req.params.id);
  const b = req.body || {};
  const existing = db.prepare('SELECT id, role FROM users WHERE id = ?').get(id) as { id: number; role: string } | undefined;
  if (!existing) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }
  const nextRole = b.role ? mapRoleToDb(String(b.role)) : null;
  db.prepare(`
    UPDATE users
    SET full_name = COALESCE(?, full_name),
        mobile = COALESCE(?, mobile),
        role = COALESCE(?, role),
        credits = COALESCE(?, credits),
        is_active = COALESCE(?, is_active)
    WHERE id = ?
  `).run(
    b.full_name ?? null,
    b.mobile ?? null,
    nextRole,
    b.credits !== undefined ? Number(b.credits) : null,
    b.is_active !== undefined ? (b.is_active ? 1 : 0) : null,
    id
  );
  res.json(
    db
      .prepare('SELECT id, full_name, email, mobile, role, referral_code, COALESCE(credits, 0) as credits, is_active, created_at FROM users WHERE id = ?')
      .get(id)
  );
});

router.delete('/users/:id', (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user!.id) {
    res.status(400).json({ error: 'You cannot delete your own active admin account.' });
    return;
  }
  const target = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
  if (!target) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  res.json({ ok: true });
});

// 3. Faculty Management
router.get('/faculty', (_req, res) => {
  const rows = db
    .prepare(`
      SELECT u.id, u.full_name, u.email, u.mobile, u.is_active, u.created_at,
             fp.title, fp.bio, fp.specialization, fp.experience_years, fp.qualifications, fp.permissions_json,
             (SELECT COUNT(*) FROM courses c WHERE c.faculty_id = u.id) as courses_count,
             (SELECT COUNT(*) FROM batches b WHERE b.faculty_id = u.id) as batches_count
      FROM users u
      LEFT JOIN faculty_profiles fp ON fp.user_id = u.id
      WHERE u.role = 'faculty'
      ORDER BY u.id ASC
    `)
    .all() as Array<Record<string, unknown>>;
  res.json(
    rows.map((r) => ({
      ...r,
      permissions: JSON.parse(String(r.permissions_json || '{}')),
    }))
  );
});

router.post('/faculty', (req, res) => {
  const { full_name, email, mobile, password, title = 'Instructor', bio = '', specialization = '', experience_years = 5, qualifications = '', permissions } = req.body || {};
  if (!full_name || !email || !mobile || !password) {
    res.status(400).json({ error: 'Name, email, mobile, and password are required.' });
    return;
  }
  const cleanEmail = String(email).trim().toLowerCase();
  const cleanMobile = String(mobile).replace(/\D/g, '');
  const exists = db.prepare('SELECT id FROM users WHERE email = ? OR mobile = ?').get(cleanEmail, cleanMobile);
  if (exists) {
    res.status(409).json({ error: 'Email or mobile already registered.' });
    return;
  }
  const code = `FAC-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const r = db
    .prepare("INSERT INTO users (full_name, email, mobile, password_hash, role, referral_code, is_active) VALUES (?, ?, ?, ?, 'faculty', ?, 1)")
    .run(String(full_name).trim(), cleanEmail, cleanMobile, hashPassword(String(password)), code);
  const fid = Number(r.lastInsertRowid);
  db.prepare(`
    INSERT INTO faculty_profiles (user_id, title, bio, specialization, experience_years, qualifications, permissions_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    fid,
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
    )
  );
  res.status(201).json({ id: fid, full_name, email: cleanEmail });
});

router.put('/faculty/:id', (req, res) => {
  const id = Number(req.params.id);
  const { full_name, title, bio, specialization, experience_years, qualifications, is_active, permissions } = req.body || {};
  if (full_name !== undefined || is_active !== undefined) {
    db.prepare(`
      UPDATE users SET full_name = COALESCE(?, full_name), is_active = COALESCE(?, is_active)
      WHERE id = ? AND role = 'faculty'
    `).run(full_name ?? null, is_active !== undefined ? (is_active ? 1 : 0) : null, id);
  }
  db.prepare(`
    UPDATE faculty_profiles
    SET title = COALESCE(?, title),
        bio = COALESCE(?, bio),
        specialization = COALESCE(?, specialization),
        experience_years = COALESCE(?, experience_years),
        qualifications = COALESCE(?, qualifications),
        permissions_json = COALESCE(?, permissions_json)
    WHERE user_id = ?
  `).run(
    title ?? null,
    bio ?? null,
    specialization ?? null,
    experience_years !== undefined ? Number(experience_years) : null,
    qualifications ?? null,
    permissions ? JSON.stringify(permissions) : null,
    id
  );
  res.json({ ok: true });
});

// 4. Categories Management (with courses count & full edit + image)
router.get('/categories', (_req, res) => {
  res.json(
    db
      .prepare(`
        SELECT cat.*,
               (SELECT COUNT(*) FROM courses c WHERE c.category_id = cat.id) as courses_count
        FROM categories cat
        ORDER BY cat.id ASC
      `)
      .all()
  );
});

router.post('/categories', (req, res) => {
  const { name, slug: customSlug, description = '', image = '', icon_name = 'BookOpen', is_active = 1 } = req.body || {};
  if (!name) {
    res.status(400).json({ error: 'Category name is required.' });
    return;
  }
  const slug =
    customSlug && String(customSlug).trim()
      ? String(customSlug).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      : String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const r = db
    .prepare('INSERT INTO categories (name, slug, description, image, icon_name, is_active) VALUES (?, ?, ?, ?, ?, ?)')
    .run(String(name).trim(), slug, description, image, icon_name, is_active ? 1 : 0);
  res.status(201).json(db.prepare('SELECT * FROM categories WHERE id = ?').get(Number(r.lastInsertRowid)));
});

router.put('/categories/:id', (req, res) => {
  const id = Number(req.params.id);
  const b = req.body || {};
  db.prepare(`
    UPDATE categories
    SET name = COALESCE(?, name),
        slug = COALESCE(?, slug),
        description = COALESCE(?, description),
        image = COALESCE(?, image),
        is_active = COALESCE(?, is_active)
    WHERE id = ?
  `).run(
    b.name ?? null,
    b.slug ? String(b.slug).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : null,
    b.description ?? null,
    b.image ?? null,
    b.is_active !== undefined ? (b.is_active ? 1 : 0) : null,
    id
  );
  res.json(db.prepare('SELECT * FROM categories WHERE id = ?').get(id));
});

router.delete('/categories/:id', (req, res) => {
  db.prepare('DELETE FROM categories WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

// 5. Courses, Modules & Lessons Management
router.get('/courses', (_req, res) => {
  const courses = db
    .prepare(`
      SELECT c.*, cat.name as category_name, u.full_name as faculty_name,
             (SELECT COUNT(*) FROM modules m WHERE m.course_id = c.id) as modules_count,
             (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id) as lessons_count,
             (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) as enrolled_count
      FROM courses c
      LEFT JOIN categories cat ON cat.id = c.category_id
      LEFT JOIN users u ON u.id = c.faculty_id
      ORDER BY c.display_order ASC, c.id ASC
    `)
    .all() as Array<Record<string, unknown>>;
  res.json(
    courses.map((c) => ({
      ...c,
      what_you_learn: JSON.parse(String(c.what_you_learn_json || '[]')),
      faqs: JSON.parse(String(c.faqs_json || '[]')),
    }))
  );
});

router.post('/courses', (req, res) => {
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

  const r = db
    .prepare(`
      INSERT INTO courses (
        slug, category_id, title, short_description, description,
        thumbnail_url, banner_image, preview_image, instructor_image,
        level, duration, language, prerequisites,
        price, discount_price, is_free, featured, faculty_id,
        what_you_learn_json, faqs_json, is_published, display_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 99)
    `)
    .run(
      slug,
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
      is_published ? 1 : 0
    );

  const cid = Number(r.lastInsertRowid);
  db.prepare("INSERT INTO modules (course_id, title, description, sort_order) VALUES (?, 'Module 1: Getting Started', '', 1)").run(cid);
  res.status(201).json(db.prepare('SELECT * FROM courses WHERE id = ?').get(cid));
});

router.put('/courses/:id', (req, res) => {
  const id = Number(req.params.id);
  const b = req.body || {};
  db.prepare(`
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
  `).run(
    b.title ?? null,
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
    id
  );
  res.json(db.prepare('SELECT * FROM courses WHERE id = ?').get(id));
});

router.post('/courses/:id/duplicate', (req, res) => {
  const srcId = Number(req.params.id);
  const src = db.prepare('SELECT * FROM courses WHERE id = ?').get(srcId) as Record<string, any> | undefined;
  if (!src) {
    res.status(404).json({ error: 'Course not found.' });
    return;
  }
  const newSlug = `${src.slug}-copy-${crypto.randomInt(100, 999)}`;
  const r = db
    .prepare(`
      INSERT INTO courses (
        slug, category_id, title, short_description, description,
        thumbnail_url, banner_image, preview_image, instructor_image,
        level, duration, language, prerequisites,
        price, discount_price, is_free, featured, faculty_id,
        what_you_learn_json, faqs_json, is_published, display_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 99)
    `)
    .run(
      newSlug,
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
      src.faqs_json
    );
  const newId = Number(r.lastInsertRowid);
  const mods = db.prepare('SELECT * FROM modules WHERE course_id = ?').all(srcId) as Array<Record<string, any>>;
  for (const m of mods) {
    const nm = db
      .prepare('INSERT INTO modules (course_id, title, description, sort_order) VALUES (?, ?, ?, ?)')
      .run(newId, m.title, m.description, m.sort_order);
    const newModId = Number(nm.lastInsertRowid);
    const lessons = db.prepare('SELECT * FROM lessons WHERE module_id = ?').all(m.id) as Array<Record<string, any>>;
    for (const l of lessons) {
      db.prepare(`
        INSERT INTO lessons (module_id, course_id, title, lesson_type, video_url, material_url, duration_minutes, content_text, is_preview, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(newModId, newId, l.title, l.lesson_type, l.video_url, l.material_url, l.duration_minutes, l.content_text, l.is_preview, l.sort_order);
    }
  }
  res.status(201).json(db.prepare('SELECT * FROM courses WHERE id = ?').get(newId));
});

router.delete('/courses/:id', (req, res) => {
  db.prepare('DELETE FROM courses WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

router.get('/courses/:id/curriculum', (req, res) => {
  const cid = Number(req.params.id);
  const modules = db.prepare('SELECT * FROM modules WHERE course_id = ? ORDER BY sort_order ASC, id ASC').all(cid);
  const lessons = db.prepare('SELECT * FROM lessons WHERE course_id = ? ORDER BY sort_order ASC, id ASC').all(cid);
  res.json({ modules, lessons });
});

router.post('/courses/:id/modules', (req, res) => {
  const cid = Number(req.params.id);
  const { title, description = '' } = req.body || {};
  if (!title) {
    res.status(400).json({ error: 'Module title is required.' });
    return;
  }
  const r = db
    .prepare('INSERT INTO modules (course_id, title, description, sort_order) VALUES (?, ?, ?, 99)')
    .run(cid, String(title).trim(), description);
  res.status(201).json(db.prepare('SELECT * FROM modules WHERE id = ?').get(Number(r.lastInsertRowid)));
});

router.post('/courses/:id/lessons', (req, res) => {
  const cid = Number(req.params.id);
  const { module_id, title, lesson_type = 'video', video_url = '', material_url = '', duration_minutes = 20, content_text = '', is_preview = 0 } = req.body || {};
  if (!module_id || !title) {
    res.status(400).json({ error: 'Module and lesson title are required.' });
    return;
  }
  const r = db
    .prepare(`
      INSERT INTO lessons (module_id, course_id, title, lesson_type, video_url, material_url, duration_minutes, content_text, is_preview, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 99)
    `)
    .run(Number(module_id), cid, String(title).trim(), lesson_type, video_url, material_url, Number(duration_minutes) || 20, content_text, is_preview ? 1 : 0);
  res.status(201).json(db.prepare('SELECT * FROM lessons WHERE id = ?').get(Number(r.lastInsertRowid)));
});

router.delete('/lessons/:lessonId', (req, res) => {
  db.prepare('DELETE FROM lessons WHERE id = ?').run(Number(req.params.lessonId));
  res.json({ ok: true });
});

// 6. Batches Management
router.get('/batches', (_req, res) => {
  res.json(
    db
      .prepare(`
        SELECT b.*, c.title as course_title, u.full_name as faculty_name
        FROM batches b
        JOIN courses c ON c.id = b.course_id
        LEFT JOIN users u ON u.id = b.faculty_id
        ORDER BY b.id DESC
      `)
      .all()
  );
});

router.post('/batches', (req, res) => {
  const { name, course_id, faculty_id, start_date, end_date, timings, total_seats = 60, status = 'upcoming' } = req.body || {};
  if (!name || !course_id || !start_date || !end_date || !timings) {
    res.status(400).json({ error: 'All batch fields are required.' });
    return;
  }
  const r = db
    .prepare(`
      INSERT INTO batches (name, course_id, faculty_id, start_date, end_date, timings, total_seats, enrolled_seats, status, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 1)
    `)
    .run(name, Number(course_id), faculty_id ? Number(faculty_id) : null, start_date, end_date, timings, Number(total_seats), status);
  res.status(201).json(db.prepare('SELECT * FROM batches WHERE id = ?').get(Number(r.lastInsertRowid)));
});

router.put('/batches/:id', (req, res) => {
  const id = Number(req.params.id);
  const b = req.body || {};
  db.prepare(`
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
  `).run(
    b.name ?? null,
    b.course_id ? Number(b.course_id) : null,
    b.faculty_id ? Number(b.faculty_id) : null,
    b.start_date ?? null,
    b.end_date ?? null,
    b.timings ?? null,
    b.total_seats ? Number(b.total_seats) : null,
    b.status ?? null,
    b.is_active !== undefined ? (b.is_active ? 1 : 0) : null,
    id
  );
  res.json(db.prepare('SELECT * FROM batches WHERE id = ?').get(id));
});

router.delete('/batches/:id', (req, res) => {
  db.prepare('DELETE FROM batches WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

// 7. Live Classes Management
router.get('/live-classes', (_req, res) => {
  res.json(
    db
      .prepare(`
        SELECT lc.*, c.title as course_title, u.full_name as faculty_name
        FROM live_classes lc
        JOIN courses c ON c.id = lc.course_id
        LEFT JOIN users u ON u.id = lc.faculty_id
        ORDER BY lc.scheduled_at DESC
      `)
      .all()
  );
});

router.post('/live-classes', (req, res) => {
  const { title, course_id, faculty_id, scheduled_at, duration_minutes = 60, meeting_url, status = 'upcoming', recording_url = '', description = '' } = req.body || {};
  if (!title || !course_id || !scheduled_at || !meeting_url) {
    res.status(400).json({ error: 'Title, course, scheduled time, and meeting URL are required.' });
    return;
  }
  const r = db
    .prepare(`
      INSERT INTO live_classes (title, course_id, faculty_id, scheduled_at, duration_minutes, meeting_url, status, recording_url, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(title, Number(course_id), faculty_id ? Number(faculty_id) : null, scheduled_at, Number(duration_minutes), meeting_url, status, recording_url, description);
  res.status(201).json(db.prepare('SELECT * FROM live_classes WHERE id = ?').get(Number(r.lastInsertRowid)));
});

router.put('/live-classes/:id', (req, res) => {
  const id = Number(req.params.id);
  const b = req.body || {};
  db.prepare(`
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
  `).run(
    b.title ?? null,
    b.course_id ? Number(b.course_id) : null,
    b.faculty_id ? Number(b.faculty_id) : null,
    b.scheduled_at ?? null,
    b.duration_minutes ? Number(b.duration_minutes) : null,
    b.meeting_url ?? null,
    b.status ?? null,
    b.recording_url ?? null,
    b.description ?? null,
    id
  );
  res.json(db.prepare('SELECT * FROM live_classes WHERE id = ?').get(id));
});

router.delete('/live-classes/:id', (req, res) => {
  db.prepare('DELETE FROM live_classes WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

// 8. Tests & Quizzes Management
router.get('/tests', (_req, res) => {
  res.json(
    db
      .prepare(`
        SELECT t.*, c.title as course_title, cat.name as category_name,
               (SELECT COUNT(*) FROM questions q WHERE q.test_id = t.id) as questions_count,
               (SELECT COUNT(*) FROM test_attempts ta WHERE ta.test_id = t.id) as attempts_count
        FROM tests t
        LEFT JOIN courses c ON c.id = t.course_id
        LEFT JOIN categories cat ON cat.id = c.category_id
        ORDER BY t.id DESC
      `)
      .all()
  );
});

router.post('/tests', (req, res) => {
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
  const r = db
    .prepare(`
      INSERT INTO tests (title, course_id, description, duration_minutes, total_marks, pass_marks, negative_marks, difficulty, is_published, price, certificate_enabled, expiry_date, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      title,
      course_id ? Number(course_id) : null,
      description,
      Number(duration_minutes),
      Number(total_marks),
      Number(pass_marks),
      Number(negative_marks),
      difficulty,
      is_published ? 1 : 0,
      Number(price || 0),
      certificate_enabled ? 1 : 0,
      String(expiry_date || ''),
      req.user!.id
    );
  res.status(201).json(db.prepare('SELECT * FROM tests WHERE id = ?').get(Number(r.lastInsertRowid)));
});

router.put('/tests/:id', (req, res) => {
  const id = Number(req.params.id);
  const b = req.body || {};
  db.prepare(`
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
  `).run(
    b.title ?? null,
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
    id
  );
  res.json(db.prepare('SELECT * FROM tests WHERE id = ?').get(id));
});

router.delete('/tests/:id', (req, res) => {
  db.prepare('DELETE FROM tests WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

router.get('/tests/:id/questions', (req, res) => {
  const qs = db.prepare('SELECT * FROM questions WHERE test_id = ? ORDER BY sort_order ASC, id ASC').all(Number(req.params.id)) as Array<Record<string, unknown>>;
  res.json(qs.map((q) => ({ ...q, options: JSON.parse(String(q.options_json || '[]')) })));
});

router.post('/tests/:id/questions', (req, res) => {
  const testId = Number(req.params.id);
  const { question_text, options, correct_index = 0, marks = 2, explanation = '' } = req.body || {};
  if (!question_text || !Array.isArray(options) || options.length < 2) {
    res.status(400).json({ error: 'Question text and at least 2 options are required.' });
    return;
  }
  const r = db
    .prepare('INSERT INTO questions (test_id, question_text, options_json, correct_index, marks, explanation, sort_order) VALUES (?, ?, ?, ?, ?, ?, 99)')
    .run(testId, question_text, JSON.stringify(options), Number(correct_index), Number(marks), explanation);
  res.status(201).json(db.prepare('SELECT * FROM questions WHERE id = ?').get(Number(r.lastInsertRowid)));
});

router.delete('/questions/:qid', (req, res) => {
  db.prepare('DELETE FROM questions WHERE id = ?').run(Number(req.params.qid));
  res.json({ ok: true });
});

// 9. Subscriptions Management
router.get('/plans', (_req, res) => {
  const rows = db.prepare('SELECT * FROM subscription_plans ORDER BY price ASC').all() as Array<Record<string, unknown>>;
  res.json(rows.map((p) => ({ ...p, features: JSON.parse(String(p.features_json || '[]')) })));
});

router.post('/plans', (req, res) => {
  const { name, price, duration_months, badge = '', features = [], is_popular = 0, is_active = 1 } = req.body || {};
  if (!name || price === undefined || !duration_months) {
    res.status(400).json({ error: 'Plan name, price, and duration are required.' });
    return;
  }
  const slug = String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + crypto.randomInt(10, 99);
  const r = db
    .prepare('INSERT INTO subscription_plans (name, slug, price, duration_months, badge, features_json, is_popular, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(name, slug, Number(price), Number(duration_months), badge, JSON.stringify(features), is_popular ? 1 : 0, is_active ? 1 : 0);
  res.status(201).json(db.prepare('SELECT * FROM subscription_plans WHERE id = ?').get(Number(r.lastInsertRowid)));
});

router.put('/plans/:id', (req, res) => {
  const id = Number(req.params.id);
  const b = req.body || {};
  db.prepare(`
    UPDATE subscription_plans
    SET name = COALESCE(?, name),
        price = COALESCE(?, price),
        duration_months = COALESCE(?, duration_months),
        badge = COALESCE(?, badge),
        features_json = COALESCE(?, features_json),
        is_popular = COALESCE(?, is_popular),
        is_active = COALESCE(?, is_active)
    WHERE id = ?
  `).run(
    b.name ?? null,
    b.price !== undefined ? Number(b.price) : null,
    b.duration_months !== undefined ? Number(b.duration_months) : null,
    b.badge ?? null,
    b.features ? JSON.stringify(b.features) : null,
    b.is_popular !== undefined ? (b.is_popular ? 1 : 0) : null,
    b.is_active !== undefined ? (b.is_active ? 1 : 0) : null,
    id
  );
  res.json(db.prepare('SELECT * FROM subscription_plans WHERE id = ?').get(id));
});

router.delete('/plans/:id', (req, res) => {
  db.prepare('DELETE FROM subscription_plans WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

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

router.get('/payments', (req, res) => {
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
  const rows = db.prepare(sql).all(...params) as Array<Record<string, unknown>>;
  res.json(
    rows.map((p) => ({
      ...p,
      display_status: toDisplayPaymentStatus(String(p.status || 'pending')),
    }))
  );
});

router.patch('/payments/:id/status', (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body || {};
  const norm = normalizePaymentStatus(String(status || ''));
  if (!norm) {
    res.status(400).json({ error: 'Invalid payment status.' });
    return;
  }
  const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(id) as
    | { id: number; student_id: number; item_type: string; item_id: number; item_title: string; status: string }
    | undefined;
  if (!payment) {
    res.status(404).json({ error: 'Payment not found.' });
    return;
  }

  db.prepare('UPDATE payments SET status = ? WHERE id = ?').run(norm, id);

  // Strict business rule: ONLY Success / successful activates course enrollment
  if (norm === 'successful' && payment.item_type === 'course') {
    const enrolled = db
      .prepare('SELECT id FROM enrollments WHERE student_id = ? AND course_id = ?')
      .get(payment.student_id, payment.item_id);
    if (!enrolled) {
      db.prepare(`
        INSERT INTO enrollments (student_id, course_id, status, progress_percent, completed_lessons_json)
        VALUES (?, ?, 'active', 0, '[]')
      `).run(payment.student_id, payment.item_id);
      db.prepare(`
        INSERT INTO notifications (user_id, title, message, type)
        VALUES (?, 'Payment Confirmed!', ?, 'success')
      `).run(payment.student_id, `Your payment for "${payment.item_title}" is confirmed and course access is now active.`);
    }
  }
  res.json({ ok: true, status: norm, display_status: toDisplayPaymentStatus(norm) });
});

router.get('/enrollments', (_req, res) => {
  res.json(
    db
      .prepare(`
        SELECT e.*, u.full_name as student_name, u.email as student_email, c.title as course_title
        FROM enrollments e
        JOIN users u ON u.id = e.student_id
        JOIN courses c ON c.id = e.course_id
        ORDER BY e.enrolled_at DESC
      `)
      .all()
  );
});

// 11. Referrals & Certificates Management
router.get('/referrals', (_req, res) => {
  const signupReferrals = db
    .prepare(`
      SELECT r.id, r.referral_code, r.status, r.reward_amount, r.created_at,
             u1.full_name as referrer_name, u2.full_name as referred_name
      FROM referrals r
      JOIN users u1 ON u1.id = r.referrer_id
      JOIN users u2 ON u2.id = r.referred_user_id
      ORDER BY r.created_at DESC
    `)
    .all();

  const courseReferrals = db
    .prepare(`
      SELECT crl.id, crl.course_id, crl.referral_code, crl.clicks, crl.enrollments_count,
             crl.status, crl.created_at,
             c.title as course_title, c.slug as course_slug,
             COALESCE(u.full_name, 'Guest / Public Share') as referrer_name
      FROM course_referral_links crl
      JOIN courses c ON c.id = crl.course_id
      LEFT JOIN users u ON u.id = crl.referrer_id
      ORDER BY crl.clicks DESC, crl.created_at DESC
    `)
    .all() as Array<{ clicks: number; enrollments_count: number; [k: string]: unknown }>;

  const courseReferralsWithRates = courseReferrals.map((r) => ({
    ...r,
    conversion_rate:
      Number(r.clicks) > 0 ? Math.min(100, Math.round((Number(r.enrollments_count) / Number(r.clicks)) * 100)) : 0,
  }));

  const eventSummary = db
    .prepare('SELECT event_type, COUNT(*) as count FROM referral_events GROUP BY event_type')
    .all();

  const attributions = db
    .prepare(`
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
    `)
    .all() as Array<{ paid_amount: number }>;

  const totalReferrals = signupReferrals.length + courseReferrals.length;
  const totalClicks = courseReferrals.reduce((acc, r) => acc + Number(r.clicks || 0), 0);
  const registeredLeads = signupReferrals.length + attributions.length;
  const successfulEnrollments = courseReferrals.reduce((acc, r) => acc + Number(r.enrollments_count || 0), 0);
  const referralRevenue = attributions.reduce((acc, a) => acc + Number(a.paid_amount || 0), 0);
  const signupRewards = signupReferrals.reduce(
    (acc, r) => acc + Number((r as Record<string, unknown>).reward_amount || 0),
    0
  );
  const redemptionRewardsRow = db
    .prepare('SELECT COALESCE(SUM(amount), 0) as total FROM redemptions WHERE LOWER(status) != ?')
    .get('rejected') as { total: number };

  const cmsRow = db.prepare("SELECT value_json FROM cms_settings WHERE key = 'referral'").get() as
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
});

router.patch('/referrals/:id/status', (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body || {};
  if (!['active', 'paused'].includes(status)) {
    res.status(400).json({ error: 'Invalid status.' });
    return;
  }
  db.prepare('UPDATE course_referral_links SET status = ? WHERE id = ?').run(status, id);
  res.json({ ok: true });
});

router.get('/certificates', (_req, res) => {
  res.json(db.prepare('SELECT * FROM certificates ORDER BY issued_at DESC').all());
});

router.post('/certificates', (req, res) => {
  const { student_id, course_id } = req.body || {};
  if (!student_id || !course_id) {
    res.status(400).json({ error: 'Student and course are required.' });
    return;
  }
  const student = db.prepare('SELECT id, full_name FROM users WHERE id = ?').get(Number(student_id)) as
    | { id: number; full_name: string }
    | undefined;
  const course = db.prepare('SELECT id, title FROM courses WHERE id = ?').get(Number(course_id)) as
    | { id: number; title: string }
    | undefined;
  if (!student || !course) {
    res.status(404).json({ error: 'Student or course not found.' });
    return;
  }
  const existing = db
    .prepare('SELECT * FROM certificates WHERE student_id = ? AND course_id = ?')
    .get(student.id, course.id);
  if (existing) {
    res.json(existing);
    return;
  }
  const certificateCode = `OLRN-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const r = db
    .prepare(`
      INSERT INTO certificates (certificate_code, student_id, course_id, student_name, course_title, status)
      VALUES (?, ?, ?, ?, ?, 'valid')
    `)
    .run(certificateCode, student.id, course.id, student.full_name, course.title);
  db.prepare(`
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (?, 'Certificate Issued!', ?, 'success')
  `).run(student.id, `Your completion certificate (${certificateCode}) for "${course.title}" is now available.`);
  res.status(201).json(db.prepare('SELECT * FROM certificates WHERE id = ?').get(Number(r.lastInsertRowid)));
});

router.patch('/certificates/:id/status', (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body || {};
  if (!['valid', 'revoked'].includes(status)) {
    res.status(400).json({ error: 'Invalid status.' });
    return;
  }
  db.prepare('UPDATE certificates SET status = ? WHERE id = ?').run(status, id);
  res.json({ ok: true });
});

router.delete('/certificates/:id', (req, res) => {
  db.prepare('DELETE FROM certificates WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

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

router.get('/redemptions', (req, res) => {
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
  res.json(db.prepare(sql).all(...params));
});

router.post('/redemptions', (req, res) => {
  const { user_id, amount, method = 'UPI', account_reference, account_details = '', notes = '' } = req.body || {};
  if (!user_id || !amount || Number(amount) <= 0) {
    res.status(400).json({ error: 'Valid user and positive amount are required.' });
    return;
  }
  const ref = String(account_reference ?? account_details ?? '');
  const r = db
    .prepare(`
      INSERT INTO redemptions (user_id, amount, method, account_reference, status, notes)
      VALUES (?, ?, ?, ?, 'Pending', ?)
    `)
    .run(Number(user_id), Number(amount), String(method), ref, String(notes));
  res.status(201).json(db.prepare('SELECT *, account_reference as account_details FROM redemptions WHERE id = ?').get(Number(r.lastInsertRowid)));
});

router.patch('/redemptions/:id', (req, res) => {
  const id = Number(req.params.id);
  const { status, notes } = req.body || {};
  const norm = status ? normalizeRedemptionStatus(String(status)) : null;
  if (status && !norm) {
    res.status(400).json({ error: 'Invalid redemption status.' });
    return;
  }
  db.prepare(`
    UPDATE redemptions
    SET status = COALESCE(?, status),
        notes = COALESCE(?, notes),
        updated_at = datetime('now')
    WHERE id = ?
  `).run(norm, notes ?? null, id);
  res.json(db.prepare('SELECT *, account_reference as account_details FROM redemptions WHERE id = ?').get(id));
});

// 12. Contact Enquiries Management
router.get('/enquiries', (_req, res) => {
  res.json(db.prepare('SELECT * FROM contact_enquiries ORDER BY created_at DESC').all());
});

router.patch('/enquiries/:id', (req, res) => {
  const id = Number(req.params.id);
  const { status, admin_notes } = req.body || {};
  db.prepare('UPDATE contact_enquiries SET status = COALESCE(?, status), admin_notes = COALESCE(?, admin_notes) WHERE id = ?').run(
    status ?? null,
    admin_notes ?? null,
    id
  );
  res.json({ ok: true });
});

// 13. Website CMS Management
router.put('/cms', (req, res) => {
  const payload = req.body || {};
  const upsert = db.prepare(`
    INSERT INTO cms_settings (key, value_json, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = datetime('now')
  `);
  for (const [k, v] of Object.entries(payload)) {
    upsert.run(k, JSON.stringify(v));
  }
  const rows = db.prepare('SELECT key, value_json FROM cms_settings').all() as Array<{ key: string; value_json: string }>;
  const cms: Record<string, unknown> = {};
  for (const r of rows) cms[r.key] = JSON.parse(r.value_json);
  res.json(cms);
});

// 14. Safe Demo Cleanup Endpoint (Section 39)
router.post('/cleanup-demo', (_req, res) => {
  const result = runSafeDemoCleanup();
  res.json({ ok: true, ...result });
});

export default router;

