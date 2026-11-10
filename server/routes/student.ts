import { Router } from 'express';
import crypto from 'node:crypto';
import db from '../db.js';
import { requireAuth, requireRole } from '../auth.js';

const router = Router();
router.use(requireAuth, requireRole('student', 'admin'));

function issueCertificateIfEligible(studentId: number, courseId: number): { issued: boolean; certificate?: unknown } {
  const enrollment = db
    .prepare('SELECT * FROM enrollments WHERE student_id = ? AND course_id = ?')
    .get(studentId, courseId) as { progress_percent: number } | undefined;
  if (!enrollment || enrollment.progress_percent < 100) return { issued: false };

  const existing = db
    .prepare('SELECT * FROM certificates WHERE student_id = ? AND course_id = ?')
    .get(studentId, courseId);
  if (existing) return { issued: false, certificate: existing };

  const user = db.prepare('SELECT full_name FROM users WHERE id = ?').get(studentId) as { full_name: string };
  const course = db.prepare('SELECT title FROM courses WHERE id = ?').get(courseId) as { title: string };
  const code = `OLR-CERT-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

  const res = db
    .prepare(`
      INSERT INTO certificates (certificate_code, student_id, course_id, student_name, course_title, status)
      VALUES (?, ?, ?, ?, ?, 'valid')
    `)
    .run(code, studentId, courseId, user.full_name, course.title);

  db.prepare(`
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (?, 'Certificate Earned!', ?, 'success')
  `).run(studentId, `Congratulations! Your official certificate for "${course.title}" (${code}) is ready.`);

  const cert = db.prepare('SELECT * FROM certificates WHERE id = ?').get(Number(res.lastInsertRowid));
  return { issued: true, certificate: cert };
}

router.get('/dashboard', (req, res) => {
  const sid = req.user!.id;
  const enrollments = db
    .prepare(`
      SELECT e.*, c.title, c.slug, c.thumbnail_url, c.duration, c.level,
             u.full_name as faculty_name,
             (SELECT COUNT(*) FROM modules m WHERE m.course_id = c.id) as modules_count,
             (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id) as lessons_count
      FROM enrollments e
      JOIN courses c ON c.id = e.course_id
      LEFT JOIN users u ON u.id = c.faculty_id
      WHERE e.student_id = ?
      ORDER BY e.enrolled_at DESC
    `)
    .all(sid) as Array<Record<string, unknown>>;

  const totalCourses = enrollments.length;
  const completedCourses = enrollments.filter((e) => e.status === 'completed' || Number(e.progress_percent) >= 100).length;
  const inProgressCourses = enrollments.filter((e) => e.status !== 'completed' && Number(e.progress_percent) < 100).length;
  const certificatesCount = (
    db.prepare("SELECT COUNT(*) as c FROM certificates WHERE student_id = ? AND status = 'valid'").get(sid) as { c: number }
  ).c;

  const liveClasses = db
    .prepare(`
      SELECT lc.*, c.title as course_title, u.full_name as faculty_name
      FROM live_classes lc
      JOIN courses c ON c.id = lc.course_id
      LEFT JOIN users u ON u.id = lc.faculty_id
      WHERE lc.status IN ('live', 'upcoming')
      ORDER BY CASE lc.status WHEN 'live' THEN 0 ELSE 1 END, lc.scheduled_at ASC
      LIMIT 4
    `)
    .all();

  const activeSub = db
    .prepare(`
      SELECT us.*, sp.name as plan_name, sp.duration_months
      FROM user_subscriptions us
      JOIN subscription_plans sp ON sp.id = us.plan_id
      WHERE us.student_id = ? AND us.status = 'active' AND datetime(us.expires_at) > datetime('now')
      ORDER BY us.expires_at DESC
      LIMIT 1
    `)
    .get(sid);

  const notifications = db
    .prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 10')
    .all(sid);

  res.json({
    summary: {
      myCourses: totalCourses,
      inProgress: inProgressCourses,
      completed: completedCourses,
      certificates: certificatesCount,
    },
    enrollments,
    liveClasses,
    activeSubscription: activeSub || null,
    notifications,
  });
});

router.get('/courses', (req, res) => {
  const sid = req.user!.id;
  const enrollments = db
    .prepare(`
      SELECT e.*, c.title, c.slug, c.short_description, c.thumbnail_url, c.duration, c.level,
             u.full_name as faculty_name,
             (SELECT COUNT(*) FROM modules m WHERE m.course_id = c.id) as modules_count,
             (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id) as lessons_count
      FROM enrollments e
      JOIN courses c ON c.id = e.course_id
      LEFT JOIN users u ON u.id = c.faculty_id
      WHERE e.student_id = ?
      ORDER BY e.enrolled_at DESC
    `)
    .all(sid);
  res.json(enrollments);
});

router.get('/learn/:courseId', (req, res) => {
  const sid = req.user!.id;
  const key = req.params.courseId;
  const course = db
    .prepare(`
      SELECT c.*, u.full_name as faculty_name, fp.title as faculty_title
      FROM courses c
      LEFT JOIN users u ON u.id = c.faculty_id
      LEFT JOIN faculty_profiles fp ON fp.user_id = u.id
      WHERE c.slug = ? OR c.id = ?
    `)
    .get(key, Number(key) || -1) as Record<string, unknown> | undefined;

  if (!course) {
    res.status(404).json({ error: 'Course not found.' });
    return;
  }

  const courseId = Number(course.id);
  const enrollment = db
    .prepare('SELECT * FROM enrollments WHERE student_id = ? AND course_id = ?')
    .get(sid, courseId) as Record<string, unknown> | undefined;

  if (!enrollment && req.user!.role !== 'admin') {
    res.status(403).json({ error: 'Please enroll in this course to access the learning area.' });
    return;
  }

  const modules = db
    .prepare('SELECT * FROM modules WHERE course_id = ? ORDER BY sort_order ASC, id ASC')
    .all(courseId) as Array<Record<string, unknown>>;
  const lessons = db
    .prepare('SELECT * FROM lessons WHERE course_id = ? ORDER BY sort_order ASC, id ASC')
    .all(courseId) as Array<Record<string, unknown>>;

  const completedLessons: number[] = enrollment
    ? JSON.parse(String(enrollment.completed_lessons_json || '[]'))
    : [];

  const modulesWithLessons = modules.map((m) => ({
    ...m,
    lessons: lessons.filter((l) => Number(l.module_id) === Number(m.id)),
  }));

  const certificate = db
    .prepare('SELECT * FROM certificates WHERE student_id = ? AND course_id = ?')
    .get(sid, courseId);

  res.json({
    course,
    enrollment: enrollment ? { ...enrollment, completed_lessons: completedLessons } : null,
    modules: modulesWithLessons,
    certificate: certificate || null,
  });
});

router.post('/learn/:courseId/lessons/:lessonId/complete', (req, res) => {
  const sid = req.user!.id;
  const courseId = Number(req.params.courseId);
  const lessonId = Number(req.params.lessonId);
  const { completed = true } = req.body || {};

  const enrollment = db
    .prepare('SELECT * FROM enrollments WHERE student_id = ? AND course_id = ?')
    .get(sid, courseId) as { id: number; completed_lessons_json: string } | undefined;

  if (!enrollment) {
    res.status(403).json({ error: 'Enrollment not found for this course.' });
    return;
  }

  const allLessons = db
    .prepare('SELECT id FROM lessons WHERE course_id = ?')
    .all(courseId) as Array<{ id: number }>;
  const validIds = new Set(allLessons.map((l) => l.id));
  if (!validIds.has(lessonId)) {
    res.status(404).json({ error: 'Lesson not found in this course.' });
    return;
  }

  let completedList: number[] = JSON.parse(enrollment.completed_lessons_json || '[]');
  if (completed) {
    if (!completedList.includes(lessonId)) completedList.push(lessonId);
  } else {
    completedList = completedList.filter((id) => id !== lessonId);
  }

  const total = allLessons.length || 1;
  const progress = Math.min(100, Math.round((completedList.length / total) * 100));
  const status = progress >= 100 ? 'completed' : 'active';
  const completedAt = progress >= 100 ? new Date().toISOString() : null;

  db.prepare(`
    UPDATE enrollments
    SET completed_lessons_json = ?, progress_percent = ?, status = ?, completed_at = COALESCE(?, completed_at)
    WHERE id = ?
  `).run(JSON.stringify(completedList), progress, status, completedAt, enrollment.id);

  const certResult = issueCertificateIfEligible(sid, courseId);

  res.json({
    completed_lessons: completedList,
    progress_percent: progress,
    status,
    certificate: certResult.certificate || null,
    newly_issued_certificate: certResult.issued,
  });
});

router.post('/courses/:courseId/review', (req, res) => {
  const sid = req.user!.id;
  const courseId = Number(req.params.courseId);
  const { rating, comment } = req.body || {};
  const numRating = Number(rating);
  if (!numRating || numRating < 1 || numRating > 5 || !comment || String(comment).trim().length < 5) {
    res.status(400).json({ error: 'Please provide a rating (1-5) and a comment of at least 5 characters.' });
    return;
  }
  const enrolled = db
    .prepare('SELECT id FROM enrollments WHERE student_id = ? AND course_id = ?')
    .get(sid, courseId);
  if (!enrolled) {
    res.status(403).json({ error: 'Only enrolled learners can submit a course review.' });
    return;
  }
  db.prepare(`
    INSERT INTO reviews (course_id, student_id, student_name, rating, comment)
    VALUES (?, ?, ?, ?, ?)
  `).run(courseId, sid, req.user!.full_name, numRating, String(comment).trim());
  res.status(201).json({ ok: true });
});

router.post('/enroll/free', (req, res) => {
  const sid = req.user!.id;
  const { course_id, batch_id } = req.body || {};
  const course = db
    .prepare('SELECT * FROM courses WHERE id = ? AND is_published = 1')
    .get(Number(course_id)) as { id: number; title: string; is_free: number; price: number; discount_price: number | null } | undefined;

  if (!course) {
    res.status(404).json({ error: 'Course not found.' });
    return;
  }

  const existing = db
    .prepare('SELECT id FROM enrollments WHERE student_id = ? AND course_id = ?')
    .get(sid, course.id);
  if (existing) {
    res.json({ ok: true, alreadyEnrolled: true, course_id: course.id });
    return;
  }

  const activeSub = db
    .prepare(
      "SELECT id FROM user_subscriptions WHERE student_id = ? AND status = 'active' AND datetime(expires_at) > datetime('now')"
    )
    .get(sid);

  const effectivePrice = course.discount_price ?? course.price;
  if (course.is_free !== 1 && effectivePrice > 0 && !activeSub) {
    res.status(402).json({ error: 'This is a paid course. Please complete payment to enroll.' });
    return;
  }

  db.prepare(`
    INSERT INTO enrollments (student_id, course_id, batch_id, status, progress_percent, completed_lessons_json)
    VALUES (?, ?, ?, 'active', 0, '[]')
  `).run(sid, course.id, batch_id ? Number(batch_id) : null);

  if (batch_id) {
    db.prepare('UPDATE batches SET enrolled_seats = enrolled_seats + 1 WHERE id = ?').run(Number(batch_id));
  }

  db.prepare(`
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (?, 'Enrollment Confirmed!', ?, 'success')
  `).run(sid, `You are now enrolled in "${course.title}". Start learning inside My Courses!`);

  res.status(201).json({ ok: true, course_id: course.id });
});

router.post('/checkout', (req, res) => {
  const sid = req.user!.id;
  const { item_type, item_id, method = 'UPI' } = req.body || {};
  const validMethods = ['UPI', 'Card', 'NetBanking', 'Wallet'];
  if (!validMethods.includes(method)) {
    res.status(400).json({ error: 'Unsupported payment method selected.' });
    return;
  }

  let itemTitle = '';
  let amount = 0;
  let discountAmount = 0;
  let finalAmount = 0;

  if (item_type === 'course') {
    const course = db
      .prepare('SELECT * FROM courses WHERE id = ? AND is_published = 1')
      .get(Number(item_id)) as { id: number; title: string; price: number; discount_price: number | null; is_free: number } | undefined;
    if (!course) {
      res.status(404).json({ error: 'Course not found.' });
      return;
    }
    const already = db
      .prepare('SELECT id FROM enrollments WHERE student_id = ? AND course_id = ?')
      .get(sid, course.id);
    if (already) {
      res.status(409).json({ error: 'You are already enrolled in this course.' });
      return;
    }
    itemTitle = course.title;
    amount = course.price;
    finalAmount = course.is_free ? 0 : course.discount_price ?? course.price;
    discountAmount = Math.max(0, amount - finalAmount);
  } else if (item_type === 'subscription') {
    const plan = db
      .prepare('SELECT * FROM subscription_plans WHERE id = ? AND is_active = 1')
      .get(Number(item_id)) as { id: number; name: string; price: number } | undefined;
    if (!plan) {
      res.status(404).json({ error: 'Subscription plan not found.' });
      return;
    }
    itemTitle = plan.name;
    amount = plan.price;
    finalAmount = plan.price;
    discountAmount = 0;
  } else {
    res.status(400).json({ error: 'Invalid checkout item type.' });
    return;
  }

  const orderRef = `ORD-${new Date().getFullYear()}-${crypto.randomInt(100000, 999999)}`;
  const resInsert = db
    .prepare(`
      INSERT INTO payments (order_ref, student_id, item_type, item_id, item_title, amount, discount_amount, final_amount, method, status, gateway_txn_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'processing', '')
    `)
    .run(orderRef, sid, item_type, Number(item_id), itemTitle, amount, discountAmount, finalAmount, method);

  const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(Number(resInsert.lastInsertRowid));
  res.status(201).json({ payment });
});

router.post('/payments/:paymentId/verify', (req, res) => {
  const sid = req.user!.id;
  const paymentId = Number(req.params.paymentId);
  const { simulate = 'success', batch_id } = req.body || {};

  const payment = db
    .prepare('SELECT * FROM payments WHERE id = ? AND student_id = ?')
    .get(paymentId, sid) as
    | {
        id: number;
        order_ref: string;
        item_type: 'course' | 'subscription';
        item_id: number;
        item_title: string;
        final_amount: number;
        method: string;
        status: string;
      }
    | undefined;

  if (!payment) {
    res.status(404).json({ error: 'Payment record not found.' });
    return;
  }

  if (payment.status === 'successful') {
    res.json({ payment, verified: true });
    return;
  }

  if (simulate === 'fail') {
    db.prepare("UPDATE payments SET status = 'failed', gateway_txn_id = ? WHERE id = ?").run(
      `FAIL-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
      payment.id
    );
    const failed = db.prepare('SELECT * FROM payments WHERE id = ?').get(payment.id);
    res.status(402).json({ error: 'Payment could not be completed. Please try again.', payment: failed });
    return;
  }

  const txnId = `${payment.method.toUpperCase()}-OLR-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  db.prepare("UPDATE payments SET status = 'successful', gateway_txn_id = ? WHERE id = ?").run(txnId, payment.id);

  if (payment.item_type === 'course') {
    const existing = db
      .prepare('SELECT id FROM enrollments WHERE student_id = ? AND course_id = ?')
      .get(sid, payment.item_id);
    if (!existing) {
      db.prepare(`
        INSERT INTO enrollments (student_id, course_id, batch_id, status, progress_percent, completed_lessons_json)
        VALUES (?, ?, ?, 'active', 0, '[]')
      `).run(sid, payment.item_id, batch_id ? Number(batch_id) : null);
      if (batch_id) {
        db.prepare('UPDATE batches SET enrolled_seats = enrolled_seats + 1 WHERE id = ?').run(Number(batch_id));
      }
    }
  } else if (payment.item_type === 'subscription') {
    const plan = db
      .prepare('SELECT duration_months FROM subscription_plans WHERE id = ?')
      .get(payment.item_id) as { duration_months: number };
    const expires = new Date();
    expires.setMonth(expires.getMonth() + (plan?.duration_months || 3));
    db.prepare("UPDATE user_subscriptions SET status = 'expired' WHERE student_id = ? AND status = 'active'").run(sid);
    db.prepare(`
      INSERT INTO user_subscriptions (student_id, plan_id, status, expires_at, payment_id)
      VALUES (?, ?, 'active', ?, ?)
    `).run(sid, payment.item_id, expires.toISOString(), payment.id);
  }

  db.prepare(`
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (?, 'Payment Successful', ?, 'success')
  `).run(sid, `Payment of ₹${payment.final_amount} for "${payment.item_title}" (${payment.order_ref}) was verified.`);

  const updated = db.prepare('SELECT * FROM payments WHERE id = ?').get(payment.id);
  res.json({ payment: updated, verified: true });
});

router.get('/payments', (req, res) => {
  const sid = req.user!.id;
  const payments = db
    .prepare('SELECT * FROM payments WHERE student_id = ? ORDER BY created_at DESC')
    .all(sid);
  const activeSubscription = db
    .prepare(`
      SELECT us.*, sp.name as plan_name, sp.price, sp.duration_months
      FROM user_subscriptions us
      JOIN subscription_plans sp ON sp.id = us.plan_id
      WHERE us.student_id = ? AND us.status = 'active' AND datetime(us.expires_at) > datetime('now')
      ORDER BY us.expires_at DESC
      LIMIT 1
    `)
    .get(sid);
  res.json({ payments, activeSubscription: activeSubscription || null });
});

router.get('/live-classes', (_req, res) => {
  const classes = db
    .prepare(`
      SELECT lc.*, c.title as course_title, u.full_name as faculty_name, b.name as batch_name
      FROM live_classes lc
      JOIN courses c ON c.id = lc.course_id
      LEFT JOIN users u ON u.id = lc.faculty_id
      LEFT JOIN batches b ON b.id = lc.batch_id
      WHERE lc.status != 'cancelled'
      ORDER BY CASE lc.status WHEN 'live' THEN 0 WHEN 'upcoming' THEN 1 ELSE 2 END, lc.scheduled_at ASC
    `)
    .all();
  res.json(classes);
});

router.get('/tests', (req, res) => {
  const sid = req.user!.id;
  const tests = db
    .prepare(`
      SELECT t.*, c.title as course_title,
             (SELECT COUNT(*) FROM questions q WHERE q.test_id = t.id) as questions_count
      FROM tests t
      LEFT JOIN courses c ON c.id = t.course_id
      WHERE t.is_published = 1
      ORDER BY t.id ASC
    `)
    .all();
  const attempts = db
    .prepare(`
      SELECT ta.*, t.title as test_title
      FROM test_attempts ta
      JOIN tests t ON t.id = ta.test_id
      WHERE ta.student_id = ?
      ORDER BY ta.submitted_at DESC
    `)
    .all(sid);
  res.json({ tests, attempts });
});

router.get('/tests/:testId/start', (req, res) => {
  const test = db
    .prepare(`
      SELECT t.*, c.title as course_title
      FROM tests t
      LEFT JOIN courses c ON c.id = t.course_id
      WHERE t.id = ? AND t.is_published = 1
    `)
    .get(Number(req.params.testId));

  if (!test) {
    res.status(404).json({ error: 'Test not found or not currently published.' });
    return;
  }

  const questions = db
    .prepare('SELECT id, test_id, question_text, options_json, marks, sort_order FROM questions WHERE test_id = ? ORDER BY sort_order ASC, id ASC')
    .all(Number(req.params.testId)) as Array<Record<string, unknown>>;

  res.json({
    test,
    questions: questions.map((q) => ({
      ...q,
      options: JSON.parse(String(q.options_json || '[]')),
    })),
  });
});

router.post('/tests/:testId/submit', (req, res) => {
  const sid = req.user!.id;
  const testId = Number(req.params.testId);
  const { answers = {}, time_taken_seconds = 0 } = req.body || {};

  const test = db.prepare('SELECT * FROM tests WHERE id = ? AND is_published = 1').get(testId) as
    | { id: number; total_marks: number; negative_marks: number; pass_marks: number; title: string }
    | undefined;
  if (!test) {
    res.status(404).json({ error: 'Test not found.' });
    return;
  }

  const questions = db
    .prepare('SELECT * FROM questions WHERE test_id = ? ORDER BY sort_order ASC, id ASC')
    .all(testId) as Array<{
    id: number;
    question_text: string;
    options_json: string;
    correct_index: number;
    marks: number;
    explanation: string;
  }>;

  let score = 0;
  let totalPossible = 0;
  let correctCount = 0;
  let wrongCount = 0;
  let unansweredCount = 0;

  const breakdown = questions.map((q, idx) => {
    totalPossible += q.marks;
    const selected = answers[q.id] !== undefined ? answers[q.id] : answers[idx];
    const isAnswered = selected !== undefined && selected !== null && selected !== -1;
    const isCorrect = isAnswered && Number(selected) === q.correct_index;

    if (!isAnswered) {
      unansweredCount += 1;
    } else if (isCorrect) {
      correctCount += 1;
      score += q.marks;
    } else {
      wrongCount += 1;
      score -= test.negative_marks || 0;
    }

    return {
      question_id: q.id,
      question_text: q.question_text,
      options: JSON.parse(q.options_json),
      selected_index: isAnswered ? Number(selected) : null,
      correct_index: q.correct_index,
      is_correct: isCorrect,
      explanation: q.explanation,
      marks: q.marks,
    };
  });

  score = Math.max(0, Number(score.toFixed(2)));
  const maxMarks = totalPossible || test.total_marks || 1;
  const percentage = Math.max(0, Math.round((score / maxMarks) * 100));

  const betterAttempts = (
    db
      .prepare('SELECT COUNT(*) as c FROM test_attempts WHERE test_id = ? AND score > ?')
      .get(testId, score) as { c: number }
  ).c;
  const rank = betterAttempts + 1;

  const insertAttempt = db
    .prepare(`
      INSERT INTO test_attempts (test_id, student_id, answers_json, score, total_marks, correct_count, wrong_count, unanswered_count, percentage, rank, time_taken_seconds)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      testId,
      sid,
      JSON.stringify(answers),
      score,
      maxMarks,
      correctCount,
      wrongCount,
      unansweredCount,
      percentage,
      rank,
      Number(time_taken_seconds) || 0
    );

  const attempt = db.prepare('SELECT * FROM test_attempts WHERE id = ?').get(Number(insertAttempt.lastInsertRowid));
  res.status(201).json({ attempt, breakdown, passed: score >= test.pass_marks });
});

