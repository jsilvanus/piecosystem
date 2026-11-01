#!/usr/bin/env node
/**
 * Writes ecosystem.yaml, the catalog of Pi Ecosystem services.
 *
 * Inputs:
 *   - every sibling directory of this repository (PI_ROOT, default: the parent
 *     directory) whose package.json has a "pi" block (schema: README.md, "The pi block");
 *   - ecosystem.manual.yaml, hand-written entries for services that cannot carry a pi block.
 *
 * Output: ecosystem.yaml. It has no timestamp, so it only changes when an input does.
 *
 * Usage:
 *   node scripts/generate-ecosystem.mjs [--check] [--allow-duplicates]
 *                                       [--root DIR] [--manual FILE] [--out FILE]
 *
 *   --check             do not write; exit 1 when ecosystem.yaml is stale
 *   --allow-duplicates  report duplicate HTTP ports as warnings instead of failing
 *   --root / --manual / --out   override PI_ROOT, the manual file and the output file
 *
 * Exit codes: 0 ok, 1 invalid input, duplicate ports or stale file, 2 bad arguments.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse, stringify } from 'yaml';
import { REPO_ROOT, defaultRoot } from './lib/paths.mjs';
import { gitOrigin } from './lib/git.mjs';

/** Dependencies recorded per service, in this order. */
export const TRACKED_DEPENDENCIES = ['fastify', 'typescript', 'tsx', 'zod'];

export const DEFAULT_OUT = join(REPO_ROOT, 'ecosystem.yaml');
export const DEFAULT_MANUAL = join(REPO_ROOT, 'ecosystem.manual.yaml');
export const MANUAL_FILE_NAME = 'ecosystem.manual.yaml';

const SERVICE_NAME = /^[a-z0-9][a-z0-9-]*$/;
const PORT_NAME = /^[A-Za-z][A-Za-z0-9-]*$/;
const ENV_NAME = /^[A-Z_][A-Z0-9_]*$/;
const HOST = /^[A-Za-z0-9.:[\]-]+$/;
const PI_BLOCK_KEYS = ['service', 'displayName', 'layer', 'kind', 'port', 'ports', 'healthEndpoint', 'envPortVar', 'healthAuthEnv', 'hostOverride'];
const MANUAL_ONLY_KEYS = ['dir', 'runtime', 'versionFile'];
const KINDS = ['service', 'library', 'control'];
const RUNTIMES = ['node', 'python', 'other'];

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isPort = (v) => Number.isInteger(v) && v >= 1 && v <= 65535;
const compact = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));

/**
 * Validates one entry: a pi block (origin = "<dir>/package.json ..."), or a manual entry
 * (manual = true). Problems are pushed onto `errors`; returns the normalized entry or null.
 */
