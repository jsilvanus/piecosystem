import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { main, buildEcosystem, findPortDuplicates } from '../scripts/generate-ecosystem.mjs';
import { stripCredentials } from '../scripts/lib/git.mjs';

/** A temporary workspace: `root` holds the sibling repos, `out` the generated file. */
function workspace(t) {
  const base = mkdtempSync(join(tmpdir(), 'piecosystem-gen-'));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  const root = join(base, 'ws');
  mkdirSync(root);
  return { base, root, out: join(base, 'ecosystem.yaml'), manual: join(base, 'ecosystem.manual.yaml') };
}

function addRepo(root, dir, pkg) {
  mkdirSync(join(root, dir), { recursive: true });
  if (pkg !== undefined) writeFileSync(join(root, dir, 'package.json'), JSON.stringify(pkg, null, 2));
}

function run(args, env = {}) {
  const out = [];
  const err = [];
  const code = main(args, env, {
    stdout: { write: (s) => out.push(s) },
    stderr: { write: (s) => err.push(s) },
  });
  return { code, stdout: out.join(''), stderr: err.join('') };
}

const alpha = {
  name: 'alpha',
  version: '1.4.2',
  packageManager: 'pnpm@11.23.0',
  engines: { node: '>=22' },
  dependencies: { fastify: '^5.2.0' },
  devDependencies: { typescript: '^5.7.3', tsx: '^4.19.0', vitest: '^3.0.0' },
  pi: {
    service: 'alpha',
    displayName: 'Alpha',
    layer: 'Layer 1',
    port: 3001,
    ports: { udpTelemetry: 4001 },
    healthEndpoint: '/health',
    envPortVar: 'ALPHA_PORT',
  },
};

test('discovers pi blocks, ignores other folders, and writes deterministic output without a timestamp', (t) => {
  const ws = workspace(t);
  addRepo(ws.root, 'zeta', { name: 'zeta', version: '0.2.0', pi: { service: 'zeta', healthEndpoint: '/health', port: 3002 } });
  addRepo(ws.root, 'alpha', alpha);
  addRepo(ws.root, 'plain-lib', { name: 'plain-lib', version: '9.9.9' }); // no pi block
  addRepo(ws.root, 'not-a-repo'); // no package.json at all
  mkdirSync(join(ws.root, '.hidden'));

  const first = run(['--root', ws.root, '--manual', ws.manual, '--out', ws.out]);
  assert.equal(first.code, 0, first.stderr);
  const content = readFileSync(ws.out, 'utf8');
  assert.doesNotMatch(content, /generatedAt|\d{4}-\d{2}-\d{2}T/);

  const names = buildEcosystem({ root: ws.root, manualPath: ws.manual }).services.map((s) => s.service);
  assert.deepEqual(names, ['alpha', 'zeta']);

  const second = run(['--root', ws.root, '--manual', ws.manual, '--out', ws.out]);
  assert.equal(second.code, 0);
  assert.equal(readFileSync(ws.out, 'utf8'), content, 'same inputs must give the same bytes');

  const check = run(['--check', '--root', ws.root, '--manual', ws.manual, '--out', ws.out]);
  assert.equal(check.code, 0, check.stderr);
});

test('records version, packageManager, engines, tracked dependencies and the pi block fields', (t) => {
  const ws = workspace(t);
  addRepo(ws.root, 'alpha', alpha);
  const { services } = buildEcosystem({ root: ws.root, manualPath: ws.manual });
  const [svc] = services;
  assert.equal(svc.service, 'alpha');
  assert.equal(svc.displayName, 'Alpha');
  assert.equal(svc.dir, 'alpha');
  assert.equal(svc.source, 'package.json');
  assert.equal(svc.port, 3001);
  assert.deepEqual(svc.ports, { udpTelemetry: 4001 });
  assert.equal(svc.envPortVar, 'ALPHA_PORT');
  assert.equal(svc.version, '1.4.2');
  assert.equal(svc.packageManager, 'pnpm@11.23.0');
  assert.deepEqual(svc.engines, { node: '>=22' });
  // only the four tracked dependencies, in fixed order, from dependencies and devDependencies
  assert.deepEqual(Object.keys(svc.dependencies), ['fastify', 'typescript', 'tsx']);
});

test('a duplicate HTTP port fails and names every service that shares it', (t) => {
  const ws = workspace(t);
  addRepo(ws.root, 'one', { pi: { service: 'one', port: 3300, healthEndpoint: '/health' } });
  addRepo(ws.root, 'two', { pi: { service: 'two', port: 3300, healthEndpoint: '/health' } });
  const result = run(['--root', ws.root, '--manual', ws.manual, '--out', ws.out]);
  assert.equal(result.code, 1);
  assert.match(result.stderr, /Duplicate HTTP port 3300/);
  assert.match(result.stderr, /one\s+\(one\/package\.json "pi" block\)/);
  assert.match(result.stderr, /two\s+\(two\/package\.json "pi" block\)/);
  assert.match(result.stderr, /--allow-duplicates/);
  assert.equal(existsSync(ws.out), false, 'nothing is written when the check fails');
});

