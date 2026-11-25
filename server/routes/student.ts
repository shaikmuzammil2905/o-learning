import { Router } from 'express';
import crypto from 'node:crypto';
import { dbAll, dbGet, dbRun } from '../db.js';
import { asyncHandler, requireAuth, requireRole } from '../auth.js';

const router = Router();
router.use(requireAuth, requireRole('student', 'admin'));

async function issueCertificateIfEligible(studentId: number, courseId: number): Promise<{ issued: boolean; certificate?: unknown }> {
  const enrollment = (await dbGet('SELECT * FROM enrollments WHERE student_id = ? AND course_id = ?', [studentId, courseId])) as { progress_percent: number } | undefined;
  if (!enrollment || enrollment.progress_percent < 100) return { issued: false };

  const existing = (await dbGet('SELECT * FROM certificates WHERE student_id = ? AND course_id = ?', [studentId, courseId]));
  if (existing) return { issued: false, certificate: existing };

  const user = (await dbGet('SELECT full_name FROM users WHERE id = ?', [studentId])) as { full_name: string };
  const course = (await dbGet('SELECT title FROM courses WHERE id = ?', [courseId])) as { title: string };
  const code = `OLR-CERT-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

  const res = (await dbRun(`
      INSERT INTO certificates (certificate_code, student_id, course_id, student_name, course_title, status)
      VALUES (?, ?, ?, ?, ?, 'valid')
     RETURNING id`, [code, studentId, courseId, user.full_name, course.title]));

  (await dbRun(`
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (?, 'Certificate Earned!', ?, 'success')
  `, [studentId, `Congratulations! Your official certificate for "${course.title}" (${code}) is ready.`]));

  const cert = (await dbGet('SELECT * FROM certificates WHERE id = ?', [Number(res.lastInsertRowid)]));
  return { issued: true, certificate: cert };
}

router.get('/dashboard', asyncHandler(async (req, res) => {
  const sid = req.user!.id;
  const enrollments = (await dbAll(`
      SELECT e.*, c.title, c.slug, c.thumbnail_url, c.duration, c.level,
             u.full_name as faculty_name,
             (SELECT COUNT(*) FROM modules m WHERE m.course_id = c.id) as modules_count,
             (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id) as lessons_count
      FROM enrollments e
      JOIN courses c ON c.id = e.course_id
      LEFT JOIN users u ON u.id = c.faculty_id
      WHERE e.student_id = ?
      ORDER BY e.enrolled_at DESC
    `, [sid])) as Array<Record<string, unknown>>;

  const totalCourses = enrollments.length;
  const completedCourses = enrollments.filter((e) => e.status === 'completed' || Number(e.progress_percent) >= 100).length;
  const inProgressCourses = enrollments.filter((e) => e.status !== 'completed' && Number(e.progress_percent) < 100).length;
  const certificatesCount = (
    (await dbGet("SELECT COUNT(*) as c FROM certificates WHERE student_id = ? AND status = 'valid'", [sid])) as { c: number }
  ).c;

  const liveClasses = (await dbAll(`
      SELECT lc.*, c.title as course_title, u.full_name as faculty_name
      FROM live_classes lc
      JOIN courses c ON c.id = lc.course_id
      LEFT JOIN users u ON u.id = lc.faculty_id
      WHERE lc.status IN ('live', 'upcoming')
      ORDER BY CASE lc.status WHEN 'live' THEN 0 ELSE 1 END, lc.scheduled_at ASC
      LIMIT 4
    `));

  const activeSub = (await dbGet(`
      SELECT us.*, sp.name as plan_name, sp.duration_months
      FROM user_subscriptions us
      JOIN subscription_plans sp ON sp.id = us.plan_id
      WHERE us.student_id = ? AND us.status = 'active' AND us.expires_at > NOW()
      ORDER BY us.expires_at DESC
      LIMIT 1
    `, [sid]));

  const notifications = (await dbAll('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 10', [sid]));

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
}));

router.get('/courses', asyncHandler(async (req, res) => {
  const sid = req.user!.id;
  const enrollments = (await dbAll(`
      SELECT e.*, c.title, c.slug, c.short_description, c.thumbnail_url, c.duration, c.level,
             u.full_name as faculty_name,
             (SELECT COUNT(*) FROM modules m WHERE m.course_id = c.id) as modules_count,
             (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id) as lessons_count
      FROM enrollments e
      JOIN courses c ON c.id = e.course_id
      LEFT JOIN users u ON u.id = c.faculty_id
      WHERE e.student_id = ?
      ORDER BY e.enrolled_at DESC
    `, [sid]));
  res.json(enrollments);
}));

router.get('/learn/:courseId', asyncHandler(async (req, res) => {
  const sid = req.user!.id;
  const key = req.params.courseId;
  const course = (await dbGet(`
      SELECT c.*, u.full_name as faculty_name, fp.title as faculty_title
      FROM courses c
      LEFT JOIN users u ON u.id = c.faculty_id
      LEFT JOIN faculty_profiles fp ON fp.user_id = u.id
      WHERE c.slug = ? OR c.id = ?
    `, [key, Number(key) || -1])) as Record<string, unknown> | undefined;

  if (!course) {
    res.status(404).json({ error: 'Course not found.' });
    return;
  }

  const courseId = Number(course.id);
  const enrollment = (await dbGet('SELECT * FROM enrollments WHERE student_id = ? AND course_id = ?', [sid, courseId])) as Record<string, unknown> | undefined;

  if (!enrollment && req.user!.role !== 'admin') {
    res.status(403).json({ error: 'Please enroll in this course to access the learning area.' });
    return;
  }

  const modules = (await dbAll('SELECT * FROM modules WHERE course_id = ? ORDER BY sort_order ASC, id ASC', [courseId])) as Array<Record<string, unknown>>;
  const lessons = (await dbAll('SELECT * FROM lessons WHERE course_id = ? ORDER BY sort_order ASC, id ASC', [courseId])) as Array<Record<string, unknown>>;

  const completedLessons: number[] = enrollment
    ? JSON.parse(String(enrollment.completed_lessons_json || '[]'))
    : [];

  const modulesWithLessons = modules.map((m) => ({
    ...m,
    lessons: lessons.filter((l) => Number(l.module_id) === Number(m.id)),
  }));

  const certificate = (await dbGet('SELECT * FROM certificates WHERE student_id = ? AND course_id = ?', [sid, courseId]));

  const notes = (await dbAll('SELECT * FROM course_notes WHERE course_id = ? AND is_published = 1 ORDER BY id ASC', [courseId])) as Array<Record<string, unknown>>;

  res.json({
    course,
    enrollment: enrollment ? { ...enrollment, completed_lessons: completedLessons } : null,
    modules: modulesWithLessons,
    notes,
    certificate: certificate || null,
  });
}));

router.get('/learn/:courseId/notes/:noteId/download', asyncHandler(async (req, res) => {
  const sid = req.user!.id;
  const courseId = Number(req.params.courseId);
  const noteId = Number(req.params.noteId);

  const enrollment = (await dbGet('SELECT progress_percent FROM enrollments WHERE student_id = ? AND course_id = ?', [sid, courseId])) as { progress_percent: number } | undefined;

  const isCompleted = (enrollment && enrollment.progress_percent === 100) || req.user!.role === 'admin';
  if (!isCompleted) {
    res.status(403).json({
      error: 'Course completion required! Complete 100% of the course to unlock the official PDF notes download.',
      progress_percent: enrollment?.progress_percent || 0,
    });
    return;
  }

  const note = (await dbGet('SELECT * FROM course_notes WHERE id = ? AND course_id = ?', [noteId, courseId])) as Record<string, any> | undefined;

  if (!note) {
    res.status(404).json({ error: 'Note not found.' });
    return;
  }

  if (note.file_url && (note.file_url.startsWith('http://') || note.file_url.startsWith('https://'))) {
    res.redirect(note.file_url);
    return;
  }

  const course = (await dbGet('SELECT title, short_description FROM courses WHERE id = ?', [courseId])) as
    | { title: string; short_description: string }
    | undefined;

  const content = `=======================================================\nO-LEARNING PLATFORM — OFFICIAL COURSE HANDBOOK\n=======================================================\nCourse: ${course?.title || ''}\nDocument: ${note.title}\nStatus: Course Completed (100% Progress Milestone)\nLocation: India\nWebsite: https://o-learning.vercel.app/\n\nDescription:\n${note.description || course?.short_description || ''}\n\nKey Concepts & Reference Guidelines:\n1. Master the core principles, syntax, formulas, and methodologies explained in each module.\n2. Revise formula sheets and solved question banks ahead of competitive tests and job assessments.\n3. Review your official Course Certificate (ID verified) from your student dashboard.\n\nAcademic Support: olearningplatform33@gmail.com | Helpline: 8978991329 / 9121403515\n=======================================================\n`;

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="olearning-${note.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.txt"`);
  res.send(content);
}));

router.post('/learn/:courseId/lessons/:lessonId/complete', asyncHandler(async (req, res) => {
  const sid = req.user!.id;
  const courseId = Number(req.params.courseId);
  const lessonId = Number(req.params.lessonId);
  const { completed = true } = req.body || {};

  const enrollment = (await dbGet('SELECT * FROM enrollments WHERE student_id = ? AND course_id = ?', [sid, courseId])) as { id: number; completed_lessons_json: string } | undefined;

  if (!enrollment) {
    res.status(403).json({ error: 'Enrollment not found for this course.' });
    return;
  }

  const allLessons = (await dbAll('SELECT id FROM lessons WHERE course_id = ?', [courseId])) as Array<{ id: number }>;
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

  (await dbRun(`
    UPDATE enrollments
    SET completed_lessons_json = ?, progress_percent = ?, status = ?, completed_at = COALESCE(?, completed_at)
    WHERE id = ?
  `, [JSON.stringify(completedList), progress, status, completedAt, enrollment.id]));
  const certResult = await issueCertificateIfEligible(sid, courseId);

  res.json({
    completed_lessons: completedList,
    progress_percent: progress,
    status,
    certificate: certResult.certificate || null,
    newly_issued_certificate: certResult.issued,
  });
}));

router.post('/courses/:courseId/review', asyncHandler(async (req, res) => {
  const sid = req.user!.id;
  const courseId = Number(req.params.courseId);
  const { rating, comment } = req.body || {};
  const numRating = Number(rating);
  if (!numRating || numRating < 1 || numRating > 5 || !comment || String(comment).trim().length < 5) {
    res.status(400).json({ error: 'Please provide a rating (1-5) and a comment of at least 5 characters.' });
    return;
  }
  const enrolled = (await dbGet('SELECT id FROM enrollments WHERE student_id = ? AND course_id = ?', [sid, courseId]));
  if (!enrolled) {
    res.status(403).json({ error: 'Only enrolled learners can submit a course review.' });
    return;
  }
  (await dbRun(`
    INSERT INTO reviews (course_id, student_id, student_name, rating, comment)
    VALUES (?, ?, ?, ?, ?)
  `, [courseId, sid, req.user!.full_name, numRating, String(comment).trim()]));
  res.status(201).json({ ok: true });
}));

async function attributeCourseReferral(
  studentId: number,
  courseId: number,
  rawReferralCode?: unknown,
  paymentId: number | null = null
): Promise<void> {
  const cleanCode = String(rawReferralCode || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  if (!cleanCode) return;

  // Validate against course_referral_links or user referral_code
  let link = (await dbGet("SELECT * FROM course_referral_links WHERE UPPER(referral_code) = ? AND status = 'active'", [cleanCode])) as
    | { id: number; course_id: number; referrer_id: number | null; referral_code: string }
    | undefined;

  if (!link) {
    const refOwner = (await dbGet('SELECT id FROM users WHERE UPPER(referral_code) = ? AND is_active = 1', [cleanCode])) as { id: number } | undefined;
    if (!refOwner) return; // Invalid referral code -> ignore safely

    const generatedCode = `${cleanCode}-${courseId}`;
    const existingLink = (await dbGet('SELECT * FROM course_referral_links WHERE referral_code = ?', [generatedCode])) as typeof link;
    if (existingLink) {
      link = existingLink;
    } else {
      (await dbRun(`
        INSERT INTO course_referral_links (course_id, referrer_id, referral_code, clicks, enrollments_count, status)
        VALUES (?, ?, ?, 1, 0, 'active')
      `, [courseId, refOwner.id, generatedCode]));
      link = (await dbGet('SELECT * FROM course_referral_links WHERE referral_code = ?', [generatedCode])) as typeof link;
    }
  }

  if (!link) return;
  // Prevent self-referral abuse
  if (link.referrer_id && link.referrer_id === studentId) return;

  // Prevent duplicate attribution for the same student + course
  const dup = (await dbGet('SELECT id FROM course_referral_attributions WHERE course_id = ? AND referred_user_id = ?', [courseId, studentId]));
  if (dup) return;

  (await dbRun(`
    INSERT INTO course_referral_attributions (course_id, referral_code, referrer_id, referred_user_id, payment_id)
    VALUES (?, ?, ?, ?, ?)
  `, [courseId, link.referral_code, link.referrer_id, studentId, paymentId]));

  (await dbRun('UPDATE course_referral_links SET enrollments_count = enrollments_count + 1 WHERE id = ?', [link.id]));
  (await dbRun("INSERT INTO referral_events (course_id, referral_code, event_type, actor_user_id) VALUES (?, ?, 'course_enrollment', ?)", [courseId, link.referral_code, studentId]));

  if (link.referrer_id) {
    const course = (await dbGet('SELECT title FROM courses WHERE id = ?', [courseId])) as { title: string } | undefined;
    // Credit the referrer for each course enrollment via their referral
    const cmsRefEnroll = (await dbGet("SELECT value_json FROM cms_settings WHERE key = 'referral'")) as { value_json: string } | undefined;
    const perEnrollReward: number = cmsRefEnroll
      ? (JSON.parse(cmsRefEnroll.value_json).perEnrollReward ?? JSON.parse(cmsRefEnroll.value_json).rewardAmount ?? 150)
      : 150;
    (await dbRun(
      'UPDATE users SET credits = COALESCE(credits, 0) + ? WHERE id = ?',
      [perEnrollReward, link.referrer_id]
    ));
    (await dbRun(`
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (?, 'Course Referral Reward Credited!', ?, 'success')
     RETURNING id`, [link.referrer_id, `A learner enrolled in "${course?.title || 'a course'}" via your referral link. ₹${perEnrollReward} credited to your wallet!`]));
  }
}

router.post('/enroll/free', asyncHandler(async (req, res) => {
  const sid = req.user!.id;
  const { course_id, batch_id, referral_code } = req.body || {};
  const course = (await dbGet('SELECT * FROM courses WHERE id = ? AND is_published = 1', [Number(course_id)])) as { id: number; title: string; is_free: number; price: number; discount_price: number | null } | undefined;

  if (!course) {
    res.status(404).json({ error: 'Course not found.' });
    return;
  }

  const existing = (await dbGet('SELECT id FROM enrollments WHERE student_id = ? AND course_id = ?', [sid, course.id]));
  if (existing) {
    res.json({ ok: true, alreadyEnrolled: true, course_id: course.id });
    return;
  }

  const activeSub = (await dbGet("SELECT id FROM user_subscriptions WHERE student_id = ? AND status = 'active' AND expires_at > NOW()", [sid]));

  const effectivePrice = course.discount_price ?? course.price;
  if (course.is_free !== 1 && effectivePrice > 0 && !activeSub) {
    res.status(402).json({ error: 'This is a paid course. Please complete payment to enroll.' });
    return;
  }

  (await dbRun(`
    INSERT INTO enrollments (student_id, course_id, batch_id, status, progress_percent, completed_lessons_json)
    VALUES (?, ?, ?, 'active', 0, '[]')
  `, [sid, course.id, batch_id ? Number(batch_id) : null]));

  if (batch_id) {
    (await dbRun('UPDATE batches SET enrolled_seats = enrolled_seats + 1 WHERE id = ?', [Number(batch_id)]));
  }

  await attributeCourseReferral(sid, course.id, referral_code, null);

  (await dbRun(`
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (?, 'Enrollment Confirmed!', ?, 'success')
  `, [sid, `You are now enrolled in "${course.title}". Start learning inside My Courses!`]));

  res.status(201).json({ ok: true, course_id: course.id });
}));

router.post('/checkout', asyncHandler(async (req, res) => {
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
    const course = (await dbGet('SELECT * FROM courses WHERE id = ? AND is_published = 1', [Number(item_id)])) as { id: number; title: string; price: number; discount_price: number | null; is_free: number } | undefined;
    if (!course) {
      res.status(404).json({ error: 'Course not found.' });
      return;
    }
    const already = (await dbGet('SELECT id FROM enrollments WHERE student_id = ? AND course_id = ?', [sid, course.id]));
    if (already) {
      res.status(409).json({ error: 'You are already enrolled in this course.' });
      return;
    }
    itemTitle = course.title;
    amount = course.price;
    finalAmount = course.is_free ? 0 : course.discount_price ?? course.price;
    discountAmount = Math.max(0, amount - finalAmount);
  } else if (item_type === 'subscription') {
    const plan = (await dbGet('SELECT * FROM subscription_plans WHERE id = ? AND is_active = 1', [Number(item_id)])) as { id: number; name: string; price: number } | undefined;
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
  const resInsert = (await dbRun(`
      INSERT INTO payments (order_ref, student_id, item_type, item_id, item_title, amount, discount_amount, final_amount, method, status, gateway_txn_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', '')
     RETURNING id`, [orderRef, sid, item_type, Number(item_id), itemTitle, amount, discountAmount, finalAmount, method]));

  const payment = (await dbGet('SELECT * FROM payments WHERE id = ?', [Number(resInsert.lastInsertRowid)])) as {
    id: number;
    order_ref: string;
    final_amount: number;
  };
  const verificationToken = crypto
    .createHmac('sha256', process.env.JWT_SECRET || 'o-learning-dev-secret')
    .update(`${payment.id}:${payment.order_ref}:${sid}:${payment.final_amount}`)
    .digest('hex');

  // Razorpay Order Creation via official API
  const rzpKeyId = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_U0uW1zCdYUSuPO';
  const rzpKeySecret = process.env.RAZORPAY_KEY_SECRET || 'rSLPGCibFy5ynJTWWR2nU3Fj';
  let razorpayOrder: { id: string; amount: number; currency: string } | null = null;

  if (finalAmount > 0 && rzpKeyId && rzpKeySecret) {
    try {
      const basicAuth = Buffer.from(`${rzpKeyId}:${rzpKeySecret}`).toString('base64');
      const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${basicAuth}`,
        },
        body: JSON.stringify({
          amount: Math.round(finalAmount * 100), // amount in paise
          currency: 'INR',
          receipt: orderRef,
          notes: {
            payment_id: String(payment.id),
            item_type: String(item_type),
            item_id: String(item_id),
            student_id: String(sid),
          },
        }),
      });

      if (rzpRes.ok) {
        razorpayOrder = (await rzpRes.json()) as { id: string; amount: number; currency: string };
      } else {
        const errText = await rzpRes.text();
        console.warn('Razorpay order creation returned non-200:', errText);
      }
    } catch (rzpErr) {
      console.warn('Razorpay order creation network issue:', rzpErr);
    }
  }

  res.status(201).json({
    payment,
    verification_token: verificationToken,
    razorpay: {
      key_id: rzpKeyId,
      order_id: razorpayOrder?.id || null,
      amount: razorpayOrder?.amount || Math.round(finalAmount * 100),
      currency: razorpayOrder?.currency || 'INR',
    },
  });
}));

