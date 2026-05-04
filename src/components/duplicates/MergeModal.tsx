import { usePipeline } from '../../context/PipelineContext';
import { DuplicatePair, ProcessedRecord } from '../../types';
import { getColumnLabel, getRecordSummary } from '../../utils/pipelineDisplay';
import { Dialog } from '../ui/dialog';

interface Props {
  open: boolean;
  onClose: () => void;
  pair?: DuplicatePair;
  left?: ProcessedRecord;
  right?: ProcessedRecord;
  onMerge: () => void;
}

export const MergeModal: React.FC<Props> = ({ open, onClose, pair, left, right, onMerge }) => {
  const { state } = usePipeline();
  if (!pair || !left || !right) return null;

  return (
    <Dialog open={open} onClose={onClose} title="Merge preview">
      <div className="space-y-5">
        <div>
          <h2 className="text-2xl font-semibold text-slate-950 dark:text-white">Merge preview</h2>
          <p className="mt-2 text-sm text-slate-500">Confidence {(pair.confidence * 100).toFixed(0)}% • Fields {pair.fields.map((field) => getColumnLabel(state.columns, field)).join(', ')}</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[left, right].map((record) => (
            <div key={record.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
              <p className="font-semibold text-slate-950 dark:text-white">{record.id}</p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{getRecordSummary(record, state.columns)}</p>
              <div className="mt-3 space-y-2 text-sm">
                {pair.fields.map((field) => (
                  <p key={`${record.id}-${field}`}>
                    <span className="font-semibold">{getColumnLabel(state.columns, field)}:</span> {record.values[field] || '—'}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <button className="rounded-xl border border-slate-300 px-4 py-2 text-sm dark:border-slate-700" onClick={onClose} type="button">Cancel</button>
          <button className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-slate-950" onClick={onMerge} type="button">Merge records</button>
        </div>
      </div>
    </Dialog>
  );
};
