import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePipeline } from '../context/PipelineContext';

export const ReviewPage = () => {
  const { state, runPipeline, biometricFilesCount } = usePipeline();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);

  const visibleColumns = useMemo(() => state.columns, [state.columns]);

  const onProcess = async () => {
    if (processing) return;
    setProcessing(true);
    try {
      const mode = biometricFilesCount > 0 ? 'FULL' : 'SYSTEM_ONLY';
      await runPipeline({ records: state.rawRecords, columns: state.columns }, undefined, mode);
      navigate('/table');
    } finally {
      setProcessing(false);
    }
  };

  if (!state.columns.length) {
    return <p className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">Upload a dataset first to review rows and columns.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-xl font-semibold">Uploaded data review</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Scan full rows/columns, then configure rules and process. Issues and suggested fixes will be shown per cell after processing.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm" type="button" onClick={() => navigate('/rules')}>Set rules</button>
          <button className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white" type="button" disabled={processing} onClick={onProcess}>{processing ? 'Processing...' : 'Process dataset'}</button>
        </div>
      </div>

      <div className="overflow-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800">
              <th className="p-2 text-left">Row</th>
              {visibleColumns.map((column) => <th key={column.key} className="p-2 text-left">{column.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {state.rawRecords.map((record) => (
              <tr key={record.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="p-2">{record.sourceRow}</td>
                {visibleColumns.map((column) => <td key={`${record.id}-${column.key}`} className="p-2">{record.values[column.key] ?? ''}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
