import { useMemo, useState } from 'react';
import { usePipeline } from '../context/PipelineContext';
import { Card, CardHeader, CardTitle } from '../components/ui/card';

export const AuditPage = () => {
  const { auditTrail, exportCsv } = usePipeline();
  const [action, setAction] = useState('ALL');
  const [ruleId, setRuleId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const rows = useMemo(() => {
    return auditTrail.filter((entry) => {
      if (action !== 'ALL' && entry.action !== action) return false;
      if (ruleId && !entry.ruleId.toLowerCase().includes(ruleId.toLowerCase())) return false;
      if (from && new Date(entry.timestamp) < new Date(from)) return false;
      if (to && new Date(entry.timestamp) > new Date(to)) return false;
      return true;
    });
  }, [auditTrail, action, ruleId, from, to]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Audit Filters</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
          <input type="date" className="rounded-lg border border-slate-300 p-2 text-sm dark:border-slate-600 dark:bg-slate-800" value={from} onChange={(e) => setFrom(e.target.value)} />
          <input type="date" className="rounded-lg border border-slate-300 p-2 text-sm dark:border-slate-600 dark:bg-slate-800" value={to} onChange={(e) => setTo(e.target.value)} />
          <select className="rounded-lg border border-slate-300 p-2 text-sm dark:border-slate-600 dark:bg-slate-800" value={action} onChange={(e) => setAction(e.target.value)}>
            <option value="ALL">All actions</option>
            <option value="AUTO_CORRECTED">AUTO_CORRECTED</option>
            <option value="USER_ACCEPTED">USER_ACCEPTED</option>
            <option value="USER_REJECTED">USER_REJECTED</option>
            <option value="QUARANTINED">QUARANTINED</option>
            <option value="MERGED">MERGED</option>
          </select>
          <input className="rounded-lg border border-slate-300 p-2 text-sm dark:border-slate-600 dark:bg-slate-800" value={ruleId} onChange={(e) => setRuleId(e.target.value)} placeholder="Filter by rule ID" />
          <button className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white" onClick={() => exportCsv('audit')} type="button">Export CSV</button>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="p-2 text-left">Timestamp</th>
                <th className="p-2 text-left">Record ID</th>
                <th className="p-2 text-left">Field</th>
                <th className="p-2 text-left">Old Value</th>
                <th className="p-2 text-left">New Value</th>
                <th className="p-2 text-left">Rule ID</th>
                <th className="p-2 text-left">Action</th>
                <th className="p-2 text-left">User</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((entry, idx) => (
                <tr key={`${entry.recordId}-${entry.timestamp}-${idx}`} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="p-2">{new Date(entry.timestamp).toLocaleString()}</td>
                  <td className="p-2">{entry.recordId}</td>
                  <td className="p-2">{entry.field}</td>
                  <td className="p-2">{entry.oldValue}</td>
                  <td className="p-2">{entry.newValue}</td>
                  <td className="p-2">{entry.ruleId}</td>
                  <td className="p-2">{entry.action}</td>
                  <td className="p-2">{entry.user}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
