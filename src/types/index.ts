export type Severity = 'CRITICAL' | 'ERROR' | 'WARNING' | 'INFO';
export type RecordStatus = 'CLEAN' | 'ACCEPTABLE' | 'REVIEW' | 'QUARANTINE';
export type AutoCorrect = 'YES' | 'PARTIAL' | 'NO';
export type RuleScope = 'FIELD' | 'CROSS_FIELD' | 'DUPLICATE';

export type FieldRuleOperator =
  | 'required'
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'regex'
  | 'min_length'
  | 'max_length'
  | 'is_numeric'
  | 'is_email'
  | 'is_lowercase'
  | 'is_uppercase'
  | 'no_symbols'
  | 'letters_spaces_only';

export type CrossFieldOperator =
  | 'matches_column'
  | 'not_matches_column'
  | 'contains_column'
  | 'greater_than_column'
  | 'less_than_column';

export type DuplicateRuleOperator = 'unique' | 'composite_unique';
export type RuleOperator = FieldRuleOperator | CrossFieldOperator | DuplicateRuleOperator;

export interface ColumnProfile {
  key: string;
  label: string;
  completeness: number;
  uniqueValues: number;
  sampleValues: string[];
}

export interface RawRecord {
  id: string;
  values: Record<string, string>;
  sourceRow: number;
}

export interface Violation {
  ruleId: string;
  ruleName: string;
  field: string;
  relatedFields?: string[];
  severity: Severity;
  originalValue: string;
  suggestedValue?: string;
  autoCorrect: AutoCorrect;
  description: string;
  stage: number;
}

export interface AuditEntry {
  timestamp: string;
  field: string;
  oldValue: string;
  newValue: string;
  ruleId: string;
  action: 'AUTO_CORRECTED' | 'USER_ACCEPTED' | 'USER_REJECTED' | 'QUARANTINED' | 'MERGED' | 'BIOMETRIC_ASSESSED';
  user: string;
}

export interface BiometricQuality {
  recordId: string;
  modality: 'fingerprint' | 'face' | 'iris' | 'voice';
  score: number;
  status: 'PASS' | 'WARN' | 'FAIL';
  diagnostics: string[];
  provider: 'openbq' | 'mock';
  assessedAt: string;
  sourceFile?: string;
  previewImageUrl?: string;
}

export interface ProcessedRecord extends RawRecord {
  violations: Violation[];
  qualityScore: number;
  status: RecordStatus;
  correctedFields: Record<string, string>;
  isDuplicate: boolean;
  duplicateOf?: string[];
  auditLog: AuditEntry[];
  biometricQuality?: BiometricQuality;
}

export interface DashboardStats {
  total: number;
  clean: number;
  acceptable: number;
  review: number;
  quarantine: number;
  totalViolations: number;
  criticalCount: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  avgScore: number;
  duplicatePairs: number;
  autoFixable: number;
  biometricCoverage: number;
  biometricAvgScore: number;
  biometricFailed: number;
}

export interface RuleCondition {
  column: string;
  operator: FieldRuleOperator;
  value?: string;
}

export interface RuleConfig {
  ruleId: string;
  ruleName: string;
  stage: number;
  enabled: boolean;
  severity: Severity;
  scope: RuleScope;
  targetColumn: string;
  operator: RuleOperator;
  value?: string;
  compareColumn?: string;
  columns?: string[];
  when?: RuleCondition;
  applyToRows?: number[];
}

export interface DuplicatePair {
  id: string;
  leftId: string;
  rightId: string;
  confidence: number;
  type: 'EXACT' | 'FUZZY';
  fields: string[];
}

export interface PipelineStageProgress {
  stage: number;
  name: string;
  complete: boolean;
  violationsFound: number;
}

export interface ImportedDataset {
  records: RawRecord[];
  columns: ColumnProfile[];
}
