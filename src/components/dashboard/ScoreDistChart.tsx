import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ProcessedRecord } from '../../types';
import { Card, CardHeader, CardTitle } from '../ui/card';

export const ScoreDistChart: React.FC<{ records: ProcessedRecord[] }> = ({ records }) => {
  const data = [
    { band: '0-49', count: records.filter((r) => r.qualityScore < 50).length, color: '#ef4444' },
    { band: '50-69', count: records.filter((r) => r.qualityScore >= 50 && r.qualityScore < 70).length, color: '#f59e0b' },
    { band: '70-89', count: records.filter((r) => r.qualityScore >= 70 && r.qualityScore < 90).length, color: '#eab308' },
    { band: '90-100', count: records.filter((r) => r.qualityScore >= 90).length, color: '#22c55e' },
  ];

  return (
    <Card className="h-[320px]">
      <CardHeader>
        <CardTitle>Score Distribution</CardTitle>
      </CardHeader>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="band" />
          <YAxis allowDecimals={false} />
          <Tooltip formatter={(value) => `${value ?? 0} records`} />
          <Bar dataKey="count" fill="#2E75B6" radius={[8, 8, 0, 0]}>
            {data.map((entry) => <Cell key={entry.band} fill={entry.color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
};
