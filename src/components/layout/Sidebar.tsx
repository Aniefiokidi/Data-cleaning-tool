import { BarChart3, ClipboardCheck, FileText, LayoutDashboard, ListChecks, MoonStar, Shield, SunMedium } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { usePipeline } from '../../context/PipelineContext';

interface Props {
  dark: boolean;
  toggleDark: () => void;
}

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/table', label: 'Results', icon: ClipboardCheck },
  { to: '/rules', label: 'Rules', icon: ListChecks },
  { to: '/duplicates', label: 'Duplicates', icon: Shield },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/audit', label: 'Audit Log', icon: FileText },
];

export const Sidebar: React.FC<Props> = ({ dark, toggleDark }) => {
  const { state } = usePipeline();
  const progress = state.rawRecords.length ? Math.round((state.currentRecord / state.rawRecords.length) * 100) : 0;

  return (
    <aside className="hidden border-r border-slate-200 bg-white lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-72 lg:flex-col dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-slate-200 px-6 py-6 dark:border-slate-800">
        <p className="text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">
          Upload a file, set simple rules, and review issues clearly in the results table.
        </p>
      </div>

      <nav className="flex-1 space-y-1 px-4 py-5">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                  isActive
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {link.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="space-y-4 border-t border-slate-200 px-6 py-5 dark:border-slate-800">
        <div className="rounded-2xl bg-slate-100 p-4 dark:bg-slate-800/80">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Pipeline status</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{state.currentRecord}/{state.rawRecords.length}</p>
          <p className="text-sm text-slate-500">records processed</p>
          <div className="mt-4 h-2 rounded-full bg-slate-200 dark:bg-slate-700">
            <div className="h-2 rounded-full bg-sky-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <button className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200" onClick={toggleDark} type="button">
          {dark ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
          {dark ? 'Light mode' : 'Dark mode'}
        </button>
      </div>
    </aside>
  );
};
