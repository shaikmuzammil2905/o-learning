import { Router } from 'express';
import crypto from 'node:crypto';
import db from '../db.js';
import { attachOptionalUser } from '../auth.js';

const router = Router();

router.get('/cms', (_req, res) => {
  const rows = db.prepare('SELECT key, value_json FROM cms_settings').all() as Array<{
    key: string;
    value_json: string;
  }>;
  const cms: Record<string, unknown> = {};
  for (const r of rows) {
    cms[r.key] = JSON.parse(r.value_json);
  }
  res.json(cms);
});

router.get('/categories', (_req, res) => {
  const categories = db
    .prepare('SELECT * FROM categories WHERE is_active = 1 ORDER BY id ASC')
    .all();
  res.json(categories);
});

router.get('/courses', (req, res) => {
  const { category, search, level } = req.query;
  let sql = `
    SELECT c.*, cat.name as category_name, cat.slug as category_slug,
           u.full_name as faculty_name, fp.title as faculty_title,
           (SELECT COUNT(*) FROM modules m WHERE m.course_id = c.id) as modules_count,
           (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id) as lessons_count,
           (SELECT ROUND(AVG(r.rating), 1) FROM reviews r WHERE r.course_id = c.id) as avg_rating,
           (SELECT COUNT(*) FROM reviews r WHERE r.course_id = c.id) as reviews_count
    FROM courses c
    LEFT JOIN categories cat ON cat.id = c.category_id
    LEFT JOIN users u ON u.id = c.faculty_id
    LEFT JOIN faculty_profiles fp ON fp.user_id = u.id
    WHERE c.is_published = 1
  `;
  const params: Array<string | number> = [];
  if (category && category !== 'all') {
    sql += ' AND (cat.slug = ? OR c.category_id = ?)';
    params.push(String(category), Number(category) || 0);
  }
  if (level && level !== 'all') {
    sql += ' AND LOWER(c.level) LIKE ?';
    params.push(`%${String(level).toLowerCase()}%`);
  }
  if (search) {
    sql += ' AND (LOWER(c.title) LIKE ? OR LOWER(c.short_description) LIKE ? OR LOWER(c.description) LIKE ?)';
    const q = `%${String(search).toLowerCase()}%`;
    params.push(q, q, q);
  }
  sql += ' ORDER BY c.display_order ASC, c.id ASC';
  const rows = db.prepare(sql).all(...params) as Array<Record<string, unknown>>;
  const courses = rows.map((r) => ({
    ...r,
    what_you_learn: JSON.parse(String(r.what_you_learn_json || '[]')),
    faqs: JSON.parse(String(r.faqs_json || '[]')),
  }));
  res.json(courses);
});

