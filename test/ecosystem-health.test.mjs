import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkService, checkAll, main, resolvePort, healthUrl, HEALTH_TIMEOUT_MS } from '../scripts/ecosystem-health.mjs';

let server;
let base; // http://127.0.0.1:<port>
const seenKeys = [];

before(async () => {
  server = createServer((req, res) => {
    switch (req.url) {
      case '/health':
        res.writeHead(200, { 'content-type': 'application/json' }).end('{"ok":true}');
        break;
      case '/degraded':
        res.writeHead(503).end('loading');
        break;
      case '/redirect':
        res.writeHead(302, { location: '/health' }).end();
        break;
      case '/keyed':
        seenKeys.push(req.headers['x-api-key'] ?? null);
        res.writeHead(req.headers['x-api-key'] === 's3cret' ? 200 : 401).end();
        break;
      case '/hang':
        // never answers; the checker must give up after its timeout
        break;
      default:
        res.writeHead(404).end();
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
});

const port = () => server.address().port;

/** A port nothing listens on: bind, read the number, close. */
async function closedPort() {
  const probe = createServer();
  await new Promise((resolve) => probe.listen(0, '127.0.0.1', resolve));
  const n = probe.address().port;
  await new Promise((resolve) => probe.close(resolve));
  return n;
}

const entry = (over = {}) => ({
  service: 'svc',
  displayName: 'Svc',
  dir: 'svc-dir',
  port: port(),
  healthEndpoint: '/health',
  ...over,
});

const env = { PI_HOST: '127.0.0.1' };
const root = mkdtempSync(join(tmpdir(), 'piecosystem-health-'));
after(() => rmSync(root, { recursive: true, force: true }));

test('ONLINE for a 2xx answer, with latency and the probed URL', async () => {
  const row = await checkService(entry(), { root, env });
  assert.equal(row.state, 'ONLINE');
  assert.equal(row.httpStatus, 200);
  assert.equal(typeof row.latencyMs, 'number');
  assert.equal(row.url, `http://127.0.0.1:${port()}/health`);
});

test('DEGRADED for an answer that is not 2xx', async () => {
  const row = await checkService(entry({ healthEndpoint: '/degraded' }), { root, env });
  assert.equal(row.state, 'DEGRADED');
  assert.equal(row.httpStatus, 503);
  assert.equal(row.note, 'HTTP 503');
});

test('a redirect is not followed and counts as DEGRADED', async () => {
  const row = await checkService(entry({ healthEndpoint: '/redirect' }), { root, env });
  assert.equal(row.state, 'DEGRADED');
  assert.equal(row.httpStatus, 302);
});

test('OFFLINE when the connection is refused', async () => {
  const row = await checkService(entry({ port: await closedPort() }), { root, env });
  assert.equal(row.state, 'OFFLINE');
  assert.equal(row.httpStatus, null);
  assert.equal(row.note, 'ECONNREFUSED');
});

test('OFFLINE when nothing answers within the timeout', async () => {
  const started = Date.now();
  const row = await checkService(entry({ healthEndpoint: '/hang' }), { root, env, timeoutMs: 150 });
  assert.equal(row.state, 'OFFLINE');
  assert.equal(row.note, 'no answer within 150 ms');
  assert.ok(Date.now() - started < 1500, 'the check gave up on its own timer');
});

test('the default timeout is 1500 ms', () => {
  assert.equal(HEALTH_TIMEOUT_MS, 1500);
});

test('STATIC for an entry without a port (library or non-HTTP service), with no request made', async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    throw new Error('must not be called');
  };
  const row = await checkService({ service: 'lib', dir: 'lib-dir' }, { root, env, fetchImpl });
  assert.equal(row.state, 'STATIC');
  assert.equal(row.url, null);
  assert.equal(calls, 0);
});

test('the API key from healthAuthEnv is sent as X-Api-Key, and absent when the variable is unset', async () => {
  seenKeys.length = 0;
  const keyed = entry({ healthEndpoint: '/keyed', healthAuthEnv: 'SVC_KEY' });
  const withKey = await checkService(keyed, { root, env: { ...env, SVC_KEY: 's3cret' } });
  assert.equal(withKey.state, 'ONLINE');
  const withoutKey = await checkService(keyed, { root, env });
  assert.equal(withoutKey.state, 'DEGRADED');
  assert.deepEqual(seenKeys, ['s3cret', null]);
});

test('the only request made is a GET, and the key never appears in the result', async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, method: init.method });
    return new Response(null, { status: 200 });
  };
  const row = await checkService(entry({ healthAuthEnv: 'SVC_KEY' }), { root, env: { ...env, SVC_KEY: 'topsecret' }, fetchImpl });
  assert.equal(row.state, 'ONLINE');
  assert.deepEqual(calls.map((c) => c.method), ['GET']);
  assert.doesNotMatch(JSON.stringify(row), /topsecret/);
});

