#!/usr/bin/env node
// Ecosystem-wide dependency check for the Pi repositories (pi* directories only).
//
// For every dependency it shows what each repo (and workspace package) DECLARES in
// package.json, what the LOCK files resolve (pnpm-lock.yaml and package-lock.json), and
// optionally what is INSTALLED in node_modules. It flags:
//   range-mismatch     the same package is declared with different ranges across repos
//   version-mismatch   the same package resolves to different versions across repos
//   lock-mismatch      pnpm-lock and package-lock resolve a dependency differently
//   lock-drift         the lock resolves a version that does not satisfy the declared range
//   installed-drift    node_modules holds a version other than the lock (needs --installed)
//   missing-lock       a package.json dependency is not in the lock file
//
//   node scripts/dep-check.mjs                    table of shared dependencies with findings
//   node scripts/dep-check.mjs --all              also list dependencies without findings
//   node scripts/dep-check.mjs --json             JSON on stdout
//   node scripts/dep-check.mjs --root /home/pi/apps --installed   run on the Pi
//   node scripts/dep-check.mjs --repos pimatrix,picam --package fastify
//   node scripts/dep-check.mjs --fail-on-mismatch exit 1 when any finding exists
//
// --root defaults to PI_ROOT or the parent of this checkout. Nothing is written or fetched.
// To compare against the old npm locks, point --npm-root at a directory of checkouts that
// still carry package-lock.json (for example `git worktree` of the pre-pnpm commit);
// when a repo has both lock files in one place they are compared directly.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { defaultRoot } from './lib/paths.mjs';

const DEP_FIELDS = ['dependencies', 'devDependencies', 'optionalDependencies'];

// ---------- semver subset (enough to check "does this version satisfy this range") ----------

function parseVersion(v) {
  const m = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?/.exec(String(v).trim());
  return m ? { n: [+m[1], +m[2], +m[3]], pre: m[4] ?? null } : null;
}

function cmp(a, b) {
  for (let i = 0; i < 3; i++) if (a.n[i] !== b.n[i]) return a.n[i] - b.n[i];
  if (a.pre === b.pre) return 0;
  if (a.pre === null) return 1;
  if (b.pre === null) return -1;
  return a.pre < b.pre ? -1 : 1;
}

/** Returns true / false, or null when the spec is not a plain semver range (git, file, workspace, tag). */
export function satisfies(version, range) {
  const v = parseVersion(version);
  if (!v) return null;
  range = String(range).trim();
  if (range === '' || range === '*' || range === 'latest') return true;
  if (/^(workspace|file|link|git|github|npm|http)/.test(range) || /[:/]/.test(range)) return null;
  return range.split('||').some((alt) => {
    const parts = alt.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return true;
    const comps = [];
    for (let i = 0; i < parts.length; i++) {
      if (parts[i] === '-' && parts[i + 1] && comps.length) { // hyphen range: a - b
        const lo = comps.pop();
        comps.push(['>=', lo[1]], ['<=', parseVersion(parts[i + 1]) ?? lo[1]]);
        i++;
      } else comps.push(...expand(parts[i]));
    }
    return comps.every((c) => c !== null && test(v, c));
  });
}

function expand(token) {
  const m = /^(\^|~|>=|<=|>|<|=)?\s*v?(\d+|[xX*])(?:\.(\d+|[xX*]))?(?:\.(\d+|[xX*]))?(?:-([0-9A-Za-z.-]+))?$/.exec(token);
  if (!m) return [null];
  const [, op = '=', a, b, c, pre] = m;
  const wild = (x) => x === undefined || /[xX*]/.test(x);
  if (wild(a)) return [['>=', { n: [0, 0, 0], pre: null }]];
  const lo = { n: [+a, wild(b) ? 0 : +b, wild(c) ? 0 : +c], pre: pre ?? null };
  const n = lo.n;
  if (op === '^') {
    const hi = n[0] > 0 ? [n[0] + 1, 0, 0] : wild(b) ? [1, 0, 0] : n[1] > 0 ? [0, n[1] + 1, 0] : wild(c) ? [0, 1, 0] : [0, 0, n[2] + 1];
    return [['>=', lo], ['<', { n: hi, pre: null }]];
  }
  if (op === '~') {
    const hi = wild(b) ? [n[0] + 1, 0, 0] : [n[0], n[1] + 1, 0];
    return [['>=', lo], ['<', { n: hi, pre: null }]];
  }
  if (op === '=' && (wild(b) || wild(c))) {
    const hi = wild(b) ? [n[0] + 1, 0, 0] : [n[0], n[1] + 1, 0];
    return [['>=', lo], ['<', { n: hi, pre: null }]];
  }
  return [[op, lo]];
}

