import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync, execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, statSync, existsSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(dirname(fileURLToPath(import.meta.url)));
const backup = join(dir, "pi-backup.sh");
const restore = join(dir, "pi-restore.sh");

// A stub "age" so the tests need no real keys: encrypt = header + stdin, decrypt = strip header.
function stubBin(base) {
  const bin = join(base, "bin");
  mkdirSync(bin);
  writeFileSync(join(bin, "age"), `#!/usr/bin/env bash
set -e
mode=enc; out=""; rec=""; id=""; in=""
while [ $# -gt 0 ]; do case "$1" in -d) mode=dec;; -R) rec="$2"; shift;; -i) id="$2"; shift;; -o) out="$2"; shift;; *) in="$1";; esac; shift; done
if [ $mode = enc ]; then [ -s "$rec" ] || exit 9; { echo STUBAGE; cat; } > "$out"
else [ -s "$id" ] || exit 9; tail -n +2 "$in"; fi
`);
  chmodSync(join(bin, "age"), 0o755);
  return bin;
}

function put(root, path, content, mode = 0o644) {
  const p = join(root, path);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, content);
  chmodSync(p, mode);
}

function setup() {
  const base = mkdtempSync(join(tmpdir(), "pi-backup-"));
  const root = join(base, "root");
  const home = "/home/pi";
  put(root, "home/pi/apps/pitube.env", "PITUBE_SECRET=abc123\n", 0o600);
  put(root, "home/pi/apps/foo/.env", "FOO=1\n", 0o600);
  put(root, "home/pi/apps/foo/foo.env.example", "FOO=\n");
  put(root, "home/pi/apps/notes.txt", "not config\n");
  put(root, "home/pi/.config/systemd/user/pitube.service", "[Service]\n");
  put(root, "home/pi/.config/pi-backup/recipients.txt", "# key\nage1testrecipient\n");
  put(root, "etc/nginx/sites-available/default", "server {}\n");
  put(root, "etc/ssh/ssh_host_ed25519_key", "HOSTKEY\n", 0o600);
  const repo = join(root, "home/pi/apps/pitube");
  mkdirSync(repo, { recursive: true });
  const git = (...a) => execFileSync("git", ["-C", repo, ...a], { stdio: "pipe" });
  git("init", "-q", "-b", "main");
  git("-c", "user.email=t@t", "-c", "user.name=t", "commit", "-q", "--allow-empty", "-m", "x");
  git("remote", "add", "origin", "https://someone:ghp_token@github.com/example/pitube.git");
  const env = { ...process.env, PATH: `${stubBin(base)}:${process.env.PATH}`, PI_BACKUP_SKIP_PROBES: "1" };
  const out = join(base, "out");
  const run = (script, args) => spawnSync("bash", [script, ...args], { env, encoding: "utf8", cwd: base });
  const common = ["--root", root, "--home", home, "--user", "pi", "--host", "testpi", "--out", out];
  return { base, root, out, run, common };
}

test("--list names only manifest files and never prints contents", () => {
  const s = setup();
  const r = s.run(backup, [...s.common, "--list"]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /\/home\/pi\/apps\/pitube\.env/);
  assert.match(r.stdout, /\/home\/pi\/apps\/foo\/\.env/);
  assert.match(r.stdout, /pitube\.service/);
  assert.doesNotMatch(r.stdout, /example|notes\.txt|nginx|ssh_host/);
  assert.doesNotMatch(r.stdout, /abc123/);
  assert.equal(existsSync(s.out), false);
});

test("refuses to write a bundle without a recipient", () => {
  const s = setup();
  put(s.root, "home/pi/.config/pi-backup/recipients.txt", "# nothing yet\n");
  const r = s.run(backup, [...s.common]);
  assert.equal(r.status, 3);
  assert.match(r.stderr, /refusing/);
  assert.equal(existsSync(s.out) && readdirSync(s.out).length > 0, false);
});

