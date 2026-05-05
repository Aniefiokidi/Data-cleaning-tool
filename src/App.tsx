import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { UploadZone } from './components/upload/UploadZone';

const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const TablePage = lazy(() => import('./pages/TablePage').then((m) => ({ default: m.TablePage })));
const DuplicatesPage = lazy(() => import('./pages/DuplicatesPage').then((m) => ({ default: m.DuplicatesPage })));
const RulesPage = lazy(() => import('./pages/RulesPage').then((m) => ({ default: m.RulesPage })));
const ReportsPage = lazy(() => import('./pages/ReportsPage').then((m) => ({ default: m.ReportsPage })));
const AuditPage = lazy(() => import('./pages/AuditPage').then((m) => ({ default: m.AuditPage })));
const ReviewPage = lazy(() => import('./pages/ReviewPage').then((m) => ({ default: m.ReviewPage })));

const getInitialTheme = () => {
  const stored = localStorage.getItem('obq-theme');
  if (stored === 'dark' || stored === 'light') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const App = () => {
  const [theme, setTheme] = useState<'dark' | 'light'>(getInitialTheme);
  const [uploadOpen, setUploadOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('obq-theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const isDark = useMemo(() => theme === 'dark', [theme]);

  const RouteSkeleton = (
    <div className="grid grid-cols-1 gap-4">
      <div className="h-24 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
      <div className="h-72 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
      <div className="h-72 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
    </div>
  );

  return (
    <>
      <Routes>
        <Route path="/" element={<Layout dark={isDark} toggleDark={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))} openUpload={() => setUploadOpen(true)} />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Suspense fallback={RouteSkeleton}><DashboardPage /></Suspense>} />
          <Route path="table" element={<Suspense fallback={RouteSkeleton}><TablePage /></Suspense>} />
          <Route path="duplicates" element={<Suspense fallback={RouteSkeleton}><DuplicatesPage /></Suspense>} />
          <Route path="rules" element={<Suspense fallback={RouteSkeleton}><RulesPage /></Suspense>} />
          <Route path="review" element={<Suspense fallback={RouteSkeleton}><ReviewPage /></Suspense>} />
          <Route path="reports" element={<Suspense fallback={RouteSkeleton}><ReportsPage /></Suspense>} />
          <Route path="audit" element={<Suspense fallback={RouteSkeleton}><AuditPage /></Suspense>} />
        </Route>
      </Routes>

      <UploadZone open={uploadOpen} onClose={() => setUploadOpen(false)} />
    </>
  );
};

export default App;