export function normalizeEntry(raw, { origin, manual, dir, source }, errors) {
  if (!isPlainObject(raw)) {
    errors.push(`${origin}: must be a mapping`);
    return null;
  }
  const allowed = new Set(manual ? [...PI_BLOCK_KEYS, ...MANUAL_ONLY_KEYS] : PI_BLOCK_KEYS);
  for (const key of Object.keys(raw)) {
    if (!allowed.has(key)) errors.push(`${origin}: unknown key "${key}"`);
  }
  const before = errors.length;
  const bad = (msg) => errors.push(`${origin}: ${msg}`);

  if (typeof raw.service !== 'string' || !SERVICE_NAME.test(raw.service)) {
    bad('"service" is required (lowercase letters, digits and dashes)');
  }
  if (raw.displayName !== undefined && (typeof raw.displayName !== 'string' || !raw.displayName.trim())) {
    bad('"displayName" must be a non-empty string');
  }
  if (raw.layer !== undefined && (typeof raw.layer !== 'string' || !raw.layer.trim())) {
    bad('"layer" must be a non-empty string');
  }
  if (raw.port !== undefined && !isPort(raw.port)) bad('"port" must be an integer from 1 to 65535');
  if (raw.ports !== undefined) {
    if (!isPlainObject(raw.ports)) {
      bad('"ports" must map a name to a port number');
    } else {
      for (const [name, value] of Object.entries(raw.ports)) {
        if (!PORT_NAME.test(name)) bad(`"ports" name "${name}" must be letters, digits and dashes`);
        if (!isPort(value)) bad(`"ports.${name}" must be an integer from 1 to 65535`);
      }
    }
  }
  if (raw.healthEndpoint !== undefined && (typeof raw.healthEndpoint !== 'string' || !/^\/\S*$/.test(raw.healthEndpoint))) {
    bad('"healthEndpoint" must be a path starting with "/" and without spaces');
  }
  if (raw.port !== undefined && raw.healthEndpoint === undefined) bad('"port" needs "healthEndpoint"');
  if (raw.healthEndpoint !== undefined && raw.port === undefined) bad('"healthEndpoint" needs "port"');
  for (const key of ['envPortVar', 'healthAuthEnv']) {
    if (raw[key] !== undefined && (typeof raw[key] !== 'string' || !ENV_NAME.test(raw[key]))) {
      bad(`"${key}" must be an environment variable name (UPPER_CASE)`);
    }
  }
  if (raw.hostOverride !== undefined && (typeof raw.hostOverride !== 'string' || !HOST.test(raw.hostOverride))) {
    bad('"hostOverride" must be a host name or IP address');
  }

  const kind = raw.kind ?? 'service';
  if (!KINDS.includes(kind)) bad(`"kind" must be one of ${KINDS.join(', ')}`);
  let entryDir = dir;
  let runtime;
  let versionFile;
  if (manual) {
    entryDir = raw.dir ?? raw.service;
    if (typeof entryDir !== 'string' || !/^[A-Za-z0-9._-]+$/.test(entryDir) || entryDir === '.' || entryDir === '..') {
      bad('"dir" must be a directory name directly under the ecosystem root');
    }
    if (raw.runtime !== undefined && !RUNTIMES.includes(raw.runtime)) bad(`"runtime" must be one of ${RUNTIMES.join(', ')}`);
    runtime = raw.runtime;
    if (raw.versionFile !== undefined) {
      const v = raw.versionFile;
      if (typeof v !== 'string' || v.startsWith('/') || v.split(/[\\/]/).includes('..')) {
        bad('"versionFile" must be a relative path inside the service directory');
      } else {
        versionFile = v;
      }
    }
  }

  if (errors.length !== before) return null;
  return compact({
    service: raw.service,
    displayName: raw.displayName ?? raw.service,
    dir: entryDir,
    source,
    origin,
    layer: raw.layer,
    kind,
    runtime,
    port: raw.port,
    ports: raw.ports && Object.fromEntries(Object.entries(raw.ports).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))),
    healthEndpoint: raw.healthEndpoint,
    envPortVar: raw.envPortVar,
    healthAuthEnv: raw.healthAuthEnv,
    hostOverride: raw.hostOverride,
    versionFile,
  });
}

/** Sibling directories (not dot-folders, not node_modules) of the ecosystem root. */
function listSiblingDirs(root) {
  return readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('.') && d.name !== 'node_modules')
    .map((d) => d.name)
    .sort();
}

/** Version, packageManager, engines and tracked dependencies from a package.json file. */
function factsFromPackageJson(file) {
  const pkg = JSON.parse(readFileSync(file, 'utf8'));
  const facts = {};
  if (pkg.version !== undefined) facts.version = String(pkg.version);
  if (typeof pkg.packageManager === 'string') facts.packageManager = pkg.packageManager;
  if (isPlainObject(pkg.engines)) facts.engines = pkg.engines;
  const declared = { ...pkg.dependencies, ...pkg.devDependencies };
  const deps = {};
  for (const name of TRACKED_DEPENDENCIES) {
    if (declared[name] !== undefined) deps[name] = String(declared[name]);
  }
  if (Object.keys(deps).length) facts.dependencies = deps;
  return facts;
}

/**
 * Facts about a service directory. `versionFile` (manual entries only) names a
 * package.json or a pyproject.toml inside the directory that supplies the version
 * when the directory's own package.json is not the right one.
 */
function readFacts(dirPath, versionFile, warnings) {
  const name = basename(dirPath);
  const facts = {};
  const pkgPath = join(dirPath, 'package.json');
  const tryRead = (file, label) => {
    try {
      return factsFromPackageJson(file);
    } catch (err) {
      warnings.push(`${name}/${label} could not be read: ${err.message}`);
      return {};
    }
  };
  if (existsSync(pkgPath)) {
    Object.assign(facts, tryRead(pkgPath, 'package.json'));
    facts.node = true;
  }
  if (versionFile && versionFile.endsWith('.json')) {
    const file = join(dirPath, versionFile);
    if (existsSync(file)) Object.assign(facts, tryRead(file, versionFile));
    else warnings.push(`${name}: versionFile ${versionFile} not found`);
  } else if (versionFile) {
    const file = join(dirPath, versionFile);
    const match = existsSync(file) ? /^version\s*=\s*"([^"]+)"/m.exec(readFileSync(file, 'utf8')) : null;
    if (match) facts.version = match[1];
    else warnings.push(`${name}: no version found in ${versionFile}`);
  }
  return facts;
}