test("bundle goes through age, mode 600, no plaintext tar left", () => {
  const s = setup();
  const r = s.run(backup, [...s.common]);
  assert.equal(r.status, 0, r.stderr);
  const files = readdirSync(s.out);
  assert.equal(files.length, 1);
  assert.match(files[0], /^testpi-user-\d{8}T\d{6}Z\.tar\.age$/);
  const path = join(s.out, files[0]);
  assert.equal(statSync(path).mode & 0o777, 0o600);
  assert.equal(readFileSync(path, "latin1").slice(0, 8), "STUBAGE\n");
});

test("--system adds system files; restore dry run writes nothing; --apply restores modes", () => {
  const s = setup();
  assert.equal(s.run(backup, [...s.common, "--system"]).status, 0);
  const bundle = join(s.out, readdirSync(s.out)[0]);
  assert.match(bundle, /testpi-full-/);
  const key = join(s.base, "key.txt");
  writeFileSync(key, "AGE-SECRET-KEY-TEST\n");
  const target = join(s.base, "fresh");
  mkdirSync(target);
  const steps = join(s.base, "rebuild-steps.sh");

  const dry = s.run(restore, [bundle, "--identity", key, "--root", target, "--steps", steps]);
  assert.equal(dry.status, 0, dry.stderr);
  assert.match(dry.stdout, /new +\/etc\/ssh\/ssh_host_ed25519_key/);
  assert.match(dry.stdout, /new +\/home\/pi\/apps\/pitube\.env/);
  assert.match(dry.stdout, /dry run/);
  assert.deepEqual(readdirSync(target), []);

  const text = readFileSync(steps, "utf8");
  assert.match(text, /git clone -b main https:\/\/github\.com\/example\/pitube\.git/);
  assert.doesNotMatch(text, /ghp_token|someone/);
  assert.match(text, /systemctl --user enable pitube\.service/);

  const userOnly = s.run(restore, [bundle, "--identity", key, "--root", target, "--steps", steps, "--only", "user", "--apply"]);
  assert.equal(userOnly.status, 0, userOnly.stderr);
  assert.equal(existsSync(join(target, "etc")), false);
  const env = join(target, "home/pi/apps/pitube.env");
  assert.equal(readFileSync(env, "utf8"), "PITUBE_SECRET=abc123\n");
  assert.equal(statSync(env).mode & 0o777, 0o600);

  writeFileSync(env, "edited\n");
  const all = s.run(restore, [bundle, "--identity", key, "--root", target, "--steps", steps, "--apply"]);
  assert.equal(all.status, 0, all.stderr);
  assert.match(all.stdout, /changed +\/home\/pi\/apps\/pitube\.env/);
  assert.equal(readFileSync(env + ".pre-restore", "utf8"), "edited\n");
  assert.equal(readFileSync(join(target, "etc/ssh/ssh_host_ed25519_key"), "utf8"), "HOSTKEY\n");
});

test("an .age bundle without --identity is refused", () => {
  const s = setup();
  s.run(backup, [...s.common]);
  const bundle = join(s.out, readdirSync(s.out)[0]);
  const r = s.run(restore, [bundle, "--root", join(s.base, "x")]);
  assert.equal(r.status, 2);
});

test("--keep prunes older bundles of the same kind", () => {
  const s = setup();
  mkdirSync(s.out, { recursive: true });
  for (const t of ["20260101T000000Z", "20260102T000000Z", "20260103T000000Z"]) writeFileSync(join(s.out, `testpi-user-${t}.tar.age`), "x");
  writeFileSync(join(s.out, "testpi-full-20260101T000000Z.tar.age"), "x");
  assert.equal(s.run(backup, [...s.common, "--keep", "2"]).status, 0);
  const left = readdirSync(s.out).sort();
  assert.equal(left.filter((f) => f.includes("-user-")).length, 2);
  assert.ok(left.includes("testpi-full-20260101T000000Z.tar.age"));
  assert.ok(!left.includes("testpi-user-20260102T000000Z.tar.age"));
});
