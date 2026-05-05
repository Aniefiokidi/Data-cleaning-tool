import Papa from 'papaparse';
import React, { createContext, useContext, useEffect, useMemo, useReducer, useState } from 'react';
import toast from 'react-hot-toast';
import { scoreFromViolations, statusFromScore } from '../rules/scoreEngine';
import {
  AuditEntry,
  BiometricQuality,
  ColumnProfile,
  DashboardStats,
  DuplicatePair,
  FieldRuleOperator,
  ImportedDataset,
  PipelineStageProgress,
  ProcessedRecord,
  RawRecord,
  RecordStatus,
  RuleCondition,
  RuleConfig,
  Severity,
  Violation,
} from '../types';

const RULE_STORAGE_KEY = 'data-cleaning-user-rule-config-v2';

const STAGES: PipelineStageProgress[] = [
  { stage: 1, name: 'Field rules', complete: false, violationsFound: 0 },
  { stage: 2, name: 'Cross-column rules', complete: false, violationsFound: 0 },
  { stage: 3, name: 'Duplicate rules', complete: false, violationsFound: 0 },
  { stage: 4, name: 'Biometric checks', complete: false, violationsFound: 0 },
  { stage: 5, name: 'Scoring and routing', complete: false, violationsFound: 0 },
];

interface TableFilters {
  status: 'ALL' | RecordStatus;
  severity: 'ALL' | Severity;
  stage: 'ALL' | number;
  search: string;
  ruleId: string;
}

interface PipelineState {
  rawRecords: RawRecord[];
  processedRecords: ProcessedRecord[];
  duplicatePairs: DuplicatePair[];
  ruleConfig: RuleConfig[];
  columns: ColumnProfile[];
  stageProgress: PipelineStageProgress[];
  isRunning: boolean;
  currentRecord: number;
  tableFilters: TableFilters;
}

const initialState: PipelineState = {
  rawRecords: [],
  processedRecords: [],
  duplicatePairs: [],
  ruleConfig: [],
  columns: [],
  stageProgress: STAGES,
  isRunning: false,
  currentRecord: 0,
  tableFilters: { status: 'ALL', severity: 'ALL', stage: 'ALL', search: '', ruleId: '' },
};

type PipelineAction =
  | { type: 'SET_RUNNING'; payload: boolean }
  | { type: 'SET_PROGRESS'; payload: { stage: number; complete?: boolean; addViolations?: number; currentRecord?: number } }
  | { type: 'SET_PROCESSED'; payload: { records: ProcessedRecord[]; pairs: DuplicatePair[] } }
  | { type: 'SET_RULE_CONFIG'; payload: RuleConfig[] }
  | { type: 'SET_RAW_DATA'; payload: ImportedDataset }
  | { type: 'UPDATE_FILTERS'; payload: Partial<TableFilters> }
  | { type: 'UPDATE_RECORD'; payload: ProcessedRecord };

const reducer = (state: PipelineState, action: PipelineAction): PipelineState => {
  switch (action.type) {
    case 'SET_RUNNING':
      return {
        ...state,
        isRunning: action.payload,
        stageProgress: action.payload ? STAGES.map((stage) => ({ ...stage })) : state.stageProgress,
        currentRecord: action.payload ? 0 : state.currentRecord,
      };
    case 'SET_PROGRESS':
      return {
        ...state,
        currentRecord: action.payload.currentRecord ?? state.currentRecord,
        stageProgress: state.stageProgress.map((stage) =>
          stage.stage === action.payload.stage
            ? {
                ...stage,
                complete: action.payload.complete ?? stage.complete,
                violationsFound: stage.violationsFound + (action.payload.addViolations ?? 0),
              }
            : stage,
        ),
      };
    case 'SET_PROCESSED':
      return { ...state, processedRecords: action.payload.records, duplicatePairs: action.payload.pairs };
    case 'SET_RULE_CONFIG':
      return { ...state, ruleConfig: action.payload };
    case 'SET_RAW_DATA':
      return { ...state, rawRecords: action.payload.records, columns: action.payload.columns };
    case 'UPDATE_FILTERS':
      return { ...state, tableFilters: { ...state.tableFilters, ...action.payload } };
    case 'UPDATE_RECORD':
      return {
        ...state,
        processedRecords: state.processedRecords.map((record) => (record.id === action.payload.id ? action.payload : record)),
      };
    default:
      return state;
  }
};

interface PipelineContextValue {
  state: PipelineState;
  stats: DashboardStats;
  auditTrail: (AuditEntry & { recordId: string })[];
  filteredRecords: ProcessedRecord[];
  runPipeline: (dataset?: ImportedDataset, biometricFiles?: File[], mode?: 'FULL' | 'SYSTEM_ONLY' | 'OPENBQ_ONLY') => Promise<void>;
  updateRuleConfig: (next: RuleConfig[]) => void;
  parseUploadFile: (file: File) => Promise<ImportedDataset>;
  setRawDataset: (dataset: ImportedDataset) => void;
  setBiometricFiles: (files: File[]) => void;
  biometricFilesCount: number;
  acceptSuggestedField: (recordId: string, field: string) => void;
  quarantineRecord: (recordId: string) => void;
  acceptAllSuggestions: (recordId: string) => void;
  acceptAllPendingSuggestions: () => void;
  setFilters: (filters: Partial<TableFilters>) => void;
  mergePair: (pair: DuplicatePair) => void;
  exportCsv: (kind: 'clean' | 'quarantine' | 'errors' | 'audit') => void;
  exportJson: () => void;
}

