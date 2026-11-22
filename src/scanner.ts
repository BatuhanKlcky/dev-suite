import path from 'node:path';
import { runCommunityChecks } from './checks/community.js';
import { runDocumentationChecks } from './checks/documentation.js';
import { runEngineeringChecks } from './checks/engineering.js';
import { runHygieneChecks } from './checks/hygiene.js';
import type {
  AuditReport,
  CategoryId,
  CategorySummary,
  CheckResult,
  Grade,
} from './types.js';

const CATEGORY_LABELS: Record<CategoryId, string> = {
  documentation: 'Documentation',
  community: 'Community & Governance',
  engineering: 'Engineering & CI',
  hygiene: 'Hygiene & Metadata',
};

const CATEGORY_ORDER: CategoryId[] = [
  'documentation',
  'community',
  'engineering',
  'hygiene',
];

export function computeGrade(score: number): Grade {
  if (score >= 95) return 'S';
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 50) return 'C';
  return 'D';
}

export function scanRepository(targetDir: string): AuditReport {
  const resolved = path.resolve(targetDir);
  const checks: CheckResult[] = [
    ...runDocumentationChecks(resolved),
    ...runCommunityChecks(resolved),
    ...runEngineeringChecks(resolved),
    ...runHygieneChecks(resolved),
  ];

  const categories: CategorySummary[] = CATEGORY_ORDER.map((id) => {
    const catChecks = checks.filter((c) => c.category === id);
    const score = catChecks.reduce((sum, c) => sum + c.points, 0);
    const maxScore = catChecks.reduce((sum, c) => sum + c.maxPoints, 0);
    return {
      id,
      label: CATEGORY_LABELS[id],
      score,
      maxScore,
      checks: catChecks,
    };
  });

  const score = checks.reduce((sum, c) => sum + c.points, 0);
  const maxScore = checks.reduce((sum, c) => sum + c.maxPoints, 0);
  const fixableCount = checks.filter(
    (c) => c.fixable && c.status !== 'pass',
  ).length;

  return {
    targetDir: resolved,
    repoName: path.basename(resolved),
    score,
    maxScore,
    grade: computeGrade(score),
    categories,
    checks,
    fixableCount,
    timestamp: new Date().toISOString(),
  };
}
