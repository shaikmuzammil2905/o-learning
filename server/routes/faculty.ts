import { Router } from 'express';
import { dbAll, dbGet, dbRun } from '../db.js';
import { asyncHandler, requireAuth, requireRole } from '../auth.js';

const router = Router();
router.use(requireAuth, requireRole('faculty', 'admin'));

async function getFacultyPermissions(userId: number) {
  const row = await dbGet<{ permissions_json: string }>(
    'SELECT permissions_json FROM faculty_profiles WHERE user_id = ?',
    [userId]
  );
  if (!row) {
    return {
      can_manage_lessons: true,
      can_schedule_live: true,
      can_manage_tests: true,
      can_upload_materials: true,
    };
  }
  return JSON.parse(row.permissions_json || '{}');
}

router.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const fid = req.user!.id;
    const isAdmin = req.user!.role === 'admin';
    const courses = isAdmin
      ? await dbAll<{ id: number }>('SELECT * FROM courses ORDER BY id ASC')
      : await dbAll<{ id: number }>('SELECT * FROM courses WHERE faculty_id = ? ORDER BY id ASC', [fid]);

    const courseIds = courses.map((c) => c.id);
    const placeholders = courseIds.length ? courseIds.map(() => '?').join(',') : '-1';

    const students = await dbAll(
      `SELECT DISTINCT u.id, u.full_name, u.email, u.mobile, e.course_id, c.title as course_title, e.progress_percent, e.status as enrollment_status, e.enrolled_at
       FROM enrollments e
       JOIN users u ON u.id = e.student_id
       JOIN courses c ON c.id = e.course_id
       WHERE e.course_id IN (${placeholders})
       ORDER BY e.enrolled_at DESC`,
      courseIds
    );

    const liveClasses = await dbAll(
      `SELECT lc.*, c.title as course_title
       FROM live_classes lc
       JOIN courses c ON c.id = lc.course_id
       WHERE ${isAdmin ? '1=1' : 'lc.faculty_id = ?'}
       ORDER BY lc.scheduled_at DESC`,
      isAdmin ? [] : [fid]
    );

    const tests = await dbAll(
      `SELECT t.*, c.title as course_title,
              (SELECT COUNT(*) FROM questions q WHERE q.test_id = t.id) as questions_count,
              (SELECT COUNT(*) FROM test_attempts ta WHERE ta.test_id = t.id) as attempts_count
       FROM tests t
       LEFT JOIN courses c ON c.id = t.course_id
       WHERE ${isAdmin ? '1=1' : `t.course_id IN (${placeholders}) OR t.created_by = ?`}
       ORDER BY t.id DESC`,
      isAdmin ? [] : [...courseIds, fid]
    );

    const performance = await dbAll(
      `SELECT ta.*, u.full_name as student_name, t.title as test_title
       FROM test_attempts ta
       JOIN users u ON u.id = ta.student_id
       JOIN tests t ON t.id = ta.test_id
       WHERE ${isAdmin ? '1=1' : `t.course_id IN (${placeholders}) OR t.created_by = ?`}
       ORDER BY ta.submitted_at DESC
       LIMIT 30`,
      isAdmin ? [] : [...courseIds, fid]
    );

    const permissions = isAdmin
      ? { can_manage_lessons: true, can_schedule_live: true, can_manage_tests: true, can_upload_materials: true }
      : await getFacultyPermissions(fid);

    res.json({ courses, students, liveClasses, tests, performance, permissions });
  })
);

router.get(
  '/courses/:courseId/curriculum',
  asyncHandler(async (req, res) => {
    const courseId = Number(req.params.courseId);
    const course = await dbGet<{ faculty_id: number }>('SELECT * FROM courses WHERE id = ?', [courseId]);
    if (!course) {
      res.status(404).json({ error: 'Course not found.' });
      return;
    }
    if (req.user!.role !== 'admin' && course.faculty_id !== req.user!.id) {
      res.status(403).json({ error: 'You are not assigned to this course.' });
      return;
    }
    const modules = await dbAll('SELECT * FROM modules WHERE course_id = ? ORDER BY sort_order ASC', [courseId]);
    const lessons = await dbAll('SELECT * FROM lessons WHERE course_id = ? ORDER BY sort_order ASC', [courseId]);
    res.json({ course, modules, lessons });
  })
);

router.post(
  '/courses/:courseId/lessons',
  asyncHandler(async (req, res) => {
    const courseId = Number(req.params.courseId);
    const course = await dbGet<{ faculty_id: number }>('SELECT * FROM courses WHERE id = ?', [courseId]);
    if (!course) {
      res.status(404).json({ error: 'Course not found.' });
      return;
    }
    if (req.user!.role !== 'admin') {
      if (course.faculty_id !== req.user!.id) {
        res.status(403).json({ error: 'You are not assigned to this course.' });
        return;
      }
      const perms = await getFacultyPermissions(req.user!.id);
      if (!perms.can_manage_lessons) {
        res.status(403).json({ error: 'You do not have permission to create lessons.' });
        return;
      }
    }

    const { module_id, title, lesson_type = 'video', video_url = '', material_url = '', duration_minutes = 25, content_text = '' } = req.body || {};
    if (!module_id || !title) {
      res.status(400).json({ error: 'Module and lesson title are required.' });
      return;
    }
    const r = await dbRun(
      `INSERT INTO lessons (module_id, course_id, title, lesson_type, video_url, material_url, duration_minutes, content_text, is_preview, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 99) RETURNING id`,
      [Number(module_id), courseId, String(title).trim(), lesson_type, video_url, material_url, Number(duration_minutes) || 25, content_text]
    );

    const lesson = await dbGet('SELECT * FROM lessons WHERE id = ?', [r.lastInsertRowid]);
    res.status(201).json(lesson);
  })
);

