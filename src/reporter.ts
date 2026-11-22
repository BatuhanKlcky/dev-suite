import { createColorizer, type Colorizer } from './colors.js';
import type { AuditReport, CheckStatus, FixResult, Grade } from './types.js';

function renderBar(
  score: number,
  maxScore: number,
  width: number,
  c: Colorizer,
): string {
  const ratio = maxScore > 0 ? Math.min(1, Math.max(0, score / maxScore)) : 0;
  const filled = Math.round(ratio * width);
  const empty = width - filled;
  const colorFn =
    ratio >= 0.85 ? c.green : ratio >= 0.6 ? c.yellow : c.red;
  return `${colorFn('█'.repeat(filled))}${c.dim('░'.repeat(empty))}`;
}

function gradeBadge(grade: Grade, c: Colorizer): string {
  switch (grade) {
    case 'S':
    case 'A':
      return c.green(c.bold(` ${grade} `));
    case 'B':
      return c.cyan(c.bold(` ${grade} `));
    case 'C':
      return c.yellow(c.bold(` ${grade} `));
    case 'D':
      return c.red(c.bold(` ${grade} `));
  }
}

function statusIcon(status: CheckStatus, c: Colorizer): string {
  switch (status) {
    case 'pass':
      return c.green('✔');
    case 'warn':
      return c.yellow('▲');
    case 'fail':
      return c.red('✖');
  }
}

export function formatTerminalReport(
  report: AuditReport,
  useColor: boolean,
  fixResults?: FixResult[],
): string {
  const c = createColorizer(useColor);
  const lines: string[] = [];

  lines.push('');
  lines.push(
    `  ${c.bold(c.cyan('repo-pulse'))} ${c.dim('—')} Open-Source Readiness Audit`,
  );
  lines.push(`  ${c.dim('Target:')} ${report.targetDir}`);
  lines.push('');

  const bar = renderBar(report.score, report.maxScore, 28, c);
  lines.push(
    `  ${c.bold('Health Score:')} ${bar} ${c.bold(`${report.score}/${report.maxScore}`)}  Grade [${gradeBadge(report.grade, c)}]`,
  );
  lines.push('');

  for (const cat of report.categories) {
    const catBar = renderBar(cat.score, cat.maxScore, 12, c);
    lines.push(
      `  ${c.bold(cat.label.padEnd(24))} ${catBar} ${c.dim(`${cat.score}/${cat.maxScore}`)}`,
    );

    for (const check of cat.checks) {
      const icon = statusIcon(check.status, c);
      const pts = c.dim(`(${check.points}/${check.maxPoints})`);
      const fixTag =
        check.fixable && check.status !== 'pass'
          ? ` ${c.magenta('[--fix]')}`
          : '';
      lines.push(
        `    ${icon} ${check.name.padEnd(32)} ${pts} ${c.dim(check.message)}${fixTag}`,
      );
      if (check.suggestion && check.status !== 'pass') {
        lines.push(`      ${c.dim('↳ ' + check.suggestion)}`);
      }
    }
    lines.push('');
  }

  if (fixResults && fixResults.length > 0) {
    lines.push(`  ${c.bold(c.magenta('Auto-Fix Summary:'))}`);
    for (const r of fixResults) {
      const icon = r.created ? c.green('+') : c.yellow('~');
      lines.push(`    ${icon} ${r.file} ${c.dim(`(${r.reason})`)}`);
    }
    lines.push('');
  } else if (report.fixableCount > 0) {
    lines.push(
      `  ${c.cyan('Tip:')} Run ${c.bold('repo-pulse --fix')} to auto-generate ${report.fixableCount} missing file(s).`,
    );
    lines.push('');
  }

  const badgeColor =
    report.score >= 85 ? 'brightgreen' : report.score >= 70 ? 'blue' : 'orange';
  lines.push(
    `  ${c.dim('README Badge:')} ![Repo Pulse](https://img.shields.io/badge/repo--pulse-${report.score}%2F100%20(${report.grade})-${badgeColor})`,
  );
  lines.push('');

  return lines.join('\n');
}