function test(v, [op, bound]) {
  const d = cmp(v, bound);
  switch (op) {
    case '>=': return d >= 0;
    case '<=': return d <= 0;
    case '>': return d > 0;
    case '<': return d < 0;
    default: return d === 0;
  }
}

// ---------- reading a repository ----------

function readJson(path) {
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return null; }
}

/** Workspace package directories (relative to repo, '.' first) from pnpm-workspace.yaml or "workspaces". */
export function workspaceDirs(repoDir) {
  const dirs = ['.'];
  let globs = [];
  const wsFile = join(repoDir, 'pnpm-workspace.yaml');
  if (existsSync(wsFile)) {
    try { globs = parseYaml(readFileSync(wsFile, 'utf8'))?.packages ?? []; } catch { /* ignore */ }
  }
  const pkg = readJson(join(repoDir, 'package.json'));
  const w = pkg?.workspaces;
  if (Array.isArray(w)) globs = globs.concat(w);
  else if (Array.isArray(w?.packages)) globs = globs.concat(w.packages);
  for (const g of globs) {
    if (g.startsWith('!')) continue;
    const parts = g.replace(/\/+$/, '').split('/');
    let bases = [''];
    for (const part of parts) {
      const next = [];
      for (const b of bases) {
        if (part === '*' || part === '**') {
          const abs = join(repoDir, b);
          if (!existsSync(abs)) continue;
          for (const e of readdirSync(abs, { withFileTypes: true })) {
            if (e.isDirectory() && e.name !== 'node_modules' && !e.name.startsWith('.')) next.push(join(b, e.name));
          }
        } else next.push(join(b, part));
      }
      bases = next;
    }
    for (const b of bases) if (existsSync(join(repoDir, b, 'package.json')) && !dirs.includes(b)) dirs.push(b);
  }
  return dirs;
}

/** pnpm-lock.yaml (v6-v9): Map<importerPath, Map<dep, {specifier, version}>>. */
export function readPnpmLock(repoDir) {
  const file = join(repoDir, 'pnpm-lock.yaml');
  if (!existsSync(file)) return null;
  let doc;
  try { doc = parseYaml(readFileSync(file, 'utf8')); } catch { return null; }
  const importers = doc?.importers ?? { '.': doc };
  const out = new Map();
  for (const [path, imp] of Object.entries(importers)) {
    const deps = new Map();
    for (const f of DEP_FIELDS) {
      for (const [name, e] of Object.entries(imp?.[f] ?? {})) {
        const raw = typeof e === 'string' ? e : e?.version;
        deps.set(name, { specifier: typeof e === 'object' ? e?.specifier : undefined, version: cleanPnpmVersion(raw) });
      }
    }
    out.set(path, deps);
  }
  return { lockfileVersion: String(doc?.lockfileVersion ?? '?'), importers: out };
}

