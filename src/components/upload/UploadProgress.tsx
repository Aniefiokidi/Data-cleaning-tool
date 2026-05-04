import { usePipeline } from '../../context/PipelineContext';
import { Progress } from '../ui/progress';

export const UploadProgress = () => {
  const { state } = usePipeline();

  return (
    <div className="space-y-3">
      {state.stageProgress.map((stage) => (
        <div key={stage.stage}>
          <div className="mb-1 flex items-center justify-between text-xs text-slate-800 dark:text-slate-100">
            <span>Stage {stage.stage}: {stage.name}</span>
            <span>{stage.violationsFound} violations</span>
          </div>
          <Progress value={stage.complete ? 100 : state.isRunning ? 50 : 0} className={stage.complete ? 'bg-green-200' : ''} />
        </div>
      ))}
    </div>
  );
};
