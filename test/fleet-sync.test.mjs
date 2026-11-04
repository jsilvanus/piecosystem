import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { CANONICAL_REPOS, syncRepo } from '../scripts/fleet-sync.mjs';

test('CANONICAL_REPOS covers core Pi services and seam projects', () => {
  assert.ok(CANONICAL_REPOS.includes('picam'));
  assert.ok(CANONICAL_REPOS.includes('pigateway'));
  assert.ok(CANONICAL_REPOS.includes('pimatrix'));
  assert.ok(CANONICAL_REPOS.includes('keskuskirkko'));
  assert.ok(CANONICAL_REPOS.includes('canva-pieco-app'));
  assert.ok(CANONICAL_REPOS.includes('virtual-screen-streamer'));
  // Ensure deleted repo is not present
  assert.ok(!CANONICAL_REPOS.includes('piecosystem-riihimaki'));
});

test('syncRepo reports NOT CLONED for non-existent repo when clone is false', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'fleet-test-'));
  try {
    const res = syncRepo('non-existent-repo', {
      root: tmp,
      clone: false,
      fetch: false,
      pull: false,
      stash: false,
    });
    assert.equal(res.status, 'NOT CLONED');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('syncRepo reports NOT GIT for a directory that is not a repository', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'fleet-test-'));
  try {
    const repoDir = join(tmp, 'dummy-dir');
    mkdirSync(repoDir, { recursive: true });
    const res = syncRepo('dummy-dir', {
      root: tmp,
      clone: false,
      fetch: false,
      pull: false,
      stash: false,
    });
    assert.equal(res.status, 'NOT GIT');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('syncRepo inspects a valid git repository cleanly', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'fleet-test-'));
  try {
    const repoDir = join(tmp, 'sample-repo');
    mkdirSync(repoDir, { recursive: true });
    execFileSync('git', ['-C', repoDir, 'init', '-b', 'main']);
    execFileSync('git', ['-C', repoDir, 'config', 'user.email', 'test@example.com']);
    execFileSync('git', ['-C', repoDir, 'config', 'user.name', 'Tester']);
    writeFileSync(join(repoDir, 'file.txt'), 'hello');
    execFileSync('git', ['-C', repoDir, 'add', '.']);
    execFileSync('git', ['-C', repoDir, 'commit', '-m', 'initial']);

    const res = syncRepo('sample-repo', {
      root: tmp,
      clone: false,
      fetch: false,
      pull: false,
      stash: false,
    });
    assert.equal(res.repo, 'sample-repo');
    assert.equal(res.branch, 'main');
    assert.equal(res.dirty, 'clean');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
