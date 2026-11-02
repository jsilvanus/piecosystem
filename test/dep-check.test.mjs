import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { satisfies, collectRepo, analyse, listRepos } from '../scripts/dep-check.mjs';

let root;
const w = (p, o) => { mkdirSync(join(root, p, '..'), { recursive: true }); writeFileSync(join(root, p), typeof o === 'string' ? o : JSON.stringify(o)); };

before(() => {
  root = mkdtempSync(join(tmpdir(), 'depcheck-'));
  w('pia/package.json', { name: 'pia', dependencies: { fastify: '^5.2.0', zod: '^3.24.0' } });
  w('pia/pnpm-lock.yaml', "lockfileVersion: '9.0'\nimporters:\n  .:\n    dependencies:\n      fastify:\n        specifier: ^5.2.0\n        version: 5.12.7\n      zod:\n        specifier: ^3.24.0\n        version: 3.25.76(foo@1)\n");
  w('pia/package-lock.json', { lockfileVersion: 3, packages: { '': { dependencies: { fastify: '^5.2.0', zod: '^3.24.0' } }, 'node_modules/fastify': { version: '5.2.1' }, 'node_modules/zod': { version: '3.25.76' } } });
  w('pib/package.json', { name: 'pib', dependencies: { fastify: '^5.2.1', zod: '^4.0.0' } });
  w('pib/pnpm-lock.yaml', "lockfileVersion: '9.0'\nimporters:\n  .:\n    dependencies:\n      fastify:\n        specifier: ^5.2.1\n        version: 5.12.7\n      zod:\n        specifier: ^4.0.0\n        version: 3.25.76\n");
  w('other/package.json', {});
});
after(() => rmSync(root, { recursive: true, force: true }));

test('satisfies handles caret, tilde and non-semver specs', () => {
  assert.equal(satisfies('5.12.7', '^5.2.0'), true);
  assert.equal(satisfies('0.2.5', '^0.2.1'), true);
  assert.equal(satisfies('0.3.0', '^0.2.1'), false);
  assert.equal(satisfies('1.2.9', '~1.2.3'), true);
  assert.equal(satisfies('1.3.0', '~1.2.3'), false);
  assert.equal(satisfies('2.0.0', '>=1 <2 || ^2.1'), false);
  assert.equal(satisfies('1.0.0', 'github:a/b'), null);
});

test('only pi* repos with a package.json are listed', () => {
  assert.deepEqual(listRepos(root), ['pia', 'pib']);
});

test('finds range, version, lock mismatches and drift', () => {
  const repos = ['pia', 'pib'].map((r) => collectRepo(root, r));
  const { findings } = analyse(repos);
  const kinds = findings.map((f) => `${f.kind}:${f.package}`);
  assert.ok(kinds.includes('range-mismatch:fastify'));
  assert.ok(kinds.includes('range-mismatch:zod'));
  assert.ok(!kinds.includes('version-mismatch:zod'));
  assert.ok(kinds.includes('lock-mismatch:fastify'));
  assert.ok(kinds.includes('lock-drift:zod'));
  assert.ok(!kinds.includes('lock-mismatch:zod'));
});
