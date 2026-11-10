import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import compression from 'compression';
import { initDatabase } from './db.js';
import db from './db.js';
import authRoutes from './routes/auth.js';
import publicRoutes from './routes/public.js';
import studentRoutes from './routes/student.js';
import facultyRoutes from './routes/faculty.js';
import adminRoutes from './routes/admin.js';

initDatabase();

const app = express();
const PORT = Number(process.env.PORT) || 4000;

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);
app.use(compression());
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());

// Health Check
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, platform: 'O-LEARNING PLATFORM', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/admin', adminRoutes);

// Dynamic XML Sitemap for SEO
app.get('/sitemap.xml', (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const courses = db
    .prepare('SELECT slug FROM courses WHERE is_published = 1')
    .all() as Array<{ slug: string }>;
  const staticRoutes = ['', '/courses', '/tests', '/batches', '/plans', '/about', '/contact', '/verify-certificate'];
  const urls = [
    ...staticRoutes.map((r) => `${baseUrl}${r}`),
    ...courses.map((c) => `${baseUrl}/courses/${c.slug}`),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${u}</loc><changefreq>weekly</changefreq></url>`)
    .join('\n')}\n</urlset>`;
  res.setHeader('Content-Type', 'application/xml');
  res.send(xml);
});

// Serve static assets & built Vite frontend
const publicDir = path.resolve(process.cwd(), 'public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir, { maxAge: '1d' }));
}

const distDir = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir, { maxAge: '7d' }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

// Global Error Handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Server Error]', err);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

app.listen(PORT, () => {
  console.log(`O-LEARNING PLATFORM server running on http://localhost:${PORT}`);
});
