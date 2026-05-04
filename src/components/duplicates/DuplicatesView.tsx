import { useState } from 'react';
import { usePipeline } from '../../context/PipelineContext';
import { DuplicatePair } from '../../types';
import { getColumnLabel, getRecordSummary } from '../../utils/pipelineDisplay';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { MergeModal } from './MergeModal';

export const DuplicatesView = () => {
  const { state, mergePair } = usePipeline();
  const [tab, setTab] = useState<'EXACT' | 'FUZZY'>('EXACT');
  const [activePair, setActivePair] = useState<DuplicatePair | undefined>(undefined);
  const pairs = state.duplicatePairs.filter((pair) => pair.type === tab);

  return (
    <div className="space-y-5">
      <Card className="rounded-[28px] border-white/70 bg-white/80 dark:border-slate-800 dark:bg-slate-950/60">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {state.duplicatePairs.filter((pair) => pair.type === 'EXACT').length} exact duplicates, {state.duplicatePairs.filter((pair) => pair.type === 'FUZZY').length} fuzzy matches
        </p>
      </Card>

      <div className="flex gap-2">
        <button className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === 'EXACT' ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950' : 'bg-slate-200 dark:bg-slate-800'}`} onClick={() => setTab('EXACT')} type="button">Exact duplicates</button>
        <button className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === 'FUZZY' ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950' : 'bg-slate-200 dark:bg-slate-800'}`} onClick={() => setTab('FUZZY')} type="button">Fuzzy matches</button>
      </div>

      {pairs.length ? (
        <div className="space-y-4">
          {pairs.map((pair) => {
            const left = state.processedRecords.find((record) => record.id === pair.leftId);
            const right = state.processedRecords.find((record) => record.id === pair.rightId);
            if (!left || !right) return null;

            return (
              <Card key={pair.id} className="rounded-[28px] border-white/70 bg-white/80 dark:border-slate-800 dark:bg-slate-950/60">
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  {[left, right].map((record) => (
                    <div key={record.id} className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
                      <p className="font-semibold text-slate-950 dark:text-white">{record.id}</p>
                      <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">{getRecordSummary(record, state.columns)}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {pair.fields.map((field) => (
                          <Badge key={`${record.id}-${field}`} className="border-amber-300 bg-white text-amber-800 dark:border-amber-900 dark:bg-slate-900 dark:text-amber-100">
                            {getColumnLabel(state.columns, field)}: {record.values[field] || '—'}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Badge className="border-blue-300 bg-blue-100 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">{(pair.confidence * 100).toFixed(0)}%</Badge>
                  <Badge className="border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    Based on {pair.fields.map((field) => getColumnLabel(state.columns, field)).join(', ')}
                  </Badge>
                  <button className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white dark:bg-white dark:text-slate-950" onClick={() => setActivePair(pair)} type="button">Merge preview</button>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="rounded-[28px] border-dashed border-slate-300 bg-white/60 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950/50">
          No duplicate pairs yet. Create a duplicate rule from the Rules page and rerun the pipeline.
        </Card>
      )}

      <MergeModal
        open={Boolean(activePair)}
        pair={activePair}
        left={state.processedRecords.find((record) => record.id === activePair?.leftId)}
        right={state.processedRecords.find((record) => record.id === activePair?.rightId)}
        onClose={() => setActivePair(undefined)}
        onMerge={() => {
          if (!activePair) return;
          mergePair(activePair);
          setActivePair(undefined);
        }}
      />
    </div>
  );
};