const PipelineContext = createContext<PipelineContextValue | undefined>(undefined);

const download = (content: string, filename: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const toCsvRow = (entry: AuditEntry & { recordId: string }) => ({
  timestamp: entry.timestamp,
  record_id: entry.recordId,
  field: entry.field,
  old_value: entry.oldValue,
  new_value: entry.newValue,
  rule_id: entry.ruleId,
  action: entry.action,
  user: entry.user,
});

const normalizeHeader = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
const titleCase = (value: string) => value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

const computeStats = (records: ProcessedRecord[], duplicatePairs: DuplicatePair[]): DashboardStats => {
  const violations = records.flatMap((record) => record.violations);
  const biometricRecords = records.filter((record) => record.biometricQuality);

  return {
    total: records.length,
    clean: records.filter((record) => record.status === 'CLEAN').length,
    acceptable: records.filter((record) => record.status === 'ACCEPTABLE').length,
    review: records.filter((record) => record.status === 'REVIEW').length,
    quarantine: records.filter((record) => record.status === 'QUARANTINE').length,
    totalViolations: violations.length,
    criticalCount: violations.filter((violation) => violation.severity === 'CRITICAL').length,
    errorCount: violations.filter((violation) => violation.severity === 'ERROR').length,
    warningCount: violations.filter((violation) => violation.severity === 'WARNING').length,
    infoCount: violations.filter((violation) => violation.severity === 'INFO').length,
    avgScore: records.length ? Math.round(records.reduce((sum, record) => sum + record.qualityScore, 0) / records.length) : 0,
    duplicatePairs: duplicatePairs.length,
    autoFixable: violations.filter((violation) => violation.autoCorrect !== 'NO').length,
    biometricCoverage: records.length ? Math.round((biometricRecords.length / records.length) * 100) : 0,
    biometricAvgScore: biometricRecords.length
      ? Math.round(biometricRecords.reduce((sum, record) => sum + (record.biometricQuality?.score ?? 0), 0) / biometricRecords.length)
      : 0,
    biometricFailed: biometricRecords.filter((record) => record.biometricQuality?.status === 'FAIL').length,
  };
};

const evaluateFieldCondition = (value: string, operator: FieldRuleOperator, expected?: string): boolean => {
  const actual = String(value ?? '');
  const target = String(expected ?? '');

  switch (operator) {
    case 'required':
      return actual.trim().length > 0;
    case 'equals':
      return actual === target;
    case 'not_equals':
      return actual !== target;
    case 'contains':
      return actual.toLowerCase().includes(target.toLowerCase());
    case 'not_contains':
      return !actual.toLowerCase().includes(target.toLowerCase());
    case 'starts_with':
      return actual.toLowerCase().startsWith(target.toLowerCase());
    case 'ends_with':
      return actual.toLowerCase().endsWith(target.toLowerCase());
    case 'regex':
      try {
        return new RegExp(target).test(actual);
      } catch {
        return false;
      }
    case 'min_length':
      return actual.length >= Number(target || '0');
    case 'max_length':
      return actual.length <= Number(target || '0');
    case 'is_numeric':
      return /^-?\d+(\.\d+)?$/.test(actual.trim());
    case 'is_email':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(actual.trim());
    case 'is_lowercase':
      return actual === actual.toLowerCase();
    case 'is_uppercase':
      return actual === actual.toUpperCase();
    case 'no_symbols':
      return !/[^\w\s]/.test(actual);
    case 'letters_spaces_only':
      return /^[a-z\s]+$/i.test(actual.trim());
    default:
      return true;
  }
};

const describeFieldRule = (operator: FieldRuleOperator, value?: string) => {
  switch (operator) {
    case 'required':
      return 'must not be empty';
    case 'equals':
      return `must equal "${value}"`;
    case 'not_equals':
      return `must not equal "${value}"`;
    case 'contains':
      return `must contain "${value}"`;
    case 'not_contains':
      return `must not contain "${value}"`;
    case 'starts_with':
      return `must start with "${value}"`;
    case 'ends_with':
      return `must end with "${value}"`;
    case 'regex':
      return `must match regex ${value}`;
    case 'min_length':
      return `must be at least ${value} characters`;
    case 'max_length':
      return `must be at most ${value} characters`;
    case 'is_numeric':
      return 'must be numeric';
    case 'is_email':
      return 'must be a valid email';
    case 'is_lowercase':
      return 'must be lowercase';
    case 'is_uppercase':
      return 'must be uppercase';
    case 'no_symbols':
      return 'must not contain symbols';
    case 'letters_spaces_only':
      return 'must contain letters and spaces only';
    default:
      return 'failed validation';
  }
};

const recommendFieldFix = (
  value: string,
  operator: FieldRuleOperator,
  expected?: string,
): { suggestedValue?: string; autoCorrect: 'YES' | 'PARTIAL' | 'NO'; fixHint: string } => {
  const actual = String(value ?? '');
  const target = String(expected ?? '');

  switch (operator) {
    case 'required':
      return { autoCorrect: 'NO', fixHint: 'Provide a non-empty value.' };
    case 'equals':
      return { suggestedValue: target, autoCorrect: 'YES', fixHint: `Set the value to "${target}".` };
    case 'not_equals':
      return { autoCorrect: 'NO', fixHint: `Change the value so it no longer equals "${target}".` };
    case 'contains':
      return { suggestedValue: `${actual}${target}`, autoCorrect: 'PARTIAL', fixHint: `Append "${target}" or revise the entry.` };
    case 'not_contains':
      return {
        suggestedValue: actual.replace(new RegExp(target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig'), ''),
        autoCorrect: 'PARTIAL',
        fixHint: `Remove "${target}" from the value.`,
      };
    case 'starts_with':
      return { suggestedValue: `${target}${actual}`, autoCorrect: 'PARTIAL', fixHint: `Prefix the value with "${target}".` };
    case 'ends_with':
      return { suggestedValue: `${actual}${target}`, autoCorrect: 'PARTIAL', fixHint: `Suffix the value with "${target}".` };
    case 'regex':
      return { autoCorrect: 'NO', fixHint: `Adjust the value so it matches ${target}.` };
    case 'min_length': {
      const minimum = Number(target || '0');
      const fill = Number.isFinite(minimum) && minimum > actual.length ? '_'.repeat(minimum - actual.length) : '';
      return {
        suggestedValue: fill ? `${actual}${fill}` : undefined,
        autoCorrect: fill ? 'PARTIAL' : 'NO',
        fixHint: `Use at least ${minimum} characters.`,
      };
    }
    case 'max_length': {
      const maximum = Number(target || '0');
      return {
        suggestedValue: Number.isFinite(maximum) ? actual.slice(0, maximum) : undefined,
        autoCorrect: 'PARTIAL',
        fixHint: `Trim the value to ${maximum} characters or fewer.`,
      };
    }
    case 'is_numeric': {
      const cleaned = actual.replace(/[^0-9.-]/g, '');
      return { suggestedValue: cleaned || undefined, autoCorrect: cleaned ? 'PARTIAL' : 'NO', fixHint: 'Keep only numeric characters.' };
    }
    case 'is_email': {
      const lowered = actual.trim().toLowerCase();
      return { suggestedValue: lowered !== actual ? lowered : undefined, autoCorrect: lowered !== actual ? 'PARTIAL' : 'NO', fixHint: 'Use a standard email format.' };
    }
    case 'is_lowercase':
      return { suggestedValue: actual.toLowerCase(), autoCorrect: 'YES', fixHint: 'Convert the value to lowercase.' };
    case 'is_uppercase':
      return { suggestedValue: actual.toUpperCase(), autoCorrect: 'YES', fixHint: 'Convert the value to uppercase.' };
    case 'no_symbols': {
      const cleaned = actual.replace(/[^\w\s]/g, '');
      return { suggestedValue: cleaned !== actual ? cleaned : undefined, autoCorrect: cleaned !== actual ? 'PARTIAL' : 'NO', fixHint: 'Remove symbols and punctuation.' };
    }
    case 'letters_spaces_only': {
      const cleaned = actual.replace(/[^a-z\s]/gi, '');
      return { suggestedValue: cleaned !== actual ? cleaned : undefined, autoCorrect: cleaned !== actual ? 'PARTIAL' : 'NO', fixHint: 'Keep letters and spaces only.' };
    }
    default:
      return { autoCorrect: 'NO', fixHint: 'Review the value manually.' };
  }
};

const valueAsComparable = (value: string): number | string => {
  const trimmed = value.trim();
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  const date = Date.parse(trimmed);
  if (!Number.isNaN(date) && /[-/]/.test(trimmed)) return date;
  return trimmed.toLowerCase();
};

const ruleApplies = (record: RawRecord, condition?: RuleCondition) => {
  if (!condition) return true;
  return evaluateFieldCondition(record.values[condition.column] ?? '', condition.operator, condition.value);
};

const columnLookup = (columns: ColumnProfile[]) => new Map(columns.map((column) => [column.key, column.label]));

const buildColumns = (records: RawRecord[], labelsByKey: Map<string, string>): ColumnProfile[] => {
  const allKeys = Array.from(
    new Set(records.flatMap((record) => Object.keys(record.values))),
  );

  return allKeys.map((key) => {
    const values = records.map((record) => record.values[key] ?? '');
    const nonEmpty = values.filter((value) => value.trim());
    return {
      key,
      label: labelsByKey.get(key) ?? titleCase(key),
      completeness: records.length ? Math.round((nonEmpty.length / records.length) * 100) : 0,
      uniqueValues: new Set(nonEmpty.map((value) => value.toLowerCase())).size,
      sampleValues: Array.from(new Set(nonEmpty)).slice(0, 3),
    };
  });
};

const rowsToDataset = (rows: Record<string, unknown>[]): ImportedDataset => {
  const labels = Array.from(
    new Set(
      rows.flatMap((row) => Object.keys(row)),
    ),
  );

  const labelsByKey = new Map<string, string>();
  const keyByLabel = new Map<string, string>();
  const usedKeys = new Set<string>();

  labels.forEach((label, index) => {
    const base = normalizeHeader(label) || `column_${index + 1}`;
    let key = base;
    let counter = 2;
    while (usedKeys.has(key)) {
      key = `${base}_${counter}`;
      counter += 1;
    }
    usedKeys.add(key);
    keyByLabel.set(label, key);
    labelsByKey.set(key, label.trim() || `Column ${index + 1}`);
  });

  const idCandidates = ['id', 'record_id', 'recordid', 'row_id'];
  const records = rows.map((row, index) => {
    const values: Record<string, string> = {};
    labels.forEach((label) => {
      const key = keyByLabel.get(label);
      if (!key) return;
      values[key] = String(row[label] ?? '').trim();
    });

    const idKey = Array.from(keyByLabel.values()).find((key) => idCandidates.includes(key));
    const id = idKey && values[idKey] ? values[idKey] : `ROW-${String(index + 1).padStart(4, '0')}`;

    return { id, values, sourceRow: index + 1 };
  });

  return { records, columns: buildColumns(records, labelsByKey) };
};

const extractDelimitedRows = (text: string): Record<string, unknown>[] => {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const candidateDelimiters = [',', '\t', ';', '|'];
  const delimiter = candidateDelimiters.find((candidate) => lines[0].includes(candidate));
  if (!delimiter) return [];

  const headers = lines[0].split(delimiter).map((cell) => cell.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(delimiter);
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? '']));
  });
};

