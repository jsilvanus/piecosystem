#!/usr/bin/env node
// Merge the newest open PR of each Pi repo when its CI is green, one repo at a time.
//
// Needs the GitHub CLI (`gh`), logged in with rights to merge.
//
//   node scripts/merge-green-prs.mjs                 dry run: report only, merge nothing
//   node scripts/merge-green-prs.mjs --merge         merge the green ones (merge commit)
//   node scripts/merge-green-prs.mjs --merge --method squash
//   node scripts/merge-green-prs.mjs --merge --allow-no-checks   also merge PRs that report no checks
//   node scripts/merge-green-prs.mjs --repos pimatrix,picam --branch claude/project-thread-htfrjs
//
// A PR is merged only when it is open, not a draft, mergeable (no conflicts), has at
// least one check (unless --allow-no-checks), and every check has finished successfully (skipped/neutral count
// as fine). Anything else is reported and left alone. The script never forces anything.

import { execFileSync } from 'node:child_process';

const OWNER = 'jsilvanus';
const DEFAULT_REPOS = [
  'pigateway', 'pimatrix', 'picam', 'piswitch', 'piencoder', 'pisound', 'pivoice', 'pitally',
  'pipoe', 'piprogram', 'pigraphics', 'piperception', 'pispace', 'piembed', 'piagent',
  'pirundown', 'pidirector', 'picomposer', 'pitube', 'picontrol-mcp', 'picomposer-mcp',
  'pirundown-designer', 'picontrol', 'piui', 'canva-pieco-app', 'piecosystem',
  'pistorage', 'pisim', 'pinotify', 'notify-core',
];

function parseArgs(argv) {
  const opts = { merge: false, method: 'merge', repos: DEFAULT_REPOS, branch: null, owner: OWNER, allowNoChecks: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--merge') opts.merge = true;
    else if (a === '--allow-no-checks') opts.allowNoChecks = true;
    else if (a === '--method') opts.method = argv[++i];
    else if (a === '--repos') opts.repos = argv[++i].split(',').map(s => s.trim()).filter(Boolean);
    else if (a === '--branch') opts.branch = argv[++i];
    else if (a === '--owner') opts.owner = argv[++i];
    else if (a === '-h' || a === '--help') { console.log('See the header of this file.'); process.exit(0); }
    else { console.error(`Unknown argument: ${a}`); process.exit(2); }
  }
  if (!['merge', 'squash', 'rebase'].includes(opts.method)) {
    console.error('--method must be merge, squash or rebase'); process.exit(2);
  }
  return opts;
}

function gh(args) {
  return execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function ghJson(args) {
  return JSON.parse(gh(args));
}

const OK = new Set(['SUCCESS', 'SKIPPED', 'NEUTRAL']);

function checkVerdict(rollup, allowNoChecks = false) {
  if (!rollup || rollup.length === 0) {
    return allowNoChecks ? { ok: true, why: 'no checks reported, allowed' } : { ok: false, why: 'no checks reported' };
  }
  const bad = [];
  for (const c of rollup) {
    const name = c.name ?? c.context ?? 'check';
    if (c.__typename === 'StatusContext') {
      if (c.state !== 'SUCCESS') bad.push(`${name}: ${c.state}`);
    } else if (c.status !== 'COMPLETED') {
      bad.push(`${name}: ${c.status}`);
    } else if (!OK.has(c.conclusion)) {
      bad.push(`${name}: ${c.conclusion}`);
    }
  }
  return bad.length ? { ok: false, why: bad.join(', ') } : { ok: true, why: `${rollup.length} checks green` };
}

function processRepo(opts, repo) {
  const slug = `${opts.owner}/${repo}`;
  const listArgs = ['pr', 'list', '--repo', slug, '--state', 'open', '--limit', '30',
    '--json', 'number,headRefName,createdAt'];
  let prs = ghJson(listArgs);
  if (opts.branch) prs = prs.filter(p => p.headRefName === opts.branch);
  if (prs.length === 0) return { repo, result: 'no open PR' };
  prs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const number = prs[0].number;

  const pr = ghJson(['pr', 'view', String(number), '--repo', slug,
    '--json', 'number,title,isDraft,mergeable,mergeStateStatus,headRefOid,statusCheckRollup']);
  const label = `#${pr.number} ${pr.title}`;
  if (pr.isDraft) return { repo, result: `skip ${label}: draft` };
  if (pr.mergeable === 'CONFLICTING') return { repo, result: `skip ${label}: merge conflicts` };

  const verdict = checkVerdict(pr.statusCheckRollup, opts.allowNoChecks);
  if (!verdict.ok) return { repo, result: `skip ${label}: ${verdict.why}` };
  if (!opts.merge) return { repo, result: `green ${label} (${verdict.why}), would merge (dry run)` };

  // --match-head-commit makes gh refuse if someone pushed after we looked.
  gh(['pr', 'merge', String(pr.number), '--repo', slug, `--${opts.method}`,
    '--match-head-commit', pr.headRefOid]);
  return { repo, result: `MERGED ${label} (${verdict.why})` };
}

const opts = parseArgs(process.argv.slice(2));
console.log(`${opts.merge ? 'MERGING' : 'DRY RUN'} ${opts.repos.length} repos as ${opts.owner}, method ${opts.method}\n`);

let merged = 0;
let skipped = 0;
let failed = 0;
for (const repo of opts.repos) {
  try {
    const { result } = processRepo(opts, repo);
    console.log(`${repo.padEnd(20)} ${result}`);
    if (result.startsWith('MERGED')) merged++;
    else if (result.startsWith('green')) merged++;
    else skipped++;
  } catch (err) {
    failed++;
    const msg = (err.stderr?.toString() || err.message).trim().split('\n')[0];
    console.log(`${repo.padEnd(20)} ERROR ${msg}`);
  }
}
console.log(`\n${opts.merge ? 'merged' : 'mergeable'}: ${merged}, skipped: ${skipped}, errors: ${failed}`);
process.exit(failed ? 1 : 0);
