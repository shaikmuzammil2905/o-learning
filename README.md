# O-LEARNING PLATFORM

**Learn Today, Lead Tomorrow!**  
*Your Learning Partner for a Better Future.*

A full-stack EdTech LMS, Public Website, Student Learning App, Faculty Portal, and Admin Management System built for **O-LEARNING PLATFORM** (Hyderabad, Telangana, India).

---

## Tech Stack
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, React Router v7, Lucide Icons
- **Backend:** Node.js, Express, `node:sqlite` (SQLite WAL persistence)
- **Security:** `crypto.scryptSync` salted password hashing, HMAC-SHA256 JWT HTTP-only cookies, Helmet security headers, role-based access control (`student`, `faculty`, `admin`)

---

## Core Modules
- **Public Website:** Home (with animated desktop & mobile hero views), Courses Catalog, Course Detail (Overview, Curriculum, Faculty, Reviews, FAQs), Tests, Batches, Subscription Plans, About, Contact & Enquiry, Certificate Verification (`/verify-certificate`), SEO (`sitemap.xml`, `robots.txt`).
- **Student System:** Registration (with optional Referral Code), Login & Password Reset, Dashboard, My Courses, Interactive LMS Course Player (video, downloadable notes, progress tracking, automatic certificate generation upon 100% completion), Live Classes, Timed Mock Test Engine (auto-submit, score, percentage, rank, answer key), Payment Checkout & History, Refer & Earn (WhatsApp/Copy/Native Share), Profile & Settings.
- **Faculty Portal:** Permission-gated access to Assigned Courses, Lesson & Material Creation, Live Class Scheduling, Student Progress & Test Performance, Test & Question Builder.
- **Admin Portal:** Analytics Dashboard & Revenue Breakdown, Courses & Categories CRUD, Students & Faculty Management, Batches & Live Classes, Tests & Questions, Payments & Dynamic Subscription Plans, Referrals & Certificates Verification/Revocation, Dynamic Website CMS & Contact Enquiries Inbox.

---

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Development mode (API + Vite Dev Server):**
   ```bash
   npm run dev
   ```
   - Frontend: `http://localhost:5173`
   - Backend API: `http://localhost:4000`

3. **Production Build & Start:**
   ```bash
   npm run build
   npm start
   ```
   Serves the production SPA and `/api/*` endpoints from `http://localhost:4000` (or `PORT` env variable).