const extractKeyValueBlocks = (text: string): Record<string, unknown>[] => {
  const blocks = text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  return blocks
    .map((block) => {
      const pairs = block
        .split(/\r?\n/)
        .map((line) => line.split(/[:=]/))
        .filter((parts) => parts.length >= 2)
        .map(([left, ...right]) => [left.trim(), right.join(':').trim()]);
      return Object.fromEntries(pairs);
    })
    .filter((row) => Object.keys(row).length > 0);
};

const applyBiometricPenalty = (score: number, biometric?: BiometricQuality) => {
  if (!biometric) return score;
  if (biometric.status === 'FAIL') return Math.max(0, score - 20);
  if (biometric.status === 'WARN') return Math.max(0, score - 8);
  return score;
};

interface BiometricsApiResponse {
  provider: 'openbq' | 'mock';
  assessments: BiometricQuality[];
}

const analyzeBiometrics = async (records: RawRecord[], biometricFiles: File[]): Promise<Map<string, BiometricQuality>> => {
  if (!biometricFiles.length) return new Map();

  const formData = new FormData();
  formData.append('records', JSON.stringify(records));
  formData.append('modality', 'fingerprint');
  biometricFiles.forEach((file) => formData.append('files', file, file.name));

  const response = await fetch('/api/biometrics/analyze-files', { method: 'POST', body: formData });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `OpenBQ API returned ${response.status}`);
  }

  const payload = (await response.json()) as BiometricsApiResponse;
  return new Map(payload.assessments.map((assessment) => [assessment.recordId, assessment]));
};

