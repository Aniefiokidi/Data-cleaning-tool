import { Database, Fingerprint, UploadCloud } from 'lucide-react';
import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { usePipeline } from '../../context/PipelineContext';
import { ImportedDataset } from '../../types';
import { Dialog } from '../ui/dialog';
import { UploadProgress } from './UploadProgress';

interface Props {
  open: boolean;
  onClose: () => void;
}

export const UploadZone: React.FC<Props> = ({ open, onClose }) => {
  const { parseUploadFile, setRawDataset, runPipeline, setBiometricFiles, state } = usePipeline();
  const [file, setFile] = useState<File | null>(null);
  const [biometricFiles, setLocalBiometricFiles] = useState<File[]>([]);
  const [uploadIntent, setUploadIntent] = useState<'BOTH' | 'SYSTEM' | 'OPENBQ'>('SYSTEM');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const biometricRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();

  const canStartProcessing =
    !isSubmitting
    && (uploadIntent === 'OPENBQ' ? biometricFiles.length > 0 : true)
    && (uploadIntent === 'SYSTEM' || uploadIntent === 'BOTH' ? Boolean(file) : true)
    && (uploadIntent === 'SYSTEM' ? true : biometricFiles.length > 0);

  const rawFromBiometricFiles = (): ImportedDataset => ({
    columns: [
      {
        key: 'source_file',
        label: 'Source File',
        completeness: 100,
        uniqueValues: biometricFiles.length,
        sampleValues: biometricFiles.slice(0, 3).map((item) => item.name),
      },
    ],
    records: biometricFiles.map((biometricFile, index) => {
      const base = biometricFile.name.replace(/\.[^.]+$/, '');
      const inferredId = (base.split('__')[0] || '').trim() || `BIO-${index + 1}`;
      return {
        id: inferredId,
        sourceRow: index + 1,
        values: { source_file: biometricFile.name },
      };
    }),
  });

  const processFile = async () => {
    if (isSubmitting) return;

    if (uploadIntent !== 'OPENBQ' && !file) {
      toast.error('Select a data file first.');
      return;
    }

    if (uploadIntent !== 'SYSTEM' && biometricFiles.length === 0) {
      toast.error('Select biometric files first.');
      return;
    }

    setIsSubmitting(true);
    try {
      let dataset: ImportedDataset = { records: state.rawRecords, columns: state.columns };
      if (uploadIntent !== 'OPENBQ') {
        dataset = await parseUploadFile(file as File);
      } else if (!dataset.records.length) {
        dataset = rawFromBiometricFiles();
      }

      setRawDataset(dataset);
      setBiometricFiles(uploadIntent === 'SYSTEM' ? [] : biometricFiles);

      if (uploadIntent === 'OPENBQ') {
        await runPipeline(dataset, biometricFiles, 'OPENBQ_ONLY');
        onClose();
        navigate('/dashboard');
        return;
      }

      onClose();
      navigate('/review');
    } catch (error) {
      const message = String(error);
      if (!message.includes('Pipeline failed:')) toast.error(`Processing failed: ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Upload dataset" className="max-w-4xl">
      <div className="space-y-6">
        <div>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Choose what you want to run. Most users only need <span className="font-semibold">Data checks only</span>.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {[
            { key: 'SYSTEM', title: 'Data checks only', body: 'Upload a table file and run the cleaning rules.' },
            { key: 'BOTH', title: 'Data + biometrics', body: 'Run the data checks and OpenBQ together.' },
            { key: 'OPENBQ', title: 'Biometrics only', body: 'Run only biometric quality checks.' },
          ].map((option) => (
            <button
              key={option.key}
              className={`rounded-2xl border p-4 text-left ${
                uploadIntent === option.key
                  ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-950'
                  : 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
              }`}
              onClick={() => setUploadIntent(option.key as 'BOTH' | 'SYSTEM' | 'OPENBQ')}
              type="button"
            >
              <p className="font-semibold">{option.title}</p>
              <p className="mt-2 text-sm opacity-80">{option.body}</p>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {uploadIntent !== 'OPENBQ' ? (
            <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
              <div className="mb-3 flex items-center gap-2">
                <Database className="h-4 w-4" />
                <p className="font-semibold">Dataset file</p>
              </div>
              <button
                className="flex h-48 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 text-sm transition hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700"
                onClick={() => fileRef.current?.click()}
                type="button"
              >
                <UploadCloud className="mb-3 h-8 w-8" />
                <span>Choose CSV, Excel, PDF, JSON, TXT, or TSV</span>
              </button>
              {file ? <p className="mt-3 text-sm text-emerald-600">{file.name} • {Math.round(file.size / 1024)} KB</p> : null}
            </div>
          ) : null}

          {uploadIntent !== 'SYSTEM' ? (
            <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
              <div className="mb-3 flex items-center gap-2">
                <Fingerprint className="h-4 w-4" />
                <p className="font-semibold">Biometric files</p>
              </div>
              <button
                className="flex h-48 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 text-sm transition hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700"
                onClick={() => biometricRef.current?.click()}
                type="button"
              >
                <UploadCloud className="mb-3 h-8 w-8" />
                <span>Choose image or WSQ files</span>
              </button>
              {biometricFiles.length ? <p className="mt-3 text-sm text-emerald-600">{biometricFiles.length} biometric file(s) selected</p> : null}
            </div>
          ) : null}
        </div>

        <input
          className="hidden"
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx,.xls,.pdf,.json,.txt,.tsv"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
        <input
          className="hidden"
          ref={biometricRef}
          type="file"
          multiple
          accept="image/*,.wsq"
          onChange={(event) => setLocalBiometricFiles(Array.from(event.target.files ?? []))}
        />

        <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          <p className="font-semibold text-slate-900 dark:text-white">How it works</p>
          <p className="mt-2">After upload, the app reads your column names, lets your saved rules run against them, and shows the flagged results in the table.</p>
        </div>

        <UploadProgress />

        <div className="flex justify-end gap-2">
          <button className="rounded-xl border border-slate-300 px-4 py-2 text-sm dark:border-slate-700" onClick={onClose} type="button">Cancel</button>
          <button
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-100 dark:text-slate-950"
            onClick={processFile}
            type="button"
            disabled={!canStartProcessing}
          >
            {isSubmitting ? 'Preparing...' : 'Next: Review data'}
          </button>
        </div>
      </div>
    </Dialog>
  );
};
