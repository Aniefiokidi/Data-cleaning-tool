import { useMemo } from 'react';
import { usePipeline } from '../../context/PipelineContext';
import { ProcessedRecord } from '../../types';
import { Card, CardHeader, CardTitle } from '../ui/card';

const intensityColor = (count: number) => {
  if (count === 0) return 'bg-white dark:bg-slate-950/70';
  if (count <= 2) return 'bg-amber-100 dark:bg-amber-950/30';
  if (count <= 5) return 'bg-orange-200 dark:bg-orange-950/40';
  return 'bg-rose-500 text-white dark:bg-rose-700';
};

export const StageHeatmap: React.FC<{ records: ProcessedRecord[] }> = ({ records }) => {
  const { state } = usePipeline();

  const columns = useMemo(() => {
    const seen = new Set<string>();
    records.forEach((record) => {
      record.violations.forEach((violation) => {
        if (!violation.field.startsWith('__')) seen.add(violation.field);
      });
    });

    return state.columns.filter((column) => seen.has(column.key)).slice(0, 10);
  }, [records, state.columns]);

  const matrix = useMemo(
    () =>
      state.stageProgress.map((stage) => ({
        stage,
        values: new Map(columns.map((column) => [column.key, 0])),
      })),
    [columns, state.stageProgress],
  );

  records.forEach((record) => {
    record.violations.forEach((violation) => {
      const row = matrix.find((item) => item.stage.stage === violation.stage);
      if (!row || !row.values.has(violation.field)) return;
      row.values.set(violation.field, (row.values.get(violation.field) ?? 0) + 1);
    });
  });

  return (
    <Card className="rounded-[28px] border-white/70 bg-white/80 dark:border-slate-800 dark:bg-slate-950/60">
      <CardHeader>
        <CardTitle>Stage Heatmap</CardTitle>
      </CardHeader>
      {!columns.length ? (
        <p className="text-sm text-slate-500">Run some rules first to see which columns are lighting up by stage.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className="p-2 text-left">Stage</th>
                {columns.map((column) => (
                  <th key={column.key} className="p-2 text-left">{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.map((row) => (
                <tr key={row.stage.stage}>
                  <td className="p-2 font-semibold">{row.stage.name}</td>
                  {columns.map((column) => {
                    const count = row.values.get(column.key) ?? 0;
                    return (
                      <td key={`${row.stage.stage}-${column.key}`} className={`rounded-xl p-2 text-center ${intensityColor(count)}`} title={`${count} issue(s) in ${row.stage.name}`}>
                        {count}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
};