/**
 * Discovers and validates all services. Never throws on bad input: problems are
 * returned in `errors` (fatal) and `warnings` (reported, not fatal).
 */
export function buildEcosystem({ root, manualPath = DEFAULT_MANUAL }) {
  const errors = [];
  const warnings = [];
  const entries = [];

  for (const dirName of listSiblingDirs(root)) {
    const pkgPath = join(root, dirName, 'package.json');
    if (!existsSync(pkgPath)) continue;
    let pkg;
    try {
      pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    } catch (err) {
      warnings.push(`${dirName}/package.json is not valid JSON and was skipped (${err.message})`);
      continue;
    }
    if (!isPlainObject(pkg) || !('pi' in pkg)) continue;
    const origin = `${dirName}/package.json "pi" block`;
    const entry = normalizeEntry(pkg.pi, { origin, manual: false, dir: dirName, source: 'package.json' }, errors);
    if (entry) entries.push(entry);
  }

  if (existsSync(manualPath)) {
    const name = basename(manualPath);
    let doc = null;
    try {
      doc = parse(readFileSync(manualPath, 'utf8'));
    } catch (err) {
      errors.push(`${name}: invalid YAML (${err.message.split('\n')[0]})`);
    }
    if (doc !== null && doc !== undefined) {
      if (!isPlainObject(doc) || !Array.isArray(doc.services)) {
        errors.push(`${name}: expected a top-level "services" list`);
      } else {
        doc.services.forEach((raw, i) => {
          const origin = `${name} services[${i}]`;
          const entry = normalizeEntry(raw, { origin, manual: true, source: MANUAL_FILE_NAME }, errors);
          if (entry) entries.push(entry);
        });
      }
    }
  }

  // A repository that adopts a pi block supersedes its manual entry: the pi block wins.
  const piNames = new Set(entries.filter((e) => e.source === 'package.json').map((e) => e.service));
  const kept = entries.filter((e) => {
    if (e.source === 'package.json' || !piNames.has(e.service)) return true;
    warnings.push(`${e.service}: ${MANUAL_FILE_NAME} entry ignored, the pi block in ${e.service}'s package.json takes precedence; delete the manual entry`);
    return false;
  });
  entries.splice(0, entries.length, ...kept);

  const byName = new Map();
  for (const entry of entries) {
    const first = byName.get(entry.service);
    if (first) {
      errors.push(`service "${entry.service}" is defined twice (${first.origin} and ${entry.origin})`);
    } else {
      byName.set(entry.service, entry);
    }
  }

  for (const entry of entries) {
    if (!existsSync(join(root, entry.dir))) {
      warnings.push(`${entry.service}: directory ${entry.dir} not found under ${root}`);
    }
  }

  const duplicates = findPortDuplicates(entries);
  const services = errors.length
    ? []
    : entries
        .map((entry) => {
          const dirPath = join(root, entry.dir);
          const facts = existsSync(dirPath) ? readFacts(dirPath, entry.versionFile, warnings) : {};
          const origin = existsSync(dirPath) ? gitOrigin(dirPath) : null;
          const out = compact({
            service: entry.service,
            displayName: entry.displayName,
            dir: entry.dir,
            source: entry.source,
            layer: entry.layer,
            kind: entry.kind,
            runtime: entry.runtime ?? (facts.node ? 'node' : undefined),
            port: entry.port,
            ports: entry.ports,
            healthEndpoint: entry.healthEndpoint,
            envPortVar: entry.envPortVar,
            healthAuthEnv: entry.healthAuthEnv,
            hostOverride: entry.hostOverride,
            version: facts.version,
            packageManager: facts.packageManager,
            engines: facts.engines,
            dependencies: facts.dependencies,
            git: origin ? { origin } : undefined,
          });
          return { sort: entry.service, value: out };
        })
        .sort((a, b) => (a.sort < b.sort ? -1 : a.sort > b.sort ? 1 : 0))
        .map((x) => x.value);

  return { services, errors, warnings, duplicates, entries };
}

