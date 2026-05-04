import { DatabaseZap } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, description, actionLabel, onAction }) => (
  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/70 p-10 text-center dark:border-slate-700 dark:bg-slate-900/40">
    <DatabaseZap className="mb-4 h-10 w-10 text-secondary" />
    <h3 className="mb-2 text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">{title}</h3>
    <p className="max-w-lg text-sm text-slate-600 dark:text-slate-300">{description}</p>
    {actionLabel && onAction ? (
      <button className="mt-4 rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-primary" onClick={onAction} type="button">
        {actionLabel}
      </button>
    ) : null}
  </div>
);