test('--allow-duplicates writes the file and reports the duplicates as warnings', (t) => {
  const ws = workspace(t);
  addRepo(ws.root, 'one', { pi: { service: 'one', port: 3300, healthEndpoint: '/health' } });
  addRepo(ws.root, 'two', { pi: { service: 'two', port: 3300, healthEndpoint: '/health' } });
  const result = run(['--allow-duplicates', '--root', ws.root, '--manual', ws.manual, '--out', ws.out]);
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stderr, /allowing duplicate HTTP ports/);
  assert.equal(existsSync(ws.out), true);
});

test('services on different hosts (hostOverride) may use the same port', (t) => {
  const ws = workspace(t);
  addRepo(ws.root, 'one', { pi: { service: 'one', port: 3300, healthEndpoint: '/health' } });
  addRepo(ws.root, 'two', { pi: { service: 'two', port: 3300, healthEndpoint: '/health', hostOverride: 'kirkonpi2.local' } });
  const result = run(['--root', ws.root, '--manual', ws.manual, '--out', ws.out]);
  assert.equal(result.code, 0, result.stderr);
  const two = buildEcosystem({ root: ws.root, manualPath: ws.manual }).services.find((s) => s.service === 'two');
  assert.equal(two.hostOverride, 'kirkonpi2.local');
  assert.deepEqual(findPortDuplicates(buildEcosystem({ root: ws.root, manualPath: ws.manual }).entries), []);
});

test('an invalid pi block fails with a message that names the key and the file', (t) => {
  const ws = workspace(t);
  addRepo(ws.root, 'bad', { pi: { service: 'bad', port: 3400 } });
  addRepo(ws.root, 'typo', { pi: { service: 'typo', healthEndpont: '/health' } });
  const result = run(['--root', ws.root, '--manual', ws.manual, '--out', ws.out]);
  assert.equal(result.code, 1);
  assert.match(result.stderr, /bad\/package\.json "pi" block: "port" needs "healthEndpoint"/);
  assert.match(result.stderr, /typo\/package\.json "pi" block: unknown key "healthEndpont"/);
});

test('the same service name in two places is an error', (t) => {
  const ws = workspace(t);
  addRepo(ws.root, 'first', { pi: { service: 'twin', port: 3500, healthEndpoint: '/health' } });
  addRepo(ws.root, 'second', { pi: { service: 'twin', port: 3501, healthEndpoint: '/health' } });
  const result = run(['--root', ws.root, '--manual', ws.manual, '--out', ws.out]);
  assert.equal(result.code, 1);
  assert.match(result.stderr, /service "twin" is defined twice/);
});

test('manual entries are merged, default their dir to the service name, and read a pyproject version', (t) => {
  const ws = workspace(t);
  addRepo(ws.root, 'alpha', alpha);
  addRepo(ws.root, 'py-service');
  mkdirSync(join(ws.root, 'py-service', 'pkg'), { recursive: true });
  writeFileSync(join(ws.root, 'py-service', 'pkg', 'pyproject.toml'), '[project]\nname = "py"\nversion = "2.0.1"\n');
  writeFileSync(
    ws.manual,
    [
      'services:',
      '  - service: py-service',
      '    layer: Layer 2',
      '    runtime: python',
      '    versionFile: pkg/pyproject.toml',
      '    port: 8090',
      '    healthEndpoint: /health',
      '  - service: amx-box',
      '    dir: alpha',
      '    kind: control',
      '    runtime: other',
      '',
    ].join('\n'),
  );
  const { services, errors } = buildEcosystem({ root: ws.root, manualPath: ws.manual });
  assert.deepEqual(errors, []);
  const py = services.find((s) => s.service === 'py-service');
  assert.equal(py.dir, 'py-service');
  assert.equal(py.source, 'ecosystem.manual.yaml');
  assert.equal(py.version, '2.0.1');
  assert.equal(py.runtime, 'python');
  const amx = services.find((s) => s.service === 'amx-box');
  assert.equal(amx.kind, 'control');
  assert.equal(amx.dir, 'alpha');
  assert.equal(amx.port, undefined);
});

test('a manual entry that repeats a pi-block service is dropped with a warning; the pi block wins', (t) => {
  const ws = workspace(t);
  addRepo(ws.root, 'alpha', alpha);
  writeFileSync(ws.manual, 'services:\n  - service: alpha\n    port: 9000\n    healthEndpoint: /health\n');
  const result = run(['--root', ws.root, '--manual', ws.manual, '--out', ws.out]);
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stderr, /alpha: ecosystem\.manual\.yaml entry ignored/);
  const { services } = buildEcosystem({ root: ws.root, manualPath: ws.manual });
  assert.equal(services.length, 1);
  assert.equal(services[0].port, 3001);
  assert.equal(services[0].source, 'package.json');
});

