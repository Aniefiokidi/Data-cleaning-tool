interface Props {
  count: number;
  onAccept: () => void;
  onQuarantine: () => void;
  onExport: () => void;
  onDelete: () => void;
}

export const BulkActions: React.FC<Props> = ({ count, onAccept, onQuarantine, onExport, onDelete }) => (
  <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
    <span className="text-sm font-semibold">{count} selected</span>
    <button className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white" onClick={onAccept} type="button">Accept All Auto-Fixes ({count} records)</button>
    <button className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white" onClick={onQuarantine} type="button">Quarantine Selected</button>
    <button className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-white" onClick={onExport} type="button">Export Selected</button>
    <button className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white" onClick={onDelete} type="button">Delete Selected</button>
  </div>
);