/** Groups services that share an HTTP port on the same host (hostOverride, or the local host). */
export function findPortDuplicates(entries) {
  const groups = new Map();
  for (const entry of entries) {
    if (entry.port === undefined) continue;
    const host = entry.hostOverride ?? '';
    const key = `${host}|${entry.port}`;
    if (!groups.has(key)) groups.set(key, { port: entry.port, hostOverride: entry.hostOverride, services: [] });
    groups.get(key).services.push(entry);
  }
  return [...groups.values()]
    .filter((g) => g.services.length > 1)
    .sort((a, b) => a.port - b.port)
    .map((g) => ({
      port: g.port,
      hostOverride: g.hostOverride,
      services: g.services.map((s) => ({ service: s.service, origin: s.origin })),
    }));
}

export function formatDuplicates(duplicates, { allowed = false } = {}) {
  const lines = [];
  for (const d of duplicates) {
    const where = d.hostOverride ? `on host ${d.hostOverride}` : 'on this host (no hostOverride)';
    lines.push(`Duplicate HTTP port ${d.port} ${where}:`);
    for (const s of d.services) lines.push(`    ${s.service}  (${s.origin})`);
  }
  lines.push('Give each service its own port, or set "hostOverride" when they run on different hosts.');
  if (!allowed) lines.push('To accept the duplicates anyway, run again with --allow-duplicates.');
  return lines.join('\n');
}

/** The file content for a list of services. Deterministic: no timestamp. */
export function renderEcosystem(services) {
  const header = [
    '# Generated by scripts/generate-ecosystem.mjs. Do not edit by hand.',
    '# Inputs: the "pi" block in each sibling package.json, and ecosystem.manual.yaml.',
    '# Run `pnpm sync` after changing an input. There is no timestamp on purpose.',
    '',
  ].join('\n');
  return header + stringify({ schema: 1, services }, { lineWidth: 0 });
}

function parseArgs(argv) {
  const opts = { check: false, allowDuplicates: false, root: undefined, manual: DEFAULT_MANUAL, out: DEFAULT_OUT };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => {
      if (argv[i + 1] === undefined) throw new Error(`${arg} needs a value`);
      return argv[++i];
    };
    if (arg === '--check') opts.check = true;
    else if (arg === '--allow-duplicates') opts.allowDuplicates = true;
    else if (arg === '--root') opts.root = resolve(next());
    else if (arg === '--manual') opts.manual = resolve(next());
    else if (arg === '--out') opts.out = resolve(next());
    else throw new Error(`unknown argument ${arg}`);
  }
  return opts;
}

export function main(argv = process.argv.slice(2), env = process.env, io = { stdout: process.stdout, stderr: process.stderr }) {
  let opts;
  try {
    opts = parseArgs(argv);
  } catch (err) {
    io.stderr.write(`${err.message}\nusage: generate-ecosystem.mjs [--check] [--allow-duplicates] [--root DIR] [--manual FILE] [--out FILE]\n`);
    return 2;
  }
  const root = opts.root ?? defaultRoot(env);
  const { services, errors, warnings, duplicates } = buildEcosystem({ root, manualPath: opts.manual });

  for (const w of warnings) io.stderr.write(`warning: ${w}\n`);
  if (errors.length) {
    io.stderr.write(`ecosystem: ${errors.length} invalid entr${errors.length === 1 ? 'y' : 'ies'}:\n`);
    for (const e of errors) io.stderr.write(`  - ${e}\n`);
    return 1;
  }
  if (duplicates.length) {
    if (!opts.allowDuplicates) {
      io.stderr.write(`ecosystem: ${duplicates.length} duplicate HTTP port${duplicates.length === 1 ? '' : 's'}; nothing written.\n`);
      io.stderr.write(`${formatDuplicates(duplicates)}\n`);
      return 1;
    }
    io.stderr.write(`warning: allowing duplicate HTTP ports (--allow-duplicates)\n${formatDuplicates(duplicates, { allowed: true })}\n`);
  }

  const content = renderEcosystem(services);
  if (opts.check) {
    const current = existsSync(opts.out) ? readFileSync(opts.out, 'utf8').replace(/\r\n/g, '\n') : null;
    if (current !== content) {
      io.stderr.write(`${opts.out} is stale. Run: pnpm sync\n`);
      return 1;
    }
    io.stdout.write(`${opts.out} is up to date (${services.length} services)\n`);
    return 0;
  }
  writeFileSync(opts.out, content);
  io.stdout.write(`Wrote ${services.length} services to ${opts.out}\n`);
  return 0;
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) process.exitCode = main();
