import { useMemo } from 'react';
import { usePipeline } from '../../context/PipelineContext';
import { Card, CardHeader, CardTitle } from '../ui/card';

export const RecentActivity = () => {
  const { auditTrail } = usePipeline();

  const rows = useMemo(() => auditTrail.slice(0, 10), [auditTrail]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <div className="space-y-3">
        {rows.map((entry) => (
          <div key={`${entry.recordId}-${entry.timestamp}-${entry.ruleId}`} className="rounded-lg border border-slate-200 p-3 text-xs dark:border-slate-700">
            <p className="font-semibold text-slate-800 dark:text-slate-100">{entry.action} • {entry.field}</p>
            <p className="mt-1 text-slate-500">{new Date(entry.timestamp).toLocaleString()}</p>
            <p className="text-slate-500">Rule {entry.ruleId} • Record {entry.recordId}</p>
          </div>
        ))}
      </div>
    </Card>
  );
};