router.get('/courses/:courseId', attachOptionalUser, (req, res) => {
  const key = String(req.params.courseId);
  const course = db
    .prepare(`
      SELECT c.*, cat.name as category_name, cat.slug as category_slug,
             u.full_name as faculty_name, u.email as faculty_email,
             fp.title as faculty_title, fp.bio as faculty_bio,
             fp.specialization as faculty_specialization,
             fp.experience_years as faculty_experience,
             fp.qualifications as faculty_qualifications
      FROM courses c
      LEFT JOIN categories cat ON cat.id = c.category_id
      LEFT JOIN users u ON u.id = c.faculty_id
      LEFT JOIN faculty_profiles fp ON fp.user_id = u.id
      WHERE (c.slug = ? OR c.id = ?) AND c.is_published = 1
    `)
    .get(key, Number(key) || -1) as Record<string, unknown> | undefined;

  if (!course) {
    res.status(404).json({ error: 'Course not found.' });
    return;
  }

  const courseId = Number(course.id);
  let isEnrolled = false;
  let enrollment = null;
  if (req.user) {
    enrollment = db
      .prepare('SELECT * FROM enrollments WHERE student_id = ? AND course_id = ?')
      .get(req.user.id, courseId);
    isEnrolled = Boolean(enrollment);
    // Also check active subscription
    if (!isEnrolled && req.user.role === 'student') {
      const activeSub = db
        .prepare(
          "SELECT id FROM user_subscriptions WHERE student_id = ? AND status = 'active' AND datetime(expires_at) > datetime('now')"
        )
        .get(req.user.id);
      if (activeSub) isEnrolled = false; // Still requires click "Enroll" which activates using subscription or payment
    }
  }

  const modules = db
    .prepare('SELECT * FROM modules WHERE course_id = ? ORDER BY sort_order ASC, id ASC')
    .all(courseId) as Array<Record<string, unknown>>;

  const lessons = db
    .prepare('SELECT * FROM lessons WHERE course_id = ? ORDER BY sort_order ASC, id ASC')
    .all(courseId) as Array<Record<string, unknown>>;

  const canAccessPaid =
    isEnrolled ||
    Number(course.is_free) === 1 ||
    req.user?.role === 'admin' ||
    (req.user?.role === 'faculty' && Number(course.faculty_id) === req.user.id);

  // Never expose paid lesson video/material URLs before enrollment/payment
  const modulesWithLessons = modules.map((m) => ({
    ...m,
    lessons: lessons
      .filter((l) => Number(l.module_id) === Number(m.id))
      .map((l) => {
        const unlocked = canAccessPaid || Number(l.is_preview) === 1;
        return {
          id: l.id,
          module_id: l.module_id,
          course_id: l.course_id,
          title: l.title,
          lesson_type: l.lesson_type,
          duration_minutes: l.duration_minutes,
          is_preview: l.is_preview,
          sort_order: l.sort_order,
          unlocked,
          video_url: unlocked ? l.video_url : '',
          material_url: unlocked ? l.material_url : '',
          content_text: unlocked ? l.content_text : 'Enroll in this course to unlock full lesson notes & video.',
        };
      }),
  }));

  const reviews = db
    .prepare('SELECT * FROM reviews WHERE course_id = ? ORDER BY created_at DESC')
    .all(courseId);

  const batches = db
    .prepare(`
      SELECT b.*, u.full_name as faculty_name
      FROM batches b
      LEFT JOIN users u ON u.id = b.faculty_id
      WHERE b.course_id = ? AND b.is_active = 1
      ORDER BY b.start_date ASC
    `)
    .all(courseId);

  res.json({
    ...course,
    what_you_learn: JSON.parse(String(course.what_you_learn_json || '[]')),
    faqs: JSON.parse(String(course.faqs_json || '[]')),
    modules: modulesWithLessons,
    reviews,
    batches,
    is_enrolled: isEnrolled,
    enrollment,
  });
});

router.get('/faculty', (_req, res) => {
  const rows = db
    .prepare(`
      SELECT u.id, u.full_name, u.avatar_url, fp.title, fp.bio, fp.specialization, fp.experience_years, fp.qualifications
      FROM users u
      JOIN faculty_profiles fp ON fp.user_id = u.id
      WHERE u.role = 'faculty' AND u.is_active = 1
      ORDER BY u.id ASC
    `)
    .all();
  res.json(rows);
});

router.get('/batches', (_req, res) => {
  const rows = db
    .prepare(`
      SELECT b.*, c.title as course_title, c.slug as course_slug, c.thumbnail_url as course_thumbnail,
             c.price, c.discount_price, c.is_free, u.full_name as faculty_name
      FROM batches b
      JOIN courses c ON c.id = b.course_id
      LEFT JOIN users u ON u.id = b.faculty_id
      WHERE b.is_active = 1
      ORDER BY CASE b.status WHEN 'active' THEN 1 WHEN 'upcoming' THEN 2 ELSE 3 END, b.start_date ASC
    `)
    .all();
  res.json(rows);
});

