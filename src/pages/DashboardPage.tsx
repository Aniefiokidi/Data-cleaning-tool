import { CorrectionPanel } from '../components/corrections/CorrectionPanel';
import { RecentActivity } from '../components/dashboard/RecentActivity';
import { ScoreDistChart } from '../components/dashboard/ScoreDistChart';
import { SeverityPieChart } from '../components/dashboard/SeverityPieChart';
import { StageHeatmap } from '../components/dashboard/StageHeatmap';
import { StatCards } from '../components/dashboard/StatCards';
import { ViolationsByRule } from '../components/dashboard/ViolationsByRule';
import { usePipeline } from '../context/PipelineContext';

const scoreColorClass = (score: number) => {
  if (score <= 29) return 'text-red-500';
  if (score <= 40) return 'text-orange-500';
  if (score <= 60) return 'text-yellow-500';
  return 'text-green-500';
};

const ScoreRingMini: React.FC<{ score: number }> = ({ score }) => {
  const bounded = Math.max(0, Math.min(100, score));
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - bounded / 100);

  return (
    <div className="relative h-12 w-12">
      <svg className="h-12 w-12 -rotate-90" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r={radius} className="stroke-slate-200 dark:stroke-slate-700" strokeWidth="6" fill="none" />
        <circle
          cx="22"
          cy="22"
          r={radius}
          className={scoreColorClass(bounded)}
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className={`text-[10px] font-bold ${scoreColorClass(bounded)}`}>{bounded}%</span>
      </div>
    </div>
  );
};

export const DashboardPage = () => {
  const { state, stats, setFilters } = usePipeline();
  const usingProvider = state.processedRecords.find((record) => record.biometricQuality)?.biometricQuality?.provider;
  const assessments = state.processedRecords.filter((record) => record.biometricQuality).slice(0, 6);

  return (
    <div className="space-y-5">
      <section className="rounded-[32px] border border-white/70 bg-white/75 p-6 shadow-soft backdrop-blur dark:border-slate-800 dark:bg-slate-950/60">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Control center</p>
            <h2 className="mt-2 text-3xl font-semibold text-slate-950 dark:text-white">Schema-aware quality dashboard</h2>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              Trends now follow the analyst's own rule set. Once a dataset is uploaded, the app reads its columns, applies your configured checks, and shows where those rules are hurting quality across the table.
            </p>
          </div>

          <div className="rounded-[28px] bg-slate-950 px-5 py-4 text-white dark:bg-white dark:text-slate-950">
            <p className="text-xs uppercase tracking-[0.2em] opacity-60">Loaded columns</p>
            <p className="mt-1 text-3xl font-semibold">{state.columns.length}</p>
          </div>
        </div>
      </section>

      <StatCards stats={stats} />

      <section className="rounded-[28px] border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/60">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">OpenBQ Biometrics</h2>
          <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800">
            Provider: {usingProvider ? 'OpenBQ Live' : 'No results yet'}
          </span>
        </div>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Coverage: {stats.biometricCoverage}% • Failed: {stats.biometricFailed} • Avg biometric score: {stats.biometricAvgScore}
        </p>

        {assessments.length ? (
          <div className="mt-3 space-y-2">
            {assessments.map((record) => (
              <div key={record.id} className="rounded-lg border border-slate-200 p-2 text-xs dark:border-slate-700">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      {record.id} • {record.biometricQuality?.modality.toUpperCase()} • {record.biometricQuality?.status} • Score {record.biometricQuality?.score}
                    </p>
                    <p className="truncate text-slate-500 dark:text-slate-300">{record.biometricQuality?.sourceFile || 'No file name available'}</p>
                    {record.biometricQuality?.previewImageUrl ? (
                      <img
                        src={record.biometricQuality.previewImageUrl}
                        alt={`Biometric preview ${record.id}`}
                        className="mt-2 h-16 w-24 rounded border border-slate-200 object-cover dark:border-slate-700"
                      />
                    ) : null}
                  </div>
                  {record.biometricQuality?.score !== undefined ? <ScoreRingMini score={record.biometricQuality.score} /> : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-300">
            Upload data with biometric files to populate this section.
          </p>
        )}
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ScoreDistChart records={state.processedRecords} />
        <ViolationsByRule records={state.processedRecords} onRuleClick={(ruleId) => setFilters({ ruleId })} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <SeverityPieChart stats={stats} />
        </div>
        <RecentActivity />
      </div>

      <StageHeatmap records={state.processedRecords} />
      <CorrectionPanel />
    </div>
  );
};
