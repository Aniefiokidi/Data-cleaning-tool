import { usePipeline } from '../../context/PipelineContext';
import { RuleConfig, Severity } from '../../types';
import { getColumnLabel } from '../../utils/pipelineDisplay';

interface Props {
  config: RuleConfig;
  affected: number;
  onToggle: (id: string, enabled: boolean) => void;
  onSeverity: (id: string, severity: Severity) => void;
  onDelete?: (id: string) => void;
}

const scopeLabel: Record<RuleConfig['scope'], string> = {
  FIELD: 'Field check',
  CROSS_FIELD: 'Cross-column',
  DUPLICATE: 'Duplicate detection',
};

export const RuleCard: React.FC<Props> = ({ config, affected, onToggle, onSeverity, onDelete }) => {
  const { state } = usePipeline();

  return (
    <div className="rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-soft backdrop-blur dark:border-slate-800 dark:bg-slate-950/60">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{scopeLabel[config.scope]}</p>
          <h4 className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">{config.ruleName}</h4>
          <p className="mt-1 font-mono text-xs text-slate-500">{config.ruleId}</p>
        </div>
        <label className="text-xs font-semibold text-slate-500">
          <input checked={config.enabled} onChange={(event) => onToggle(config.ruleId, event.target.checked)} type="checkbox" /> Enabled
        </label>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-500">
        <div className="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-slate-900/80">
          <p className="uppercase tracking-[0.2em]">Stage</p>
          <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">{config.stage}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-slate-900/80">
          <p className="uppercase tracking-[0.2em]">Affected</p>
          <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">{affected} record(s)</p>
        </div>
      </div>

      <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
        <p><span className="font-semibold text-slate-900 dark:text-white">Target:</span> {getColumnLabel(state.columns, config.targetColumn)}</p>
        <p><span className="font-semibold text-slate-900 dark:text-white">Operator:</span> {config.operator}</p>
        {config.value ? <p><span className="font-semibold text-slate-900 dark:text-white">Value:</span> {config.value}</p> : null}
        {config.compareColumn ? <p><span className="font-semibold text-slate-900 dark:text-white">Compare with:</span> {getColumnLabel(state.columns, config.compareColumn)}</p> : null}
        {config.columns?.length ? <p><span className="font-semibold text-slate-900 dark:text-white">Composite columns:</span> {config.columns.map((column) => getColumnLabel(state.columns, column)).join(', ')}</p> : null}
        {config.when ? (
          <p>
            <span className="font-semibold text-slate-900 dark:text-white">Runs when:</span>{' '}
            {getColumnLabel(state.columns, config.when.column)} {config.when.operator}{config.when.value ? ` ${config.when.value}` : ''}
          </p>
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-[1fr_auto] gap-3">
        <select className="rounded-2xl border border-slate-200 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-900" value={config.severity} onChange={(event) => onSeverity(config.ruleId, event.target.value as Severity)}>
          <option value="CRITICAL">CRITICAL</option>
          <option value="ERROR">ERROR</option>
          <option value="WARNING">WARNING</option>
          <option value="INFO">INFO</option>
        </select>

        <button className="rounded-2xl border border-rose-300 px-4 py-3 text-xs font-semibold text-rose-700 dark:border-rose-900/60 dark:text-rose-300" onClick={() => onDelete?.(config.ruleId)} type="button">
          Delete
        </button>
      </div>
    </div>
  );
};
