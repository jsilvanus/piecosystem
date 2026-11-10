# pi-backup: config bundle for a microSD swap

Back up what a Pi needs beyond its git checkouts (env files, user units, ssh, nginx, certbot, MediaMTX config, network,
boot config) into one **age-encrypted** bundle, and restore it onto a fresh card. Plain bash + `tar` + `age`
(`apt install age`), so the restore works on a bare image before Node is installed.

This directory is public: it holds tooling and a list of *paths* only. Bundles, keys, addresses and the site's own
path additions never go here.

## Keys

The Pi holds only the **public** recipient; it cannot decrypt its own bundles. Make the key pair somewhere else:

```sh
age-keygen -o pi-backup.key          # keep this file off the Pi (password manager + one offline copy)
age-keygen -y pi-backup.key          # the age1... line goes into the Pi's recipients file
```

On the Pi: `~/.config/pi-backup/recipients.txt` (one `age1...` per line; several = several people can restore).

## Back up

```sh
tools/pi-backup/pi-backup.sh --list               # names and sizes only, writes nothing: review this first
tools/pi-backup/pi-backup.sh                      # user part -> ~/backups/<host>-user-<UTC>.tar.age
sudo tools/pi-backup/pi-backup.sh --system        # user + root-owned files -> ~/backups/<host>-full-<UTC>.tar.age
```

- No plaintext mode: without a recipient it stops. The archive is streamed into `age`; no `.tar` is written.
- `--keep N` (default 14) keeps the newest N bundles of each kind.
- Paths: `manifest.conf` (`[user]`, `[system]`; `~` = the target user's home). Site additions go in
  `~/.config/pi-backup/manifest.local.conf` on the Pi (same format), not in this repo.
- The bundle also carries `.pi-backup/`: file list, each `~/apps/*` repo (remote, branch, commit), enabled user and
  system units, linger, `apt-mark showmanual`, crontab, Node/pnpm versions, users and groups (with `--system`).

Get bundles off the Pi by **pulling** (e.g. `scp` from a machine that already has ssh to the Pi); the Pi needs no
outbound credential. Store the `.age` files in a private place; they are ciphertext.

## Restore onto a fresh card

```sh
pi-restore.sh <bundle>.tar.age --identity pi-backup.key            # dry run: new / changed / same per file
pi-restore.sh <bundle>.tar.age --identity pi-backup.key --only user --apply
sudo pi-restore.sh <bundle>.tar.age --identity pi-backup.key --only system --apply
less ./rebuild-steps.sh && ./rebuild-steps.sh                       # packages, repos (main), units, linger
```

- `--apply` writes the files with their saved mode (and owner, when run as root). A file that already exists and
  differs is kept as `<file>.pre-restore`.
- `rebuild-steps.sh` is generated, never run by the script. Repos are cloned at `main` (devices deploy from main);
  the backed-up commit is noted beside each clone. Any `user:token@` in a remote URL is dropped.
- Users created by hand (e.g. a tunnel user) are listed in step 6 of `rebuild-steps.sh`: create them before restoring
  the system part, so their files get the right owner.
- The dry run decrypts into a private temp directory (mode 700) that is removed on exit.

## Tests

`pnpm test` runs `test/pi-backup.test.mjs` against a fake root with a stub `age`. A real `age` round trip was checked
by hand. **Not run on a Pi yet**; the real paths of MediaMTX, nginx, certbot and the network config are to be confirmed
there (read-only `--list`).
