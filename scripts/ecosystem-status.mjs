#!/usr/bin/env node
/**
 * Cross-repository status checker for the Pi Ecosystem.
 * Scans all sibling pi* directories, reports git branches, working tree status, and package versions.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..', '..');

const PI_PROJECTS = [
  'picam',
  'picanva',
  'picompanion',
  'picontrol',
  'picontrol-mcp',
  'pigateway',
  'piencoder',
  'pigraphics',
  'pitally',
  'pimatrix',
  'piprogram',
  'pirundown',
  'pirundown-designer',
  'pisound',
  'pispace',
  'piswitch',
  'pitube',
  'pivoice',
  'piperception',
  'pidirector',
  'piagent',
  'piembed',
  'piui',
  'piecosystem',
  // Adjacent & Infrastructure
  'liturgos-auditor',
  'web-radio-relay',
  'fffleet',
  'live-captions-yt',
  'deploy-media'
];

console.log('\n======================================================');
console.log('           PI ECOSYSTEM REPOSITORY STATUS             ');
console.log('======================================================\n');
console.log(`Ecosystem Root: ${rootDir}\n`);

const rows = [];

for (const proj of PI_PROJECTS) {
  const projPath = join(rootDir, proj);
  if (!existsSync(projPath)) {
    rows.push({
      Project: proj,
      Version: '-',
      Branch: 'MISSING',
      Status: 'Folder not found',
      Type: '-'
    });
    continue;
  }

  // Version from package.json
  let version = '-';
  const pkgPath = join(projPath, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
      version = pkg.version || '0.0.0';
    } catch {
      version = 'ERR_JSON';
    }
  }

  // Git branch and dirty status
  let branch = '-';
  let status = 'Clean';
  try {
    branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: projPath, stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim();
    const gitStatus = execSync('git status --porcelain', { cwd: projPath, stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim();
    if (gitStatus.length > 0) {
      const lineCount = gitStatus.split('\n').filter(Boolean).length;
      status = `Dirty (${lineCount} uncommitted files)`;
    }
  } catch {
    branch = 'No git';
    status = '-';
  }

  rows.push({
    Project: proj,
    Version: version,
    Branch: branch,
    Status: status
  });
}

console.table(rows);
console.log(`Total projects checked: ${rows.length}\n`);