router.get('/plans', (_req, res) => {
  const rows = db
    .prepare('SELECT * FROM subscription_plans WHERE is_active = 1 ORDER BY price ASC')
    .all() as Array<Record<string, unknown>>;
  res.json(
    rows.map((p) => ({
      ...p,
      features: JSON.parse(String(p.features_json || '[]')),
    }))
  );
});

router.get('/tests', (_req, res) => {
  const rows = db
    .prepare(`
      SELECT t.*, c.title as course_title, c.slug as course_slug,
             (SELECT COUNT(*) FROM questions q WHERE q.test_id = t.id) as questions_count
      FROM tests t
      LEFT JOIN courses c ON c.id = t.course_id
      WHERE t.is_published = 1
      ORDER BY t.id ASC
    `)
    .all();
  res.json(rows);
});

router.get('/materials/:courseId/:materialNum', (req, res) => {
  const course = db
    .prepare('SELECT title, short_description FROM courses WHERE id = ?')
    .get(Number(req.params.courseId)) as { title: string; short_description: string } | undefined;
  const title = course?.title || 'O-Learning Study Material';
  const text = `O-LEARNING PLATFORM — OFFICIAL STUDY NOTES\nCourse: ${title}\nModule Resource #${req.params.materialNum}\nTagline: Learn Today, Lead Tomorrow!\nLocation: Hyderabad, Telangana, India\n\nSummary:\n${course?.short_description || ''}\n\nKey Takeaways:\n1. Review core concepts before taking the module quiz.\n2. Practice daily exercises and attend the live doubt-clearing session.\n3. Reach out to faculty support at olearningplatform33@gmail.com.\n`;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="olearning-notes-course-${req.params.courseId}.txt"`);
  res.send(text);
});

router.post('/contact', (req, res) => {
  const { name, email, mobile, subject, message } = req.body || {};
  if (!name || !email || !mobile || !message) {
    res.status(400).json({ error: 'Please fill in your name, email, mobile number, and message.' });
    return;
  }
  const cleanEmail = String(email).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    res.status(400).json({ error: 'Please enter a valid email address.' });
    return;
  }
  db.prepare(`
    INSERT INTO contact_enquiries (name, email, mobile, subject, message, status)
    VALUES (?, ?, ?, ?, ?, 'new')
  `).run(
    String(name).trim(),
    cleanEmail,
    String(mobile).trim(),
    String(subject || 'Course Enquiry').trim(),
    String(message).trim()
  );
  res.status(201).json({
    ok: true,
    message: 'Thank you for contacting O-LEARNING PLATFORM! Our Hyderabad counselor team will reach out shortly.',
  });
});

router.get('/certificates/verify/:code', (req, res) => {
  const code = String(req.params.code || '').trim().toUpperCase();
  const cert = db
    .prepare(`
      SELECT cert.*, c.duration as course_duration, c.level as course_level
      FROM certificates cert
      LEFT JOIN courses c ON c.id = cert.course_id
      WHERE UPPER(cert.certificate_code) = ?
    `)
    .get(code);
  if (!cert) {
    res.status(404).json({ error: 'Certificate ID not found. Please check the code and try again.' });
    return;
  }
  res.json(cert);
});

const ALLOWED_REFERRAL_EVENTS = new Set([
  'share_clicked',
  'referral_link_generated',
  'referral_link_copied',
  'whatsapp_share',
  'instagram_share',
  'native_share',
  'referral_visit',
]);

router.post('/referrals/generate', attachOptionalUser, (req, res) => {
  const { course_id } = req.body || {};
  const course = db
    .prepare('SELECT id, slug, title FROM courses WHERE (id = ? OR slug = ?) AND is_published = 1')
    .get(Number(course_id) || -1, String(course_id || '')) as
    | { id: number; slug: string; title: string }
    | undefined;

  if (!course) {
    res.status(404).json({ error: 'Course not found.' });
    return;
  }

  // If authenticated, reuse existing active referral link for this user + course
  if (req.user) {
    const existing = db
      .prepare("SELECT * FROM course_referral_links WHERE course_id = ? AND referrer_id = ? AND status = 'active' LIMIT 1")
      .get(course.id, req.user.id) as { referral_code: string } | undefined;
    if (existing) {
      db.prepare(
        "INSERT INTO referral_events (course_id, referral_code, event_type, actor_user_id) VALUES (?, ?, 'referral_link_generated', ?)"
      ).run(course.id, existing.referral_code, req.user.id);
      res.json({ referral_code: existing.referral_code, course_id: course.id, course_slug: course.slug });
      return;
    }
  }

  let code = `OL-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  while (db.prepare('SELECT id FROM course_referral_links WHERE referral_code = ?').get(code)) {
    code = `OL-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  }

  db.prepare(`
    INSERT INTO course_referral_links (course_id, referrer_id, referral_code, clicks, enrollments_count, status)
    VALUES (?, ?, ?, 0, 0, 'active')
  `).run(course.id, req.user?.id ?? null, code);

  db.prepare(
    "INSERT INTO referral_events (course_id, referral_code, event_type, actor_user_id) VALUES (?, ?, 'referral_link_generated', ?)"
  ).run(course.id, code, req.user?.id ?? null);

  res.status(201).json({ referral_code: code, course_id: course.id, course_slug: course.slug });
});

router.post('/referrals/track', attachOptionalUser, (req, res) => {
  const { course_id, referral_code, event_type } = req.body || {};
  if (!ALLOWED_REFERRAL_EVENTS.has(String(event_type))) {
    res.status(400).json({ error: 'Invalid referral event type.' });
    return;
  }

  const course = db
    .prepare('SELECT id, slug FROM courses WHERE (id = ? OR slug = ?) AND is_published = 1')
    .get(Number(course_id) || -1, String(course_id || '')) as { id: number; slug: string } | undefined;
  if (!course) {
    res.status(404).json({ error: 'Course not found.' });
    return;
  }

  const cleanCode = String(referral_code || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  if (!cleanCode) {
    res.status(400).json({ error: 'Referral code is required.' });
    return;
  }

  // Validate link exists or corresponds to a valid user referral_code
  let link = db
    .prepare('SELECT * FROM course_referral_links WHERE UPPER(referral_code) = ?')
    .get(cleanCode) as { id: number; course_id: number; referrer_id: number | null; status: string } | undefined;

  if (!link && event_type === 'referral_visit') {
    const refOwner = db
      .prepare('SELECT id FROM users WHERE UPPER(referral_code) = ? AND is_active = 1')
      .get(cleanCode) as { id: number } | undefined;
    if (refOwner) {
      const generatedCode = `${cleanCode}-${course.id}`;
      const existing = db
        .prepare('SELECT * FROM course_referral_links WHERE referral_code = ?')
        .get(generatedCode) as typeof link;
      if (!existing) {
        db.prepare(`
          INSERT INTO course_referral_links (course_id, referrer_id, referral_code, clicks, enrollments_count, status)
          VALUES (?, ?, ?, 0, 0, 'active')
        `).run(course.id, refOwner.id, generatedCode);
        link = db
          .prepare('SELECT * FROM course_referral_links WHERE referral_code = ?')
          .get(generatedCode) as typeof link;
      } else {
        link = existing;
      }
    }
  }

  if (link && link.status === 'active' && event_type === 'referral_visit') {
    // Prevent inflating clicks when the referrer themselves visits their own link
    if (!req.user || link.referrer_id !== req.user.id) {
      db.prepare('UPDATE course_referral_links SET clicks = clicks + 1 WHERE id = ?').run(link.id);
    }
  }

  db.prepare(`
    INSERT INTO referral_events (course_id, referral_code, event_type, actor_user_id)
    VALUES (?, ?, ?, ?)
  `).run(course.id, cleanCode, String(event_type), req.user?.id ?? null);

  res.json({ ok: true });
});

export default router;
