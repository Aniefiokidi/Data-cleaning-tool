import { Funnel, Search, SlidersHorizontal } from 'lucide-react';
import { usePipeline } from '../../context/PipelineContext';

export const FilterBar = () => {
  const { state, setFilters } = usePipeline();

  return (
    <div className="grid grid-cols-1 gap-3 rounded-[28px] border border-white/70 bg-white/75 p-4 shadow-soft backdrop-blur dark:border-slate-800 dark:bg-slate-950/60 lg:grid-cols-[1.6fr_repeat(4,minmax(0,1fr))]">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
        <input
          className="w-full rounded-2xl border border-slate-200 bg-white px-10 py-3 text-sm dark:border-slate-700 dark:bg-slate-900"
          placeholder="Search values, rule descriptions, or record IDs"
          value={state.tableFilters.search}
          onChange={(event) => setFilters({ search: event.target.value })}
        />
      </div>

      <label className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/70">
        <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
          <Funnel className="h-3.5 w-3.5" />
          Status
        </span>
        <select className="w-full bg-transparent text-sm outline-none" value={state.tableFilters.status} onChange={(event) => setFilters({ status: event.target.value as never })}>
          <option value="ALL">All records</option>
          <option value="CLEAN">Clean</option>
          <option value="ACCEPTABLE">Acceptable</option>
          <option value="REVIEW">Review</option>
          <option value="QUARANTINE">Quarantined</option>
        </select>
      </label>

      <label className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/70">
        <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Severity
        </span>
        <select className="w-full bg-transparent text-sm outline-none" value={state.tableFilters.severity} onChange={(event) => setFilters({ severity: event.target.value as never })}>
          <option value="ALL">All severities</option>
          <option value="CRITICAL">Critical</option>
          <option value="ERROR">Error</option>
          <option value="WARNING">Warning</option>
          <option value="INFO">Info</option>
        </select>
      </label>

      <label className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/70">
        <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Stage</span>
        <select
          className="w-full bg-transparent text-sm outline-none"
          value={String(state.tableFilters.stage)}
          onChange={(event) => setFilters({ stage: event.target.value === 'ALL' ? 'ALL' : Number(event.target.value) })}
        >
          <option value="ALL">All stages</option>
          {state.stageProgress.map((stage) => (
            <option key={stage.stage} value={stage.stage}>{stage.name}</option>
          ))}
        </select>
      </label>

      <div className="flex items-end">
        <button
          className="w-full rounded-2xl border border-slate-300 px-3 py-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
          onClick={() => setFilters({ status: 'ALL', severity: 'ALL', stage: 'ALL', search: '', ruleId: '' })}
          type="button"
        >
          Reset filters
        </button>
      </div>
    </div>
  );
};
