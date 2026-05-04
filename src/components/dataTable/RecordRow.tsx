import { ArrowUpRight, Eye } from 'lucide-react';
import { ColumnProfile, ProcessedRecord } from '../../types';
import { FieldHighlight } from '../shared/FieldHighlight';
import { ScoreBadge } from '../shared/ScoreBadge';
import { SeverityBadge } from '../shared/SeverityBadge';
import { Badge } from '../ui/badge';
import { TableCell, TableRow } from '../ui/table';

interface Props {
  record: ProcessedRecord;
  columns: ColumnProfile[];
  selected: boolean;
  onSelect: (id: string, value: boolean) => void;
  onView: (record: ProcessedRecord) => void;
  onAcceptAll: (recordId: string) => void;
  onQuarantine: (recordId: string) => void;
}

export const RecordRow: React.FC<Props> = ({ record, columns, selected, onSelect, onView, onAcceptAll, onQuarantine }) => {
  const firstIssue = (field: string) => record.violations.find((violation) => violation.field === field || violation.relatedFields?.includes(field));

  return (
    <TableRow className="border-b border-white/60 bg-white/80 backdrop-blur transition hover:-translate-y-0.5 hover:bg-white dark:border-slate-800 dark:bg-slate-950/60 dark:hover:bg-slate-900">
      <TableCell><input checked={selected} onChange={(event) => onSelect(record.id, event.target.checked)} type="checkbox" /></TableCell>
      <TableCell className="min-w-[9rem]">
        <div className="space-y-1">
          <p className="font-mono text-xs font-semibold text-slate-900 dark:text-white">{record.id}</p>
          <p className="text-[11px] text-slate-500">Row {record.sourceRow}</p>
        </div>
      </TableCell>
      {columns.map((column) => {
        const violation = firstIssue(column.key);
        return (
          <TableCell key={column.key} className="min-w-[12rem] max-w-[16rem]">
            <FieldHighlight severity={violation?.severity}>
              <span className="line-clamp-2 break-words">{record.values[column.key] || '—'}</span>
            </FieldHighlight>
          </TableCell>
        );
      })}
      <TableCell><Badge className="border-slate-200 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">{record.status}</Badge></TableCell>
      <TableCell><ScoreBadge score={record.qualityScore} /></TableCell>
      <TableCell>
        <div className="space-y-2">
          <Badge className="border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">{record.violations.length} issues</Badge>
          {record.violations[0] ? <SeverityBadge severity={record.violations[0].severity} /> : null}
        </div>
      </TableCell>
      <TableCell className="min-w-[11rem]">
        <div className="flex flex-col gap-2 text-xs">
          <button className="inline-flex items-center gap-1 font-semibold text-secondary" onClick={() => onView(record)} type="button">
            <Eye className="h-3.5 w-3.5" />
            Inspect
          </button>
          <button className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300" onClick={() => onAcceptAll(record.id)} type="button">
            <ArrowUpRight className="h-3.5 w-3.5" />
            Apply suggestions
          </button>
          <button className="text-amber-700 dark:text-amber-300" onClick={() => onQuarantine(record.id)} type="button">Move to quarantine</button>
        </div>
      </TableCell>
    </TableRow>
  );
};
