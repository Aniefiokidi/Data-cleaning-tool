import React from 'react';
import { cn } from '../../utils/cn';

interface ProgressProps {
  value: number;
  className?: string;
}

export const Progress: React.FC<ProgressProps> = ({ value, className }) => (
  <div className={cn('h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700', className)}>
    <div className="h-full rounded-full bg-secondary transition-all duration-200" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
  </div>
);
