#!/usr/bin/env node
/**
 * Synchronizes and inspects all repositories across the Pi Ecosystem.
 *
 * Usage:
 *   node scripts/fleet-sync.mjs                    status and fetch report
 *   node scripts/fleet-sync.mjs --pull             fetch and pull clean repos behind origin
 *   node scripts/fleet-sync.mjs --pull --stash     pull even if dirty (stash, pull, pop)
 *   node scripts/fleet-sync.mjs --clone            clone any missing ecosystem repos
 *   node scripts/fleet-sync.mjs --repos picam,pisound
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { defaultRoot } from './lib/paths.mjs';

const OWNER = 'jsilvanus';

export const CANONICAL_REPOS = [
  // Layer 1: Southbound Hardware Interfacing
  'picam', 'piswitch', 'pisound', 'pitally', 'pipoe', 'piencoder', 'pimatrix',
  // Layer 2: Media Pipeline & Real-Time Composition
  'piprogram', 'pigraphics', 'pivoice', 'piperception', 'picomposer',
  // Layer 3: Orchestration, State & Workflow
  'pigateway', 'pirundown', 'pispace', 'piembed',
  // Storage & Edge Delivery (Layer 4)
  'pistorage', 'pitube', 'pinotify',
  // +1 Control, Agentic & UI Planes
  'picontrol', 'picontrol-mcp', 'piagent', 'pidirector', 'piui',
  'picomposer-mcp', 'pirundown-designer', 'pisim',
  // Coordination
  'piecosystem',
  // Seam & Physical Venue
  'keskuskirkko', 'canva-pieco-app', 'virtual-screen-streamer',
  'liturgos-auditor', 'web-radio-relay', 'fffleet', 'notify-core', 'saarnavideo'
];

function git(dir, args) {
  try {
    return execFileSync('git', ['-C', dir, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch (err) {
    return null;
  }
}

function parseArgs(argv) {
  const opts = {
    pull: false,
    stash: false,
    clone: false,
    fetch: true,
    root: defaultRoot(),
    repos: CANONICAL_REPOS,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--pull') opts.pull = true;
    else if (a === '--stash') opts.stash = true;
    else if (a === '--clone') opts.clone = true;
    else if (a === '--no-fetch') opts.fetch = false;
    else if (a === '--root') opts.root = resolve(argv[++i]);
    else if (a === '--repos') opts.repos = argv[++i].split(',').map(s => s.trim()).filter(Boolean);
    else if (a === '-h' || a === '--help') {
      console.log('Usage: node scripts/fleet-sync.mjs [--pull] [--stash] [--clone] [--no-fetch] [--root DIR] [--repos a,b]');
      process.exit(0);
    }
  }
  return opts;
}

export function syncRepo(repo, opts) {
  const dir = join(opts.root, repo);
  const exists = existsSync(dir);

  if (!exists) {
    if (opts.clone) {
      try {
        execFileSync('gh', ['repo', 'clone', `${OWNER}/${repo}`, dir], { stdio: 'inherit' });
        return { repo, status: 'CLONED', detail: 'fresh clone' };
      } catch (e) {
        return { repo, status: 'ERROR', detail: `clone failed: ${e.message}` };
      }
    }
    return { repo, status: 'NOT CLONED', detail: 'run with --clone to clone' };
  }

  const isRepo = git(dir, ['rev-parse', '--is-inside-work-tree']) === 'true';
  if (!isRepo) return { repo, status: 'NOT GIT', detail: 'directory is not a git repository' };

  const branch = git(dir, ['branch', '--show-current']) || 'detached';
  const dirtyCount = (git(dir, ['status', '--porcelain']) || '').split('\n').filter(Boolean).length;
  const isDirty = dirtyCount > 0;

  if (opts.fetch) {
    git(dir, ['fetch', 'origin']);
  }

  const counts = git(dir, ['rev-list', '--left-right', '--count', `${branch}...origin/${branch}`]);
  let ahead = 0;
  let behind = 0;
  if (counts) {
    const [a, b] = counts.split(/\s+/).map(Number);
    ahead = a || 0;
    behind = b || 0;
  }

  let action = 'OK';
  if (behind > 0) {
    if (!opts.pull) {
      action = `BEHIND (${behind} commits)`;
    } else if (!isDirty) {
      const pullRes = git(dir, ['pull', '--ff-only']);
      action = pullRes !== null ? `PULLED (${behind} commits)` : 'PULL FAILED';
    } else if (opts.stash) {
      git(dir, ['stash']);
      const pullRes = git(dir, ['pull', '--ff-only']);
      git(dir, ['stash', 'pop']);
      action = pullRes !== null ? `PULLED (${behind} commits, stashed)` : 'PULL FAILED (stash restored)';
    } else {
      action = `DIRTY (${dirtyCount} files), BEHIND (${behind}) - skipped`;
    }
  } else if (ahead > 0) {
    action = `AHEAD (${ahead} commits)`;
  } else if (isDirty) {
    action = `DIRTY (${dirtyCount} uncommitted files)`;
  }

  return {
    repo,
    branch,
    dirty: isDirty ? `${dirtyCount} files` : 'clean',
    ahead,
    behind,
    action,
  };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  console.log('='.repeat(75));
  console.log(`  PI ECOSYSTEM FLEET SYNC  |  Root: ${opts.root}`);
  console.log(`  Options: fetch=${opts.fetch}, pull=${opts.pull}, stash=${opts.stash}, clone=${opts.clone}`);
  console.log('='.repeat(75));

  const results = [];
  for (const repo of opts.repos) {
    results.push(syncRepo(repo, opts));
  }

  console.log('');
  console.table(results.map(r => ({
    Repository: r.repo,
    Branch: r.branch || '-',
    Status: r.dirty || '-',
    Behind: r.behind ?? '-',
    Action: r.action || r.detail || r.status,
  })));

  const pulled = results.filter(r => r.action && r.action.startsWith('PULLED')).length;
  const behind = results.filter(r => r.action && r.action.startsWith('BEHIND')).length;
  const dirty = results.filter(r => r.dirty && r.dirty !== 'clean').length;
  const missing = results.filter(r => r.status === 'NOT CLONED').length;

  console.log(`\nSummary: ${results.length} repos checked. ${pulled} pulled, ${behind} behind, ${dirty} dirty, ${missing} missing.`);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  main();
}
