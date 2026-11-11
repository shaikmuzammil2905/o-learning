import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SiteProvider } from './context/SiteContext';
import { SplashScreen } from './components/SplashScreen';
import { LoadingState } from './components/ui/StateViews';

// Public Pages
import { HomePage } from './pages/public/HomePage';
import { CoursesPage } from './pages/public/CoursesPage';
import { CourseDetailPage } from './pages/public/CourseDetailPage';
import { TestsPage } from './pages/public/TestsPage';
import { BatchesPage } from './pages/public/BatchesPage';
import { AboutPage } from './pages/public/AboutPage';
import { ContactPage } from './pages/public/ContactPage';
import { PlansPage } from './pages/public/PlansPage';
import { VerifyCertPage } from './pages/public/VerifyCertPage';
import { LoginPage } from './pages/public/LoginPage';
import { RegisterPage } from './pages/public/RegisterPage';

// Student Pages
import { StudentDashboard } from './pages/student/StudentDashboard';
import { MyCoursesPage } from './pages/student/MyCoursesPage';
import { CourseLearningPage } from './pages/student/CourseLearningPage';
import { LiveClassesPage } from './pages/student/LiveClassesPage';
import { StudentTestsPage } from './pages/student/StudentTestsPage';
import { CertificatesPage } from './pages/student/CertificatesPage';
import { PaymentsPage } from './pages/student/PaymentsPage';
import { ReferralsPage } from './pages/student/ReferralsPage';
import { ProfilePage } from './pages/student/ProfilePage';

// Faculty & Admin Portals
import { FacultyPortal } from './pages/faculty/FacultyPortal';
import { AdminPortal } from './pages/admin/AdminPortal';
import type { UserRole } from './types';

function RequireRole({ roles, children }: { roles: UserRole[]; children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <LoadingState message="Verifying session…" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) {
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    if (user.role === 'faculty') return <Navigate to="/faculty" replace />;
    return <Navigate to="/student" replace />;
  }
  return <>{children}</>;
}

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] p-6 text-center">
          <h1 className="font-display font-bold text-2xl text-[#002B7A]">O-LEARNING PLATFORM</h1>
          <p className="text-sm text-slate-600 mt-2 max-w-md">
            Something went wrong while rendering this view ({this.state.message}).
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 px-5 py-2.5 rounded-xl bg-[#0052CC] text-white text-sm font-bold cursor-pointer"
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <AppErrorBoundary>
      <AuthProvider>
        <SiteProvider>
          <BrowserRouter>
            <SplashScreen />
            <Routes>
            {/* Public Website */}
            <Route path="/" element={<HomePage />} />
            <Route path="/courses" element={<CoursesPage />} />
            <Route path="/courses/:courseId" element={<CourseDetailPage />} />
            <Route path="/course/:courseId" element={<CourseDetailPage />} />
            <Route path="/tests" element={<TestsPage />} />
            <Route path="/batches" element={<BatchesPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/plans" element={<PlansPage />} />
            <Route path="/verify-certificate" element={<VerifyCertPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Student Portal */}
            <Route
              path="/student"
              element={
                <RequireRole roles={['student', 'admin']}>
                  <StudentDashboard />
                </RequireRole>
              }
            />
            <Route
              path="/student/courses"
              element={
                <RequireRole roles={['student', 'admin']}>
                  <MyCoursesPage />
                </RequireRole>
              }
            />
            <Route
              path="/student/learn/:courseId"
              element={
                <RequireRole roles={['student', 'admin']}>
                  <CourseLearningPage />
                </RequireRole>
              }
            />
            <Route
              path="/student/live"
              element={
                <RequireRole roles={['student', 'admin']}>
                  <LiveClassesPage />
                </RequireRole>
              }
            />
            <Route
              path="/student/tests"
              element={
                <RequireRole roles={['student', 'admin']}>
                  <StudentTestsPage />
                </RequireRole>
              }
            />
            <Route
              path="/student/certificates"
              element={
                <RequireRole roles={['student', 'admin']}>
                  <CertificatesPage />
                </RequireRole>
              }
            />
            <Route
              path="/student/payments"
              element={
                <RequireRole roles={['student', 'admin']}>
                  <PaymentsPage />
                </RequireRole>
              }
            />
            <Route
              path="/student/referrals"
              element={
                <RequireRole roles={['student', 'admin']}>
                  <ReferralsPage />
                </RequireRole>
              }
            />
            <Route
              path="/student/profile"
              element={
                <RequireRole roles={['student', 'admin']}>
                  <ProfilePage />
                </RequireRole>
              }
            />

            {/* Faculty Portal */}
            <Route
              path="/faculty"
              element={
                <RequireRole roles={['faculty', 'admin']}>
                  <FacultyPortal section="overview" />
                </RequireRole>
              }
            />
            <Route
              path="/faculty/courses"
              element={
                <RequireRole roles={['faculty', 'admin']}>
                  <FacultyPortal section="courses" />
                </RequireRole>
              }
            />
            <Route
              path="/faculty/students"
              element={
                <RequireRole roles={['faculty', 'admin']}>
                  <FacultyPortal section="students" />
                </RequireRole>
              }
            />
            <Route
              path="/faculty/live"
              element={
                <RequireRole roles={['faculty', 'admin']}>
                  <FacultyPortal section="live" />
                </RequireRole>
              }
            />
            <Route
              path="/faculty/tests"
              element={
                <RequireRole roles={['faculty', 'admin']}>
                  <FacultyPortal section="tests" />
                </RequireRole>
              }
            />

            {/* Admin Portal */}
            <Route
              path="/admin"
              element={
                <RequireRole roles={['admin']}>
                  <AdminPortal section="overview" />
                </RequireRole>
              }
            />
            <Route
              path="/admin/courses"
              element={
                <RequireRole roles={['admin']}>
                  <AdminPortal section="courses" />
                </RequireRole>
              }
            />
            <Route
              path="/admin/students"
              element={
                <RequireRole roles={['admin']}>
                  <AdminPortal section="students" />
                </RequireRole>
              }
            />
            <Route
              path="/admin/faculty"
              element={
                <RequireRole roles={['admin']}>
                  <AdminPortal section="faculty" />
                </RequireRole>
              }
            />
            <Route
              path="/admin/batches"
              element={
                <RequireRole roles={['admin']}>
                  <AdminPortal section="batches" />
                </RequireRole>
              }
            />
            <Route
              path="/admin/tests"
              element={
                <RequireRole roles={['admin']}>
                  <AdminPortal section="tests" />
                </RequireRole>
              }
            />
            <Route
              path="/admin/payments"
              element={
                <RequireRole roles={['admin']}>
                  <AdminPortal section="payments" />
                </RequireRole>
              }
            />
            <Route
              path="/admin/certificates"
              element={
                <RequireRole roles={['admin']}>
                  <AdminPortal section="certificates" />
                </RequireRole>
              }
            />
            <Route
              path="/admin/referrals"
              element={
                <RequireRole roles={['admin']}>
                  <AdminPortal section="referrals" />
                </RequireRole>
              }
            />
            <Route
              path="/admin/cms"
              element={
                <RequireRole roles={['admin']}>
                  <AdminPortal section="cms" />
                </RequireRole>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </SiteProvider>
    </AuthProvider>
    </AppErrorBoundary>
  );
}

