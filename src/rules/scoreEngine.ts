import { RecordStatus, Violation } from '../types';

export const scoreFromViolations = (violations: Violation[]): number => {
  const penalty = violations.reduce((sum, violation) => {
    switch (violation.severity) {
      case 'CRITICAL':
        return sum + 30;
      case 'ERROR':
        return sum + 10;
      case 'WARNING':
        return sum + 5;
      case 'INFO':
        return sum + 1;
      default:
        return sum;
    }
  }, 0);

  return Math.max(0, 100 - penalty);
};

export const statusFromScore = (score: number): RecordStatus => {
  if (score >= 90) return 'CLEAN';
  if (score >= 70) return 'ACCEPTABLE';
  if (score >= 50) return 'REVIEW';
  return 'QUARANTINE';
};
