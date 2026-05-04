import { describe, expect, it } from 'vitest';
import { scoreFromViolations, statusFromScore } from './scoreEngine';
import type { Violation } from '../types';

const v = (severity: Violation['severity']): Violation => ({
  ruleId: 'T-001',
  ruleName: 'test',
  field: 'email',
  severity,
  originalValue: 'x',
  autoCorrect: 'NO',
  description: 'test',
  stage: 1,
});

describe('score engine', () => {
  it('applies weighted penalties and floor at zero', () => {
    const violations: Violation[] = [
      v('CRITICAL'),
      v('ERROR'),
      v('WARNING'),
      v('INFO'),
      v('CRITICAL'),
      v('CRITICAL'),
      v('CRITICAL'),
    ];
    expect(scoreFromViolations(violations)).toBe(0);
  });

  it('maps score bands to statuses', () => {
    expect(statusFromScore(96)).toBe('CLEAN');
    expect(statusFromScore(82)).toBe('ACCEPTABLE');
    expect(statusFromScore(55)).toBe('REVIEW');
    expect(statusFromScore(11)).toBe('QUARANTINE');
  });
});
