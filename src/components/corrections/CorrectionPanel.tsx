import { usePipeline } from '../../context/PipelineContext';
import { Card, CardHeader, CardTitle } from '../ui/card';
import { CorrectionDiff } from './CorrectionDiff';

export const CorrectionPanel = () => {
  const { state, acceptSuggestedField, acceptAllPendingSuggestions, exportCsv, exportJson } = usePipeline();
  const suggestions = state.processedRecords.flatMap((r) =>
    r.violations
      .filter((v) => v.suggestedValue)
      .map((v) => ({ recordId: r.id, ...v })),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Suggested Corrections</CardTitle>
      </CardHeader>
      <div className="mb-3 flex flex-wrap gap-2">
        <button
          className="rounded bg-green-700 px-3 py-1 text-xs font-semibold text-white"
          onClick={acceptAllPendingSuggestions}
          type="button"
        >
          Accept All Pending ({suggestions.length})
        </button>
        <button className="rounded bg-slate-700 px-3 py-1 text-xs font-semibold text-white" onClick={() => exportCsv('clean')} type="button">
          Quick Export Clean CSV
        </button>
        <button className="rounded bg-slate-700 px-3 py-1 text-xs font-semibold text-white" onClick={() => exportCsv('audit')} type="button">
          Quick Export Audit CSV
        </button>
        <button className="rounded bg-primary px-3 py-1 text-xs font-semibold text-white" onClick={exportJson} type="button">
          Quick Export Full JSON
        </button>
      </div>
      <div className="space-y-3">
        {!suggestions.length ? <p className="text-sm text-slate-500">No pending suggestions to accept.</p> : null}
        {suggestions.slice(0, 12).map((s) => (
          <div key={`${s.recordId}-${s.ruleId}-${s.field}`} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <p className="mb-1 text-xs font-semibold">{s.recordId} • {s.field} • {s.ruleId}</p>
            <CorrectionDiff oldValue={s.originalValue} newValue={s.suggestedValue ?? ''} />
            <button className="mt-2 rounded bg-green-600 px-2 py-1 text-xs text-white" onClick={() => acceptSuggestedField(s.recordId, s.field)} type="button">Accept</button>
          </div>
        ))}
      </div>
    </Card>
  );
};
