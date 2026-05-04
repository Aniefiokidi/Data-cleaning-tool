import { useMemo } from 'react';
import { usePipeline } from '../../context/PipelineContext';
import { ScoreDistChart } from '../dashboard/ScoreDistChart';
import { SeverityPieChart } from '../dashboard/SeverityPieChart';
import { StageHeatmap } from '../dashboard/StageHeatmap';
import { ViolationsByRule } from '../dashboard/ViolationsByRule';
import { Card, CardHeader, CardTitle } from '../ui/card';
import { ExportButtons } from './ExportButtons';

export const ReportView = () => {
  const { state, stats, setFilters } = usePipeline();

  const rows = useMemo(() => {
    const map = new Map<string, { count: number; records: Set<string>; name: string }>();
    state.processedRecords.forEach((record) => {
      record.violations.forEach((violation) => {
        const current = map.get(violation.ruleId) ?? { count: 0, records: new Set<string>(), name: violation.ruleName };
        current.count += 1;
        current.records.add(record.id);
        map.set(violation.ruleId, current);
      });
    });
    return [...map.entries()].map(([ruleId, item]) => ({
      ruleId,
      ruleName: item.name,
      violations: item.count,
      recordsAffected: item.records.size,
      pct: stats.totalViolations ? ((item.count / stats.totalViolations) * 100).toFixed(1) : '0.0',
    }));
  }, [state.processedRecords, stats.totalViolations]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Summary Statistics</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-2 gap-3 text-sm lg:grid-cols-6">
          <div>Total: {stats.total}</div>
          <div>Clean: {stats.clean}</div>
          <div>Acceptable: {stats.acceptable}</div>
          <div>Review: {stats.review}</div>
          <div>Quarantine: {stats.quarantine}</div>
          <div>Avg Score: {stats.avgScore}</div>
        </div>
      </Card>

      <ExportButtons />

      <Card>
        <CardHeader>
          <CardTitle>Error Breakdown</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="p-2 text-left">Rule ID</th>
                <th className="p-2 text-left">Rule Name</th>
                <th className="p-2 text-left">Violations</th>
                <th className="p-2 text-left">Records Affected</th>
                <th className="p-2 text-left">% of Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.ruleId} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="p-2">{row.ruleId}</td>
                  <td className="p-2">{row.ruleName}</td>
                  <td className="p-2">{row.violations}</td>
                  <td className="p-2">{row.recordsAffected}</td>
                  <td className="p-2">{row.pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ScoreDistChart records={state.processedRecords} />
        <ViolationsByRule records={state.processedRecords} onRuleClick={(ruleId) => setFilters({ ruleId })} />
        <SeverityPieChart stats={stats} />
      </div>
      <StageHeatmap records={state.processedRecords} />
    </div>
  );
};
