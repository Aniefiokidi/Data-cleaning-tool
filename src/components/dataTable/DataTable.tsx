import { useMemo, useState } from 'react';
import { usePipeline } from '../../context/PipelineContext';
import { ProcessedRecord } from '../../types';
import { EmptyState } from '../shared/EmptyState';
import { Table, TableBody, TableHead, TableHeaderCell, TableRow } from '../ui/table';
import { BulkActions } from './BulkActions';
import { FilterBar } from './FilterBar';
import { RecordDetailModal } from './RecordDetailModal';
import { RecordRow } from './RecordRow';

export const DataTable = () => {
  const { state, filteredRecords, acceptSuggestedField, acceptAllSuggestions, quarantineRecord, exportCsv } = usePipeline();
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [activeRecord, setActiveRecord] = useState<ProcessedRecord | undefined>(undefined);
  const [sortBy, setSortBy] = useState<string>('id');

  const visibleColumns = useMemo(() => state.columns.slice(0, 8), [state.columns]);

  const sorted = useMemo(() => {
    const readValue = (record: ProcessedRecord, key: string) => (key === 'id' ? record.id : record.values[key] ?? '');
    return [...filteredRecords].sort((left, right) => String(readValue(left, sortBy)).localeCompare(String(readValue(right, sortBy))));
  }, [filteredRecords, sortBy]);

  const selectedIds = Object.entries(selected).filter(([, checked]) => checked).map(([id]) => id);

  if (!state.columns.length) {
    return <EmptyState title="No dataset loaded" description="Upload a file, detect its columns, then build rules from the discovered schema." />;
  }

  return (
    <div className="space-y-5">
      <div className="rounded-[28px] border border-white/70 bg-white/70 p-5 shadow-soft backdrop-blur dark:border-slate-800 dark:bg-slate-950/55">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Dataset view</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">Issue-first results table</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
              Columns come directly from the uploaded file. Cells with issues are highlighted, and every violation keeps its rule ID, severity, and suggested fix close to the data.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div className="rounded-2xl bg-slate-950 px-4 py-3 text-white dark:bg-slate-800">
              <p className="text-xs uppercase tracking-[0.2em] text-white/60">Rows</p>
              <p className="mt-1 text-xl font-semibold">{state.processedRecords.length}</p>
            </div>
            <div className="rounded-2xl bg-amber-100 px-4 py-3 text-amber-900 dark:bg-amber-950/50 dark:text-amber-100">
              <p className="text-xs uppercase tracking-[0.2em] opacity-70">Issues</p>
              <p className="mt-1 text-xl font-semibold">{state.processedRecords.reduce((sum, record) => sum + record.violations.length, 0)}</p>
            </div>
            <div className="rounded-2xl bg-emerald-100 px-4 py-3 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100">
              <p className="text-xs uppercase tracking-[0.2em] opacity-70">Columns</p>
              <p className="mt-1 text-xl font-semibold">{state.columns.length}</p>
            </div>
            <div className="rounded-2xl bg-sky-100 px-4 py-3 text-sky-900 dark:bg-sky-950/50 dark:text-sky-100">
              <p className="text-xs uppercase tracking-[0.2em] opacity-70">Rules</p>
              <p className="mt-1 text-xl font-semibold">{state.ruleConfig.length}</p>
            </div>
          </div>
        </div>
      </div>

      <FilterBar />

      {selectedIds.length > 0 ? (
        <BulkActions
          count={selectedIds.length}
          onAccept={() => selectedIds.forEach((id) => acceptAllSuggestions(id))}
          onQuarantine={() => selectedIds.forEach((id) => quarantineRecord(id))}
          onExport={() => exportCsv('clean')}
          onDelete={() => setSelected({})}
        />
      ) : null}

      {sorted.length === 0 ? (
        <EmptyState title="No records match your filters" description="Try widening the search, switching severity, or clearing the rule filter." />
      ) : (
        <div className="overflow-x-auto rounded-[28px] border border-white/70 bg-white/75 shadow-soft backdrop-blur dark:border-slate-800 dark:bg-slate-950/60">
          <Table className="min-w-[1200px]">
            <TableHead className="sticky top-0 bg-white/90 backdrop-blur dark:bg-slate-950/90">
              <TableRow className="hover:bg-transparent">
                <TableHeaderCell>
                  <input
                    type="checkbox"
                    onChange={(event) => {
                      const next = Object.fromEntries(sorted.map((record) => [record.id, event.target.checked]));
                      setSelected(next);
                    }}
                  />
                </TableHeaderCell>
                <TableHeaderCell className="cursor-pointer" onClick={() => setSortBy('id')}>Record</TableHeaderCell>
                {visibleColumns.map((column) => (
                  <TableHeaderCell key={column.key} className="cursor-pointer whitespace-nowrap" onClick={() => setSortBy(column.key)}>
                    <div className="space-y-1">
                      <p>{column.label}</p>
                      <p className="text-[10px] font-normal normal-case text-slate-400">{column.completeness}% filled</p>
                    </div>
                  </TableHeaderCell>
                ))}
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Score</TableHeaderCell>
                <TableHeaderCell>Issues</TableHeaderCell>
                <TableHeaderCell>Actions</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sorted.map((record) => (
                <RecordRow
                  key={record.id}
                  record={record}
                  columns={visibleColumns}
                  selected={Boolean(selected[record.id])}
                  onSelect={(id, value) => setSelected((current) => ({ ...current, [id]: value }))}
                  onView={setActiveRecord}
                  onAcceptAll={acceptAllSuggestions}
                  onQuarantine={quarantineRecord}
                />
              ))}
            </TableBody>
          </Table>
          {state.columns.length > visibleColumns.length ? (
            <div className="border-t border-slate-200 px-5 py-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
              Showing the first {visibleColumns.length} columns here for scan speed. Open a record to inspect every uploaded column.
            </div>
          ) : null}
        </div>
      )}

      <RecordDetailModal
        open={Boolean(activeRecord)}
        record={activeRecord}
        onClose={() => setActiveRecord(undefined)}
        onAcceptField={(field) => {
          if (!activeRecord) return;
          acceptSuggestedField(activeRecord.id, field);
        }}
      />
    </div>
  );
};
