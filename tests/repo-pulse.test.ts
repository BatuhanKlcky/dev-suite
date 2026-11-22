import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { applyFixes } from '../src/fixer.js';
import { scanRepository } from '../src/scanner.js';

function makeTempDir(prefix = 'repo-pulse-test-'): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

describe('repo-pulse scanner & fixer', () => {
  it('scores an empty directory low and identifies fixable items', () => {
    const dir = makeTempDir();
    try {
      const report = scanRepository(dir);
      assert.equal(report.maxScore, 100);
      assert.ok(report.score < 30, `Expected low score, got ${report.score}`);
      assert.equal(report.grade, 'D');
      assert.ok(report.fixableCount >= 5);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('respects dry-run without writing files', () => {
    const dir = makeTempDir();
    try {
      const report = scanRepository(dir);
      const fixes = applyFixes(report, true);
      assert.ok(fixes.length >= 5);
      assert.ok(fixes.every((f) => !f.created && !f.skipped));
      assert.equal(fs.existsSync(path.join(dir, 'LICENSE')), false);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('creates missing essentials with --fix and never overwrites existing files', () => {
    const dir = makeTempDir();
    try {
      fs.writeFileSync(
        path.join(dir, 'package.json'),
        JSON.stringify({
          name: 'demo-pkg',
          description: 'Demo package',
          keywords: ['demo'],
          license: 'MIT',
          scripts: { test: 'node --test' },
        }),
      );
      fs.writeFileSync(path.join(dir, 'LICENSE'), 'Custom License Text Kept Safe');

      const before = scanRepository(dir);
      const fixes = applyFixes(before, false);
      assert.ok(fixes.some((f) => f.file === 'CONTRIBUTING.md' && f.created));
      assert.equal(
        fs.readFileSync(path.join(dir, 'LICENSE'), 'utf8'),
        'Custom License Text Kept Safe',
      );

      const after = scanRepository(dir);
      assert.ok(after.score > before.score);
      assert.equal(
        fs.existsSync(path.join(dir, '.github', 'workflows', 'ci.yml')),
        true,
      );
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('detects broken relative links in README and unignored .env files', () => {
    const dir = makeTempDir();
    try {
      fs.writeFileSync(
        path.join(dir, 'README.md'),
        '# Demo\n\nSee [missing](docs/MISSING.md) for details.\n',
      );
      fs.writeFileSync(path.join(dir, '.env'), 'SECRET=123\n');

      const report = scanRepository(dir);
      const linkCheck = report.checks.find((c) => c.id === 'readme-links');
      const envCheck = report.checks.find((c) => c.id === 'no-env-leak');

      assert.equal(linkCheck?.status, 'fail');
      assert.equal(envCheck?.status, 'fail');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('outputs valid JSON and enforces --min-score via CLI', () => {
    const dir = makeTempDir();
    const cliPath = path.resolve(process.cwd(), 'dist', 'src', 'cli.js');
    try {
      const stdout = execFileSync(process.execPath, [cliPath, dir, '--json'], {
        encoding: 'utf8',
      });
      const parsed = JSON.parse(stdout) as { score: number; maxScore: number };
      assert.equal(parsed.maxScore, 100);
      assert.equal(typeof parsed.score, 'number');

      assert.throws(() => {
        execFileSync(
          process.execPath,
          [cliPath, dir, '--min-score', '95', '--no-color'],
          { encoding: 'utf8' },
        );
      });
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
