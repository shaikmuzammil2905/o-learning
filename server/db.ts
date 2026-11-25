import crypto from 'node:crypto';
import pg from 'pg';

const { Pool, types } = pg;

// Parse PostgreSQL BIGINT (COUNT, SUM) and NUMERIC (ROUND, AVG) as JS numbers
types.setTypeParser(20, (val) => parseInt(val, 10));
types.setTypeParser(1700, (val) => parseFloat(val));
// Parse TIMESTAMP / TIMESTAMPTZ as ISO strings for frontend compatibility
types.setTypeParser(1114, (val) => new Date(val).toISOString());
types.setTypeParser(1184, (val) => new Date(val).toISOString());

const connectionString =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/o_learning';

export const pool = new Pool({
  connectionString,
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

/** Convert `?` placeholders to PostgreSQL `$1, $2, ...` outside single-quoted string literals. */
function convertPlaceholders(sql: string): string {
  let out = '';
  let idx = 1;
  let inSingleQuote = false;
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (ch === "'") {
      if (inSingleQuote && sql[i + 1] === "'") {
        out += "''";
        i++;
        continue;
      }
      inSingleQuote = !inSingleQuote;
      out += ch;
    } else if (ch === '?' && !inSingleQuote) {
      out += `$${idx++}`;
    } else {
      out += ch;
    }
  }
  return out;
}

export async function dbGet<T = Record<string, any>>(
  sql: string,
  params: unknown[] = []
): Promise<T | undefined> {
  const res = await pool.query(convertPlaceholders(sql), params);
  return res.rows[0] as T | undefined;
}

export async function dbAll<T = Record<string, any>>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const res = await pool.query(convertPlaceholders(sql), params);
  return res.rows as T[];
}

export async function dbRun(
  sql: string,
  params: unknown[] = []
): Promise<{ changes: number; lastInsertRowid: number }> {
  const res = await pool.query(convertPlaceholders(sql), params);
  const firstRow = res.rows[0] as { id?: number | string } | undefined;
  return {
    changes: res.rowCount ?? 0,
    lastInsertRowid: firstRow?.id !== undefined ? Number(firstRow.id) : 0,
  };
}

export async function dbExec(sql: string): Promise<void> {
  await pool.query(sql);
}

