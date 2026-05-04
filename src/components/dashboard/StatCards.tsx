import { AlertTriangle, CheckCircle2, Database, ShieldAlert } from 'lucide-react';
import { DashboardStats } from '../../types';
import { Card } from '../ui/card';

export const StatCards: React.FC<{ stats: DashboardStats }> = ({ stats }) => {
  const quarantinePct = stats.total ? Math.round((stats.quarantine / stats.total) * 100) : 0;
  const cleanPct = stats.total ? Math.round((stats.clean / stats.total) * 100) : 0;

  const cards = [
    { label: 'Total Records', value: stats.total, tone: 'text-blue-600', icon: Database, sub: 'Loaded into pipeline' },
    { label: 'Clean Records', value: stats.clean, tone: 'text-green-600', icon: CheckCircle2, sub: `${cleanPct}% of total` },
    { label: 'Errors Found', value: stats.totalViolations, tone: 'text-red-600', icon: AlertTriangle, sub: `${stats.criticalCount} critical` },
    { label: 'Biometric Fails', value: stats.biometricFailed, tone: 'text-amber-600', icon: ShieldAlert, sub: `${stats.biometricCoverage}% coverage • avg ${stats.biometricAvgScore}` },
    { label: 'Quarantined', value: stats.quarantine, tone: 'text-amber-600', icon: ShieldAlert, sub: `${quarantinePct}% needs review` },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      {cards.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.label} className="animate-rise p-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-300">{item.label}</p>
              <Icon className={`h-5 w-5 ${item.tone}`} />
            </div>
            <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{item.value}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">{item.sub}</p>
          </Card>
        );
      })}
    </div>
  );
};
