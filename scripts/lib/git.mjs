import { execFileSync } from 'node:child_process';
import { existsSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';

/** Runs git read-only in `dir`; returns trimmed stdout or null on any failure. */
function git(dir, args) {
  try {
    return execFileSync('git', ['-C', dir, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

/**
 * True when `dir` is the top of its own git repository. A plain folder inside
 * some other repository (for example a parent checkout) must not be reported
 * as that repository's branch or origin.
 */
export function isOwnRepo(dir) {
  if (!existsSync(dir)) return false;
  const top = git(dir, ['rev-parse', '--show-toplevel']);
  if (!top) return false;
  try {
    return realpathSync(top) === realpathSync(resolve(dir));
  } catch {
    return false;
  }
}

/** Removes user:password@ or token@ from an http(s) URL so it can be written to a file. */
export function stripCredentials(url) {
  return url.replace(/^([a-z][a-z0-9+.-]*:\/\/)[^/@]+@/i, '$1');
}

export function gitOrigin(dir) {
  if (!isOwnRepo(dir)) return null;
  const url = git(dir, ['config', '--get', 'remote.origin.url']);
  return url ? stripCredentials(url) : null;
}

export function gitBranch(dir) {
  if (!isOwnRepo(dir)) return null;
  return git(dir, ['rev-parse', '--abbrev-ref', 'HEAD']);
}

/** Number of entries in `git status --porcelain`, or null when not a repository. */
export function gitDirtyCount(dir) {
  if (!isOwnRepo(dir)) return null;
  const out = git(dir, ['status', '--porcelain']);
  if (out === null) return null;
  return out.split('\n').filter(Boolean).length;
}
