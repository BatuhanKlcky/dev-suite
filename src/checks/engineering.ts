import fs from 'node:fs';
import path from 'node:path';
import type { CheckResult } from '../types.js';
import { detectProjectStack, readJsonSafe, readTextSafe } from '../utils.js';

export function runEngineeringChecks(targetDir: string): CheckResult[] {
  const results: CheckResult[] = [];
  const stack = detectProjectStack(targetDir);

  // 1. .gitignore (5 pts)
  const gitignorePath = path.join(targetDir, '.gitignore');
  const gitignoreText = readTextSafe(gitignorePath);
  if (gitignoreText && gitignoreText.trim().length > 0) {
    results.push({
      id: 'gitignore',
      category: 'engineering',
      name: '.gitignore configured',
      status: 'pass',
      points: 5,
      maxPoints: 5,
      message: `.gitignore present (${gitignoreText.split(/\r?\n/).filter((l) => l.trim() && !l.trim().startsWith('#')).length} rules).`,
    });
  } else {
    results.push({
      id: 'gitignore',
      category: 'engineering',
      name: '.gitignore configured',
      status: 'fail',
      points: 0,
      maxPoints: 5,
      message: 'No .gitignore found (or file is empty).',
      suggestion: `Run with --fix to generate a ${stack} .gitignore.`,
      fixable: true,
    });
  }

  // 2. GitHub Actions CI workflow (10 pts)
  const workflowsDir = path.join(targetDir, '.github', 'workflows');
  let workflowFiles: string[] = [];
  if (fs.existsSync(workflowsDir) && fs.statSync(workflowsDir).isDirectory()) {
    workflowFiles = fs
      .readdirSync(workflowsDir)
      .filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));
  }

  if (workflowFiles.length > 0) {
    results.push({
      id: 'ci-workflow',
      category: 'engineering',
      name: 'CI/CD workflow',
      status: 'pass',
      points: 10,
      maxPoints: 10,
      message: `Found ${workflowFiles.length} workflow(s): ${workflowFiles.slice(0, 3).join(', ')}.`,
    });
  } else {
    results.push({
      id: 'ci-workflow',
      category: 'engineering',
      name: 'CI/CD workflow',
      status: 'fail',
      points: 0,
      maxPoints: 10,
      message: 'No GitHub Actions workflow found in .github/workflows/.',
      suggestion: `Run with --fix to scaffold a ${stack} CI workflow.`,
      fixable: true,
    });
  }

  // 3. Automated tests present (10 pts)
  const hasTestDir = ['test', 'tests', '__tests__', 'spec'].some((d) =>
    fs.existsSync(path.join(targetDir, d)),
  );

  let hasTestScript = false;
  if (stack === 'node') {
    const pkg = readJsonSafe<{ scripts?: Record<string, string> }>(
      path.join(targetDir, 'package.json'),
    );
    const testCmd = pkg?.scripts?.test ?? '';
    hasTestScript =
      Boolean(testCmd) && !testCmd.includes('no test specified');
  } else if (stack === 'python') {
    hasTestScript =
      fs.existsSync(path.join(targetDir, 'pytest.ini')) ||
      (readTextSafe(path.join(targetDir, 'pyproject.toml'))?.includes('pytest') ??
        false);
  } else if (stack === 'go') {
    hasTestScript = fs
      .readdirSync(targetDir)
      .some((f) => f.endsWith('_test.go'));
  } else if (stack === 'rust') {
    hasTestScript = true; // Cargo has built-in test runner
  }

  if (hasTestDir && hasTestScript) {
    results.push({
      id: 'tests',
      category: 'engineering',
      name: 'Automated test suite',
      status: 'pass',
      points: 10,
      maxPoints: 10,
      message: 'Test directory and test runner script detected.',
    });
  } else if (hasTestDir || hasTestScript) {
    results.push({
      id: 'tests',
      category: 'engineering',
      name: 'Automated test suite',
      status: 'warn',
      points: 6,
      maxPoints: 10,
      message: hasTestDir
        ? 'Test directory found, but no test script configured in manifest.'
        : 'Test script configured, but no dedicated tests/ directory found.',
      suggestion:
        'Ensure tests can be run with a single standard command (e.g., npm test / pytest).',
    });
  } else {
    results.push({
      id: 'tests',
      category: 'engineering',
      name: 'Automated test suite',
      status: 'fail',
      points: 0,
      maxPoints: 10,
      message: 'No tests directory or test script found.',
      suggestion:
        'Add unit tests — contributors trust and star repositories with passing tests.',
    });
  }

  return results;
}