router.post(
  '/live-classes',
  asyncHandler(async (req, res) => {
    if (req.user!.role !== 'admin') {
      const perms = await getFacultyPermissions(req.user!.id);
      if (!perms.can_schedule_live) {
        res.status(403).json({ error: 'You do not have permission to schedule live classes.' });
        return;
      }
    }
    const { title, course_id, scheduled_at, duration_minutes = 60, meeting_url, status = 'upcoming', recording_url = '', description = '' } = req.body || {};
    if (!title || !course_id || !scheduled_at || !meeting_url) {
      res.status(400).json({ error: 'Title, course, date/time, and meeting link are required.' });
      return;
    }
    const r = await dbRun(
      `INSERT INTO live_classes (title, course_id, faculty_id, scheduled_at, duration_minutes, meeting_url, status, recording_url, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [String(title).trim(), Number(course_id), req.user!.id, scheduled_at, Number(duration_minutes) || 60, meeting_url, status, recording_url, description]
    );
    const lc = await dbGet('SELECT * FROM live_classes WHERE id = ?', [r.lastInsertRowid]);
    res.status(201).json(lc);
  })
);

router.put(
  '/live-classes/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const existing = await dbGet<{ faculty_id: number }>('SELECT * FROM live_classes WHERE id = ?', [id]);
    if (!existing) {
      res.status(404).json({ error: 'Live class not found.' });
      return;
    }
    if (req.user!.role !== 'admin' && existing.faculty_id !== req.user!.id) {
      res.status(403).json({ error: 'Cannot edit another faculty member’s live class.' });
      return;
    }
    const { title, scheduled_at, duration_minutes, meeting_url, status, recording_url, description } = req.body || {};
    await dbRun(
      `UPDATE live_classes
       SET title = COALESCE(?, title),
           scheduled_at = COALESCE(?, scheduled_at),
           duration_minutes = COALESCE(?, duration_minutes),
           meeting_url = COALESCE(?, meeting_url),
           status = COALESCE(?, status),
           recording_url = COALESCE(?, recording_url),
           description = COALESCE(?, description)
       WHERE id = ?`,
      [title ?? null, scheduled_at ?? null, duration_minutes ?? null, meeting_url ?? null, status ?? null, recording_url ?? null, description ?? null, id]
    );

    res.json(await dbGet('SELECT * FROM live_classes WHERE id = ?', [id]));
  })
);

router.post(
  '/tests',
  asyncHandler(async (req, res) => {
    if (req.user!.role !== 'admin') {
      const perms = await getFacultyPermissions(req.user!.id);
      if (!perms.can_manage_tests) {
        res.status(403).json({ error: 'You do not have permission to create tests.' });
        return;
      }
    }
    const { title, course_id, description = '', duration_minutes = 20, total_marks = 10, pass_marks = 5, negative_marks = 0, difficulty = 'Medium' } = req.body || {};
    if (!title) {
      res.status(400).json({ error: 'Test title is required.' });
      return;
    }
    const r = await dbRun(
      `INSERT INTO tests (title, course_id, description, duration_minutes, total_marks, pass_marks, negative_marks, difficulty, is_published, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?) RETURNING id`,
      [String(title).trim(), course_id ? Number(course_id) : null, description, Number(duration_minutes), Number(total_marks), Number(pass_marks), Number(negative_marks), difficulty, req.user!.id]
    );
    res.status(201).json(await dbGet('SELECT * FROM tests WHERE id = ?', [r.lastInsertRowid]));
  })
);

router.post(
  '/tests/:testId/questions',
  asyncHandler(async (req, res) => {
    const testId = Number(req.params.testId);
    const { question_text, options, correct_index, marks = 2, explanation = '' } = req.body || {};
    if (!question_text || !Array.isArray(options) || options.length < 2) {
      res.status(400).json({ error: 'Question text and at least 2 options are required.' });
      return;
    }
    const r = await dbRun(
      `INSERT INTO questions (test_id, question_text, options_json, correct_index, marks, explanation, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, 99) RETURNING id`,
      [testId, String(question_text).trim(), JSON.stringify(options), Number(correct_index) || 0, Number(marks) || 2, explanation]
    );
    res.status(201).json(await dbGet('SELECT * FROM questions WHERE id = ?', [r.lastInsertRowid]));
  })
);

export default router;