test('two pi blocks with the same service name is an error', (t) => {
  const ws = workspace(t);
  addRepo(ws.root, 'first', { pi: { service: 'twin', port: 3500, healthEndpoint: '/health' } });
  addRepo(ws.root, 'second', { pi: { service: 'twin', port: 3501, healthEndpoint: '/health' } });
  const result = run(['--root', ws.root, '--manual', ws.manual, '--out', ws.out]);
  assert.equal(result.code, 1);
  assert.match(result.stderr, /service "twin" is defined twice/);
});

test('--check exits 1 when ecosystem.yaml is stale and 0 once it is regenerated', (t) => {
  const ws = workspace(t);
  addRepo(ws.root, 'alpha', alpha);
  assert.equal(run(['--root', ws.root, '--manual', ws.manual, '--out', ws.out]).code, 0);
  assert.equal(run(['--check', '--root', ws.root, '--manual', ws.manual, '--out', ws.out]).code, 0);

  addRepo(ws.root, 'gamma', { pi: { service: 'gamma', port: 3010, healthEndpoint: '/health' } });
  const stale = run(['--check', '--root', ws.root, '--manual', ws.manual, '--out', ws.out]);
  assert.equal(stale.code, 1);
  assert.match(stale.stderr, /is stale\. Run: pnpm sync/);

  assert.equal(run(['--root', ws.root, '--manual', ws.manual, '--out', ws.out]).code, 0);
  assert.equal(run(['--check', '--root', ws.root, '--manual', ws.manual, '--out', ws.out]).code, 0);
});

test('a checkout with CRLF line endings is not reported as stale', (t) => {
  const ws = workspace(t);
  addRepo(ws.root, 'alpha', alpha);
  run(['--root', ws.root, '--manual', ws.manual, '--out', ws.out]);
  writeFileSync(ws.out, readFileSync(ws.out, 'utf8').replace(/\n/g, '\r\n'));
  assert.equal(run(['--check', '--root', ws.root, '--manual', ws.manual, '--out', ws.out]).code, 0);
});

test('the origin is recorded without credentials', (t) => {
  const ws = workspace(t);
  addRepo(ws.root, 'alpha', alpha);
  const repo = join(ws.root, 'alpha');
  execFileSync('git', ['-C', repo, 'init', '-q']);
  execFileSync('git', ['-C', repo, 'remote', 'add', 'origin', 'https://builder:s3cr3t-token@github.com/acme/alpha.git']);
  const result = run(['--root', ws.root, '--manual', ws.manual, '--out', ws.out]);
  assert.equal(result.code, 0, result.stderr);
  const content = readFileSync(ws.out, 'utf8');
  assert.doesNotMatch(content, /s3cr3t-token|builder:/);
  assert.match(content, /origin: https:\/\/github\.com\/acme\/alpha\.git/);
});

test('a plain folder inside another git repository does not borrow that repository origin', (t) => {
  const ws = workspace(t);
  execFileSync('git', ['-C', ws.root, 'init', '-q']);
  execFileSync('git', ['-C', ws.root, 'remote', 'add', 'origin', 'https://github.com/acme/workspace.git']);
  addRepo(ws.root, 'alpha', alpha);
  const { services } = buildEcosystem({ root: ws.root, manualPath: ws.manual });
  assert.equal(services[0].git, undefined);
});

test('an invalid manual file reports the problem and writes nothing', (t) => {
  const ws = workspace(t);
  writeFileSync(ws.manual, 'services: [unclosed\n');
  const result = run(['--root', ws.root, '--manual', ws.manual, '--out', ws.out]);
  assert.equal(result.code, 1);
  assert.match(result.stderr, /ecosystem\.manual\.yaml: invalid YAML/);
  assert.equal(existsSync(ws.out), false);
});

test('bad arguments exit 2 with usage', (t) => {
  const ws = workspace(t);
  const result = run(['--bogus', '--root', ws.root]);
  assert.equal(result.code, 2);
  assert.match(result.stderr, /unknown argument --bogus/);
  assert.match(result.stderr, /usage:/);
});

test('stripCredentials removes userinfo from http(s) URLs only', () => {
  assert.equal(stripCredentials('https://x-access-token:abc@github.com/a/b.git'), 'https://github.com/a/b.git');
  assert.equal(stripCredentials('https://github.com/a/b.git'), 'https://github.com/a/b.git');
  assert.equal(stripCredentials('git@github.com:a/b.git'), 'git@github.com:a/b.git');
});
