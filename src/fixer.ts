import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type { AuditReport, FixResult } from './types.js';
import { detectProjectStack, type ProjectStack } from './utils.js';

function getGitAuthor(): string {
  try {
    const name = execSync('git config user.name', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (name) return name;
  } catch {
    // ignore if git is unavailable
  }
  return 'Open Source Contributors';
}

function mitLicenseTemplate(author: string): string {
  const year = new Date().getFullYear();
  return `MIT License

Copyright (c) ${year} ${author}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;
}

function contributingTemplate(repoName: string): string {
  return `# Contributing to ${repoName}

Thank you for your interest in contributing! Every bug report, feature request, documentation improvement, and pull request helps make this project better.

## Getting Started

1. Fork the repository and clone it locally.
2. Create a feature branch from \`main\`:
   \`\`\`bash
   git checkout -b feat/your-feature-name
   \`\`\`
3. Make your changes and add tests where appropriate.
4. Run the test suite to verify everything passes.
5. Commit your changes with a clear message and open a Pull Request.

## Reporting Issues

- Check existing issues before opening a new one.
- Include steps to reproduce, expected behavior, and environment details.
`;
}

function issueTemplate(): string {
  return `---
name: Bug report
about: Create a report to help us improve
title: '[BUG] '
labels: bug
---

## Describe the bug
A clear and concise description of what the bug is.

## To Reproduce
Steps to reproduce the behavior:
1. Run '...'
2. See error

## Expected behavior
What you expected to happen.

## Environment
- OS: [e.g. macOS, Linux, Windows]
- Runtime/Version: [e.g. Node 22, Python 3.12]
`;
}

function prTemplate(): string {
  return `## Summary
Briefly describe what this PR changes and why.

## Checklist
- [ ] Tests added or updated
- [ ] Documentation updated (if applicable)
- [ ] All checks pass locally
`;
}

function gitignoreTemplate(stack: ProjectStack): string {
  const common = `.env
.env.local
.DS_Store
Thumbs.db
`;
  switch (stack) {
    case 'node':
      return `${common}node_modules/
dist/
coverage/
*.log
`;
    case 'python':
      return `${common}__pycache__/
*.py[cod]
.venv/
venv/
dist/
.pytest_cache/
`;
    case 'go':
      return `${common}bin/
*.exe
*.test
coverage.out
`;
    case 'rust':
      return `${common}target/
`;
    default:
      return `${common}build/
dist/
`;
  }
}

function ciWorkflowTemplate(stack: ProjectStack): string {
  if (stack === 'python') {
    return `name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          if [ -f requirements.txt ]; then pip install -r requirements.txt; fi
      - name: Run tests
        run: pytest
`;
  }

  if (stack === 'go') {
    return `name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: '1.22'
      - name: Run tests
        run: go test ./...
`;
  }

  if (stack === 'rust') {
    return `name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
      - name: Run tests
        run: cargo test --all-features
`;
  }

  return `name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm test
`;
}

export function applyFixes(
  report: AuditReport,
  dryRun = false,
): FixResult[] {
  const targetDir = report.targetDir;
  const stack = detectProjectStack(targetDir);
  const fixableIds = new Set(
    report.checks
      .filter((c) => c.fixable && c.status !== 'pass')
      .map((c) => c.id),
  );

  const planned: Array<{ id: string; relPath: string; content: () => string }> =
    [
      {
        id: 'license',
        relPath: 'LICENSE',
        content: () => mitLicenseTemplate(getGitAuthor()),
      },
      {
        id: 'contributing',
        relPath: 'CONTRIBUTING.md',
        content: () => contributingTemplate(report.repoName),
      },
      {
        id: 'issue-templates',
        relPath: path.join('.github', 'ISSUE_TEMPLATE', 'bug_report.md'),
        content: () => issueTemplate(),
      },
      {
        id: 'pr-template',
        relPath: path.join('.github', 'PULL_REQUEST_TEMPLATE.md'),
        content: () => prTemplate(),
      },
      {
        id: 'gitignore',
        relPath: '.gitignore',
        content: () => gitignoreTemplate(stack),
      },
      {
        id: 'ci-workflow',
        relPath: path.join('.github', 'workflows', 'ci.yml'),
        content: () => ciWorkflowTemplate(stack),
      },
    ];

  const results: FixResult[] = [];
  for (const item of planned) {
    if (!fixableIds.has(item.id)) continue;
    const fullPath = path.join(targetDir, item.relPath);
    if (fs.existsSync(fullPath)) {
      results.push({
        file: item.relPath,
        created: false,
        skipped: true,
        reason: 'File already exists',
      });
      continue;
    }

    if (!dryRun) {
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, item.content(), 'utf8');
    }

    results.push({
      file: item.relPath,
      created: !dryRun,
      skipped: false,
      reason: dryRun ? 'Would create (dry-run)' : 'Created',
    });
  }

  return results;
}