const createViolation = (params: {
  rule: RuleConfig;
  field: string;
  relatedFields?: string[];
  originalValue: string;
  description: string;
  suggestedValue?: string;
  autoCorrect: 'YES' | 'PARTIAL' | 'NO';
}): Violation => ({
  ruleId: params.rule.ruleId,
  ruleName: params.rule.ruleName,
  field: params.field,
  relatedFields: params.relatedFields,
  severity: params.rule.severity,
  originalValue: params.originalValue,
  suggestedValue: params.suggestedValue,
  autoCorrect: params.autoCorrect,
  description: params.description,
  stage: params.rule.stage,
});

const buildDuplicateInsights = (
  records: RawRecord[],
  rules: RuleConfig[],
  columns: ColumnProfile[],
) => {
  const labelMap = columnLookup(columns);
  const pairs: DuplicatePair[] = [];
  const violationsByRecord = new Map<string, Violation[]>();
  const linkedRecords = new Map<string, Set<string>>();

  rules
    .filter((rule) => rule.enabled && rule.scope === 'DUPLICATE')
    .forEach((rule) => {
      const activeColumns = (rule.operator === 'composite_unique' ? rule.columns : [rule.targetColumn])
        ?.filter(Boolean) ?? [];

      if (!activeColumns.length) return;

      const groups = new Map<string, RawRecord[]>();
      records.forEach((record) => {
        if (!ruleApplies(record, rule.when)) return;
        const parts = activeColumns.map((column) => record.values[column]?.trim() ?? '');
        if (parts.some((part) => !part)) return;
        const key = parts.map((part) => part.toLowerCase()).join('||');
        groups.set(key, [...(groups.get(key) ?? []), record]);
      });

      groups.forEach((group) => {
        if (group.length < 2) return;

        for (let leftIndex = 0; leftIndex < group.length; leftIndex += 1) {
          for (let rightIndex = leftIndex + 1; rightIndex < group.length; rightIndex += 1) {
            const left = group[leftIndex];
            const right = group[rightIndex];
            const pairId = `${rule.ruleId}-${left.id}-${right.id}`;

            pairs.push({
              id: pairId,
              leftId: left.id,
              rightId: right.id,
              confidence: 1,
              type: 'EXACT',
              fields: activeColumns,
            });

            linkedRecords.set(left.id, new Set([...(linkedRecords.get(left.id) ?? []), right.id]));
            linkedRecords.set(right.id, new Set([...(linkedRecords.get(right.id) ?? []), left.id]));
          }
        }

        group.forEach((record) => {
          const others = group.filter((candidate) => candidate.id !== record.id).map((candidate) => candidate.id);
          const description = activeColumns
            .map((column) => labelMap.get(column) ?? titleCase(column))
            .join(' + ');

          const violation = createViolation({
            rule,
            field: activeColumns[0],
            relatedFields: activeColumns.slice(1),
            originalValue: activeColumns.map((column) => record.values[column] ?? '').join(' | '),
            description: `Duplicate group detected on ${description}. Matching record(s): ${others.join(', ')}.`,
            autoCorrect: 'NO',
          });

          violationsByRecord.set(record.id, [...(violationsByRecord.get(record.id) ?? []), violation]);
        });
      });
    });

  return { pairs, violationsByRecord, linkedRecords };
};