test('hostOverride replaces PI_HOST for that service', async () => {
  const row = await checkService(entry({ hostOverride: '127.0.0.1' }), { root, env: { PI_HOST: 'unreachable.invalid' } });
  assert.equal(row.state, 'ONLINE');
  assert.match(row.url, /^http:\/\/127\.0\.0\.1:/);
});

test('envPortVar, when set where the check runs, replaces the port; a bad value is ignored', () => {
  const e = { port: 3300, envPortVar: 'SVC_PORT' };
  assert.equal(resolvePort(e, { SVC_PORT: '4444' }), 4444);
  assert.equal(resolvePort(e, { SVC_PORT: 'nope' }), 3300);
  assert.equal(resolvePort(e, { SVC_PORT: '70000' }), 3300);
  assert.equal(resolvePort(e, {}), 3300);
});

test('IPv6 literals are bracketed in the URL', () => {
  assert.equal(healthUrl('::1', 3100, '/health'), 'http://[::1]:3100/health');
  assert.equal(healthUrl('pi.local', 3100, '/health'), 'http://pi.local:3100/health');
});

test('checkAll probes in parallel and keeps the input order', async () => {
  const entries = [
    entry({ service: 'a', healthEndpoint: '/health' }),
    entry({ service: 'b', healthEndpoint: '/degraded' }),
    { service: 'c', dir: 'c-dir' },
  ];
  const rows = await checkAll(entries, { root, env });
  assert.deepEqual(rows.map((r) => [r.service, r.state]), [
    ['a', 'ONLINE'],
    ['b', 'DEGRADED'],
    ['c', 'STATIC'],
  ]);
});

test('the CLI reads ecosystem.yaml, reports git facts, and --fail-on-unhealthy exits 1', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'piecosystem-cli-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const ws = join(dir, 'ws');
  mkdirSync(join(ws, 'svc-dir'), { recursive: true });
  writeFileSync(join(ws, 'svc-dir', 'pnpm-lock.yaml'), 'lockfileVersion: 9\n');
  const file = join(dir, 'ecosystem.yaml');
  writeFileSync(
    file,
    [
      'schema: 1',
      'services:',
      '  - service: svc',
      '    dir: svc-dir',
      `    port: ${port()}`,
      '    healthEndpoint: /degraded',
      '  - service: lib',
      '    dir: lib-dir',
      '',
    ].join('\n'),
  );
  const out = [];
  const err = [];
  const io = { stdout: { write: (s) => out.push(s) }, stderr: { write: (s) => err.push(s) } };

  const json = await main(['--json', '--file', file, '--root', ws], env, io);
  assert.equal(json, 0);
  const parsed = JSON.parse(out.join(''));
  assert.deepEqual(parsed.services.map((s) => s.state), ['DEGRADED', 'STATIC']);
  assert.equal(parsed.services[0].git.packageManager, 'pnpm');
  assert.equal(parsed.services[1].git.present, false);

  out.length = 0;
  assert.equal(await main(['--fail-on-unhealthy', '--file', file, '--root', ws], env, io), 1);
  assert.match(out.join(''), /DEGRADED 1 · OFFLINE 0 · STATIC 1|ONLINE 0 · DEGRADED 1/);

  out.length = 0;
  assert.equal(await main(['--file', join(dir, 'missing.yaml')], env, io), 2);
  assert.equal(await main(['--nope'], env, io), 2);
  assert.equal(err.length >= 2, true);
});