router.get('/results', (req, res) => {
  const sid = req.user!.id;
  const rows = db
    .prepare(`
      SELECT ta.*, t.title as test_title, t.pass_marks, t.difficulty, c.title as course_title
      FROM test_attempts ta
      JOIN tests t ON t.id = ta.test_id
      LEFT JOIN courses c ON c.id = t.course_id
      WHERE ta.student_id = ?
      ORDER BY ta.submitted_at DESC
    `)
    .all(sid);
  res.json(rows);
});

router.get('/referrals', (req, res) => {
  const sid = req.user!.id;
  const list = db
    .prepare(`
      SELECT r.*, u.full_name as referred_name, u.created_at as joined_at
      FROM referrals r
      JOIN users u ON u.id = r.referred_user_id
      WHERE r.referrer_id = ?
      ORDER BY r.created_at DESC
    `)
    .all(sid) as Array<{ status: string; reward_amount: number }>;

  const cmsRef = db.prepare("SELECT value_json FROM cms_settings WHERE key = 'referral'").get() as
    | { value_json: string }
    | undefined;
  const config = cmsRef ? JSON.parse(cmsRef.value_json) : { rewardAmount: 250, discountPercent: 10, headline: 'Invite Friends & Earn Rewards!' };

  const totalReferrals = list.length;
  const successfulReferrals = list.filter((r) => r.status === 'successful').length;
  const rewardsEarned = list
    .filter((r) => r.status === 'successful')
    .reduce((sum, r) => sum + Number(r.reward_amount || 0), 0);

  res.json({
    referral_code: req.user!.referral_code,
    stats: {
      totalReferrals,
      successfulReferrals,
      rewardsEarned,
    },
    config,
    referrals: list,
  });
});

router.get('/certificates', (req, res) => {
  const sid = req.user!.id;
  const certs = db
    .prepare(`
      SELECT cert.*, c.duration as course_duration, c.level as course_level
      FROM certificates cert
      LEFT JOIN courses c ON c.id = cert.course_id
      WHERE cert.student_id = ?
      ORDER BY cert.issued_at DESC
    `)
    .all(sid);
  res.json(certs);
});

router.post('/notifications/read', (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user!.id);
  res.json({ ok: true });
});

export default router;

