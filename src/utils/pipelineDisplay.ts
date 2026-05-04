import { ColumnProfile, FieldRuleOperator, ProcessedRecord, RawRecord } from '../types';

const titleCase = (value: string) => value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

export const getColumnLabel = (columns: ColumnProfile[], key: string) =>
  columns.find((column) => column.key === key)?.label ?? titleCase(key);

export const getRecordSummary = (record: ProcessedRecord | RawRecord, columns: ColumnProfile[]) => {
  const bestTextColumns = ['name', 'full_name', 'first_name', 'surname', 'last_name', 'email', 'phone'];
  const picked = bestTextColumns
    .map((key) => record.values[key])
    .filter((value): value is string => Boolean(value && value.trim()));

  if (picked.length) return picked.slice(0, 2).join(' • ');

  const firstFilled = Object.entries(record.values).find(([, value]) => value.trim());
  return firstFilled ? `${getColumnLabel(columns, firstFilled[0])}: ${firstFilled[1]}` : 'No filled values';
};

export const doesFieldOperatorNeedValue = (operator: FieldRuleOperator) =>
  !['required', 'is_numeric', 'is_email', 'is_lowercase', 'is_uppercase', 'no_symbols', 'letters_spaces_only'].includes(operator);
