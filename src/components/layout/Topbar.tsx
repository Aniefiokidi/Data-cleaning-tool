import { Search, Upload } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { usePipeline } from '../../context/PipelineContext';

interface Props {
  openUpload: () => void;
}

const titleFromPath = (path: string) => {
  if (path === '/table') return 'Results Table';
  if (path === '/duplicates') return 'Duplicates';
  if (path === '/rules') return 'Rules Builder';
  if (path === '/review') return 'Upload Review';
  if (path === '/reports') return 'Reports';
  if (path === '/audit') return 'Audit Log';
  return 'Dashboard';
};

const subtitleFromPath = (path: string) => {
  if (path === '/rules') return 'Build validation rules in a few simple steps.';
  if (path === '/table') return 'Review flagged rows and apply fixes.';
  if (path === '/duplicates') return 'See records that match across selected columns.';
  if (path === '/reports') return 'Summaries and exports for cleaned data.';
  if (path === '/review') return 'Inspect rows and columns before running the cleaning pipeline.';
  if (path === '/audit') return 'Every important action taken on the dataset.';
  return 'Track data quality after each upload and pipeline run.';
};

export const Topbar: React.FC<Props> = ({ openUpload }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { setFilters, state } = usePipeline();

  return (
    <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Workspace</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{titleFromPath(location.pathname)}</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{subtitleFromPath(location.pathname)}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-200">
              {state.columns.length} columns
            </div>
            <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-200">
              {state.ruleConfig.length} rules
            </div>
            <button className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white dark:bg-slate-100 dark:text-slate-950" onClick={openUpload} type="button">
              <Upload className="h-4 w-4" />
              Upload data
            </button>
          </div>
        </div>

        <div className="relative max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm dark:border-slate-700 dark:bg-slate-800"
            placeholder="Search records and open the results table"
            onChange={(event) => {
              setFilters({ search: event.target.value });
              navigate('/table');
            }}
          />
        </div>
      </div>
    </header>
  );
};
