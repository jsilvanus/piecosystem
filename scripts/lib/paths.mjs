import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The piecosystem repository root (the directory holding package.json). */
export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * Directory whose children are the ecosystem repositories.
 * PI_ROOT wins; otherwise the parent of the piecosystem checkout.
 */
export function defaultRoot(env = process.env) {
  return env.PI_ROOT ? resolve(env.PI_ROOT) : resolve(REPO_ROOT, '..');
}
