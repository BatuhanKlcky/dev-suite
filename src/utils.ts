import fs from 'node:fs';
import path from 'node:path';

export function findFileCaseInsensitive(
  dir: string,
  candidates: string[],
): string | null {
  let entries: string[];
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return null;
  }

  const lowerMap = new Map<string, string>();
  for (const entry of entries) {
    lowerMap.set(entry.toLowerCase(), entry);
  }

  for (const candidate of candidates) {
    const match = lowerMap.get(candidate.toLowerCase());
    if (match) {
      const fullPath = path.join(dir, match);
      try {
        if (fs.statSync(fullPath).isFile()) {
          return fullPath;
        }
      } catch {
        // ignore unreadable entries
      }
    }
  }
  return null;
}

export function existsAny(dir: string, relativePaths: string[]): string | null {
  for (const rel of relativePaths) {
    const full = path.join(dir, rel);
    if (fs.existsSync(full)) {
      return full;
    }
  }
  return null;
}

export function readTextSafe(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

export function readJsonSafe<T = Record<string, unknown>>(
  filePath: string,
): T | null {
  const raw = readTextSafe(filePath);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export type ProjectStack = 'node' | 'python' | 'go' | 'rust' | 'generic';

export function detectProjectStack(dir: string): ProjectStack {
  if (fs.existsSync(path.join(dir, 'package.json'))) return 'node';
  if (
    fs.existsSync(path.join(dir, 'pyproject.toml')) ||
    fs.existsSync(path.join(dir, 'requirements.txt')) ||
    fs.existsSync(path.join(dir, 'setup.py'))
  ) {
    return 'python';
  }
  if (fs.existsSync(path.join(dir, 'go.mod'))) return 'go';
  if (fs.existsSync(path.join(dir, 'Cargo.toml'))) return 'rust';
  return 'generic';
}

const IGNORED_WALK_DIRS = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  '.next',
  '.nuxt',
  'coverage',
  '__pycache__',
  '.venv',
  'venv',
  'target',
]);

export function walkFiles(
  dir: string,
  maxDepth = 5,
  currentDepth = 0,
): Array<{ path: string; size: number }> {
  if (currentDepth > maxDepth) return [];
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const results: Array<{ path: string; size: number }> = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!IGNORED_WALK_DIRS.has(entry.name)) {
        results.push(...walkFiles(fullPath, maxDepth, currentDepth + 1));
      }
    } else if (entry.isFile()) {
      try {
        const stat = fs.statSync(fullPath);
        results.push({ path: fullPath, size: stat.size });
      } catch {
        // ignore
      }
    }
  }
  return results;
}