function cleanPnpmVersion(v) {
  if (!v) return null;
  return String(v).replace(/\(.*$/, '').replace(/^.*@(?=\d)/, '');
}

/** package-lock.json (v2/v3): Map<importerPath, Map<dep, {version}>> resolved the way npm hoists. */
export function readNpmLock(repoDir) {
  const lock = readJson(join(repoDir, 'package-lock.json'));
  if (!lock?.packages) return null;
  const pk = lock.packages;
  const out = new Map();
  for (const [path, entry] of Object.entries(pk)) {
    if (path.startsWith('node_modules')) continue;
    const base = path === '' ? '.' : path;
    const deps = new Map();
    for (const f of DEP_FIELDS) {
      for (const name of Object.keys(entry[f] ?? {})) {
        const prefix = path === '' ? '' : `${path}/`;
        const hit = pk[`${prefix}node_modules/${name}`] ?? pk[`node_modules/${name}`];
        deps.set(name, { specifier: entry[f][name], version: hit?.version ?? null });
      }
    }
    out.set(base, deps);
  }
  return { lockfileVersion: String(lock.lockfileVersion ?? '?'), importers: out };
}

function installedVersion(repoDir, dir, name) {
  for (const base of [join(repoDir, dir), repoDir]) {
    const p = join(base, 'node_modules', ...name.split('/'), 'package.json');
    if (existsSync(p)) return readJson(p)?.version ?? null;
  }
  return null;
}

export function isPiRepo(name) {
  return /^pi/.test(name);
}

export function listRepos(root, only) {
  if (only) return only;
  return readdirSync(root, { withFileTypes: true })
    .filter((e) => e.isDirectory() && isPiRepo(e.name) && existsSync(join(root, e.name, 'package.json')))
    .map((e) => e.name)
    .sort();
}

/** One row per (repo, workspace package, dependency). */
export function collectRepo(root, repo, { installed = false, npmRoot = null } = {}) {
  const dir = join(root, repo);
  const pnpm = readPnpmLock(dir);
  const npm = readNpmLock(npmRoot ? join(npmRoot, repo) : dir);
  const rows = [];
  for (const wd of workspaceDirs(dir)) {
    const pkg = readJson(join(dir, wd, 'package.json'));
    if (!pkg) continue;
    const locker = (lock) => lock?.importers.get(wd === '.' ? '.' : wd.split('\\').join('/'));
    const pl = locker(pnpm);
    const nl = locker(npm);
    for (const field of DEP_FIELDS) {
      for (const [name, range] of Object.entries(pkg[field] ?? {})) {
        if (/^workspace:/.test(range)) continue;
        rows.push({
          repo,
          pkg: pkg.name ?? repo,
          dir: wd,
          field,
          name,
          declared: range,
          pnpm: pl ? (pl.get(name)?.version ?? null) : undefined,
          npm: nl ? (nl.get(name)?.version ?? null) : undefined,
          installed: installed ? installedVersion(dir, wd, name) : undefined,
        });
      }
    }
  }
  return {
    repo,
    locks: { pnpm: pnpm?.lockfileVersion ?? null, npm: npm?.lockfileVersion ?? null },
    installed: installed && existsSync(join(dir, 'node_modules')),
    rows,
  };
}

// ---------- analysis ----------

export function analyse(repos) {
  const findings = [];
  const add = (kind, name, detail, where) => findings.push({ kind, package: name, detail, where });
  const byName = new Map();
  for (const r of repos) {
    for (const row of r.rows) {
      if (!byName.has(row.name)) byName.set(row.name, []);
      byName.get(row.name).push(row);
      const label = `${row.repo}${row.dir === '.' ? '' : `/${row.dir}`}`;
      const lockVer = row.pnpm ?? row.npm;
      if (row.pnpm === null) add('missing-lock', row.name, 'not in pnpm-lock.yaml', label);
      if (row.npm === null) add('missing-lock', row.name, 'not in package-lock.json', label);
      for (const [which, v] of [['pnpm', row.pnpm], ['npm', row.npm]]) {
        if (v && satisfies(v, row.declared) === false) {
          add('lock-drift', row.name, `${which} lock has ${v}, package.json wants ${row.declared}`, label);
        }
      }
      if (row.pnpm && row.npm && row.pnpm !== row.npm) {
        add('lock-mismatch', row.name, `pnpm ${row.pnpm} vs npm ${row.npm}`, label);
      }
      if (row.installed !== undefined && lockVer && row.installed && row.installed !== lockVer) {
        add('installed-drift', row.name, `node_modules ${row.installed}, lock ${lockVer}`, label);
      }
      if (row.installed === null && r.installed && lockVer) {
        add('installed-drift', row.name, `not installed (lock ${lockVer})`, label);
      }
    }
  }
  const shared = [];
  for (const [name, rows] of [...byName].sort((a, b) => a[0].localeCompare(b[0]))) {
    const repoNames = new Set(rows.map((r) => r.repo));
    const ranges = [...new Set(rows.map((r) => r.declared))].sort();
    const resolved = [...new Set(rows.map((r) => r.pnpm ?? r.npm).filter(Boolean))].sort();
    const issues = [];
    if (repoNames.size > 1 && ranges.length > 1) {
      issues.push('range-mismatch');
      add('range-mismatch', name, ranges.map((x) => `${x} (${[...new Set(rows.filter((r) => r.declared === x).map((r) => r.repo))].join(', ')})`).join('; '), null);
    }
    if (repoNames.size > 1 && resolved.length > 1) {
      issues.push('version-mismatch');
      add('version-mismatch', name, resolved.map((x) => `${x} (${[...new Set(rows.filter((r) => (r.pnpm ?? r.npm) === x).map((r) => r.repo))].join(', ')})`).join('; '), null);
    }
    const own = findings.filter((f) => f.package === name && f.where);
    for (const k of new Set(own.map((f) => f.kind))) issues.push(k);
    shared.push({ name, repos: repoNames.size, ranges, resolved, issues: [...new Set(issues)], rows });
  }
  return { findings, packages: shared };
}

// ---------- output ----------

function table(headers, rows) {
  const w = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => String(r[i]).length)));
  const line = (r) => r.map((c, i) => String(c).padEnd(w[i])).join('  ').trimEnd();
  return [line(headers), line(w.map((n) => '-'.repeat(n))), ...rows.map(line)].join('\n');
}

