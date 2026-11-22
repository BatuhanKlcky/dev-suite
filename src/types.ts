export type CheckStatus = 'pass' | 'warn' | 'fail';

export type CategoryId = 'documentation' | 'community' | 'engineering' | 'hygiene';

export interface CheckResult {
  id: string;
  category: CategoryId;
  name: string;
  status: CheckStatus;
  points: number;
  maxPoints: number;
  message: string;
  suggestion?: string;
  fixable?: boolean;
}

export interface CategorySummary {
  id: CategoryId;
  label: string;
  score: number;
  maxScore: number;
  checks: CheckResult[];
}

export type Grade = 'S' | 'A' | 'B' | 'C' | 'D';

export interface AuditReport {
  targetDir: string;
  repoName: string;
  score: number;
  maxScore: number;
  grade: Grade;
  categories: CategorySummary[];
  checks: CheckResult[];
  fixableCount: number;
  timestamp: string;
}

export interface CliOptions {
  targetDir: string;
  fix: boolean;
  dryRun: boolean;
  json: boolean;
  noColor: boolean;
  minScore?: number;
  help: boolean;
  version: boolean;
}

export interface FixResult {
  file: string;
  created: boolean;
  skipped: boolean;
  reason: string;
}
