import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { DashboardStats } from '../../types';
import { Card, CardHeader, CardTitle } from '../ui/card';

const palette = ['#991b1b', '#f59e0b', '#eab308', '#3b82f6'];

export const SeverityPieChart: React.FC<{ stats: DashboardStats }> = ({ stats }) => {
  const data = [
    { name: 'CRITICAL', value: stats.criticalCount },
    { name: 'ERROR', value: stats.errorCount },
    { name: 'WARNING', value: stats.warningCount },
    { name: 'INFO', value: stats.infoCount },
  ];

  return (
    <Card className="h-[320px]">
      <CardHeader>
        <CardTitle>Severity Breakdown</CardTitle>
      </CardHeader>
      <div className="relative h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie innerRadius={55} outerRadius={90} data={data} dataKey="value" nameKey="name" cx="50%" cy="50%">
              {data.map((entry, index) => (
                <Cell key={entry.name} fill={palette[index]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.totalViolations}</p>
          <p className="text-xs text-slate-500">violations</p>
        </div>
      </div>
    </Card>
  );
};