function hashSeedPassword(password: string): string {
  if (password === 'admin123') return '74b0cce31e1cffc4a4058c12c639c458:c65e4fe6a55db517764657f4d1d8b1e9d18767641cdcdc08e2e722abb11c779ee5e57a63313c5d2de9027d3c4a3398c4962c82db955a78874550fb881c43ed58';
  if (password === 'student123') return '4dae2d81e7286c84a07aac6019343a64:db607e70627d27fb1a991ffd8481b25de9e21e35e1b400830365d563dafb5540cedf1194c07a2a322aefcb47047e1a6af63a8a53cc8aa3c804bb1e0b90361789';
  if (password === 'faculty123') return 'd0da865bb723f2513ee2461322be75bf:3d72577d86ecabfb1520ca0eed46e4cac79372519680395ba6ce49b43d9c7194a2676a66cbda97c8328df42557b629a5ebebed6b2996b06caf0c63cf8a6609ef';
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export async function initDatabase(): Promise<void> {
  await dbExec(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      mobile TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('student', 'faculty', 'admin')) DEFAULT 'student',
      avatar_url TEXT,
      credits DOUBLE PRECISION NOT NULL DEFAULT 0,
      referral_code TEXT NOT NULL UNIQUE,
      referred_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL DEFAULT '',
      image TEXT NOT NULL DEFAULT '',
      icon_name TEXT NOT NULL DEFAULT 'BookOpen',
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS courses (
      id SERIAL PRIMARY KEY,
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
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS modules (
      id SERIAL PRIMARY KEY,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS lessons (
      id SERIAL PRIMARY KEY,
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
      id SERIAL PRIMARY KEY,
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
      id SERIAL PRIMARY KEY,
      student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      batch_id INTEGER REFERENCES batches(id) ON DELETE SET NULL,
      status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'upcoming')) DEFAULT 'active',
      progress_percent INTEGER NOT NULL DEFAULT 0,
      completed_lessons_json TEXT NOT NULL DEFAULT '[]',
      enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMPTZ,
      UNIQUE(student_id, course_id)
    );

    CREATE TABLE IF NOT EXISTS live_classes (
      id SERIAL PRIMARY KEY,
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
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      description TEXT NOT NULL DEFAULT '',
      duration_minutes INTEGER NOT NULL DEFAULT 30,
      total_marks INTEGER NOT NULL DEFAULT 20,
      pass_marks INTEGER NOT NULL DEFAULT 8,
      negative_marks DOUBLE PRECISION NOT NULL DEFAULT 0,
      difficulty TEXT NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')) DEFAULT 'Medium',
      price INTEGER NOT NULL DEFAULT 0,
      certificate_enabled INTEGER NOT NULL DEFAULT 1,
      expiry_date TEXT DEFAULT '',
      is_published INTEGER NOT NULL DEFAULT 1,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS questions (
      id SERIAL PRIMARY KEY,
      test_id INTEGER NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
      question_text TEXT NOT NULL,
      options_json TEXT NOT NULL,
      correct_index INTEGER NOT NULL,
      marks INTEGER NOT NULL DEFAULT 2,
      explanation TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS test_attempts (
      id SERIAL PRIMARY KEY,
      test_id INTEGER NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      answers_json TEXT NOT NULL,
      score DOUBLE PRECISION NOT NULL,
      total_marks INTEGER NOT NULL,
      correct_count INTEGER NOT NULL,
      wrong_count INTEGER NOT NULL,
      unanswered_count INTEGER NOT NULL,
      percentage DOUBLE PRECISION NOT NULL,
      rank INTEGER NOT NULL DEFAULT 1,
      time_taken_seconds INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'submitted',
      submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS subscription_plans (
      id SERIAL PRIMARY KEY,
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
      id SERIAL PRIMARY KEY,
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
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS user_subscriptions (
      id SERIAL PRIMARY KEY,
      student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      plan_id INTEGER NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
      status TEXT NOT NULL CHECK (status IN ('active', 'expired', 'cancelled')) DEFAULT 'active',
      starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL,
      payment_id INTEGER REFERENCES payments(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS referrals (
      id SERIAL PRIMARY KEY,
      referrer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      referred_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      referral_code TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('pending', 'successful')) DEFAULT 'successful',
      reward_amount INTEGER NOT NULL DEFAULT 250,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS certificates (
      id SERIAL PRIMARY KEY,
      certificate_code TEXT NOT NULL UNIQUE,
      student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      student_name TEXT NOT NULL,
      course_title TEXT NOT NULL,
      issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      status TEXT NOT NULL CHECK (status IN ('valid', 'revoked')) DEFAULT 'valid',
      UNIQUE(student_id, course_id)
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id SERIAL PRIMARY KEY,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      student_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      student_name TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      comment TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS contact_enquiries (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      mobile TEXT NOT NULL,
      subject TEXT NOT NULL DEFAULT 'Course Enquiry',
      message TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('new', 'in_progress', 'resolved')) DEFAULT 'new',
      admin_notes TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS cms_settings (
      key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'info',
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS course_referral_links (
      id SERIAL PRIMARY KEY,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      referrer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      referral_code TEXT NOT NULL UNIQUE,
      clicks INTEGER NOT NULL DEFAULT 0,
      enrollments_count INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL CHECK (status IN ('active', 'paused')) DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS referral_events (
      id SERIAL PRIMARY KEY,
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
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS course_referral_attributions (
      id SERIAL PRIMARY KEY,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      referral_code TEXT NOT NULL,
      referrer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      referred_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      payment_id INTEGER REFERENCES payments(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(course_id, referred_user_id)
    );

    CREATE TABLE IF NOT EXISTS redemptions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      referral_id INTEGER REFERENCES course_referral_links(id) ON DELETE SET NULL,
      amount DOUBLE PRECISION NOT NULL,
      method TEXT NOT NULL DEFAULT 'UPI',
      account_reference TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL CHECK (status IN ('Pending', 'Processing', 'Approved', 'Processed', 'Paid', 'Rejected', 'Failed')) DEFAULT 'Pending',
      notes TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS course_notes (
      id SERIAL PRIMARY KEY,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      file_url TEXT NOT NULL DEFAULT '',
      file_size_text TEXT NOT NULL DEFAULT '2.4 MB',
      file_size_bytes INTEGER NOT NULL DEFAULT 2516582,
      is_published INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS pdfs (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT 'Worksheets & Notes',
      file_url TEXT NOT NULL,
      thumbnail_url TEXT NOT NULL DEFAULT '',
      file_size_text TEXT NOT NULL DEFAULT '118 KB',
      display_order INTEGER NOT NULL DEFAULT 1,
      is_published INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS videos (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      video_url TEXT NOT NULL,
      thumbnail_url TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT 'Featured Overview',
      placement TEXT NOT NULL CHECK (placement IN ('homepage_featured', 'homepage_section', 'dedicated_section')) DEFAULT 'homepage_featured',
      duration_text TEXT NOT NULL DEFAULT '02:15',
      display_order INTEGER NOT NULL DEFAULT 1,
      is_published INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS email_otps (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL,
      otp_hash TEXT NOT NULL,
      purpose TEXT NOT NULL CHECK (purpose IN ('signup', 'forgot_password')),
      payload_json TEXT NOT NULL DEFAULT '{}',
      expires_at TIMESTAMPTZ NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(email, purpose)
    );
  `);

  const safeAddCol = async (table: string, colDef: string) => {
    await dbExec(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${colDef};`);
  };
  await safeAddCol('users', 'credits DOUBLE PRECISION NOT NULL DEFAULT 0');
  await safeAddCol('users', "auth_provider TEXT NOT NULL DEFAULT 'local'");
  await safeAddCol('users', 'google_id TEXT');
  await safeAddCol('users', 'email_verified INTEGER NOT NULL DEFAULT 0');
  await safeAddCol('users', 'profile_completed INTEGER NOT NULL DEFAULT 1');
  await safeAddCol('categories', "image TEXT NOT NULL DEFAULT ''");
  await safeAddCol('courses', "banner_image TEXT NOT NULL DEFAULT ''");
  await safeAddCol('courses', "preview_image TEXT NOT NULL DEFAULT ''");
  await safeAddCol('courses', "instructor_image TEXT NOT NULL DEFAULT ''");
  await safeAddCol('courses', "language TEXT NOT NULL DEFAULT 'English / Hindi'");
  await safeAddCol('courses', "prerequisites TEXT NOT NULL DEFAULT 'None'");
  await safeAddCol('courses', 'featured INTEGER NOT NULL DEFAULT 0');
  await safeAddCol('tests', 'price INTEGER NOT NULL DEFAULT 0');
  await safeAddCol('tests', 'certificate_enabled INTEGER NOT NULL DEFAULT 1');
  await safeAddCol('tests', "expiry_date TEXT DEFAULT ''");

  const userCountRow = await dbGet<{ c: number }>('SELECT COUNT(*) as c FROM users');
  if ((userCountRow?.c ?? 0) === 0) {
    await seedDatabase();
  } else {
    await dbExec(`
      UPDATE courses SET thumbnail_url = REPLACE(thumbnail_url, '.svg', '.png') WHERE thumbnail_url LIKE '/images/courses/%.svg';
      UPDATE cms_settings SET value_json = REPLACE(value_json, '/images/about-campus.svg', '/images/about-hero-banner.png') WHERE key = 'about';
      UPDATE cms_settings SET value_json = REPLACE(value_json, 'Hyderabad, Telangana, India', 'India');
      UPDATE cms_settings SET value_json = REPLACE(value_json, 'Hitech City / Madhapur EdTech Hub, Hyderabad, Telangana 500081, India', 'India');
      UPDATE faculty_profiles SET bio = REPLACE(bio, 'Hyderabad ', '') WHERE bio LIKE '%Hyderabad%';
      UPDATE faculty_profiles SET bio = REPLACE(bio, 'in Hyderabad tech parks', 'in leading Indian tech parks') WHERE bio LIKE '%Hyderabad%';
      UPDATE faculty_profiles SET bio = REPLACE(bio, 'across Telangana and India', 'across India') WHERE bio LIKE '%Telangana%';
    `);
  }

  try {
    const notesCountRow = await dbGet<{ c: number }>('SELECT COUNT(*) as c FROM course_notes');
    if ((notesCountRow?.c ?? 0) === 0) {
      const allCourses = await dbAll<{ id: number; title: string }>('SELECT id, title FROM courses');
      for (const c of allCourses) {
        await dbRun(
          `INSERT INTO course_notes (course_id, title, description, file_url, file_size_text, file_size_bytes, is_published)
           VALUES (?, ?, ?, ?, ?, ?, 1)`,
          [
            c.id,
            `${c.title} — Official Comprehensive Handbook & Formula Sheet`,
            `Complete module-by-module reference handbook, formula summaries, cheat sheets, and practice question sets for ${c.title}.`,
            `/api/public/materials/${c.id}/1`,
            '3.2 MB',
            3355443,
          ]
        );
        await dbRun(
          `INSERT INTO course_notes (course_id, title, description, file_url, file_size_text, file_size_bytes, is_published)
           VALUES (?, ?, ?, ?, ?, ?, 1)`,
          [
            c.id,
            `${c.title} — High-Yield Revision Capsule & Solved Question Bank`,
            `Core summary notes, high-yield exam takeaways, and solved exercises curated for rapid revision.`,
            `/api/public/materials/${c.id}/2`,
            '1.8 MB',
            1887436,
          ]
        );
      }
    }
  } catch {
    // ignore
  }

  try {
    const pdfCountRow = await dbGet<{ c: number }>('SELECT COUNT(*) as c FROM pdfs');
    if ((pdfCountRow?.c ?? 0) === 0) {
      const insPdfSql = `
        INSERT INTO pdfs (title, description, category, file_url, thumbnail_url, file_size_text, display_order, is_published)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1)
      `;
      await dbRun(insPdfSql, [
        'Future Forms - Will and Going To (Practice Worksheet)',
        'Comprehensive grammar practice worksheet covering Future Forms, Will vs Going To rules, sentence structures, and test exercises with answer keys.',
        'Spoken English & Grammar',
        'https://o-learning-platform-media-2026.s3.ap-southeast-2.amazonaws.com/uploads/1795100996750-Future-Forms-Practice-Worksheet.pdf',
        '/images/courses/spoken-english.png',
        '118 KB',
        1,
      ]);
      await dbRun(insPdfSql, [
        'Quantitative Aptitude & Speed Math Formula Handbook',
        'Handy formula cheat sheet with Vedic math tricks, percentage-fraction tables, and shortcuts for competitive exam aspirants.',
        'Competitive Exams',
        '/api/public/materials/2/1',
        '/images/courses/competitive-exams.png',
        '2.4 MB',
        2,
      ]);
      await dbRun(insPdfSql, [
        'Python & Full-Stack Web Architecture Cheat Sheet',
        'Essential Python syntax, OOP concepts, SQL queries, and REST API conventions formatted for quick interview and lab reference.',
        'IT & Software',
        '/api/public/materials/7/1',
        '/images/courses/it-programming.png',
        '3.1 MB',
        3,
      ]);
    }
  } catch {
    // ignore
  }

  try {
    const videoCountRow = await dbGet<{ c: number }>('SELECT COUNT(*) as c FROM videos');
    if ((videoCountRow?.c ?? 0) === 0) {
      const insVideoSql = `
        INSERT INTO videos (title, description, video_url, thumbnail_url, category, placement, duration_text, display_order, is_published)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
      `;
      await dbRun(insVideoSql, [
        'Welcome to O-Learning Platform — Learning Partner for a Better Future',
        'Experience how O-Learning Platform empowers Indian learners with expert-led live classes, structured HD lecture recordings, downloadable study notes, and outcome-oriented mentorship.',
        '/videos/platform-intro.mp4',
        '/images/hero-desktop-bg.png',
        'Platform Tour & Classroom Experience',
        'homepage_featured',
        '00:45',
        1,
      ]);
      await dbRun(insVideoSql, [
        'Live Class Demo: Spoken English & Pronunciation Mastery',
        'Sample interactive class walkthrough covering everyday conversation clubs, fluency drills, and accent neutralization.',
        '/videos/platform-intro.mp4',
        '/images/courses/spoken-english.png',
        'Classroom Demo',
        'homepage_section',
        '00:45',
        2,
      ]);
    }
  } catch {
    // ignore
  }

  const cleaned = await dbGet("SELECT key FROM cms_settings WHERE key = '_migration_v3_clean_txns'");
  if (!cleaned) {
    await runSafeDemoCleanup();
    await dbRun(
      `INSERT INTO cms_settings (key, value_json, updated_at)
       VALUES ('_migration_v3_clean_txns', ?, NOW())
       ON CONFLICT (key) DO UPDATE SET value_json = EXCLUDED.value_json, updated_at = NOW()`,
      [JSON.stringify({ cleanedAt: new Date().toISOString() })]
    );
  }
}

export async function runSafeDemoCleanup(): Promise<{ removed: Record<string, number> }> {
  const removed: Record<string, number> = {
    payments: 0,
    referrals: 0,
    users: 0,
    enquiries: 0,
  };

  removed.payments += (
    await dbRun("DELETE FROM payments WHERE order_ref IN ('ORD-2026-1001', 'ORD-2026-1002')")
  ).changes;
  removed.referrals += (
    await dbRun(
      "DELETE FROM course_referral_links WHERE referral_code IN ('OL-1023SPK', 'OL-8841INT', 'OL-5521ITP')"
    )
  ).changes;
  removed.referrals += (
    await dbRun("DELETE FROM referrals WHERE referral_code = 'OLR-AARAV26'")
  ).changes;

  const demoStudents = await dbAll<{ id: number }>(
    "SELECT id FROM users WHERE email IN ('aarav@student.in', 'sneha@student.in') AND id NOT IN (SELECT DISTINCT student_id FROM payments)"
  );
  for (const st of demoStudents) {
    removed.users += (await dbRun('DELETE FROM users WHERE id = ?', [st.id])).changes;
  }

  removed.enquiries += (
    await dbRun("DELETE FROM contact_enquiries WHERE email = 'priya.nair@example.com'")
  ).changes;

  return { removed };
}

async function seedDatabase(): Promise<void> {
  const insertUserSql = `
    INSERT INTO users (full_name, email, mobile, password_hash, role, avatar_url, referral_code, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  RETURNING id`;

  // Seed Admin, 4 Faculty, and 2 Sample Students
  const adminRes = (await dbRun(insertUserSql, [
    'O-Learning Admin',
    'admin@olearning.in',
    '9000000001',
    hashSeedPassword('Admin@123'),
    'admin',
    null,
    'OLEARNADMIN'
  ]));
  const adminId = Number(adminRes.lastInsertRowid);

  const f1 = Number(
    (await dbRun(insertUserSql, [
      'Dr. Ananya Sharma',
      'ananya@olearning.in',
      '9000000011',
      hashSeedPassword('Faculty@123'),
      'faculty',
      null,
      'FACANANYA'
    ])).lastInsertRowid
  );
  const f2 = Number(
    (await dbRun(insertUserSql, [
      'Prof. Vikram Reddy',
      'vikram@olearning.in',
      '9000000012',
      hashSeedPassword('Faculty@123'),
      'faculty',
      null,
      'FACVIKRAM'
    ])).lastInsertRowid
  );
  const f3 = Number(
    (await dbRun(insertUserSql, [
      'Rahul Deshmukh',
      'rahul@olearning.in',
      '9000000013',
      hashSeedPassword('Faculty@123'),
      'faculty',
      null,
      'FACRAHUL'
    ])).lastInsertRowid
  );
  const f4 = Number(
    (await dbRun(insertUserSql, [
      'Meera Krishnan (IAS Retd. Mentor)',
      'meera@olearning.in',
      '9000000014',
      hashSeedPassword('Faculty@123'),
      'faculty',
      null,
      'FACMEERA'
    ])).lastInsertRowid
  );

  const insertFacultyProfileSql = `
    INSERT INTO faculty_profiles (user_id, title, bio, specialization, experience_years, qualifications)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  (await dbRun(insertFacultyProfileSql, [
    f1,
    'Head of Communication & Spoken English',
    'Cambridge CELTA-certified communication coach who has mentored 12,000+ Indian learners in spoken English, pronunciation, and corporate readiness.',
    'Spoken English, Interview & Career Skills',
    11,
    'Ph.D. English Literature, CELTA'
  ]));
  (await dbRun(insertFacultyProfileSql, [
    f2,
    'Senior JEE/NEET & Quantitative Mentor',
    'Former IIT/NEET senior lecturer simplifying Physics, Mathematics, and Quantitative Aptitude with visual problem-solving methods.',
    'JEE, NEET & Quantitative Aptitude',
    14,
    'M.Tech IIT Madras'
  ]));
  (await dbRun(insertFacultyProfileSql, [
    f3,
    'Principal Software Engineering Instructor',
    '10+ years building scalable cloud and Java/Python systems in leading Indian tech parks; passionate about turning beginners into job-ready engineers.',
    'Python, Java, DSA & IT Interviews',
    10,
    'B.Tech CSE, Ex-Senior SDE'
  ]));
  (await dbRun(insertFacultyProfileSql, [
    f4,
    'UPSC & Competitive Exams Director',
    'Renowned GS & Current Affairs mentor guiding aspirants across India for UPSC CSE, SSC CGL, Banking, and State PSC.',
    'UPSC CSE, Polity, Economy & Govt Exams',
    15,
    'M.A. Public Administration'
  ]));

  // Zero demo students, zero demo payments (₹0 revenue), zero demo referrals on fresh DB

  // Categories
  const insertCatSql = 
    'INSERT INTO categories (name, slug, description, icon_name) VALUES (?, ?, ?, ?)RETURNING id'
  ;
  const catLang = Number(
    (await dbRun(insertCatSql, ['Languages & Communication', 'languages', 'Fluency, grammar, and soft skills', 'MessageCircle'])).lastInsertRowid
  );
  const catExam = Number(
    (await dbRun(insertCatSql, ['Competitive & Govt Exams', 'competitive-exams', 'UPSC, SSC, Banking, and State PSC', 'Trophy'])).lastInsertRowid
  );
  const catSci = Number(
    (await dbRun(insertCatSql, ['Engineering & Medical Entrance', 'jee-neet', 'JEE Main/Advanced & NEET UG preparation', 'GraduationCap'])).lastInsertRowid
  );
  const catApt = Number(
    (await dbRun(insertCatSql, ['Aptitude & Career Prep', 'aptitude-career', 'Placement aptitude, HR & mock interviews', 'Brain'])).lastInsertRowid
  );
  const catIT = Number(
    (await dbRun(insertCatSql, ['IT & Programming', 'it-programming', 'Python, Java, Full-Stack & Cloud skills', 'Code2'])).lastInsertRowid
  );

  // 8 Primary Courses from the Prompt
  const coursesData = [
    {
      slug: 'spoken-english',
      category_id: catLang,
      title: 'Spoken English',
      short_description:
        'Learn English from basic to advanced levels. Improve grammar, vocabulary, pronunciation, fluency and communication skills.',
      description:
        'Master real-world spoken English with daily guided speaking drills, Indian accent neutralization, practical grammar, rich vocabulary building, and interactive live conversation clubs designed for students, job seekers, and working professionals.',
      thumbnail_url: '/images/courses/spoken-english.png',
      icon_name: 'MessageSquare',
      icon_color: 'orange',
      level: 'Beginner to Advanced',
      duration: '10 Weeks',
      price: 2499,
      discount_price: 1299,
      is_free: 0,
      faculty_id: f1,
      what_you_learn: [
        'Speak fluently in everyday, academic, and workplace conversations without hesitation',
        'Build a strong foundation in practical English grammar and sentence framing',
        'Master 1,500+ high-frequency vocabulary words, idioms, and phrases',
        'Improve pronunciation, voice modulation, and active listening comprehension',
      ],
      faqs: [
        { q: 'Is this course suitable for complete beginners?', a: 'Yes! Module 1 starts from foundational sentence construction and progresses smoothly to advanced public speaking.' },
        { q: 'Are live speaking practice sessions included?', a: 'Yes, weekly live interactive rooms with Dr. Ananya Sharma are included.' },
      ],
      modules: [
        {
          title: 'Module 1: Foundations of Fluent Grammar',
          lessons: [
            { title: 'Sentence Structure & Everyday Tenses', type: 'video', dur: 24, preview: 1, text: 'Learn how native and fluent speakers naturally select Present, Past, and Future tenses without translating word-by-word.' },
            { title: '100 Essential Daily Conversation Phrases (PDF)', type: 'material', dur: 15, preview: 1, text: 'Downloadable quick-reference handbook with 100 practical dialogues for greetings, meetings, and daily life.' },
          ],
        },
        {
          title: 'Module 2: Pronunciation & Voice Confidence',
          lessons: [
            { title: 'Vowel Clarity, Stress & Rhythm Drills', type: 'video', dur: 28, preview: 0, text: 'Targeted articulation exercises to sound crisp and confident on calls and interviews.' },
            { title: 'Vocabulary Booster Quiz', type: 'quiz', dur: 15, preview: 0, text: 'Practice situational synonyms, phrasal verbs, and common error spotting.' },
          ],
        },
        {
          title: 'Module 3: Workplace & Public Speaking Mastery',
          lessons: [
            { title: 'Group Discussions & Storytelling Techniques', type: 'video', dur: 32, preview: 0, text: 'Structure persuasive opinions clearly using the PREP framework.' },
            { title: '3-Minute Recorded Speech Assignment', type: 'assignment', dur: 20, preview: 0, text: 'Record and submit a self-introduction and topic talk for mentor evaluation.' },
          ],
        },
      ],
    },
    {
      slug: 'competitive-exam-preparation',
      category_id: catExam,
      title: 'Competitive Exam Preparation',
      short_description:
        'Complete preparation for various competitive examinations through structured lessons, practice tests and expert guidance.',
      description:
        'All-in-one structured preparation for SSC CGL, CHSL, Banking (IBPS/SBI), Railways (RRB), and State PSC exams. Covers Quantitative Aptitude, General Awareness, Reasoning, and English with full-length timed mock tests.',
      thumbnail_url: '/images/courses/competitive-exams.png',
      icon_name: 'Trophy',
      icon_color: 'orange',
      level: 'Intermediate to Pro',
      duration: '16 Weeks',
      price: 3999,
      discount_price: 1999,
      is_free: 0,
      faculty_id: f4,
      what_you_learn: [
        'Complete syllabus mastery for SSC, Banking, Railways & State PSC exams',
        'Speed math tricks and shortcut formulas for 2x faster problem solving',
        'Monthly current affairs digests and static GK capsule notes',
        'Exam-hall time management through 25+ sectional & full mock tests',
      ],
      faqs: [
        { q: 'Does this cover both Prelims and Mains patterns?', a: 'Yes, lessons and test banks are aligned to the latest 2026 Prelims + Mains patterns.' },
      ],
      modules: [
        {
          title: 'Module 1: Exam Strategy & General Awareness',
          lessons: [
            { title: 'Indian Economy & Union Budget Essentials', type: 'video', dur: 35, preview: 1, text: 'Understand fiscal policy, RBI monetary tools, and high-weightage exam topics.' },
            { title: 'Current Affairs Monthly Digest Notes', type: 'material', dur: 20, preview: 1, text: 'Curated bullet-point revision sheets for national & international affairs.' },
          ],
        },
        {
          title: 'Module 2: Speed Arithmetic & Data Interpretation',
          lessons: [
            { title: 'Percentages, Profit-Loss & Ratio Shortcuts', type: 'video', dur: 40, preview: 0, text: 'Solve multi-step DI and arithmetic problems in under 35 seconds.' },
            { title: 'Speed Calculation Drill Assignment', type: 'assignment', dur: 25, preview: 0, text: 'Timed 30-question calculation practice sheet.' },
          ],
        },
      ],
    },
    {
      slug: 'jee-neet-preparation',
      category_id: catSci,
      title: 'JEE & NEET Preparation',
      short_description:
        'Concept-based learning, subject preparation, practice questions and examination guidance for aspiring engineering and medical students.',
      description:
        'Build rock-solid conceptual clarity in Physics, Chemistry, Mathematics, and Biology from NCERT fundamentals up to JEE Main/Advanced and NEET UG rank-deciding problems with structured DPPs and doubt support.',
      thumbnail_url: '/images/courses/jee-neet.png',
      icon_name: 'GraduationCap',
      icon_color: 'blue',
      level: 'Class 11, 12 & Droppers',
      duration: '24 Weeks',
      price: 5999,
      discount_price: 2999,
      is_free: 0,
      faculty_id: f2,
      what_you_learn: [
        'Deep conceptual mastery in Mechanics, Electrodynamics, Organic Chemistry & Calculus/Biology',
        'Line-by-line NCERT coverage paired with PYQ trend analysis',
        'Daily Practice Problems (DPPs) with step-by-step video solutions',
        'Rank booster mock tests simulating NTA computer-based interface',
      ],
      faqs: [
        { q: 'Are Biology and Mathematics separate tracks?', a: 'Yes! Modules clearly tag PCM (JEE) and PCB (NEET) chapters so you follow your exact target stream.' },
      ],
      modules: [
        {
          title: 'Module 1: Mechanics & Kinematics Deep Dive',
          lessons: [
            { title: 'Vectors, Relative Motion & Projectile Mastery', type: 'video', dur: 45, preview: 1, text: 'Visualize motion in 2D and solve tricky JEE/NEET numericals effortlessly.' },
            { title: 'NCERT & PYQ Formula Handbook', type: 'material', dur: 20, preview: 1, text: 'Complete Mechanics mind-map and formula compilation.' },
          ],
        },
        {
          title: 'Module 2: Organic Chemistry & Genetics',
          lessons: [
            { title: 'Reaction Mechanisms & GOC Fundamentals', type: 'video', dur: 42, preview: 0, text: 'Master inductive effect, resonance, hyperconjugation, and stability orders.' },
            { title: 'NTA Pattern Concept Quiz', type: 'quiz', dur: 25, preview: 0, text: 'Test your conceptual accuracy with negative-marking simulation.' },
          ],
        },
      ],
    },
    {
      slug: 'upsc-preparation',
      category_id: catExam,
      title: 'UPSC Preparation',
      short_description:
        'Learn general studies, English, communication, vocabulary and essential skills for civil services examination preparation.',
      description:
        'Comprehensive UPSC Civil Services (IAS/IPS) foundation covering Indian Polity, Modern History, Geography, Economy, Ethics, CSAT, Newspaper Editorial Analysis, and Mains Answer Writing along with interview communication.',
      thumbnail_url: '/images/courses/upsc.png',
      icon_name: 'Landmark',
      icon_color: 'orange',
      level: 'Foundation to Mains',
      duration: '32 Weeks',
      price: 7999,
      discount_price: 4499,
      is_free: 0,
      faculty_id: f4,
      what_you_learn: [
        'Complete GS Prelims + Mains syllabus integration with NCERT & standard texts',
        'Daily The Hindu & PIB editorial breakdown for answer enrichment',
        'Structured Mains answer-writing framework (Intro-Body-Way Forward)',
        'CSAT comprehension, vocabulary, and Personality Test communication skills',
      ],
      faqs: [
        { q: 'Does this include Mains answer writing practice?', a: 'Yes, every module includes structured answer writing prompts and model evaluations.' },
      ],
      modules: [
        {
          title: 'Module 1: Indian Polity & Constitutional Framework',
          lessons: [
            { title: 'Fundamental Rights, DPSP & Judicial Review', type: 'video', dur: 50, preview: 1, text: 'Analyze landmark Supreme Court judgements and constitutional articles.' },
            { title: 'Polity Articles & Amendments Compendium', type: 'material', dur: 25, preview: 1, text: 'Crisp revision notes covering Schedules, Parts, and key Amendments.' },
          ],
        },
        {
          title: 'Module 2: Mains Answer Writing & Ethics',
          lessons: [
            { title: 'Articulating Balanced Mains Answers', type: 'video', dur: 38, preview: 0, text: 'Learn how to incorporate committees, data points, and constitutional values.' },
            { title: 'GS Case Study Assignment', type: 'assignment', dur: 30, preview: 0, text: 'Draft a 250-word administrative ethics case study response.' },
          ],
        },
      ],
    },
    {
      slug: 'aptitude-and-reasoning',
      category_id: catApt,
      title: 'Aptitude & Reasoning',
      short_description:
        'Develop logical thinking, quantitative aptitude, analytical skills and problem-solving abilities for competitive exams and placement tests.',
      description:
        'Crack campus placements (TCS, Infosys, Wipro, Accenture, Amazon) and competitive aptitude rounds with crystal-clear logical reasoning, puzzles, permutations, probability, and data sufficiency techniques.',
      thumbnail_url: '/images/courses/aptitude-reasoning.png',
      icon_name: 'Brain',
      icon_color: 'orange',
      level: 'All Levels',
      duration: '8 Weeks',
      price: 1499,
      discount_price: 799,
      is_free: 0,
      faculty_id: f2,
      what_you_learn: [
        'Solve Number System, Time-Speed-Distance & Work problems rapidly',
        'Crack Syllogisms, Seating Arrangements, Blood Relations & Coding-Decoding',
        'Master Permutations, Combinations & Probability for IT placements',
        'Eliminate silly mistakes with smart estimation and option-elimination tactics',
      ],
      faqs: [
        { q: 'Is this useful for B.Tech / Degree campus placements?', a: 'Yes! It directly targets TCS NQT, Infosys, Capgemini, and product company aptitude tests.' },
      ],
      modules: [
        {
          title: 'Module 1: Quantitative Aptitude Core',
          lessons: [
            { title: 'Time, Work, Pipes & Relative Speed', type: 'video', dur: 30, preview: 1, text: 'LCM method and ratio shortcuts to solve every Time & Work question cleanly.' },
            { title: '50 Solved Placement Problems Sheet', type: 'material', dur: 20, preview: 1, text: 'Practice workbook with detailed step-by-step solutions.' },
          ],
        },
        {
          title: 'Module 2: Analytical & Logical Puzzles',
          lessons: [
            { title: 'Circular Seating & Complex Arrangements', type: 'video', dur: 34, preview: 0, text: 'Diagrammatic approach to solve multi-variable puzzles in 90 seconds.' },
            { title: 'Placement Aptitude Timed Quiz', type: 'quiz', dur: 20, preview: 0, text: 'Simulated placement test round.' },
          ],
        },
      ],
    },
    {
      slug: 'interview-preparation',
      category_id: catApt,
      title: 'Interview Preparation',
      short_description:
        'Prepare for IT and private-sector job interviews with mock interviews, HR questions, self-introduction and communication training.',
      description:
        'Walk into any technical or HR interview with unshakeable confidence. Includes ATS-friendly resume building, STAR method behavioral answers, common HR traps, live mock interviews, and salary negotiation coaching.',
      thumbnail_url: '/images/courses/interview-prep.png',
      icon_name: 'Users',
      icon_color: 'orange',
      level: 'Freshers & Experienced',
      duration: '6 Weeks',
      price: 1999,
      discount_price: 999,
      is_free: 0,
      faculty_id: f1,
      what_you_learn: [
        'Craft an impactful 60-second Tell Me About Yourself pitch',
        'Answer top 50 HR & behavioral questions using the STAR framework',
        'Design an ATS-optimized single-page resume & LinkedIn profile',
        'Overcome nervousness through guided mock interview simulations',
      ],
      faqs: [
        { q: 'Can non-IT graduates join this course?', a: 'Absolutely! The communication, resume, and HR mastery applies to IT, finance, sales, and management roles.' },
      ],
      modules: [
        {
          title: 'Module 1: First Impressions & Resume Architecture',
          lessons: [
            { title: 'Building an ATS-Beating Resume & LinkedIn', type: 'video', dur: 26, preview: 1, text: 'Action verbs, quantifiable impact bullets, and recruiter eye-tracking tips.' },
            { title: 'Top 50 HR Questions Answer Bank', type: 'material', dur: 18, preview: 1, text: 'Sample high-scoring templates for strengths, weaknesses, and relocation.' },
          ],
        },
        {
          title: 'Module 2: Live Mock Interviews & Feedback',
          lessons: [
            { title: 'Mock Interview Walkthrough & Body Language', type: 'video', dur: 35, preview: 0, text: 'Watch real mock interviews analyzed frame-by-frame by HR mentors.' },
            { title: 'Self-Introduction Submission', type: 'assignment', dur: 15, preview: 0, text: 'Write and refine your tailored self-introduction.' },
          ],
        },
      ],
    },
    {
      slug: 'it-and-programming-courses',
      category_id: catIT,
      title: 'IT & Programming Courses',
      short_description:
        'Learn programming languages and technical skills, including Python, Java and other essential software technologies.',
      description:
        'Go from zero coding experience to building production applications with Python, Core & Object-Oriented Java, SQL Databases, Git, Data Structures, and Full-Stack Web fundamentals taught by industry software engineers.',
      thumbnail_url: '/images/courses/it-programming.png',
      icon_name: 'Code2',
      icon_color: 'orange',
      level: 'Beginner to Job-Ready',
      duration: '14 Weeks',
      price: 4999,
      discount_price: 2499,
      is_free: 0,
      faculty_id: f3,
      what_you_learn: [
        'Write clean Python and Java code using OOP principles and best practices',
        'Solve foundational Data Structures & Algorithms problems for tech interviews',
        'Design relational databases with SQL queries, joins, and normalization',
        'Build and deploy 3 real-world portfolio capstone projects with Git',
      ],
      faqs: [
        { q: 'Do I need prior coding knowledge?', a: 'No prior coding experience is needed. We start from variables, loops, and logic building.' },
      ],
      modules: [
        {
          title: 'Module 1: Python & Logic Building Fundamentals',
          lessons: [
            { title: 'Variables, Loops, Functions & Clean Code', type: 'video', dur: 38, preview: 1, text: 'Build strong algorithmic thinking using Python 3.' },
            { title: 'Python & Java Syntax Cheat Sheet', type: 'material', dur: 15, preview: 1, text: 'Side-by-side reference guide for Python and Java constructs.' },
          ],
        },
        {
          title: 'Module 2: Object-Oriented Java & SQL',
          lessons: [
            { title: 'Classes, Inheritance, Polymorphism & Collections', type: 'video', dur: 45, preview: 0, text: 'Master enterprise Java concepts asked in technical rounds.' },
            { title: 'Mini Project: Student Management CLI', type: 'assignment', dur: 40, preview: 0, text: 'Implement CRUD operations and file persistence.' },
          ],
        },
      ],
    },
    {
      slug: 'career-development-professional-skills',
      category_id: catApt,
      title: 'Career Development & Professional Skills',
      short_description:
        'Improve workplace communication, presentation skills, confidence and professional abilities.',
      description:
        'Accelerate your career growth with executive communication, persuasive business presentations, email etiquette, emotional intelligence, leadership habits, and productivity systems.',
      thumbnail_url: '/images/courses/career-development.png',
      icon_name: 'TrendingUp',
      icon_color: 'orange',
      level: 'Students & Professionals',
      duration: '6 Weeks',
      price: 0,
      discount_price: 0,
      is_free: 1,
      faculty_id: f1,
      what_you_learn: [
        'Write crisp, persuasive professional emails and Slack/Teams updates',
        'Deliver engaging slide presentations with confident stage presence',
        'Collaborate effectively in cross-functional teams and client calls',
        'Build goal-setting, time management, and continuous growth habits',
      ],
      faqs: [
        { q: 'Is this course really free?', a: 'Yes! As part of O-LEARNING PLATFORM’s mission for affordable education, our Career Kickstart program is free with an official completion certificate.' },
      ],
      modules: [
        {
          title: 'Module 1: Workplace Communication & Etiquette',
          lessons: [
            { title: 'Executive Email & Meeting Communication', type: 'video', dur: 22, preview: 1, text: 'Stand out at work with clarity, brevity, and professional tone.' },
            { title: 'Corporate Communication Playbook (PDF)', type: 'material', dur: 12, preview: 1, text: 'Templates for status updates, follow-ups, and feedback.' },
          ],
        },
        {
          title: 'Module 2: Confidence, Presentations & Growth',
          lessons: [
            { title: 'Storytelling with Data & Slide Design', type: 'video', dur: 28, preview: 1, text: 'Structure memorable presentations that inspire action.' },
            { title: 'Career Roadmap Self-Check Quiz', type: 'quiz', dur: 10, preview: 1, text: 'Quick assessment to unlock your free certificate.' },
          ],
        },
      ],
    },
  ];

  const insertCourseSql = `
    INSERT INTO courses (
      slug, category_id, title, short_description, description, thumbnail_url,
      icon_name, icon_color, level, duration, price, discount_price, is_free,
      faculty_id, what_you_learn_json, faqs_json, is_published, display_order
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  RETURNING id`;
  const insertModuleSql = 
    'INSERT INTO modules (course_id, title, description, sort_order) VALUES (?, ?, ?, ?)RETURNING id'
  ;
  const insertLessonSql = `
    INSERT INTO lessons (module_id, course_id, title, lesson_type, video_url, material_url, duration_minutes, content_text, is_preview, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const courseIds: Record<string, number> = {};
  const sampleVideoUrls = [
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  ];

  for (const [idx, c] of coursesData.entries()) {
    const cid = Number(
      (await dbRun(insertCourseSql, [
        c.slug,
        c.category_id,
        c.title,
        c.short_description,
        c.description,
        c.thumbnail_url,
        c.icon_name,
        c.icon_color,
        c.level,
        c.duration,
        c.price,
        c.discount_price,
        c.is_free,
        c.faculty_id,
        JSON.stringify(c.what_you_learn),
        JSON.stringify(c.faqs),
        idx + 1
      ])).lastInsertRowid
    );
    courseIds[c.slug] = cid;

    for (const [mIdx, m] of c.modules.entries()) {
      const mid = Number((await dbRun(insertModuleSql, [cid, m.title, '', mIdx + 1])).lastInsertRowid);
      for (const [lIdx, l] of m.lessons.entries()) {
        (await dbRun(insertLessonSql, [
          mid,
          cid,
          l.title,
          l.type,
          l.type === 'video' ? sampleVideoUrls[(idx + lIdx) % sampleVideoUrls.length] : '',
          l.type === 'material' ? `/api/public/materials/${cid}/${lIdx + 1}` : '',
          l.dur,
          l.text,
          l.preview,
          lIdx + 1
        ]));
      }
    }
  }

  // Enroll sample student Aarav in Spoken English & IT Programming
  // Batches
  const insertBatchSql = `
    INSERT INTO batches (name, course_id, faculty_id, start_date, end_date, timings, total_seats, enrolled_seats, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const b1 = Number(
    (await dbRun(insertBatchSql, [
      'Fluency Ignite Batch — Nov 2026',
      courseIds['spoken-english'],
      f1,
      '2026-11-15',
      '2027-01-25',
      'Mon-Fri · 7:00 PM – 8:00 PM IST',
      60,
      44,
      'active'
    ])).lastInsertRowid
  );
  (await dbRun(insertBatchSql, [
    'Python & Java Placement Fast-Track',
    courseIds['it-and-programming-courses'],
    f3,
    '2026-11-18',
    '2027-02-28',
    'Tue-Sat · 8:00 PM – 9:30 PM IST',
    80,
    59,
    'active'
  ]));
  (await dbRun(insertBatchSql, [
    'JEE & NEET Sankalp 2027 Batch',
    courseIds['jee-neet-preparation'],
    f2,
    '2026-12-01',
    '2027-05-15',
    'Daily · 5:30 PM – 7:30 PM IST',
    120,
    72,
    'upcoming'
  ]));
  (await dbRun(insertBatchSql, [
    'UPSC GS Foundation Prelims+Mains',
    courseIds['upsc-preparation'],
    f4,
    '2026-12-05',
    '2027-07-30',
    'Mon-Sat · 6:30 AM – 8:30 AM IST',
    100,
    63,
    'upcoming'
  ]));
  (await dbRun(insertBatchSql, [
    'Aptitude Crash Batch — Oct 2026',
    courseIds['aptitude-and-reasoning'],
    f2,
    '2026-09-01',
    '2026-10-30',
    'Mon-Fri · 6:00 PM – 7:00 PM IST',
    60,
    60,
    'completed'
  ]));

  // Live Classes (Today's Live, Upcoming, Completed)
  const now = new Date();
  const inTwoHours = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const dayAfter = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const insertLiveSql = `
    INSERT INTO live_classes (title, course_id, faculty_id, batch_id, scheduled_at, duration_minutes, meeting_url, status, recording_url, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  (await dbRun(insertLiveSql, [
    'Confidence in Spoken English: Live Fluency Lab',
    courseIds['spoken-english'],
    f1,
    b1,
    now.toISOString(),
    60,
    'https://meet.jit.si/olearning-spoken-english-live',
    'live',
    '',
    'Interactive live speaking & pronunciation workshop with real-time mentor feedback.'
  ]));
  (await dbRun(insertLiveSql, [
    'Java OOP & Coding Interview Patterns',
    courseIds['it-and-programming-courses'],
    f3,
    null,
    inTwoHours,
    75,
    'https://meet.jit.si/olearning-java-oop-live',
    'upcoming',
    '',
    'Hands-on coding walkthrough covering Polymorphism, Interfaces, and Collections.'
  ]));
  (await dbRun(insertLiveSql, [
    'Newton’s Laws & Friction Problem Marathon',
    courseIds['jee-neet-preparation'],
    f2,
    null,
    tomorrow,
    90,
    'https://meet.jit.si/olearning-jee-physics-live',
    'upcoming',
    '',
    'High-yield JEE & NEET Mechanics numericals solved live.'
  ]));
  (await dbRun(insertLiveSql, [
    'UPSC Editorial Analysis & Mains Answer Structuring',
    courseIds['upsc-preparation'],
    f4,
    null,
    dayAfter,
    60,
    'https://meet.jit.si/olearning-upsc-editorial',
    'upcoming',
    '',
    'Decode today’s key national policies and frame high-scoring GS Mains answers.'
  ]));
  (await dbRun(insertLiveSql, [
    'Everyday Grammar Traps & Fluency Hacks',
    courseIds['spoken-english'],
    f1,
    b1,
    yesterday,
    55,
    'https://meet.jit.si/olearning-grammar-recap',
    'completed',
    sampleVideoUrls[0],
    'Recorded session covering articles, prepositions, and conditional clauses.'
  ]));

  // Tests & Questions
  const insertTestSql = `
    INSERT INTO tests (title, course_id, category_id, description, duration_minutes, total_marks, pass_marks, negative_marks, difficulty, is_published, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  RETURNING id`;
  const insertQSql = `
    INSERT INTO questions (test_id, question_text, options_json, correct_index, marks, explanation, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  const t1 = Number(
    (await dbRun(insertTestSql, [
      'Spoken English Grammar & Fluency Mock Test',
      courseIds['spoken-english'],
      catLang,
      'Evaluate your mastery of tenses, subject-verb agreement, prepositions, and workplace vocabulary.',
      15,
      10,
      5,
      0,
      'Easy',
      f1
    ])).lastInsertRowid
  );
  for (const [i, [q, opts, ans, exp]] of ([
    ['Choose the grammatically correct sentence:', ['She don’t know the answer.', 'She doesn’t knows the answer.', 'She doesn’t know the answer.', 'She not know the answer.'], 2, 'With singular third-person "she", use "does not + base verb (know)".'],
    ['Select the best synonym for "Articulate":', ['Hesitant', 'Eloquent', 'Silent', 'Ambiguous'], 1, '"Eloquent" means fluent and persuasive in speaking or writing.'],
    ['Fill in the blank: Neither the students nor the teacher ___ present today.', ['were', 'are', 'was', 'have'], 2, 'With "neither...nor", the verb agrees with the nearest subject ("the teacher", singular).'],
    ['Identify the correct preposition: I look forward ___ meeting you tomorrow.', ['for', 'to', 'at', 'with'], 1, '"Look forward to" is always followed by a noun or gerund (-ing form).'],
    ['Which phrase is most polite in a business email?', ['Send me the file fast.', 'Could you please share the updated file?', 'I want the file right now.', 'Why haven’t you sent the file?'], 1, 'Using "Could you please..." maintains a courteous professional tone.'],
  ]).entries()) {
    (await dbRun(insertQSql, [t1, q as string, JSON.stringify(opts), ans as number, 2, exp as string, i + 1]));
  }

  const t2 = Number(
    (await dbRun(insertTestSql, [
      'Quantitative Aptitude & Logical Reasoning Sprint',
      courseIds['aptitude-and-reasoning'],
      catApt,
      'Timed campus-placement & SSC style aptitude test with negative marking.',
      20,
      10,
      4,
      0.5,
      'Medium',
      f2
    ])).lastInsertRowid
  );
  for (const [i, [q, opts, ans, exp]] of ([
    ['A train 150m long passes a pole in 15 seconds. What is its speed in km/h?', ['30 km/h', '36 km/h', '40 km/h', '45 km/h'], 1, 'Speed = 150/15 = 10 m/s = 10 × 18/5 = 36 km/h.'],
    ['If A can finish a work in 12 days and B in 18 days, how many days will they take together?', ['6.2 days', '7.2 days', '8 days', '9 days'], 1, 'Combined rate = 1/12 + 1/18 = 5/36 -> 36/5 = 7.2 days.'],
    ['Find the next number in the series: 3, 7, 15, 31, 63, ?', ['125', '127', '129', '131'], 1, 'Each term follows (prev × 2) + 1: 63 × 2 + 1 = 127.'],
    ['If COURSE is coded as DPVSTF, how is LEARN coded?', ['MFBSO', 'MFCSO', 'MFBRO', 'NFBSO'], 0, 'Each letter shifts +1 in the alphabet: L->M, E->F, A->B, R->S, N->O.'],
    ['A shopkeeper sells an item at ₹540 making a 20% profit. What was the cost price?', ['₹432', '₹450', '₹460', '₹480'], 1, 'CP = 540 / 1.20 = ₹450.'],
  ]).entries()) {
    (await dbRun(insertQSql, [t2, q as string, JSON.stringify(opts), ans as number, 2, exp as string, i + 1]));
  }

  const t3 = Number(
    (await dbRun(insertTestSql, [
      'Python & Java Core Programming Assessment',
      courseIds['it-and-programming-courses'],
      catIT,
      'Verify your understanding of OOP concepts, time complexity, and Python/Java data types.',
      25,
      10,
      5,
      0,
      'Medium',
      f3
    ])).lastInsertRowid
  );
  for (const [i, [q, opts, ans, exp]] of ([
    ['What is the average time complexity of searching a key in a hash table?', ['O(n)', 'O(log n)', 'O(1)', 'O(n log n)'], 2, 'Hash tables provide O(1) average-case lookup.'],
    ['Which Python data type is immutable?', ['list', 'dict', 'set', 'tuple'], 3, 'Tuples cannot be modified after creation.'],
    ['In Java, which keyword prevents a method from being overridden?', ['static', 'final', 'private', 'abstract'], 1, 'Marking a method as final prevents subclasses from overriding it.'],
    ['What is the output of `len("O-Learning")` in Python?', ['9', '10', '11', '8'], 1, 'Count of characters in "O-Learning" including the hyphen is 10.'],
    ['Which SQL clause is used to filter grouped records?', ['WHERE', 'GROUP BY', 'HAVING', 'ORDER BY'], 2, 'HAVING filters aggregated groups after GROUP BY.'],
  ]).entries()) {
    (await dbRun(insertQSql, [t3, q as string, JSON.stringify(opts), ans as number, 2, exp as string, i + 1]));
  }

  const t4 = Number(
    (await dbRun(insertTestSql, [
      'JEE / NEET & UPSC Concept Challenge',
      courseIds['jee-neet-preparation'],
      catSci,
      'High-accuracy conceptual assessment for competitive science & general studies.',
      20,
      10,
      5,
      0.5,
      'Hard',
      f2
    ])).lastInsertRowid
  );
  for (const [i, [q, opts, ans, exp]] of ([
    ['What is the SI unit of electric flux?', ['N·m²/C', 'V/m', 'J/C', 'N/C'], 0, 'Electric flux Φ = E·A has units (N/C)·m² = N·m²/C.'],
    ['Which Article of the Indian Constitution guarantees the Right to Equality before Law?', ['Article 14', 'Article 19', 'Article 21', 'Article 32'], 0, 'Article 14 ensures equality before the law and equal protection of laws.'],
    ['Which organelle is known as the powerhouse of the cell?', ['Golgi apparatus', 'Mitochondria', 'Ribosome', 'Lysosome'], 1, 'Mitochondria generate ATP through cellular respiration.'],
    ['What is the derivative of sin(2x) with respect to x?', ['cos(2x)', '2cos(2x)', '-2cos(2x)', '2sin(2x)'], 1, 'By chain rule, d/dx[sin(2x)] = 2cos(2x).'],
    ['Which schedule of the Indian Constitution lists the official languages?', ['Seventh Schedule', 'Eighth Schedule', 'Ninth Schedule', 'Tenth Schedule'], 1, 'The Eighth Schedule currently recognizes 22 official languages.'],
  ]).entries()) {
    (await dbRun(insertQSql, [t4, q as string, JSON.stringify(opts), ans as number, 2, exp as string, i + 1]));
  }

  // Subscription Plans
  const insertPlanSql = `
    INSERT INTO subscription_plans (name, slug, price, duration_months, badge, features_json, is_popular, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `;
  (await dbRun(insertPlanSql, [
    'Basic Plan',
    'basic-plan',
    1499,
    3,
    'Starter',
    JSON.stringify([
      'Access to 2 Selected Courses',
      'Recorded HD Video Lectures',
      'Chapter-wise PDF Study Notes',
      'Monthly Practice Tests',
      'Completion Certificate',
    ]),
    0
  ]));
  (await dbRun(insertPlanSql, [
    'Pro Plan',
    'pro-plan',
    2499,
    6,
    'Most Popular',
    JSON.stringify([
      'Access to Any 5 Courses',
      'All Live Interactive Classes',
      'Recorded Lectures & Doubt Support',
      'Full Mock Test Series & Analytics',
      'Official Verified Certificates',
    ]),
    1
  ]));
  (await dbRun(insertPlanSql, [
    'Premium Plan',
    'premium-plan',
    3999,
    12,
    'Best Value',
    JSON.stringify([
      'Unlimited Access to All 8+ Courses',
      'Priority 1-on-1 Faculty Doubt Sessions',
      'All Live Batches & Bootcamps',
      'Unlimited Mock Tests & Rank Reports',
      'Interview Prep & Resume Review',
    ]),
    0
  ]));

  // Public Learner Testimonials (non-transactional display reviews)
  const insertReviewSql = 
    'INSERT INTO reviews (course_id, student_id, student_name, rating, comment) VALUES (?, ?, ?, ?, ?)'
  ;
  (await dbRun(insertReviewSql, [
    courseIds['spoken-english'],
    null,
    'Aarav Verma',
    5,
    'Dr. Ananya’s speaking exercises helped me clear my campus HR round with complete confidence!'
  ]));
  (await dbRun(insertReviewSql, [
    courseIds['it-and-programming-courses'],
    null,
    'Sneha Kulkarni',
    5,
    'Very practical Python and Java lessons. The assignments and live doubt solving are worth every rupee.'
  ]));
  (await dbRun(insertReviewSql, [
    courseIds['jee-neet-preparation'],
    null,
    'Karthik N.',
    5,
    'Crystal clear Physics and Mechanics explanations from Prof. Vikram Reddy.'
  ]));

  // Dynamic CMS Settings (Admin-editable and used everywhere on public website)
  const cmsDefaults: Record<string, unknown> = {
    brand: {
      name: 'O-LEARNING PLATFORM',
      tagline: 'Learn Today, Lead Tomorrow!',
      supportingTagline: 'Your Learning Partner for a Better Future.',
      foundedYear: '2026',
      location: 'India',
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
      { label: 'Courses & Programs', value: '8+', icon: 'BookOpen' },
      { label: 'Happy Learners', value: '10K+', icon: 'Users' },
      { label: 'Expert Faculty', value: '50+', icon: 'UserCheck' },
      { label: 'Learner Satisfaction', value: '95%', icon: 'BadgeCheck' },
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
      location: 'India',
      address: 'India',
    },
    socials: {
      facebook: 'https://www.facebook.com/share/1A4BFwTDa4/',
      youtube: 'https://youtube.com/@olearningplatform?si=YbsPm35pmp8z_UiP',
      instagram: 'https://www.instagram.com/olearningplatform33?avpt=MWJid3M2bXM1azgxeQ==',
      instagramSecondary: 'https://www.instagram.com/olearningplatform?fqnt=MWgxc2g4YnZueWs4Ng==',
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

  const insertCmsSql = 'INSERT INTO cms_settings (key, value_json) VALUES (?, ?)';
  for (const [k, v] of Object.entries(cmsDefaults)) {
    (await dbRun(insertCmsSql, [k, JSON.stringify(v)]));
  }
  void adminId;
}



