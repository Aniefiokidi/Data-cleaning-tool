import { useMemo, useState } from 'react';
import { usePipeline } from '../../context/PipelineContext';
import { FieldRuleOperator, RuleConfig, RuleScope, Severity } from '../../types';
import { doesFieldOperatorNeedValue, getColumnLabel } from '../../utils/pipelineDisplay';
import { RuleCard } from './RuleCard';

const FIELD_OPERATORS: Array<{ value: FieldRuleOperator; label: string; hint: string }> = [
  { value: 'required', label: 'Must not be empty', hint: 'Use this for required columns.' },
  { value: 'equals', label: 'Must exactly equal', hint: 'Best for fixed codes or statuses.' },
  { value: 'contains', label: 'Must contain text', hint: 'Best for words inside longer values.' },
  { value: 'starts_with', label: 'Must start with', hint: 'Useful for prefixes and IDs.' },
  { value: 'ends_with', label: 'Must end with', hint: 'Useful for file types and email domains.' },
  { value: 'min_length', label: 'Minimum length', hint: 'Use this for IDs or phone lengths.' },
  { value: 'max_length', label: 'Maximum length', hint: 'Use this to trim long values.' },
  { value: 'is_numeric', label: 'Must be numeric', hint: 'Only digits or numbers are allowed.' },
  { value: 'is_email', label: 'Must look like an email', hint: 'Checks for a simple email format.' },
  { value: 'letters_spaces_only', label: 'Letters and spaces only', hint: 'Useful for names.' },
];

const CROSS_OPERATORS = [
  { value: 'matches_column', label: 'Should match another column' },
  { value: 'contains_column', label: 'Should contain another column' },
  { value: 'greater_than_column', label: 'Should be greater than another column' },
  { value: 'less_than_column', label: 'Should be less than another column' },
] as const;

const QUICK_TEMPLATES = [
  { label: 'Required value', scope: 'FIELD' as RuleScope, operator: 'required' as FieldRuleOperator, description: 'Catch empty cells in important columns.' },
  { label: 'Numeric only', scope: 'FIELD' as RuleScope, operator: 'is_numeric' as FieldRuleOperator, description: 'Useful for IDs, amounts, and phone columns.' },
  { label: 'Email format', scope: 'FIELD' as RuleScope, operator: 'is_email' as FieldRuleOperator, description: 'Check that email values look valid.' },
  { label: 'Cross-column match', scope: 'CROSS_FIELD' as RuleScope, operator: 'matches_column', description: 'Ensure two columns agree.' },
  { label: 'Duplicate check', scope: 'DUPLICATE' as RuleScope, operator: 'unique', description: 'Flag repeated values or repeated combinations.' },
];