router.post('/payments/:paymentId/verify', asyncHandler(async (req, res) => {
  const sid = req.user!.id;
  const paymentId = Number(req.params.paymentId);
  const {
    simulate = 'success',
    batch_id,
    referral_code,
    verification_token,
    razorpay_payment_id,
    razorpay_order_id,
    razorpay_signature,
  } = req.body || {};

  const payment = (await dbGet('SELECT * FROM payments WHERE id = ? AND student_id = ?', [paymentId, sid])) as
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

  // Guard: failed/cancelled/refunded orders cannot be re-verified as successful
  if (['failed', 'cancelled', 'refunded'].includes(payment.status)) {
    res.status(409).json({ error: `This order is already ${payment.status} and cannot be completed.` });
    return;
  }

  if (verification_token) {
    const expected = crypto
      .createHmac('sha256', process.env.JWT_SECRET || 'o-learning-dev-secret')
      .update(`${payment.id}:${payment.order_ref}:${sid}:${payment.final_amount}`)
      .digest('hex');
    if (String(verification_token) !== expected) {
      res.status(403).json({ error: 'Invalid payment verification signature.' });
      return;
    }
  }

  // Cryptographic Razorpay Signature Verification
  const rzpKeySecret = process.env.RAZORPAY_KEY_SECRET || 'rSLPGCibFy5ynJTWWR2nU3Fj';
  if (razorpay_payment_id && razorpay_order_id && razorpay_signature && rzpKeySecret) {
    const expectedSignature = crypto
      .createHmac('sha256', rzpKeySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      res.status(403).json({ error: 'Razorpay payment signature verification failed. Untrusted payment transaction.' });
      return;
    }
  }

  if (simulate === 'fail') {
    (await dbRun("UPDATE payments SET status = 'failed', gateway_txn_id = ? WHERE id = ?", [`FAIL-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
      payment.id]));
    const failed = (await dbGet('SELECT * FROM payments WHERE id = ?', [payment.id]));
    res.status(402).json({ error: 'Payment could not be completed. Please try again.', payment: failed });
    return;
  }

  if (simulate === 'cancel') {
    (await dbRun("UPDATE payments SET status = 'cancelled', gateway_txn_id = ? WHERE id = ?", [`CXL-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
      payment.id]));
    const cancelled = (await dbGet('SELECT * FROM payments WHERE id = ?', [payment.id]));
    res.status(402).json({ error: 'Payment was cancelled.', payment: cancelled });
    return;
  }

  // Re-verify price integrity against current DB course/subscription record before marking successful
  if (payment.item_type === 'course') {
    const liveCourse = (await dbGet('SELECT id, is_published, is_free, price, discount_price FROM courses WHERE id = ?', [payment.item_id])) as { id: number; is_published: number; is_free: number; price: number; discount_price: number | null } | undefined;
    if (!liveCourse || liveCourse.is_published !== 1) {
      res.status(409).json({ error: 'Course is no longer published.' });
      return;
    }
    const currentDbPrice = liveCourse.is_free ? 0 : liveCourse.discount_price ?? liveCourse.price;
    if (Number(payment.final_amount) !== Number(currentDbPrice)) {
      res.status(409).json({ error: 'Course pricing changed during checkout. Please initiate a fresh checkout.' });
      return;
    }
  }

  const txnId = razorpay_payment_id || `${payment.method.toUpperCase()}-OLR-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  (await dbRun("UPDATE payments SET status = 'successful', gateway_txn_id = ? WHERE id = ?", [txnId, payment.id]));

  if (payment.item_type === 'course') {
    const existing = (await dbGet('SELECT id FROM enrollments WHERE student_id = ? AND course_id = ?', [sid, payment.item_id]));
    if (!existing) {
      (await dbRun(`
        INSERT INTO enrollments (student_id, course_id, batch_id, status, progress_percent, completed_lessons_json)
        VALUES (?, ?, ?, 'active', 0, '[]')
      `, [sid, payment.item_id, batch_id ? Number(batch_id) : null]));
      if (batch_id) {
        (await dbRun('UPDATE batches SET enrolled_seats = enrolled_seats + 1 WHERE id = ?', [Number(batch_id)]));
      }
      await attributeCourseReferral(sid, payment.item_id, referral_code, payment.id);
    }
  } else if (payment.item_type === 'subscription') {
    const plan = (await dbGet('SELECT duration_months FROM subscription_plans WHERE id = ?', [payment.item_id])) as { duration_months: number };
    const expires = new Date();
    expires.setMonth(expires.getMonth() + (plan?.duration_months || 3));
    (await dbRun("UPDATE user_subscriptions SET status = 'expired' WHERE student_id = ? AND status = 'active'", [sid]));
    (await dbRun(`
      INSERT INTO user_subscriptions (student_id, plan_id, status, expires_at, payment_id)
      VALUES (?, ?, 'active', ?, ?)
    `, [sid, payment.item_id, expires.toISOString(), payment.id]));
  }

  (await dbRun(`
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (?, 'Payment Successful', ?, 'success')
  `, [sid, `Payment of ₹${payment.final_amount} for "${payment.item_title}" (${payment.order_ref}) was verified.`]));

  const updated = (await dbGet('SELECT * FROM payments WHERE id = ?', [payment.id]));
  res.json({ payment: updated, verified: true });
}));

router.get('/payments', asyncHandler(async (req, res) => {
  const sid = req.user!.id;
  const payments = (await dbAll('SELECT * FROM payments WHERE student_id = ? ORDER BY created_at DESC', [sid]));
  const activeSubscription = (await dbGet(`
      SELECT us.*, sp.name as plan_name, sp.price, sp.duration_months
      FROM user_subscriptions us
      JOIN subscription_plans sp ON sp.id = us.plan_id
      WHERE us.student_id = ? AND us.status = 'active' AND us.expires_at > NOW()
      ORDER BY us.expires_at DESC
      LIMIT 1
    `, [sid]));
  res.json({ payments, activeSubscription: activeSubscription || null });
}));

router.get('/live-classes', asyncHandler(async (_req, res) => {
  const classes = (await dbAll(`
      SELECT lc.*, c.title as course_title, u.full_name as faculty_name, b.name as batch_name
      FROM live_classes lc
      JOIN courses c ON c.id = lc.course_id
      LEFT JOIN users u ON u.id = lc.faculty_id
      LEFT JOIN batches b ON b.id = lc.batch_id
      WHERE lc.status != 'cancelled'
      ORDER BY CASE lc.status WHEN 'live' THEN 0 WHEN 'upcoming' THEN 1 ELSE 2 END, lc.scheduled_at ASC
    `));
  res.json(classes);
}));

router.get('/tests', asyncHandler(async (req, res) => {
  const sid = req.user!.id;
  const tests = (await dbAll(`
      SELECT t.*, c.title as course_title,
             (SELECT COUNT(*) FROM questions q WHERE q.test_id = t.id) as questions_count
      FROM tests t
      LEFT JOIN courses c ON c.id = t.course_id
      WHERE t.is_published = 1
      ORDER BY t.id ASC
    `));
  const attempts = (await dbAll(`
      SELECT ta.*, t.title as test_title
      FROM test_attempts ta
      JOIN tests t ON t.id = ta.test_id
      WHERE ta.student_id = ?
      ORDER BY ta.submitted_at DESC
    `, [sid]));
  res.json({ tests, attempts });
}));

router.get('/tests/:testId/start', asyncHandler(async (req, res) => {
  const test = (await dbGet(`
      SELECT t.*, c.title as course_title
      FROM tests t
      LEFT JOIN courses c ON c.id = t.course_id
      WHERE t.id = ? AND t.is_published = 1
    `, [Number(req.params.testId)]));

  if (!test) {
    res.status(404).json({ error: 'Test not found or not currently published.' });
    return;
  }

  const questions = (await dbAll('SELECT id, test_id, question_text, options_json, marks, sort_order FROM questions WHERE test_id = ? ORDER BY sort_order ASC, id ASC', [Number(req.params.testId)])) as Array<Record<string, unknown>>;

  res.json({
    test,
    questions: questions.map((q) => ({
      ...q,
      options: JSON.parse(String(q.options_json || '[]')),
    })),
  });
}));

router.post('/tests/:testId/submit', asyncHandler(async (req, res) => {
  const sid = req.user!.id;
  const testId = Number(req.params.testId);
  const { answers = {}, time_taken_seconds = 0 } = req.body || {};

  const test = (await dbGet('SELECT * FROM tests WHERE id = ? AND is_published = 1', [testId])) as
    | { id: number; total_marks: number; negative_marks: number; pass_marks: number; title: string }
    | undefined;
  if (!test) {
    res.status(404).json({ error: 'Test not found.' });
    return;
  }

  const questions = (await dbAll('SELECT * FROM questions WHERE test_id = ? ORDER BY sort_order ASC, id ASC', [testId])) as Array<{
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
    (await dbGet('SELECT COUNT(*) as c FROM test_attempts WHERE test_id = ? AND score > ?', [testId, score])) as { c: number }
  ).c;
  const rank = betterAttempts + 1;

  const insertAttempt = (await dbRun(`
      INSERT INTO test_attempts (test_id, student_id, answers_json, score, total_marks, correct_count, wrong_count, unanswered_count, percentage, rank, time_taken_seconds)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     RETURNING id`, [testId,
      sid,
      JSON.stringify(answers),
      score,
      maxMarks,
      correctCount,
      wrongCount,
      unansweredCount,
      percentage,
      rank,
      Number(time_taken_seconds) || 0]));

  const attempt = (await dbGet('SELECT * FROM test_attempts WHERE id = ?', [Number(insertAttempt.lastInsertRowid)]));
  res.status(201).json({ attempt, breakdown, passed: score >= test.pass_marks });
}));

router.get('/results', asyncHandler(async (req, res) => {
  const sid = req.user!.id;
  const rows = (await dbAll(`
      SELECT ta.*, t.title as test_title, t.pass_marks, t.difficulty, c.title as course_title
      FROM test_attempts ta
      JOIN tests t ON t.id = ta.test_id
      LEFT JOIN courses c ON c.id = t.course_id
      WHERE ta.student_id = ?
      ORDER BY ta.submitted_at DESC
    `, [sid]));
  res.json(rows);
}));

router.get('/referrals', asyncHandler(async (req, res) => {
  const sid = req.user!.id;
  const list = (await dbAll(`
      SELECT r.*, u.full_name as referred_name, u.created_at as joined_at
      FROM referrals r
      JOIN users u ON u.id = r.referred_user_id
      WHERE r.referrer_id = ?
      ORDER BY r.created_at DESC
    `, [sid])) as Array<{ status: string; reward_amount: number }>;

  const cmsRef = (await dbGet("SELECT value_json FROM cms_settings WHERE key = 'referral'")) as
    | { value_json: string }
    | undefined;
  const config = cmsRef ? JSON.parse(cmsRef.value_json) : { rewardAmount: 250, discountPercent: 10, headline: 'Invite Friends & Earn Rewards!' };

  const totalReferrals = list.length;
  const successfulReferrals = list.filter((r) => r.status === 'successful').length;
  const rewardsEarned = list
    .filter((r) => r.status === 'successful')
    .reduce((sum, r) => sum + Number(r.reward_amount || 0), 0);

  const courseShares = (await dbAll(`
      SELECT crl.*, c.title as course_title, c.slug as course_slug, c.short_description,
             c.thumbnail_url, c.price, c.discount_price, c.is_free
      FROM course_referral_links crl
      JOIN courses c ON c.id = crl.course_id
      WHERE crl.referrer_id = ?
      ORDER BY crl.created_at DESC
    `, [sid])) as Array<{ clicks: number; enrollments_count: number }>;

  const courseStats = {
    coursesShared: courseShares.length,
    totalClicks: courseShares.reduce((s, r) => s + Number(r.clicks || 0), 0),
    successfulEnrollments: courseShares.reduce((s, r) => s + Number(r.enrollments_count || 0), 0),
  };

  const recentEvents = (await dbAll(`
      SELECT re.event_type, re.referral_code, re.created_at, c.title as course_title
      FROM referral_events re
      JOIN course_referral_links crl ON crl.referral_code = re.referral_code
      JOIN courses c ON c.id = re.course_id
      WHERE crl.referrer_id = ?
      ORDER BY re.created_at DESC
      LIMIT 15
    `, [sid]));

  res.json({
    referral_code: req.user!.referral_code,
    stats: {
      totalReferrals,
      successfulReferrals,
      rewardsEarned,
    },
    config,
    referrals: list,
    courseShares,
    courseStats,
    recentEvents,
  });
}));

router.get('/certificates', asyncHandler(async (req, res) => {
  const sid = req.user!.id;
  const certs = (await dbAll(`
      SELECT cert.*, c.duration as course_duration, c.level as course_level
      FROM certificates cert
      LEFT JOIN courses c ON c.id = cert.course_id
      WHERE cert.student_id = ?
      ORDER BY cert.issued_at DESC
    `, [sid]));
  res.json(certs);
}));

router.post('/notifications/read', asyncHandler(async (req, res) => {
  (await dbRun('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user!.id]));
  res.json({ ok: true });
}));

// DELETE student account (self-service account deletion)
router.delete('/account', asyncHandler(async (req, res) => {
  const sid = req.user!.id;
  const user = (await dbGet('SELECT * FROM users WHERE id = ?', [sid])) as
    | { id: number; full_name: string; email: string; mobile: string; referral_code: string; role: string }
    | undefined;

  if (!user) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  if (user.role === 'admin') {
    res.status(400).json({ error: 'Admin accounts cannot be deleted through student portal.' });
    return;
  }

  const { reason = 'User requested account deletion via profile page' } = req.body || {};

  // 1. Fetch payments for snapshot
  const payments = (await dbAll(
    'SELECT id, order_ref, item_type, item_id, item_title, amount, discount_amount, final_amount, method, status, gateway_txn_id, created_at FROM payments WHERE student_id = ? ORDER BY created_at DESC',
    [sid]
  )) as Array<{ final_amount: number; status: string }>;

  const totalPayments = payments
    .filter((p) => p.status === 'successful')
    .reduce((sum, p) => sum + Number(p.final_amount || 0), 0);

  // 2. Fetch enrollments count
  const enrollmentsCountRow = (await dbGet<{ c: number }>(
    'SELECT COUNT(*) as c FROM enrollments WHERE student_id = ?',
    [sid]
  ));
  const enrollmentsCount = Number(enrollmentsCountRow?.c || 0);

  // 3. Store full snapshot in deleted_accounts for admin records & auditing
  await dbRun(
    `INSERT INTO deleted_accounts (
      original_user_id, full_name, email, mobile, referral_code, role,
      total_payments_received, payments_snapshot_json, enrollments_count,
      deletion_reason, deleted_by, deleted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'user', NOW())`,
    [
      sid,
      user.full_name,
      user.email,
      user.mobile || '',
      user.referral_code || '',
      user.role || 'student',
      totalPayments,
      JSON.stringify(payments),
      enrollmentsCount,
      String(reason).slice(0, 500),
    ]
  );

  // 4. Anonymize user row so unique constraints (email, mobile) are released,
  // while keeping user ID intact so historical payments foreign keys don't break
  const timestamp = Date.now();
  const anonymizedEmail = `deleted_${sid}_${timestamp}@deleted.invalid`;
  const anonymizedMobile = `DEL_${sid}_${timestamp}`.slice(0, 20);
  const anonymizedName = `${user.full_name} (Deleted Account)`;

  await dbRun(
    `UPDATE users
     SET full_name = ?,
         email = ?,
         mobile = ?,
         password_hash = 'DELETED_ACCOUNT',
         avatar_url = NULL,
         google_id = NULL,
         is_active = 0,
         deleted_at = NOW(),
         deletion_reason = ?
     WHERE id = ?`,
    [anonymizedName, anonymizedEmail, anonymizedMobile, String(reason).slice(0, 500), sid]
  );

  // 5. Clean up any active sessions / notifications / OTPs
  await dbRun('DELETE FROM notifications WHERE user_id = ?', [sid]);
  await dbRun('DELETE FROM email_otps WHERE email = ?', [user.email]);

  res.json({
    ok: true,
    message: 'Your account has been deleted successfully. You will be logged out.',
  });
}));

export default router;

