import { usePipeline } from '../../context/PipelineContext';

export const ExportButtons = () => {
  const { exportCsv, exportJson } = usePipeline();

  return (
    <div className="flex flex-wrap gap-2">
      <button className="rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white" onClick={() => exportCsv('clean')} type="button">Download Clean CSV</button>
      <button className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white" onClick={() => exportCsv('quarantine')} type="button">Download Quarantine CSV</button>
      <button className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white" onClick={() => exportCsv('errors')} type="button">Download Error Report CSV</button>
      <button className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-semibold text-white" onClick={() => exportCsv('audit')} type="button">Download Audit Log CSV</button>
      <button className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white" onClick={exportJson} type="button">Download Full Report JSON</button>
    </div>
  );
};
