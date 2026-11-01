#!/usr/bin/env node
/**
 * Checks every service in ecosystem.yaml with one GET to its health endpoint, in parallel.
 *
 *   ONLINE    2xx answer
 *   DEGRADED  an answer with any other status (redirects included)
 *   OFFLINE   no answer within 1500 ms, or the connection failed
 *   STATIC    no port or no healthEndpoint (libraries, non-HTTP services); not probed
 *
 * Each row also shows the git branch, the number of dirty files, and whether the
 * repository uses pnpm (pnpm-lock.yaml) or npm (package-lock.json). The only network
 * traffic is the GET; a healthAuthEnv variable, when set, is sent as the X-Api-Key header.
 *
 * Usage:
 *   node scripts/ecosystem-health.mjs [--json] [--fail-on-unhealthy] [--file FILE] [--root DIR]
 *
 * Environment:
 *   PI_HOST     host to probe (default 127.0.0.1); a service's hostOverride wins over it
 *   PI_ROOT     directory holding the sibling repositories (default: parent of this repo)
 *   <envPortVar>  when set where this check runs, replaces the service's port
 *
 * Exit codes: 0 ok, 1 with --fail-on-unhealthy and a DEGRADED or OFFLINE service, 2 bad input.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { REPO_ROOT, defaultRoot } from './lib/paths.mjs';
import { gitBranch, gitDirtyCount } from './lib/git.mjs';

export const HEALTH_TIMEOUT_MS = 1500;
export const DEFAULT_FILE = join(REPO_ROOT, 'ecosystem.yaml');
export const STATES = ['ONLINE', 'DEGRADED', 'OFFLINE', 'STATIC'];

/** The port to probe: the envPortVar value when that variable is set and valid, else `port`. */
export function resolvePort(entry, env = process.env) {
  if (entry.envPortVar) {
    const raw = env[entry.envPortVar];
    if (raw !== undefined && raw.trim() !== '') {
      const n = Number(raw);
      if (Number.isInteger(n) && n >= 1 && n <= 65535) return n;
    }
  }
  return entry.port;
}

export function healthUrl(host, port, path) {
  const h = host.includes(':') && !host.startsWith('[') ? `[${host}]` : host;
  return `http://${h}:${port}${path}`;
}

/** Git and lockfile facts for a service directory. Read-only. */
export function repoSummary(dirPath) {
  if (!existsSync(dirPath)) return { present: false };
  const pnpm = existsSync(join(dirPath, 'pnpm-lock.yaml'));
  const npm = existsSync(join(dirPath, 'package-lock.json'));
  return {
    present: true,
    branch: gitBranch(dirPath),
    dirty: gitDirtyCount(dirPath),
    packageManager: pnpm && npm ? 'both' : pnpm ? 'pnpm' : npm ? 'npm' : 'none',
  };
}

function describeError(err) {
  const code = err?.cause?.code || err?.code;
  return code ? String(code) : err?.message || 'request failed';
}

/**
 * Probes one catalog entry. `fetchImpl` and `timeoutMs` can be injected for tests.
 * Returns { service, displayName, dir, state, httpStatus, latencyMs, url, note, git }.
 */
export async function checkService(entry, { root, env = process.env, timeoutMs = HEALTH_TIMEOUT_MS, fetchImpl = fetch } = {}) {
  const git = repoSummary(join(root, entry.dir));
  const row = {
    service: entry.service,
    displayName: entry.displayName ?? entry.service,
    dir: entry.dir,
    state: 'STATIC',
    httpStatus: null,
    latencyMs: null,
    url: null,
    note: null,
    git,
  };

  const port = resolvePort(entry, env);
  if (!port || !entry.healthEndpoint) return row;

  const host = entry.hostOverride ?? env.PI_HOST ?? '127.0.0.1';
  row.url = healthUrl(host, port, entry.healthEndpoint);
  const headers = {};
  const key = entry.healthAuthEnv ? env[entry.healthAuthEnv] : undefined;
  if (key) headers['X-Api-Key'] = key;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = performance.now();
  try {
    const res = await fetchImpl(row.url, { method: 'GET', headers, redirect: 'manual', signal: controller.signal });
    row.latencyMs = Math.round(performance.now() - started);
    row.httpStatus = res.status;
    await res.body?.cancel().catch(() => {});
    row.state = res.status >= 200 && res.status < 300 ? 'ONLINE' : 'DEGRADED';
    if (row.state === 'DEGRADED') row.note = `HTTP ${res.status}`;
  } catch (err) {
    row.latencyMs = Math.round(performance.now() - started);
    row.state = 'OFFLINE';
    row.note = controller.signal.aborted ? `no answer within ${timeoutMs} ms` : describeError(err);
  } finally {
    clearTimeout(timer);
  }
  return row;
}

