import fs from 'node:fs';
import path from 'node:path';
import type { CheckResult } from '../types.js';
import { findFileCaseInsensitive, readTextSafe } from '../utils.js';

export function runDocumentationChecks(targetDir: string): CheckResult[] {
  const results: CheckResult[] = [];

  const readmePath = findFileCaseInsensitive(targetDir, [
    'README.md',
    'README.mdx',
    'README.txt',
    'README',
  ]);
  const readmeContent = readmePath ? readTextSafe(readmePath) : null;

  // 1. README exists & non-trivial (10 pts)
  if (!readmePath || !readmeContent || readmeContent.trim().length === 0) {
    results.push({
      id: 'readme-exists',
      category: 'documentation',
      name: 'README.md present',
      status: 'fail',
      points: 0,
      maxPoints: 10,
      message: 'No README.md found (or file is empty).',
      suggestion:
        'Add a clear README.md explaining what the project does and why it matters.',
    });
  } else if (readmeContent.trim().length < 200) {
    results.push({
      id: 'readme-exists',
      category: 'documentation',
      name: 'README.md present',
      status: 'warn',
      points: 5,
      maxPoints: 10,
      message: `README.md is very short (${readmeContent.trim().length} chars).`,
      suggestion:
        'Expand your README with a concise pitch, installation steps, and usage examples.',
    });
  } else {
    results.push({
      id: 'readme-exists',
      category: 'documentation',
      name: 'README.md present',
      status: 'pass',
      points: 10,
      maxPoints: 10,
      message: `Found ${path.basename(readmePath)} (${readmeContent.split(/\r?\n/).length} lines).`,
    });
  }

  // 2. README essential sections (10 pts)
  if (!readmeContent) {
    results.push({
      id: 'readme-sections',
      category: 'documentation',
      name: 'README key sections',
      status: 'fail',
      points: 0,
      maxPoints: 10,
      message: 'Cannot check sections without a README.',
      suggestion: 'Include Install, Usage, Features, and License sections.',
    });
  } else {
    const lower = readmeContent.toLowerCase();
    const hasInstall =
      /##+\s*(install|installation|getting started|quick start|setup)/i.test(
        readmeContent,
      ) || /\b(npm install|npx |pip install|cargo install|go install)\b/i.test(lower);
    const hasUsage =
      /##+\s*(usage|examples?|how to use|cli|api|commands?)/i.test(
        readmeContent,
      ) || /```/.test(readmeContent);
    const hasLicenseSection =
      /##+\s*licen[cs]e/i.test(readmeContent) || /\bmit\b|\bapache\b|\bgpl\b/i.test(lower);

    const matched = [hasInstall, hasUsage, hasLicenseSection].filter(Boolean).length;
    if (matched === 3) {
      results.push({
        id: 'readme-sections',
        category: 'documentation',
        name: 'README key sections',
        status: 'pass',
        points: 10,
        maxPoints: 10,
        message: 'Covers installation, usage/examples, and license.',
      });
    } else if (matched >= 1) {
      const missing: string[] = [];
      if (!hasInstall) missing.push('Installation');
      if (!hasUsage) missing.push('Usage/Examples');
      if (!hasLicenseSection) missing.push('License');
      results.push({
        id: 'readme-sections',
        category: 'documentation',
        name: 'README key sections',
        status: 'warn',
        points: matched === 2 ? 7 : 4,
        maxPoints: 10,
        message: `Missing README section(s): ${missing.join(', ')}.`,
        suggestion: `Add ${missing.join(' and ')} section(s) so newcomers can adopt your project quickly.`,
      });
    } else {
      results.push({
        id: 'readme-sections',
        category: 'documentation',
        name: 'README key sections',
        status: 'fail',
        points: 0,
        maxPoints: 10,
        message: 'README lacks Installation, Usage, and License sections.',
        suggestion: 'Structure your README with Install, Usage, and License headings.',
      });
    }
  }

  // 3. README visuals: badges, images/GIFs, or code blocks (5 pts)
  if (!readmeContent) {
    results.push({
      id: 'readme-visuals',
      category: 'documentation',
      name: 'Badges & visual polish',
      status: 'fail',
      points: 0,
      maxPoints: 5,
      message: 'No README to inspect for badges or visuals.',
    });
  } else {
    const hasBadge =
      /shields\.io|badgen\.net|github\.com\/.*\/actions\/workflows|!\[.*\]\(https?:\/\/.*badge/i.test(
        readmeContent,
      );
    const hasImageOrGif = /!\[[^\]]*\]\([^)]+\)|<img\s+/i.test(readmeContent);
    const hasCodeBlock = /```[\s\S]+?```/.test(readmeContent);

    if ((hasBadge || hasImageOrGif) && hasCodeBlock) {
      results.push({
        id: 'readme-visuals',
        category: 'documentation',
        name: 'Badges & visual polish',
        status: 'pass',
        points: 5,
        maxPoints: 5,
        message: 'Includes badges/visuals and formatted code examples.',
      });
    } else if (hasBadge || hasImageOrGif || hasCodeBlock) {
      results.push({
        id: 'readme-visuals',
        category: 'documentation',
        name: 'Badges & visual polish',
        status: 'warn',
        points: 3,
        maxPoints: 5,
        message: hasCodeBlock
          ? 'Has code blocks, but no badges or demo screenshots/GIFs.'
          : 'Has badges/images, but no code examples.',
        suggestion:
          'Add status badges (CI, license, npm) and a terminal screenshot/GIF to boost star conversion.',
      });
    } else {
      results.push({
        id: 'readme-visuals',
        category: 'documentation',
        name: 'Badges & visual polish',
        status: 'fail',
        points: 0,
        maxPoints: 5,
        message: 'No badges, screenshots, or code blocks found in README.',
        suggestion:
          'Add a demo screenshot/GIF, shields.io badges, and fenced code examples.',
      });
    }
  }

  // 4. Relative links in README resolve on disk (5 pts)
  if (!readmeContent) {
    results.push({
      id: 'readme-links',
      category: 'documentation',
      name: 'Valid relative README links',
      status: 'fail',
      points: 0,
      maxPoints: 5,
      message: 'No README to validate links.',
    });
  } else {
    const brokenLinks: string[] = [];
    const linkRegex = /!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
    let match: RegExpExecArray | null;
    while ((match = linkRegex.exec(readmeContent)) !== null) {
      const target = match[1];
      if (
        target.startsWith('http://') ||
        target.startsWith('https://') ||
        target.startsWith('#') ||
        target.startsWith('mailto:')
      ) {
        continue;
      }
      const cleanPath = target.split('#')[0].split('?')[0];
      if (!cleanPath) continue;
      const resolved = path.resolve(targetDir, cleanPath);
      if (!fs.existsSync(resolved)) {
        brokenLinks.push(target);
      }
    }

    if (brokenLinks.length === 0) {
      results.push({
        id: 'readme-links',
        category: 'documentation',
        name: 'Valid relative README links',
        status: 'pass',
        points: 5,
        maxPoints: 5,
        message: 'All relative links in README resolve cleanly.',
      });
    } else {
      results.push({
        id: 'readme-links',
        category: 'documentation',
        name: 'Valid relative README links',
        status: 'fail',
        points: 0,
        maxPoints: 5,
        message: `Found ${brokenLinks.length} broken relative link(s): ${brokenLinks.slice(0, 3).join(', ')}.`,
        suggestion: 'Fix or remove broken relative file links in README.md.',
      });
    }
  }

  // 5. CHANGELOG.md (5 pts)
  const changelogPath = findFileCaseInsensitive(targetDir, [
    'CHANGELOG.md',
    'CHANGES.md',
    'HISTORY.md',
    'RELEASES.md',
  ]);
  if (changelogPath) {
    results.push({
      id: 'changelog',
      category: 'documentation',
      name: 'CHANGELOG.md present',
      status: 'pass',
      points: 5,
      maxPoints: 5,
      message: `Found ${path.basename(changelogPath)}.`,
    });
  } else {
    results.push({
      id: 'changelog',
      category: 'documentation',
      name: 'CHANGELOG.md present',
      status: 'warn',
      points: 0,
      maxPoints: 5,
      message: 'No CHANGELOG.md found.',
      suggestion:
        'Add a CHANGELOG.md so users can track new features and breaking changes.',
    });
  }

  return results;
}
