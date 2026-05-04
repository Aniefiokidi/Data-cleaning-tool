import { Severity } from '../../types';
import { Badge } from '../ui/badge';

const severityClass: Record<Severity, string> = {
  CRITICAL: 'bg-red-100 text-red-800 border-red-300',
  ERROR: 'bg-orange-100 text-orange-800 border-orange-300',
  WARNING: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  INFO: 'bg-blue-100 text-blue-800 border-blue-300',
};

export const SeverityBadge: React.FC<{ severity: Severity }> = ({ severity }) => (
  <Badge className={severityClass[severity]}>{severity}</Badge>
);
