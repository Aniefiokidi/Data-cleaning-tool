import { usePipeline } from '../../context/PipelineContext';
import { ProcessedRecord } from '../../types';
import { getColumnLabel } from '../../utils/pipelineDisplay';
import { SeverityBadge } from '../shared/SeverityBadge';
import { Dialog } from '../ui/dialog';

const scoreColorClass = (score: number) => {
  if (score <= 29) return 'text-red-500';
  if (score <= 40) return 'text-orange-500';
  if (score <= 60) return 'text-yellow-500';
  return 'text-green-500';
};

const ScoreRing: React.FC<{ score: number }> = ({ score }) => {
  const bounded = Math.max(0, Math.min(100, score));
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - bounded / 100);

  return (
    <div className="relative h-20 w-20">
      <svg className="h-20 w-20 -rotate-90" viewBox="0 0 72 72" aria-label={`Quality score ${bounded}`} role="img">
        <circle cx="36" cy="36" r={radius} className="stroke-slate-200 dark:stroke-slate-700" strokeWidth="8" fill="none" />
        <circle
          cx="36"
          cy="36"
          r={radius}
          className={scoreColorClass(bounded)}
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className={`text-sm font-bold ${scoreColorClass(bounded)}`}>{bounded}%</span>
      </div>
    </div>
  );
};

interface Props {
  open: boolean;
  onClose: () => void;
  record?: ProcessedRecord;
  onAcceptField: (field: string) => void;
}

export const RecordDetailModal: React.FC<Props> = ({ open, onClose, record, onAcceptField }) => {
  const { state } = usePipeline();
  if (!record) return null;

  return (
    <Dialog open={open} onClose={onClose} title={`Record ${record.id}`} className="max-w-6xl">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-[28px] bg-slate-950 px-6 py-5 text-white md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/50">Record workspace</p>
            <h2 className="mt-2 text-2xl font-semibold">{record.id}</h2>
            <p className="mt-2 text-sm text-white/70">Source row {record.sourceRow} • {record.violations.length} issue(s) • Status {record.status}</p>
          </div>
          <ScoreRing score={record.qualityScore} />
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.3fr_0.9fr]">
          <section className="rounded-[28px] border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">All columns</p>
                <h3 className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">Uploaded row values</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {state.columns.map((column) => {
                const violation = record.violations.find(
                  (item) => item.field === column.key || item.relatedFields?.includes(column.key),
                );
                return (
                  <div key={column.key} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">{column.label}</p>
                    <p className="mt-2 break-words text-sm font-medium text-slate-900 dark:text-white">{record.values[column.key] || '—'}</p>
                    {violation?.suggestedValue ? <p className="mt-2 text-xs text-emerald-600">Suggested: {violation.suggestedValue}</p> : null}
                    {violation ? <div className="mt-3"><SeverityBadge severity={violation.severity} /></div> : null}
                    {violation?.suggestedValue ? (
                      <button className="mt-3 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white" onClick={() => onAcceptField(column.key)} type="button">
                        Accept suggestion
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="space-y-4">
            <div className="rounded-[28px] border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950/60">
              <h3 className="text-lg font-semibold text-slate-950 dark:text-white">Violations</h3>
              <div className="mt-4 space-y-3">
                {record.violations.length ? record.violations.map((violation) => (
                  <div key={`${violation.ruleId}-${violation.field}-${violation.description}`} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-950 dark:text-white">{violation.ruleId} • {violation.ruleName}</p>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{violation.description}</p>
                        <p className="mt-2 text-xs text-slate-500">
                          Field: {getColumnLabel(state.columns, violation.field)}
                          {violation.relatedFields?.length ? ` • Related: ${violation.relatedFields.map((field) => getColumnLabel(state.columns, field)).join(', ')}` : ''}
                          {' • '}
                          Stage {violation.stage}
                        </p>
                      </div>
                      <SeverityBadge severity={violation.severity} />
                    </div>
                  </div>
                )) : <p className="text-sm text-slate-500">No issues found for this record.</p>}
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950/60">
              <h3 className="text-lg font-semibold text-slate-950 dark:text-white">Biometric quality</h3>
              {record.biometricQuality ? (
                <div className="mt-4 space-y-4">
                  <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                    <p className="font-semibold text-slate-950 dark:text-white">
                      {record.biometricQuality.modality.toUpperCase()} • {record.biometricQuality.status} • Score {record.biometricQuality.score}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">Provider: {record.biometricQuality.provider}</p>
                    {record.biometricQuality.sourceFile ? <p className="mt-1 text-xs text-slate-500">Source: {record.biometricQuality.sourceFile}</p> : null}
                    <p className="mt-2 text-xs text-slate-500">{record.biometricQuality.diagnostics.join(' | ')}</p>
                  </div>

                  {record.biometricQuality.previewImageUrl ? (
                    <div className="rounded-2xl border border-slate-200 p-3 dark:border-slate-800">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Preview</p>
                      <img
                        src={record.biometricQuality.previewImageUrl}
                        alt={`Biometric preview for ${record.id}`}
                        className="max-h-56 w-full rounded-xl object-contain bg-slate-50 dark:bg-slate-900"
                      />
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">No biometric assessment is attached to this record.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </Dialog>
  );
};
