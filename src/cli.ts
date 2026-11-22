#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { applyFixes } from './fixer.js';
import { formatTerminalReport } from './reporter.js';
import { scanRepository } from './scanner.js';
import type { CliOptions } from './types.js';

const VERSION = '1.0.0';

function printHelp(): void {
  console.log(`
repo-pulse v${VERSION}
Audit your repository's open-source readiness with a 0-100 health score.

USAGE:
  repo-pulse [path] [options]

OPTIONS:
  --fix             Auto-generate missing open-source essentials (LICENSE, CI, templates)
  --dry-run         Preview files that --fix would create without writing to disk
  --json            Output machine-readable JSON report
  --min-score <n>   Exit with code 1 if score is below <n> (useful in CI)
  --no-color        Disable ANSI colors
  -h, --help        Show this help message
  -v, --version     Show version number

EXAMPLES:
  npx repo-pulse
  npx repo-pulse ./my-project --fix
  npx repo-pulse --min-score 80 --json
`);
}

export function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    targetDir: process.cwd(),
    fix: false,
    dryRun: false,
    json: false,
    noColor: Boolean(process.env.NO_COLOR),
    help: false,
    version: false,
  };

  let positionalSet = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '-h' || arg === '--help') {
      opts.help = true;
    } else if (arg === '-v' || arg === '--version') {
      opts.version = true;
    } else if (arg === '--fix') {
      opts.fix = true;
    } else if (arg === '--dry-run') {
      opts.dryRun = true;
    } else if (arg === '--json') {
      opts.json = true;
    } else if (arg === '--no-color') {
      opts.noColor = true;
    } else if (arg === '--min-score') {
      const next = argv[i + 1];
      const parsed = Number(next);
      if (!next || Number.isNaN(parsed) || parsed < 0 || parsed > 100) {
        throw new Error('--min-score requires a number between 0 and 100');
      }
      opts.minScore = parsed;
      i++;
    } else if (arg.startsWith('-')) {
      throw new Error(`Unknown option: ${arg}`);
    } else if (!positionalSet) {
      opts.targetDir = path.resolve(arg);
      positionalSet = true;
    } else {
      throw new Error(`Unexpected argument: ${arg}`);
    }
  }

  return opts;
}

function main(): void {
  let opts: CliOptions;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`Error: ${(err as Error).message}`);
    process.exit(1);
  }

  if (opts.help) {
    printHelp();
    process.exit(0);
  }

  if (opts.version) {
    console.log(VERSION);
    process.exit(0);
  }

  if (
    !fs.existsSync(opts.targetDir) ||
    !fs.statSync(opts.targetDir).isDirectory()
  ) {
    console.error(`Error: Directory does not exist: ${opts.targetDir}`);
    process.exit(1);
  }

  let report = scanRepository(opts.targetDir);
  let fixResults = undefined;

  if (opts.fix || opts.dryRun) {
    fixResults = applyFixes(report, opts.dryRun);
    if (opts.fix && !opts.dryRun) {
      report = scanRepository(opts.targetDir);
    }
  }

  if (opts.json) {
    console.log(JSON.stringify({ ...report, fixes: fixResults }, null, 2));
  } else {
    const useColor = !opts.noColor && Boolean(process.stdout.isTTY);
    console.log(formatTerminalReport(report, useColor, fixResults));
  }

  if (opts.minScore !== undefined && report.score < opts.minScore) {
    process.exit(1);
  }
}

main();
