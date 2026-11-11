import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

const dbPath =
  process.env.DB_PATH ||
  (process.env.VERCEL
    ? path.join('/tmp', 'o_learning.db')
    : path.resolve(process.cwd(), 'data', 'o_learning.db'));
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new DatabaseSync(dbPath);
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

function hashSeedPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function initDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      mobile TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('student', 'faculty', 'admin')) DEFAULT 'student',
      avatar_url TEXT,
      credits REAL NOT NULL DEFAULT 0,
      referral_code TEXT NOT NULL UNIQUE,
      referred_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS faculty_profiles (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      bio TEXT NOT NULL,
      specialization TEXT NOT NULL,
      experience_years INTEGER NOT NULL DEFAULT 5,
      qualifications TEXT NOT NULL DEFAULT '',
      permissions_json TEXT NOT NULL DEFAULT '{"can_manage_lessons":true,"can_schedule_live":true,"can_manage_tests":true,"can_upload_materials":true}'
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL DEFAULT '',
      image TEXT NOT NULL DEFAULT '',
      icon_name TEXT NOT NULL DEFAULT 'BookOpen',
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      short_description TEXT NOT NULL,
      description TEXT NOT NULL,
      thumbnail_url TEXT NOT NULL,
      banner_image TEXT NOT NULL DEFAULT '',
      preview_image TEXT NOT NULL DEFAULT '',
      instructor_image TEXT NOT NULL DEFAULT '',
      icon_name TEXT NOT NULL DEFAULT 'BookOpen',
      icon_color TEXT NOT NULL DEFAULT 'orange',
      level TEXT NOT NULL DEFAULT 'Beginner to Advanced',
      duration TEXT NOT NULL DEFAULT '12 Weeks',
      language TEXT NOT NULL DEFAULT 'English / Hindi',
      prerequisites TEXT NOT NULL DEFAULT 'None',
      price INTEGER NOT NULL DEFAULT 1999,
      discount_price INTEGER,
      is_free INTEGER NOT NULL DEFAULT 0,
      featured INTEGER NOT NULL DEFAULT 0,
      faculty_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      what_you_learn_json TEXT NOT NULL DEFAULT '[]',
      faqs_json TEXT NOT NULL DEFAULT '[]',
      is_published INTEGER NOT NULL DEFAULT 1,
      display_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS modules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS lessons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      module_id INTEGER NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      lesson_type TEXT NOT NULL CHECK (lesson_type IN ('video', 'material', 'quiz', 'assignment')) DEFAULT 'video',
      video_url TEXT NOT NULL DEFAULT '',
      material_url TEXT NOT NULL DEFAULT '',
      duration_minutes INTEGER NOT NULL DEFAULT 25,
      content_text TEXT NOT NULL DEFAULT '',
      is_preview INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      faculty_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      timings TEXT NOT NULL,
      total_seats INTEGER NOT NULL DEFAULT 60,
      enrolled_seats INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL CHECK (status IN ('upcoming', 'active', 'completed')) DEFAULT 'upcoming',
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS enrollments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      batch_id INTEGER REFERENCES batches(id) ON DELETE SET NULL,
      status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'upcoming')) DEFAULT 'active',
      progress_percent INTEGER NOT NULL DEFAULT 0,
      completed_lessons_json TEXT NOT NULL DEFAULT '[]',
      enrolled_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT,
      UNIQUE(student_id, course_id)
    );

    CREATE TABLE IF NOT EXISTS live_classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      faculty_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      batch_id INTEGER REFERENCES batches(id) ON DELETE SET NULL,
      scheduled_at TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL DEFAULT 60,
      meeting_url TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('live', 'upcoming', 'completed', 'cancelled')) DEFAULT 'upcoming',
      recording_url TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS tests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      description TEXT NOT NULL DEFAULT '',
      duration_minutes INTEGER NOT NULL DEFAULT 30,
      total_marks INTEGER NOT NULL DEFAULT 20,
      pass_marks INTEGER NOT NULL DEFAULT 8,
      negative_marks REAL NOT NULL DEFAULT 0,
      difficulty TEXT NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')) DEFAULT 'Medium',
      price INTEGER NOT NULL DEFAULT 0,
      certificate_enabled INTEGER NOT NULL DEFAULT 1,
      expiry_date TEXT DEFAULT '',
      is_published INTEGER NOT NULL DEFAULT 1,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      test_id INTEGER NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
      question_text TEXT NOT NULL,
      options_json TEXT NOT NULL,
      correct_index INTEGER NOT NULL,
      marks INTEGER NOT NULL DEFAULT 2,
      explanation TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS test_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      test_id INTEGER NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      answers_json TEXT NOT NULL,
      score REAL NOT NULL,
      total_marks INTEGER NOT NULL,
      correct_count INTEGER NOT NULL,
      wrong_count INTEGER NOT NULL,
      unanswered_count INTEGER NOT NULL,
      percentage REAL NOT NULL,
      rank INTEGER NOT NULL DEFAULT 1,
      time_taken_seconds INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'submitted',
      submitted_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS subscription_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      price INTEGER NOT NULL,
      duration_months INTEGER NOT NULL,
      badge TEXT NOT NULL DEFAULT '',
      features_json TEXT NOT NULL DEFAULT '[]',
      is_popular INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_ref TEXT NOT NULL UNIQUE,
      student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      item_type TEXT NOT NULL CHECK (item_type IN ('course', 'subscription')),
      item_id INTEGER NOT NULL,
      item_title TEXT NOT NULL,
      amount INTEGER NOT NULL,
      discount_amount INTEGER NOT NULL DEFAULT 0,
      final_amount INTEGER NOT NULL,
      method TEXT NOT NULL CHECK (method IN ('UPI', 'Card', 'NetBanking', 'Wallet', 'Free')),
      status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'successful', 'failed', 'cancelled', 'refunded')) DEFAULT 'pending',
      gateway_txn_id TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      plan_id INTEGER NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
      status TEXT NOT NULL CHECK (status IN ('active', 'expired', 'cancelled')) DEFAULT 'active',
      starts_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL,
      payment_id INTEGER REFERENCES payments(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS referrals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      referrer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      referred_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      referral_code TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('pending', 'successful')) DEFAULT 'successful',
      reward_amount INTEGER NOT NULL DEFAULT 250,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS certificates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      certificate_code TEXT NOT NULL UNIQUE,
      student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      student_name TEXT NOT NULL,
      course_title TEXT NOT NULL,
      issued_at TEXT NOT NULL DEFAULT (datetime('now')),
      status TEXT NOT NULL CHECK (status IN ('valid', 'revoked')) DEFAULT 'valid',
      UNIQUE(student_id, course_id)
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      student_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      student_name TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      comment TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS contact_enquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      mobile TEXT NOT NULL,
      subject TEXT NOT NULL DEFAULT 'Course Enquiry',
      message TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('new', 'in_progress', 'resolved')) DEFAULT 'new',
      admin_notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cms_settings (
      key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'info',
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS course_referral_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      referrer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      referral_code TEXT NOT NULL UNIQUE,
      clicks INTEGER NOT NULL DEFAULT 0,
      enrollments_count INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL CHECK (status IN ('active', 'paused')) DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS referral_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      referral_code TEXT NOT NULL,
      event_type TEXT NOT NULL CHECK (
        event_type IN (
          'share_clicked',
          'referral_link_generated',
          'referral_link_copied',
          'whatsapp_share',
          'instagram_share',
          'native_share',
          'referral_visit',
          'course_enrollment'
        )
      ),
      actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS course_referral_attributions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      referral_code TEXT NOT NULL,
      referrer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      referred_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      payment_id INTEGER REFERENCES payments(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(course_id, referred_user_id)
    );

    CREATE TABLE IF NOT EXISTS redemptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      referral_id INTEGER REFERENCES course_referral_links(id) ON DELETE SET NULL,
      amount REAL NOT NULL,
      method TEXT NOT NULL DEFAULT 'UPI',
      account_reference TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL CHECK (status IN ('Pending', 'Processing', 'Approved', 'Processed', 'Paid', 'Rejected', 'Failed')) DEFAULT 'Pending',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Ensure new columns exist if DB was created before this migration
  const safeAddCol = (table: string, colDef: string) => {
    try {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${colDef};`);
    } catch {
      // column already exists
    }
  };
  safeAddCol('users', 'credits REAL NOT NULL DEFAULT 0');
  safeAddCol('categories', "image TEXT NOT NULL DEFAULT ''");
  safeAddCol('courses', "banner_image TEXT NOT NULL DEFAULT ''");
  safeAddCol('courses', "preview_image TEXT NOT NULL DEFAULT ''");
  safeAddCol('courses', "instructor_image TEXT NOT NULL DEFAULT ''");
  safeAddCol('courses', "language TEXT NOT NULL DEFAULT 'English / Hindi'");
  safeAddCol('courses', "prerequisites TEXT NOT NULL DEFAULT 'None'");
  safeAddCol('courses', 'featured INTEGER NOT NULL DEFAULT 0');
  safeAddCol('tests', 'price INTEGER NOT NULL DEFAULT 0');
  safeAddCol('tests', 'certificate_enabled INTEGER NOT NULL DEFAULT 1');
  safeAddCol('tests', "expiry_date TEXT DEFAULT ''");

  const userCount = (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c;
  if (userCount === 0) {
    seedDatabase();
  }

  // Idempotent v2 safe demo-data cleanup: removes seeded demo/sample records so production analytics start cleanly at 0
  // without deleting any real customer accounts, courses, or transactions.
  const cleaned = db
    .prepare("SELECT key FROM cms_settings WHERE key = '_migration_v2_demo_cleanup'")
    .get();
  if (!cleaned) {
    runSafeDemoCleanup();
    db.prepare(
      "INSERT INTO cms_settings (key, value_json) VALUES ('_migration_v2_demo_cleanup', ?)"
    ).run(JSON.stringify({ cleanedAt: new Date().toISOString() }));
  }
}

export function runSafeDemoCleanup(): { removed: Record<string, number> } {
  const removed: Record<string, number> = {
    payments: 0,
    referrals: 0,
    users: 0,
    courses: 0,
    categories: 0,
    tests: 0,
    enquiries: 0,
  };

  // 1. Remove known seeded demo payments & test attempts
  removed.payments += Number(
    db.prepare("DELETE FROM payments WHERE order_ref IN ('ORD-2026-1001', 'ORD-2026-1002')").run().changes
  );

  // 2. Remove known seeded demo referral links & signup referrals
  removed.referrals += Number(
    db
      .prepare("DELETE FROM course_referral_links WHERE referral_code IN ('OL-1023SPK', 'OL-8841INT', 'OL-5521ITP')")
      .run().changes
  );
  removed.referrals += Number(
    db.prepare("DELETE FROM referrals WHERE referral_code = 'OLR-AARAV26'").run().changes
  );

  // 3. Remove known seeded demo student accounts if they have zero real non-seed payments
  const demoStudents = db
    .prepare(
      "SELECT id FROM users WHERE email IN ('aarav@student.in', 'sneha@student.in') AND id NOT IN (SELECT DISTINCT student_id FROM payments)"
    )
    .all() as Array<{ id: number }>;
  for (const st of demoStudents) {
    removed.users += Number(db.prepare('DELETE FROM users WHERE id = ?').run(st.id).changes);
  }

  // 4. Remove known seeded demo enquiry
  removed.enquiries += Number(
    db.prepare("DELETE FROM contact_enquiries WHERE email = 'priya.nair@example.com'").run().changes
  );

  // 5. Remove untouched seeded demo courses ONLY if no real enrollments or payments exist on them
  const seedSlugs = [
    'spoken-english',
    'competitive-exam-preparation',
    'jee-neet-preparation',
    'upsc-preparation',
    'aptitude-and-reasoning',
    'interview-preparation',
    'it-and-programming-courses',
    'career-development-professional-skills',
  ];
  for (const slug of seedSlugs) {
    const course = db.prepare('SELECT id FROM courses WHERE slug = ?').get(slug) as { id: number } | undefined;
    if (!course) continue;
    const realEnroll = db
      .prepare('SELECT COUNT(*) as c FROM enrollments WHERE course_id = ?')
      .get(course.id) as { c: number };
    const realPay = db
      .prepare("SELECT COUNT(*) as c FROM payments WHERE item_type = 'course' AND item_id = ?")
      .get(course.id) as { c: number };
    if (realEnroll.c === 0 && realPay.c === 0) {
      db.prepare('DELETE FROM tests WHERE course_id = ?').run(course.id);
      db.prepare('DELETE FROM batches WHERE course_id = ?').run(course.id);
      db.prepare('DELETE FROM live_classes WHERE course_id = ?').run(course.id);
      removed.courses += Number(db.prepare('DELETE FROM courses WHERE id = ?').run(course.id).changes);
    }
  }

  // 6. Remove remaining orphan demo tests/reviews/plans if system is otherwise empty
  const realCourseCount = (db.prepare('SELECT COUNT(*) as c FROM courses').get() as { c: number }).c;
  if (realCourseCount === 0) {
    removed.tests += Number(db.prepare('DELETE FROM tests').run().changes);
    db.prepare('DELETE FROM subscription_plans').run();
    removed.categories += Number(db.prepare('DELETE FROM categories').run().changes);
  }

  // 7. Remove seeded demo faculty accounts only if zero courses reference them
  const demoFacultyEmails = [
    'ananya@olearning.in',
    'vikram@olearning.in',
    'rahul@olearning.in',
    'meera@olearning.in',
  ];
  for (const em of demoFacultyEmails) {
    const fac = db.prepare('SELECT id FROM users WHERE email = ?').get(em) as { id: number } | undefined;
    if (!fac) continue;
    const refs = (
      db.prepare('SELECT COUNT(*) as c FROM courses WHERE faculty_id = ?').get(fac.id) as { c: number }
    ).c;
    if (refs === 0) {
      removed.users += Number(db.prepare('DELETE FROM users WHERE id = ?').run(fac.id).changes);
    }
  }

  // 8. Ensure stats in cms_settings do not display static fake figures if empty
  if (realCourseCount === 0) {
    const cleanStats = [
      { label: 'Courses & Programs', value: '0', icon: 'BookOpen' },
      { label: 'Happy Learners', value: '0', icon: 'Users' },
      { label: 'Expert Faculty', value: '0', icon: 'UserCheck' },
      { label: 'Verified Enrollments', value: '0', icon: 'BadgeCheck' },
    ];
    db.prepare(
      "INSERT INTO cms_settings (key, value_json, updated_at) VALUES ('stats', ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = datetime('now')"
    ).run(JSON.stringify(cleanStats));
  }

  return { removed };
}

function seedDatabase(): void {
  const insertUser = db.prepare(`
    INSERT INTO users (full_name, email, mobile, password_hash, role, avatar_url, referral_code, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `);

  // Bootstrap Administrator login only — zero fake students, zero fake courses, zero fake payments/revenue!
  insertUser.run(
    'O-Learning Admin',
    'admin@olearning.in',
    '9000000001',
    hashSeedPassword('Admin@123'),
    'admin',
    null,
    'OLEARNADMIN'
  );

  // Clean CMS defaults starting at 0 real records
  const cmsDefaults: Record<string, unknown> = {
    brand: {
      name: 'O-LEARNING PLATFORM',
      tagline: 'Learn Today, Lead Tomorrow!',
      supportingTagline: 'Your Learning Partner for a Better Future.',
      foundedYear: '2026',
      location: 'Hyderabad, Telangana, India',
    },
    hero: {
      heading: 'Your Learning Partner for a Better Future.',
      subtext:
        'Access expert-led online courses, live classes, recorded videos and exam preparation – all in one place.',
      primaryCtaLabel: 'Explore Courses',
      secondaryCtaLabel: 'Join Now',
      desktopBgUrl: '/images/hero-desktop-bg.png',
      mobileBgUrl: '/images/hero-mobile-bg.png',
      featureList: ['Live Classes', 'Recorded Videos', 'Practice Tests', 'Expert Faculty', 'Certificates'],
    },
    stats: [
      { label: 'Courses & Programs', value: '0', icon: 'BookOpen' },
      { label: 'Happy Learners', value: '0', icon: 'Users' },
      { label: 'Expert Faculty', value: '0', icon: 'UserCheck' },
      { label: 'Verified Enrollments', value: '0', icon: 'BadgeCheck' },
    ],
    banner: {
      heading: 'Learn Anywhere, Anytime!',
      bullets: [
        'Live & Recorded Classes',
        'Study Material & Notes',
        'Practice Tests & Mock Exams',
        'Expert Support',
      ],
      ctaLabel: 'Get Started Now',
    },
    about: {
      vision:
        'To become a leading online learning platform in India, providing quality and affordable education to every student.',
      mission:
        'Make learning simple, accessible and affordable through expert faculty, practical training, recorded classes and interactive learning.',
      coreValues: [
        'Quality Education',
        'Affordable Learning',
        'Student Success',
        'Practical Knowledge',
        'Innovation & Technology',
        'Transparency and Trust',
        'Continuous Improvement',
      ],
      imageUrl: '/images/about-hero-banner.png',
    },
    contact: {
      phone: '8978991329',
      whatsapp: '9121403515',
      email: 'olearningplatform33@gmail.com',
      location: 'Hyderabad, Telangana, India',
      address: 'Hitech City / Madhapur EdTech Hub, Hyderabad, Telangana 500081, India',
    },
    referral: {
      enabled: true,
      rewardType: 'fixed',
      rewardAmount: 250,
      discountPercent: 10,
      minPurchase: 0,
      maxReward: 2500,
      headline: 'Invite Friends & Earn Rewards!',
      shareMessage: 'Check out this course on O-Learning Platform!',
    },
    payment: {
      currency: 'INR',
      gatewayMode: 'Standard Checkout',
    },
  };

  const insertCms = db.prepare('INSERT INTO cms_settings (key, value_json) VALUES (?, ?)');
  for (const [k, v] of Object.entries(cmsDefaults)) {
    insertCms.run(k, JSON.stringify(v));
  }
}

export default db;