export const RulesPanel = () => {
  const { state, updateRuleConfig } = usePipeline();
  const columns = state.columns;

  const [scope, setScope] = useState<RuleScope>('FIELD');
  const [ruleName, setRuleName] = useState('');
  const [severity, setSeverity] = useState<Severity>('WARNING');
  const [targetColumn, setTargetColumn] = useState('');
  const [fieldOperator, setFieldOperator] = useState<FieldRuleOperator>('required');
  const [fieldValue, setFieldValue] = useState('');
  const [compareColumn, setCompareColumn] = useState('');
  const [crossOperator, setCrossOperator] = useState<(typeof CROSS_OPERATORS)[number]['value']>('matches_column');
  const [duplicateColumns, setDuplicateColumns] = useState<string[]>([]);
  const [rowScopeText, setRowScopeText] = useState('');

  const generatedRuleId = useMemo(() => {
    const prefix = scope === 'FIELD' ? 'RULE' : scope === 'CROSS_FIELD' ? 'XREF' : 'DUP';
    const count = state.ruleConfig.filter((rule) => rule.ruleId.startsWith(prefix)).length + 1;
    return `${prefix}-${String(count).padStart(3, '0')}`;
  }, [scope, state.ruleConfig]);

  const affectedCount = useMemo(() => {
    const counts = new Map<string, number>();
    state.processedRecords.forEach((record) => {
      new Set(record.violations.map((violation) => violation.ruleId)).forEach((ruleId) => {
        counts.set(ruleId, (counts.get(ruleId) ?? 0) + 1);
      });
    });
    return counts;
  }, [state.processedRecords]);

  const selectedOperator = FIELD_OPERATORS.find((operator) => operator.value === fieldOperator);

  const canSaveRule = useMemo(() => {
    if (!ruleName.trim()) return false;
    if (scope !== 'DUPLICATE' && !targetColumn) return false;
    if (scope === 'FIELD' && doesFieldOperatorNeedValue(fieldOperator) && !fieldValue.trim()) return false;
    if (scope === 'CROSS_FIELD' && !compareColumn) return false;
    if (scope === 'DUPLICATE' && duplicateColumns.length === 0) return false;
    return true;
  }, [compareColumn, duplicateColumns.length, fieldOperator, fieldValue, ruleName, scope, targetColumn]);

  const applyTemplate = (template: (typeof QUICK_TEMPLATES)[number]) => {
    setScope(template.scope);
    setRuleName(template.label);
    if (columns.length) {
      setTargetColumn(columns[0].key);
      setCompareColumn(columns[Math.min(1, columns.length - 1)].key);
    }
    if (template.scope === 'FIELD') setFieldOperator(template.operator as FieldRuleOperator);
    if (template.scope === 'CROSS_FIELD') setCrossOperator(template.operator as (typeof CROSS_OPERATORS)[number]['value']);
    if (template.scope === 'DUPLICATE' && columns.length) setDuplicateColumns([columns[0].key]);
  };

  const toggleDuplicateColumn = (column: string) => {
    setDuplicateColumns((current) =>
      current.includes(column) ? current.filter((item) => item !== column) : [...current, column],
    );
  };

  const resetBuilder = () => {
    setScope('FIELD');
    setRuleName('');
    setSeverity('WARNING');
    setTargetColumn('');
    setFieldOperator('required');
    setFieldValue('');
    setCompareColumn('');
    setCrossOperator('matches_column');
    setDuplicateColumns([]);
    setRowScopeText('');
  };

  const saveRule = () => {
    if (!canSaveRule) return;

    const nextRule: RuleConfig = {
      ruleId: generatedRuleId,
      ruleName: ruleName.trim(),
      stage: scope === 'FIELD' ? 1 : scope === 'CROSS_FIELD' ? 2 : 3,
      enabled: true,
      severity,
      scope,
      targetColumn: scope === 'DUPLICATE' ? duplicateColumns[0] : targetColumn,
      operator:
        scope === 'FIELD'
          ? fieldOperator
          : scope === 'CROSS_FIELD'
            ? crossOperator
            : duplicateColumns.length > 1 ? 'composite_unique' : 'unique',
      value: scope === 'FIELD' && doesFieldOperatorNeedValue(fieldOperator) ? fieldValue.trim() : undefined,
      compareColumn: scope === 'CROSS_FIELD' ? compareColumn : undefined,
      columns: scope === 'DUPLICATE' ? duplicateColumns : undefined,
      applyToRows: rowScopeText.trim()
        ? Array.from(new Set(rowScopeText.split(',').map((item) => Number(item.trim())).filter((item) => Number.isInteger(item) && item > 0)))
        : undefined,
    };

    updateRuleConfig([...state.ruleConfig, nextRule]);
    resetBuilder();
  };

  const onToggle = (ruleId: string, enabled: boolean) => {
    updateRuleConfig(state.ruleConfig.map((rule) => (rule.ruleId === ruleId ? { ...rule, enabled } : rule)));
  };

  const onSeverity = (ruleId: string, nextSeverity: Severity) => {
    updateRuleConfig(state.ruleConfig.map((rule) => (rule.ruleId === ruleId ? { ...rule, severity: nextSeverity } : rule)));
  };

  const onDelete = (ruleId: string) => {
    updateRuleConfig(state.ruleConfig.filter((rule) => rule.ruleId !== ruleId));
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Quick start</p>
        <h2 className="mt-2 text-3xl font-semibold text-slate-950 dark:text-white">Create clear data cleaning rules</h2>
        <p className="mt-3 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
          Use the steps below: choose what to validate, set the rule, and preview the sentence before saving. The form is designed so non-technical users can set rules safely.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          {QUICK_TEMPLATES.map((template) => (
            <button
              key={template.label}
              className="rounded-2xl border border-slate-200 p-4 text-left transition hover:border-slate-900 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-slate-200 dark:hover:bg-slate-800"
              onClick={() => applyTemplate(template)}
              type="button"
            >
              <p className="font-semibold text-slate-950 dark:text-white">{template.label}</p>
              <p className="mt-2 text-sm text-slate-500">{template.description}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap gap-2">
            {(['FIELD', 'CROSS_FIELD', 'DUPLICATE'] as RuleScope[]).map((entry) => (
              <button
                key={entry}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  scope === entry
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200'
                }`}
                onClick={() => setScope(entry)}
                type="button"
              >
                {entry === 'FIELD' ? 'Step 1: Single column' : entry === 'CROSS_FIELD' ? 'Step 2: Compare columns' : 'Step 3: Duplicates'}
              </button>
            ))}
          </div>

          {!columns.length ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500 dark:border-slate-700">
              Upload a dataset first. Once the app reads the column names, the builder will become active.
            </div>
          ) : (
            <div className="mt-6 space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Rule title</span>
                  <input
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                    placeholder="Example: Email is required"
                    value={ruleName}
                    onChange={(event) => setRuleName(event.target.value)}
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Severity</span>
                  <select className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-800" value={severity} onChange={(event) => setSeverity(event.target.value as Severity)}>
                    <option value="CRITICAL">Critical</option>
                    <option value="ERROR">Error</option>
                    <option value="WARNING">Warning</option>
                    <option value="INFO">Info</option>
                  </select>
                </label>
              </div>

              {scope !== 'DUPLICATE' ? (
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Column to check</span>
                  <select className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-800" value={targetColumn} onChange={(event) => setTargetColumn(event.target.value)}>
                    <option value="">Choose a column</option>
                    {columns.map((column) => (
                      <option key={column.key} value={column.key}>{column.label}</option>
                    ))}
                  </select>
                </label>
              ) : null}

              {scope === 'FIELD' ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr]">
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Validation type</span>
                    <select className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-800" value={fieldOperator} onChange={(event) => setFieldOperator(event.target.value as FieldRuleOperator)}>
                      {FIELD_OPERATORS.map((operator) => (
                        <option key={operator.value} value={operator.value}>{operator.label}</option>
                      ))}
                    </select>
                    {selectedOperator ? <p className="text-xs text-slate-500">{selectedOperator.hint}</p> : null}
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Expected value (if needed)</span>
                    <input
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                      disabled={!doesFieldOperatorNeedValue(fieldOperator)}
                      placeholder={doesFieldOperatorNeedValue(fieldOperator) ? 'Type the value or pattern' : 'Not needed for this check'}
                      value={fieldValue}
                      onChange={(event) => setFieldValue(event.target.value)}
                    />
                  </label>
                </div>
              ) : null}

              {scope === 'CROSS_FIELD' ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Relationship</span>
                    <select className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-800" value={crossOperator} onChange={(event) => setCrossOperator(event.target.value as (typeof CROSS_OPERATORS)[number]['value'])}>
                      {CROSS_OPERATORS.map((operator) => (
                        <option key={operator.value} value={operator.value}>{operator.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Second column</span>
                    <select className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-800" value={compareColumn} onChange={(event) => setCompareColumn(event.target.value)}>
                      <option value="">Choose another column</option>
                      {columns.map((column) => (
                        <option key={column.key} value={column.key}>{column.label}</option>
                      ))}
                    </select>
                  </label>
                </div>
              ) : null}

              {scope === 'DUPLICATE' ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Columns used to detect duplicates</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {columns.map((column) => (
                      <label key={column.key} className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm dark:border-slate-700">
                        <input checked={duplicateColumns.includes(column.key)} onChange={() => toggleDuplicateColumn(column.key)} type="checkbox" />
                        <span>{column.label}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500">Choose one column for exact repeats or several columns for a combined duplicate key.</p>
                </div>
              ) : null}

              <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-4 text-sm text-slate-700 dark:border-sky-900/40 dark:bg-sky-900/20 dark:text-slate-200">
                <label className="mb-3 block space-y-2">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Optional row scope</span>
                  <input
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                    placeholder="Example: 1,2,18 (leave blank to apply to all rows)"
                    value={rowScopeText}
                    onChange={(event) => setRowScopeText(event.target.value)}
                  />
                </label>
                <p className="font-semibold">How to choose a rule type</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-600 dark:text-slate-300">
                  <li><strong>Single column:</strong> Check one field like email, phone, ID, or required values.</li>
                  <li><strong>Compare columns:</strong> Verify two fields agree (for example Start Date less than End Date).</li>
                  <li><strong>Duplicates:</strong> Catch repeated people, IDs, or repeated column combinations.</li>
                </ul>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Preview</p>
                <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
                  Rule ID: {generatedRuleId}
                </p>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                  {scope === 'FIELD' && targetColumn
                    ? `${getColumnLabel(columns, targetColumn)} ${selectedOperator?.label.toLowerCase() ?? 'will be checked'}${fieldValue ? ` "${fieldValue}"` : ''}.`
                    : null}
                  {scope === 'CROSS_FIELD' && targetColumn && compareColumn
                    ? `${getColumnLabel(columns, targetColumn)} ${crossOperator.replaceAll('_', ' ')} ${getColumnLabel(columns, compareColumn)}.`
                    : null}
                  {scope === 'DUPLICATE' && duplicateColumns.length
                    ? `Rows will be flagged when these columns repeat together: ${duplicateColumns.map((column) => getColumnLabel(columns, column)).join(', ')}.`
                    : null}
                  {!targetColumn && scope !== 'DUPLICATE' ? 'Choose a column to see a plain-language preview.' : null}
                  {scope === 'DUPLICATE' && !duplicateColumns.length ? 'Choose one or more columns to see the duplicate rule preview.' : null}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button className="rounded-full bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-sky-500 dark:hover:bg-sky-400" disabled={!canSaveRule} onClick={saveRule} type="button">
                  Save rule
                </button>
                <button className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800" onClick={resetBuilder} type="button">
                  Reset form
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Detected columns</p>
            <div className="mt-4 space-y-3">
              {columns.length ? columns.slice(0, 10).map((column) => (
                <div key={column.key} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950 dark:text-white">{column.label}</p>
                      <p className="mt-1 text-xs text-slate-500">{column.completeness}% filled • {column.uniqueValues} unique values</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-200">{column.key}</span>
                  </div>
                  {column.sampleValues.length ? <p className="mt-3 text-xs text-slate-500">Sample: {column.sampleValues.join(' • ')}</p> : null}
                </div>
              )) : <p className="text-sm text-slate-500">Columns will appear here after upload.</p>}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Saved rules</p>
          <h3 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">Current workspace rules</h3>
        </div>

        {state.ruleConfig.length ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {state.ruleConfig.map((rule) => (
              <RuleCard
                key={rule.ruleId}
                config={rule}
                affected={affectedCount.get(rule.ruleId) ?? 0}
                onToggle={onToggle}
                onSeverity={onSeverity}
                onDelete={onDelete}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900">
            No rules saved yet. Use a quick template or follow the guided steps above.
          </div>
        )}
      </section>
    </div>
  );
};
