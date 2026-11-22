import fs from 'node:fs';
import path from 'node:path';
import type { CheckResult } from '../types.js';
import { existsAny, findFileCaseInsensitive, readTextSafe } from '../utils.js';

export function runCommunityChecks(targetDir: string): CheckResult[] {
  const results: CheckResult[] = [];

  // 1. LICENSE (10 pts)
  const licensePath = findFileCaseInsensitive(targetDir, [
    'LICENSE',
    'LICENSE.md',
    'LICENSE.txt',
    'LICENCE',
    'COPYING',
  ]);
  if (!licensePath) {
    results.push({
      id: 'license',
      category: 'community',
      name: 'Open-source LICENSE',
      status: 'fail',
      points: 0,
      maxPoints: 10,
      message: 'No LICENSE file found.',
      suggestion: 'Run with --fix to generate an MIT LICENSE file.',
      fixable: true,
    });
  } else {
    const content = readTextSafe(licensePath) ?? '';
    const isValid =
      content.trim().length > 50 &&
      /mit license|apache license|gnu general public|bsd|isc license|mozilla public/i.test(
        content,
      );
    if (isValid) {
      results.push({
        id: 'license',
        category: 'community',
        name: 'Open-source LICENSE',
        status: 'pass',
        points: 10,
        maxPoints: 10,
        message: `Found ${path.basename(licensePath)}.`,
      });
    } else {
      results.push({
        id: 'license',
        category: 'community',
        name: 'Open-source LICENSE',
        status: 'warn',
        points: 5,
        maxPoints: 10,
        message: `${path.basename(licensePath)} exists but does not match a standard OSI template.`,
        suggestion: 'Ensure your LICENSE contains the full standard license text.',
      });
    }
  }

  // 2. CONTRIBUTING.md (5 pts)
  const contributingPath =
    findFileCaseInsensitive(targetDir, ['CONTRIBUTING.md', 'CONTRIBUTING.txt']) ??
    existsAny(targetDir, ['.github/CONTRIBUTING.md', 'docs/CONTRIBUTING.md']);

  if (contributingPath) {
    results.push({
      id: 'contributing',
      category: 'community',
      name: 'CONTRIBUTING guide',
      status: 'pass',
      points: 5,
      maxPoints: 5,
      message: `Found ${path.relative(targetDir, contributingPath)}.`,
    });
  } else {
    results.push({
      id: 'contributing',
      category: 'community',
      name: 'CONTRIBUTING guide',
      status: 'fail',
      points: 0,
      maxPoints: 5,
      message: 'No CONTRIBUTING.md found.',
      suggestion: 'Run with --fix to scaffold a welcoming CONTRIBUTING.md.',
      fixable: true,
    });
  }

  // 3. Issue templates (5 pts)
  const issueTemplateDir = path.join(targetDir, '.github', 'ISSUE_TEMPLATE');
  const hasIssueDir =
    fs.existsSync(issueTemplateDir) &&
    fs.statSync(issueTemplateDir).isDirectory() &&
    fs.readdirSync(issueTemplateDir).length > 0;
  const issueTemplateFile = existsAny(targetDir, [
    '.github/ISSUE_TEMPLATE.md',
    'ISSUE_TEMPLATE.md',
  ]);

  if (hasIssueDir || issueTemplateFile) {
    results.push({
      id: 'issue-templates',
      category: 'community',
      name: 'Issue templates',
      status: 'pass',
      points: 5,
      maxPoints: 5,
      message: 'GitHub issue template(s) configured.',
    });
  } else {
    results.push({
      id: 'issue-templates',
      category: 'community',
      name: 'Issue templates',
      status: 'fail',
      points: 0,
      maxPoints: 5,
      message: 'No .github/ISSUE_TEMPLATE found.',
      suggestion: 'Run with --fix to add a structured bug report template.',
      fixable: true,
    });
  }

  // 4. PR template (5 pts)
  const prTemplateDir = path.join(
    targetDir,
    '.github',
    'PULL_REQUEST_TEMPLATE',
  );
  const hasPrDir =
    fs.existsSync(prTemplateDir) &&
    fs.statSync(prTemplateDir).isDirectory() &&
    fs.readdirSync(prTemplateDir).length > 0;
  const prTemplateFile = existsAny(targetDir, [
    '.github/PULL_REQUEST_TEMPLATE.md',
    '.github/pull_request_template.md',
    'PULL_REQUEST_TEMPLATE.md',
  ]);

  if (hasPrDir || prTemplateFile) {
    results.push({
      id: 'pr-template',
      category: 'community',
      name: 'Pull Request template',
      status: 'pass',
      points: 5,
      maxPoints: 5,
      message: 'Pull Request template configured.',
    });
  } else {
    results.push({
      id: 'pr-template',
      category: 'community',
      name: 'Pull Request template',
      status: 'fail',
      points: 0,
      maxPoints: 5,
      message: 'No PULL_REQUEST_TEMPLATE.md found.',
      suggestion: 'Run with --fix to add a clean PR checklist template.',
      fixable: true,
    });
  }

  return results;
}