export function render(result, repos, { all = false, only = null } = {}) {
  const out = [];
  out.push(table(['repo', 'pnpm-lock', 'package-lock', 'node_modules'], repos.map((r) => [
    r.repo, r.locks.pnpm ? `v${r.locks.pnpm}` : '-', r.locks.npm ? `v${r.locks.npm}` : '-', r.installed ? 'yes' : '-',
  ])));
  let pk = result.packages.filter((p) => p.repos > 1 || p.issues.length);
  if (only) pk = result.packages.filter((p) => p.name === only);
  const flagged = pk.filter((p) => p.issues.length);
  const rows = (all || only ? pk : flagged).map((p) => [
    p.name, p.repos, p.ranges.join(' | '), p.resolved.join(' | '), p.issues.join(', ') || 'ok',
  ]);
  out.push('');
  out.push(rows.length
    ? table(['package', 'repos', 'declared', 'resolved', 'findings'], rows)
    : 'No findings for shared dependencies.');
  const local = result.findings.filter((f) => f.where);
  if (local.length) {
    out.push('', 'Per-repo findings:');
    out.push(table(['kind', 'package', 'where', 'detail'], local.map((f) => [f.kind, f.package, f.where, f.detail])));
  }
  const counts = {};
  for (const f of result.findings) counts[f.kind] = (counts[f.kind] ?? 0) + 1;
  out.push('', Object.keys(counts).length ? 'Summary: ' + Object.entries(counts).map(([k, n]) => `${k} ${n}`).join(', ') : 'Summary: clean');
  return out.join('\n');
}

function parseArgs(argv) {
  const o = { root: defaultRoot(), npmRoot: null, repos: null, installed: false, json: false, all: false, failOnMismatch: false, package: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--root') o.root = resolve(argv[++i]);
    else if (a === '--npm-root') o.npmRoot = resolve(argv[++i]);
    else if (a === '--repos') o.repos = argv[++i].split(',').map((s) => s.trim()).filter(Boolean);
    else if (a === '--package') o.package = argv[++i];
    else if (a === '--installed') o.installed = true;
    else if (a === '--json') o.json = true;
    else if (a === '--all') o.all = true;
    else if (a === '--fail-on-mismatch') o.failOnMismatch = true;
    else if (a === '-h' || a === '--help') { console.log('See the header of this file.'); process.exit(0); }
    else { console.error(`Unknown argument: ${a}`); process.exit(2); }
  }
  return o;
}

export function main(argv = process.argv.slice(2)) {
  const o = parseArgs(argv);
  if (!existsSync(o.root) || !statSync(o.root).isDirectory()) {
    console.error(`Root not found: ${o.root}`);
    return 2;
  }
  const names = listRepos(o.root, o.repos);
  const repos = names.map((n) => collectRepo(o.root, n, { installed: o.installed, npmRoot: o.npmRoot }));
  const result = analyse(repos);
  if (o.json) {
    console.log(JSON.stringify({
      root: o.root,
      repos: repos.map((r) => ({ repo: r.repo, locks: r.locks, installed: r.installed })),
      findings: result.findings,
      packages: result.packages,
    }, null, 2));
  } else {
    console.log(render(result, repos, { all: o.all, only: o.package }));
  }
  return o.failOnMismatch && result.findings.length ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  process.exitCode = main();
}
