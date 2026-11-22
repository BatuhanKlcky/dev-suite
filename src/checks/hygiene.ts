import fs from 'node:fs';
import path from 'node:path';
import type { CheckResult } from '../types.js';
import {
  detectProjectStack,
  readJsonSafe,
  readTextSafe,
  walkFiles,
} from '../utils.js';

const FIVE_MB = 5 * 1024 * 1024;

export function runHygieneChecks(targetDir: string): CheckResult[] {
  const results: CheckResult[] = [];
  const stack = detectProjectStack(targetDir);

  // 1. No exposed .env without .gitignore protection (5 pts)
  const envExists = fs.existsSync(path.join(targetDir, '.env'));
  const gitignoreText = readTextSafe(path.join(targetDir, '.gitignore')) ?? '';
  const envIgnored = /^\s*\.env(\s|$|\*)/m.test(gitignoreText);

  if (envExists && !envIgnored) {
    results.push({
      id: 'no-env-leak',
      category: 'hygiene',
      name: 'Secret & .env safety',
      status: 'fail',
      points: 0,
      maxPoints: 5,
      message: '.env file exists and is NOT listed in .gitignore!',
      suggestion:
        'Add .env to .gitignore immediately and provide a .env.example template instead.',
    });
  } else {
    results.push({
      id: 'no-env-leak',
      category: 'hygiene',
      name: 'Secret & .env safety',
      status: 'pass',
      points: 5,
      maxPoints: 5,
      message: envExists
        ? '.env exists and is properly ignored by .gitignore.'
        : 'No unignored .env files detected.',
    });
  }

  // 2. No oversized files > 5 MB (5 pts)
  const files = walkFiles(targetDir);
  const largeFiles = files.filter((f) => f.size > FIVE_MB);
  if (largeFiles.length === 0) {
    results.push({
      id: 'no-large-files',
      category: 'hygiene',
      name: 'Repository size hygiene',
      status: 'pass',
      points: 5,
      maxPoints: 5,
      message: `Scanned ${files.length} file(s); none exceed 5 MB.`,
    });
  } else {
    const names = largeFiles
      .slice(0, 3)
      .map((f) => path.relative(targetDir, f.path));
    results.push({
      id: 'no-large-files',
      category: 'hygiene',
      name: 'Repository size hygiene',
      status: 'warn',
      points: 2,
      maxPoints: 5,
      message: `Found ${largeFiles.length} large file(s) >5 MB: ${names.join(', ')}.`,
      suggestion:
        'Remove large binaries from git or track them with Git LFS to keep clones fast.',
    });
  }

  // 3. Manifest metadata for discoverability (5 pts)
  if (stack === 'node') {
    const pkg = readJsonSafe<{
      description?: string;
      keywords?: string[];
      license?: string;
      repository?: unknown;
    }>(path.join(targetDir, 'package.json'));
    const hasDesc = Boolean(pkg?.description && pkg.description.trim().length > 0);
    const hasKeywords = Boolean(pkg?.keywords && pkg.keywords.length > 0);
    const hasLicense = Boolean(pkg?.license);
    const count = [hasDesc, hasKeywords, hasLicense].filter(Boolean).length;

    if (count === 3) {
      results.push({
        id: 'manifest-metadata',
        category: 'hygiene',
        name: 'Package metadata & discoverability',
        status: 'pass',
        points: 5,
        maxPoints: 5,
        message: 'package.json includes description, keywords, and license.',
      });
    } else {
      results.push({
        id: 'manifest-metadata',
        category: 'hygiene',
        name: 'Package metadata & discoverability',
        status: 'warn',
        points: count >= 1 ? 3 : 0,
        maxPoints: 5,
        message: 'package.json is missing description, keywords, or license.',
        suggestion:
          'Add description, keywords, and license to package.json for better search discoverability.',
      });
    }
  } else if (stack === 'python') {
    const pyproject = readTextSafe(path.join(targetDir, 'pyproject.toml')) ?? '';
    const hasMeta =
      pyproject.includes('description') && pyproject.includes('version');
    results.push({
      id: 'manifest-metadata',
      category: 'hygiene',
      name: 'Package metadata & discoverability',
      status: hasMeta ? 'pass' : 'warn',
      points: hasMeta ? 5 : 2,
      maxPoints: 5,
      message: hasMeta
        ? 'pyproject.toml contains package metadata.'
        : 'Add complete metadata in pyproject.toml (name, version, description).',
    });
  } else {
    results.push({
      id: 'manifest-metadata',
      category: 'hygiene',
      name: 'Package metadata & discoverability',
      status: 'pass',
      points: 5,
      maxPoints: 5,
      message: `Detected ${stack} project structure.`,
    });
  }

  return results;
}