export const PipelineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [biometricFiles, setBiometricFilesState] = useState<File[]>([]);
  const [biometricPreviewUrls, setBiometricPreviewUrls] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(RULE_STORAGE_KEY);
      if (stored) {
        dispatch({ type: 'SET_RULE_CONFIG', payload: JSON.parse(stored) as RuleConfig[] });
      }
    } catch {
      toast.error('Could not read saved rule workspace');
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(RULE_STORAGE_KEY, JSON.stringify(state.ruleConfig));
  }, [state.ruleConfig]);

  useEffect(() => () => {
    biometricPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
  }, [biometricPreviewUrls]);

  const parseCsvUpload = (file: File): Promise<ImportedDataset> =>
    new Promise((resolve, reject) => {
      Papa.parse<Record<string, unknown>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => resolve(rowsToDataset(result.data)),
        error: (error) => reject(error),
      });
    });

  const parseExcelUpload = async (file: File): Promise<ImportedDataset> => {
    const xlsx = await import('xlsx');
    const buffer = await file.arrayBuffer();
    const workbook = xlsx.read(buffer, { type: 'array' });
    const firstSheet = workbook.SheetNames[0];
    const rows = xlsx.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[firstSheet], { defval: '' });
    return rowsToDataset(rows);
  };

  const parseJsonUpload = async (file: File): Promise<ImportedDataset> => {
    const text = await file.text();
    const parsed = JSON.parse(text) as unknown;
    const rows = Array.isArray(parsed) ? parsed : [parsed];
    return rowsToDataset(rows.filter((row): row is Record<string, unknown> => typeof row === 'object' && row !== null));
  };

  const parseTextLikeUpload = async (file: File): Promise<ImportedDataset> => {
    const text = await file.text();
    const delimited = extractDelimitedRows(text);
    if (delimited.length) return rowsToDataset(delimited);

    const blocks = extractKeyValueBlocks(text);
    if (blocks.length) return rowsToDataset(blocks);

    throw new Error('Unable to parse this text input. Use CSV headers or key/value pairs.');
  };

  const parsePdfUpload = async (file: File): Promise<ImportedDataset> => {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url).toString();

    const buffer = await file.arrayBuffer();
    const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) });
    const pdf = await loadingTask.promise;

    let mergedText = '';
    for (let page = 1; page <= pdf.numPages; page += 1) {
      const currentPage = await pdf.getPage(page);
      const content = await currentPage.getTextContent();
      const pageText = content.items.map((item: { str?: string }) => item.str ?? '').join(' ').replace(/\s{2,}/g, ' ').trim();
      mergedText += `${pageText}\n`;
    }

    const delimited = extractDelimitedRows(mergedText);
    if (delimited.length) return rowsToDataset(delimited);

    const blocks = extractKeyValueBlocks(mergedText.replace(/\s{2,}/g, '\n'));
    if (blocks.length) return rowsToDataset(blocks);

    throw new Error('PDF imported, but no structured records were detected.');
  };

  const parseUploadFile = async (file: File): Promise<ImportedDataset> => {
    const lower = file.name.toLowerCase();
    if (lower.endsWith('.csv')) return parseCsvUpload(file);
    if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) return parseExcelUpload(file);
    if (lower.endsWith('.json')) return parseJsonUpload(file);
    if (lower.endsWith('.txt') || lower.endsWith('.tsv')) return parseTextLikeUpload(file);
    if (lower.endsWith('.pdf')) return parsePdfUpload(file);
    throw new Error('Unsupported file type. Allowed: CSV, XLSX/XLS, PDF, JSON, TXT, TSV.');
  };

  const setRawDataset = (dataset: ImportedDataset) => {
    dispatch({ type: 'SET_RAW_DATA', payload: dataset });
  };

  const runPipeline = async (
    dataset: ImportedDataset = { records: state.rawRecords, columns: state.columns },
    biometricPayload: File[] = biometricFiles,
    mode: 'FULL' | 'SYSTEM_ONLY' | 'OPENBQ_ONLY' = 'FULL',
  ) => {
    dispatch({ type: 'SET_RUNNING', payload: true });
    dispatch({ type: 'SET_RAW_DATA', payload: dataset });

    try {
      const records = dataset.records;
      const columns = dataset.columns;
      const useRules = mode !== 'OPENBQ_ONLY';
      const useBiometrics = mode !== 'SYSTEM_ONLY';

      const previewByFileName = new Map<string, string>();
      const nextPreviewUrls: string[] = [];
      biometricPayload.forEach((file) => {
        if (!file.type.startsWith('image/')) return;
        const url = URL.createObjectURL(file);
        previewByFileName.set(file.name, url);
        nextPreviewUrls.push(url);
      });

      biometricPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
      setBiometricPreviewUrls(nextPreviewUrls);

      const biometricMap = useBiometrics ? await analyzeBiometrics(records, biometricPayload) : new Map<string, BiometricQuality>();
      dispatch({ type: 'SET_PROGRESS', payload: { stage: 4, addViolations: 0 } });

      const duplicateInsights = useRules ? buildDuplicateInsights(records, state.ruleConfig, columns) : {
        pairs: [],
        violationsByRecord: new Map<string, Violation[]>(),
        linkedRecords: new Map<string, Set<string>>(),
      };

      const labelMap = columnLookup(columns);
      const processed: ProcessedRecord[] = [];

      for (let index = 0; index < records.length; index += 1) {
        const record = records[index];
        const workingValues = { ...record.values };
        const correctedFields: Record<string, string> = {};
        const auditLog: AuditEntry[] = [];
        let violations: Violation[] = [];

        if (useRules) {
          state.ruleConfig
            .filter((rule) => rule.enabled && rule.scope !== 'DUPLICATE')
            .forEach((rule) => {
              if (!ruleApplies(record, rule.when)) return;

              if (rule.scope === 'FIELD') {
                const fieldValue = workingValues[rule.targetColumn] ?? '';
                if (evaluateFieldCondition(fieldValue, rule.operator as FieldRuleOperator, rule.value)) return;
                const recommendation = recommendFieldFix(fieldValue, rule.operator as FieldRuleOperator, rule.value);
                violations.push(
                  createViolation({
                    rule,
                    field: rule.targetColumn,
                    originalValue: fieldValue,
                    suggestedValue: recommendation.suggestedValue,
                    autoCorrect: recommendation.autoCorrect,
                    description: `${labelMap.get(rule.targetColumn) ?? titleCase(rule.targetColumn)} ${describeFieldRule(rule.operator as FieldRuleOperator, rule.value)}. ${recommendation.fixHint}`,
                  }),
                );
                dispatch({ type: 'SET_PROGRESS', payload: { stage: 1, addViolations: 1 } });
              }

              if (rule.scope === 'CROSS_FIELD' && rule.compareColumn) {
                const left = workingValues[rule.targetColumn] ?? '';
                const right = workingValues[rule.compareColumn] ?? '';
                const leftComparable = valueAsComparable(left);
                const rightComparable = valueAsComparable(right);

                let passes = true;
                let suggestion: string | undefined;
                let fixHint = 'Review both fields together.';
                let description = '';

                switch (rule.operator) {
                  case 'matches_column':
                    passes = left === right;
                    suggestion = right;
                    fixHint = `Align ${labelMap.get(rule.targetColumn) ?? titleCase(rule.targetColumn)} with ${labelMap.get(rule.compareColumn) ?? titleCase(rule.compareColumn)}.`;
                    description = `must match ${labelMap.get(rule.compareColumn) ?? titleCase(rule.compareColumn)}`;
                    break;
                  case 'not_matches_column':
                    passes = left !== right;
                    description = `must not match ${labelMap.get(rule.compareColumn) ?? titleCase(rule.compareColumn)}`;
                    break;
                  case 'contains_column':
                    passes = left.toLowerCase().includes(right.toLowerCase());
                    suggestion = right && !left.includes(right) ? `${left} ${right}`.trim() : undefined;
                    fixHint = `Include ${labelMap.get(rule.compareColumn) ?? titleCase(rule.compareColumn)} in the target field or adjust the rule.`;
                    description = `must contain ${labelMap.get(rule.compareColumn) ?? titleCase(rule.compareColumn)}`;
                    break;
                  case 'greater_than_column':
                    passes = leftComparable > rightComparable;
                    description = `must be greater than ${labelMap.get(rule.compareColumn) ?? titleCase(rule.compareColumn)}`;
                    break;
                  case 'less_than_column':
                    passes = leftComparable < rightComparable;
                    description = `must be less than ${labelMap.get(rule.compareColumn) ?? titleCase(rule.compareColumn)}`;
                    break;
                  default:
                    break;
                }

                if (!passes) {
                  violations.push(
                    createViolation({
                      rule,
                      field: rule.targetColumn,
                      relatedFields: [rule.compareColumn],
                      originalValue: left,
                      suggestedValue: suggestion,
                      autoCorrect: suggestion ? 'PARTIAL' : 'NO',
                      description: `${labelMap.get(rule.targetColumn) ?? titleCase(rule.targetColumn)} ${description}. ${fixHint}`,
                    }),
                  );
                  dispatch({ type: 'SET_PROGRESS', payload: { stage: 2, addViolations: 1 } });
                }
              }
            });

          const duplicateViolations = duplicateInsights.violationsByRecord.get(record.id) ?? [];
          if (duplicateViolations.length) {
            violations = [...violations, ...duplicateViolations];
            dispatch({ type: 'SET_PROGRESS', payload: { stage: 3, addViolations: duplicateViolations.length } });
          }
        }

        const biometric = biometricMap.get(record.id);
        if (biometric?.status === 'FAIL') {
          violations.push({
            ruleId: 'BIO-001',
            ruleName: 'Biometric quality failure',
            field: '__record__',
            severity: 'CRITICAL',
            originalValue: String(biometric.score),
            autoCorrect: 'NO',
            description: `Biometric ${biometric.modality} quality failed at score ${biometric.score}.`,
            stage: 4,
          });
          dispatch({ type: 'SET_PROGRESS', payload: { stage: 4, addViolations: 1 } });
        }

        if (biometric?.status === 'WARN') {
          violations.push({
            ruleId: 'BIO-002',
            ruleName: 'Biometric quality warning',
            field: '__record__',
            severity: 'WARNING',
            originalValue: String(biometric.score),
            autoCorrect: 'NO',
            description: `Biometric ${biometric.modality} quality warning at score ${biometric.score}.`,
            stage: 4,
          });
          dispatch({ type: 'SET_PROGRESS', payload: { stage: 4, addViolations: 1 } });
        }

        if (biometric) {
          auditLog.push({
            timestamp: new Date().toISOString(),
            field: 'biometrics',
            oldValue: '-',
            newValue: `${biometric.modality}:${biometric.score}:${biometric.status}`,
            ruleId: biometric.status === 'PASS' ? 'BIO-000' : biometric.status === 'WARN' ? 'BIO-002' : 'BIO-001',
            action: 'BIOMETRIC_ASSESSED',
            user: biometric.provider,
          });
        }

        const qualityScore = applyBiometricPenalty(scoreFromViolations(violations), biometric);
        const status = statusFromScore(qualityScore);
        dispatch({ type: 'SET_PROGRESS', payload: { stage: 5, addViolations: 0 } });

        processed.push({
          ...record,
          values: workingValues,
          violations,
          qualityScore,
          status,
          correctedFields,
          isDuplicate: (duplicateInsights.linkedRecords.get(record.id)?.size ?? 0) > 0,
          duplicateOf: Array.from(duplicateInsights.linkedRecords.get(record.id) ?? []),
          auditLog,
          biometricQuality: biometric
            ? {
                ...biometric,
                previewImageUrl: biometric.sourceFile ? previewByFileName.get(biometric.sourceFile) : undefined,
              }
            : undefined,
        });

        dispatch({ type: 'SET_PROGRESS', payload: { stage: 1, currentRecord: index + 1 } });
        await wait(10);
      }

      for (let stage = 1; stage <= STAGES.length; stage += 1) {
        dispatch({ type: 'SET_PROGRESS', payload: { stage, complete: true } });
      }

      dispatch({ type: 'SET_PROCESSED', payload: { records: processed, pairs: duplicateInsights.pairs } });
      toast.success(`Pipeline complete: ${processed.length} records processed`);
    } catch (error) {
      toast.error(`Pipeline failed: ${String(error)}`);
      throw error;
    } finally {
      dispatch({ type: 'SET_RUNNING', payload: false });
    }
  };

  const updateRuleConfig = (next: RuleConfig[]) => {
    dispatch({ type: 'SET_RULE_CONFIG', payload: next });
  };

  const setBiometricFiles = (files: File[]) => {
    setBiometricFilesState(files);
  };

  const setFilters = (filters: Partial<TableFilters>) => {
    dispatch({ type: 'UPDATE_FILTERS', payload: filters });
  };

  const recomputeRecordQuality = (record: ProcessedRecord, violations: Violation[]): ProcessedRecord => {
    const qualityScore = applyBiometricPenalty(scoreFromViolations(violations), record.biometricQuality);
    const status = statusFromScore(qualityScore);
    return { ...record, violations, qualityScore, status };
  };

  const acceptSuggestedField = (recordId: string, field: string) => {
    const record = state.processedRecords.find((item) => item.id === recordId);
    if (!record) return;

    const violation = record.violations.find((item) => item.field === field && item.suggestedValue);
    if (!violation?.suggestedValue) return;

    const nextRecord: ProcessedRecord = {
      ...record,
      values: { ...record.values, [field]: violation.suggestedValue },
      auditLog: [
        ...record.auditLog,
        {
          timestamp: new Date().toISOString(),
          field,
          oldValue: record.values[field] ?? '',
          newValue: violation.suggestedValue,
          ruleId: violation.ruleId,
          action: 'USER_ACCEPTED',
          user: 'analyst',
        },
      ],
    };

    const remainingViolations = record.violations.filter((item) => !(item.field === field && item.suggestedValue));
    dispatch({ type: 'UPDATE_RECORD', payload: recomputeRecordQuality(nextRecord, remainingViolations) });
    toast.success('Suggested correction accepted');
  };

  const acceptAllSuggestions = (recordId: string) => {
    const record = state.processedRecords.find((item) => item.id === recordId);
    if (!record) return;

    const suggestions = record.violations.filter((violation) => violation.suggestedValue);
    if (!suggestions.length) {
      toast('No pending suggestions for this record');
      return;
    }

    let updated = { ...record, values: { ...record.values } };
    suggestions.forEach((violation) => {
      if (!violation.suggestedValue) return;
      updated = {
        ...updated,
        values: { ...updated.values, [violation.field]: violation.suggestedValue },
        auditLog: [
          ...updated.auditLog,
          {
            timestamp: new Date().toISOString(),
            field: violation.field,
            oldValue: record.values[violation.field] ?? '',
            newValue: violation.suggestedValue,
            ruleId: violation.ruleId,
            action: 'USER_ACCEPTED',
            user: 'analyst',
          },
        ],
      };
    });

    dispatch({
      type: 'UPDATE_RECORD',
      payload: recomputeRecordQuality(updated, record.violations.filter((violation) => !violation.suggestedValue)),
    });
    toast.success('Accepted all suggestions for the record');
  };

  const acceptAllPendingSuggestions = () => {
    state.processedRecords
      .filter((record) => record.violations.some((violation) => violation.suggestedValue))
      .forEach((record) => acceptAllSuggestions(record.id));
  };

  const quarantineRecord = (recordId: string) => {
    const record = state.processedRecords.find((item) => item.id === recordId);
    if (!record) return;

    dispatch({
      type: 'UPDATE_RECORD',
      payload: {
        ...record,
        status: 'QUARANTINE',
        auditLog: [
          ...record.auditLog,
          {
            timestamp: new Date().toISOString(),
            field: 'status',
            oldValue: record.status,
            newValue: 'QUARANTINE',
            ruleId: 'MANUAL',
            action: 'QUARANTINED',
            user: 'analyst',
          },
        ],
      },
    });
    toast.success('Record moved to quarantine');
  };

  const mergePair = (pair: DuplicatePair) => {
    const left = state.processedRecords.find((record) => record.id === pair.leftId);
    const right = state.processedRecords.find((record) => record.id === pair.rightId);
    if (!left || !right) return;

    const mergedValues = { ...left.values };
    Object.entries(right.values).forEach(([key, value]) => {
      if (!mergedValues[key]?.trim() && value.trim()) mergedValues[key] = value;
    });

    dispatch({
      type: 'UPDATE_RECORD',
      payload: {
        ...left,
        values: mergedValues,
        auditLog: [
          ...left.auditLog,
          {
            timestamp: new Date().toISOString(),
            field: 'record',
            oldValue: right.id,
            newValue: left.id,
            ruleId: pair.id.split('-')[0] ?? 'MERGE',
            action: 'MERGED',
            user: 'analyst',
          },
        ],
      },
    });
    toast.success('Duplicate pair merged');
  };

  const exportCsv = (kind: 'clean' | 'quarantine' | 'errors' | 'audit') => {
    const orderedColumns = state.columns.map((column) => column.key);

    if (kind === 'audit') {
      const rows = state.processedRecords.flatMap((record) => record.auditLog.map((entry) => toCsvRow({ ...entry, recordId: record.id })));
      download(Papa.unparse(rows), 'audit-log.csv', 'text/csv');
      return;
    }

    if (kind === 'errors') {
      const rows = state.processedRecords.flatMap((record) =>
        record.violations.map((violation) => ({
          record_id: record.id,
          field: violation.field,
          rule_id: violation.ruleId,
          severity: violation.severity,
          value: violation.originalValue,
          description: violation.description,
        })),
      );
      download(Papa.unparse(rows), 'error-report.csv', 'text/csv');
      return;
    }

    const candidates = state.processedRecords.filter((record) =>
      kind === 'clean'
        ? record.status === 'CLEAN' || record.status === 'ACCEPTABLE'
        : record.status === 'REVIEW' || record.status === 'QUARANTINE',
    );

    const rows = candidates.map((record) => ({
      record_id: record.id,
      status: record.status,
      quality_score: record.qualityScore,
      ...Object.fromEntries(orderedColumns.map((column) => [column, record.values[column] ?? ''])),
      violation_notes: record.violations.map((violation) => `${violation.ruleId}:${violation.description}`).join(' | '),
    }));

    download(Papa.unparse(rows), kind === 'clean' ? 'clean-records.csv' : 'quarantine-records.csv', 'text/csv');
  };

  const exportJson = () => {
    download(JSON.stringify({ columns: state.columns, records: state.processedRecords, duplicates: state.duplicatePairs }, null, 2), 'full-report.json', 'application/json');
  };

  const auditTrail = useMemo(
    () =>
      state.processedRecords
        .flatMap((record) => record.auditLog.map((entry) => ({ ...entry, recordId: record.id })))
        .sort((left, right) => +new Date(right.timestamp) - +new Date(left.timestamp)),
    [state.processedRecords],
  );

  const filteredRecords = useMemo(() => {
    const { status, severity, stage, search, ruleId } = state.tableFilters;
    return state.processedRecords.filter((record) => {
      if (status !== 'ALL' && record.status !== status) return false;
      if (severity !== 'ALL' && !record.violations.some((violation) => violation.severity === severity)) return false;
      if (stage !== 'ALL' && !record.violations.some((violation) => violation.stage === stage)) return false;
      if (ruleId && !record.violations.some((violation) => violation.ruleId === ruleId)) return false;

      if (search.trim()) {
        const haystack = `${record.id} ${Object.values(record.values).join(' ')} ${record.violations.map((violation) => violation.description).join(' ')}`.toLowerCase();
        if (!haystack.includes(search.toLowerCase())) return false;
      }

      return true;
    });
  }, [state.processedRecords, state.tableFilters]);

  const stats = useMemo(() => computeStats(state.processedRecords, state.duplicatePairs), [state.processedRecords, state.duplicatePairs]);

  return (
    <PipelineContext.Provider
      value={{
        state,
        stats,
        auditTrail,
        filteredRecords,
        runPipeline,
        updateRuleConfig,
        parseUploadFile,
        setRawDataset,
        setBiometricFiles,
        biometricFilesCount: biometricFiles.length,
        acceptSuggestedField,
        quarantineRecord,
        acceptAllSuggestions,
        acceptAllPendingSuggestions,
        setFilters,
        mergePair,
        exportCsv,
        exportJson,
      }}
    >
      {children}
    </PipelineContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const usePipeline = () => {
  const context = useContext(PipelineContext);
  if (!context) throw new Error('usePipeline must be used inside PipelineProvider');
  return context;
};
