import { Severity } from '../../types';
import { cn } from '../../utils/cn';

interface FieldHighlightProps {
  severity?: Severity;
  children: React.ReactNode;
}

const severityBg: Record<Severity, string> = {
  CRITICAL: 'bg-red-100/80 dark:bg-red-950/40',
  ERROR: 'bg-orange-100/80 dark:bg-orange-950/40',
  WARNING: 'bg-yellow-100/80 dark:bg-yellow-950/30',
  INFO: 'bg-blue-100/80 dark:bg-blue-950/30',
};

export const FieldHighlight: React.FC<FieldHighlightProps> = ({ severity, children }) => (
  <span className={cn('inline-block rounded-md px-2 py-1', severity ? severityBg[severity] : '')}>{children}</span>
);
