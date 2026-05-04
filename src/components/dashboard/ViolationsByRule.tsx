import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ProcessedRecord } from '../../types';
import { Card, CardHeader, CardTitle } from '../ui/card';

interface Props {
  records: ProcessedRecord[];
  onRuleClick: (ruleId: string) => void;
}

export const ViolationsByRule: React.FC<Props> = ({ records, onRuleClick }) => {
  const map = new Map<string, number>();
  records.forEach((record) => {
    record.violations.forEach((v) => {
      map.set(v.ruleId, (map.get(v.ruleId) ?? 0) + 1);
    });
  });

  const data = [...map.entries()]
    .map(([ruleId, count]) => ({ ruleId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return (
    <Card className="h-[320px]">
      <CardHeader>
        <CardTitle>Violations by Rule</CardTitle>
      </CardHeader>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} layout="vertical" onClick={(state: unknown) => {
          const payload = state as { activeLabel?: string };
          if (payload.activeLabel) onRuleClick(payload.activeLabel);
        }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" allowDecimals={false} />
          <YAxis dataKey="ruleId" type="category" width={80} />
          <Tooltip />
          <Bar dataKey="count" fill="#ef4444" radius={[0, 8, 8, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
};