export async function checkAll(entries, options = {}) {
  return Promise.all(entries.map((entry) => checkService(entry, options)));
}

function formatTable(rows) {
  const dash = '-';
  const header = ['SERVICE', 'STATE', 'MS', 'TARGET', 'BRANCH', 'DIRTY', 'PKG', 'NOTE'];
  const body = rows.map((r) => [
    r.service,
    r.state,
    r.latencyMs === null ? dash : String(r.latencyMs),
    r.url ?? dash,
    r.git.present ? r.git.branch ?? dash : 'missing',
    r.git.present && r.git.dirty !== null ? String(r.git.dirty) : dash,
    r.git.present ? r.git.packageManager : dash,
    r.note ?? '',
  ]);
  const widths = header.map((h, i) => Math.max(h.length, ...body.map((b) => b[i].length)));
  const line = (cells) => cells.map((c, i) => c.padEnd(widths[i])).join('  ').trimEnd();
  return [line(header), ...body.map(line)];
}

function summary(rows) {
  return STATES.map((s) => `${s} ${rows.filter((r) => r.state === s).length}`).join(' · ');
}

export async function main(argv = process.argv.slice(2), env = process.env, io = { stdout: process.stdout, stderr: process.stderr }) {
  const opts = { json: false, failOnUnhealthy: false, file: DEFAULT_FILE, root: undefined };
  try {
    for (let i = 0; i < argv.length; i++) {
      const arg = argv[i];
      if (arg === '--json') opts.json = true;
      else if (arg === '--fail-on-unhealthy') opts.failOnUnhealthy = true;
      else if (arg === '--file') opts.file = resolve(argv[++i] ?? '');
      else if (arg === '--root') opts.root = resolve(argv[++i] ?? '');
      else throw new Error(`unknown argument ${arg}`);
    }
  } catch (err) {
    io.stderr.write(`${err.message}\nusage: ecosystem-health.mjs [--json] [--fail-on-unhealthy] [--file FILE] [--root DIR]\n`);
    return 2;
  }
  if (!existsSync(opts.file)) {
    io.stderr.write(`${opts.file} not found. Run: pnpm sync\n`);
    return 2;
  }
  const doc = parse(readFileSync(opts.file, 'utf8'));
  if (!doc || !Array.isArray(doc.services)) {
    io.stderr.write(`${opts.file}: expected a "services" list. Run: pnpm sync\n`);
    return 2;
  }

  const root = opts.root ?? defaultRoot(env);
  const rows = await checkAll(doc.services, { root, env });
  const host = env.PI_HOST ?? '127.0.0.1';

  if (opts.json) {
    io.stdout.write(`${JSON.stringify({ host, timeoutMs: HEALTH_TIMEOUT_MS, services: rows }, null, 2)}\n`);
  } else {
    io.stdout.write(`ECOSYSTEM HEALTH  host ${host}  timeout ${HEALTH_TIMEOUT_MS} ms  root ${root}\n\n`);
    io.stdout.write(`${formatTable(rows).join('\n')}\n\n${summary(rows)}\n`);
  }
  const unhealthy = rows.some((r) => r.state === 'DEGRADED' || r.state === 'OFFLINE');
  return opts.failOnUnhealthy && unhealthy ? 1 : 0;
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) process.exitCode = await main();
