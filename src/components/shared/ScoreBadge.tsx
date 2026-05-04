import { Badge } from '../ui/badge';

const scoreClass = (score: number) => {
  if (score >= 90) return 'bg-green-500 text-white border-green-500';
  if (score >= 70) return 'bg-blue-500 text-white border-blue-500';
  if (score >= 50) return 'bg-yellow-500 text-white border-yellow-500';
  return 'bg-red-500 text-white border-red-500';
};

export const ScoreBadge: React.FC<{ score: number }> = ({ score }) => (
  <Badge className={scoreClass(score)}>{score}</Badge>
);
