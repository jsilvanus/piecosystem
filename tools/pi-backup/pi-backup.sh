#!/usr/bin/env bash
# pi-backup.sh: put a Pi's config (env files, units, ssh, nginx, certs, network...) in one
# age-encrypted bundle, so a fresh microSD can be restored with pi-restore.sh.
# There is no plaintext mode: the bundle is always encrypted to the recipients file.
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: pi-backup.sh [options]
  --list               print the files that would be taken (names and sizes only), write nothing
  --system             also take the [system] section (run with sudo)
  --recipients FILE    age recipients (public keys); default ~/.config/pi-backup/recipients.txt
  --out DIR            where bundles go; default ~/backups
  --keep N             keep the newest N bundles of this kind; default 14
  --manifest FILE      default: manifest.conf next to this script
  --user NAME          whose home "~" means; default $SUDO_USER or $USER
  --home DIR           that user's home (default from getent)
  --host NAME          name in the bundle file; default hostname -s
  --root DIR           prefix for every path (tests); default /
EOF
}

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
list=0; system=0; recipients=""; out=""; keep=14; manifest="$here/manifest.conf"
user="${SUDO_USER:-${USER:-$(id -un)}}"; home=""; host=""; root="/"

while [ $# -gt 0 ]; do
  case "$1" in
    --list) list=1 ;;
    --system) system=1 ;;
    --recipients) recipients="$2"; shift ;;
    --out) out="$2"; shift ;;
    --keep) keep="$2"; shift ;;
    --manifest) manifest="$2"; shift ;;
    --user) user="$2"; shift ;;
    --home) home="$2"; shift ;;
    --host) host="$2"; shift ;;
    --root) root="$2"; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "pi-backup: unknown option $1" >&2; usage >&2; exit 2 ;;
  esac
  shift
done

root="${root%/}"
[ -n "$home" ] || home="$(getent passwd "$user" | cut -d: -f6 || true)"
[ -n "$home" ] || { echo "pi-backup: cannot find the home of $user (use --home)" >&2; exit 2; }
home="${home%/}"
[ -n "$host" ] || host="$(hostname -s 2>/dev/null || echo pi)"
[ -n "$recipients" ] || recipients="$root$home/.config/pi-backup/recipients.txt"
[ -n "$out" ] || out="$root$home/backups"
[[ "$keep" =~ ^[0-9]+$ ]] || { echo "pi-backup: --keep needs a number" >&2; exit 2; }
[ -f "$manifest" ] || { echo "pi-backup: manifest $manifest not found" >&2; exit 2; }
if [ "$system" = 1 ] && [ "$(id -u)" != 0 ] && [ "$root" = "" ]; then
  echo "pi-backup: --system needs root (sudo)" >&2; exit 2
fi

# Read the manifest (plus the site's local additions) into patterns for the chosen sections.
patterns=()
read_manifest() {
  local file="$1" section="" line
  while IFS= read -r line || [ -n "$line" ]; do
    line="${line%%#*}"; line="$(echo "$line" | sed 's/[[:space:]]*$//; s/^[[:space:]]*//')"
    [ -n "$line" ] || continue
    case "$line" in
      "[user]") section=user; continue ;;
      "[system]") section=system; continue ;;
      "["*"]") section=other; continue ;;
    esac
    if [ "$section" = user ] || { [ "$section" = system ] && [ "$system" = 1 ]; }; then
      case "$line" in "~/"*) line="$home/${line#\~/}" ;; esac
      case "$line" in /*) patterns+=("$line") ;; *) echo "pi-backup: skipping relative path $line" >&2 ;; esac
    fi
  done < "$file"
}
read_manifest "$manifest"
local_manifest="$root$home/.config/pi-backup/manifest.local.conf"
[ -f "$local_manifest" ] && read_manifest "$local_manifest"

# Expand globs under the root; names in the list are relative to the root.
shopt -s nullglob dotglob
files=()
for p in "${patterns[@]}"; do
  for m in $root$p; do
    [ -e "$m" ] || [ -L "$m" ] || continue
    files+=("${m#"$root"/}")
  done
done
shopt -u nullglob dotglob
mapfile -t files < <(printf '%s\n' "${files[@]+"${files[@]}"}" | sed '/^$/d' | sort -u)

if [ "$list" = 1 ]; then
  for f in "${files[@]+"${files[@]}"}"; do
    if [ -d "$root/$f" ] && [ ! -L "$root/$f" ]; then
      printf '/%s/ (%s files)\n' "$f" "$(find "$root/$f" -type f 2>/dev/null | wc -l | tr -d ' ')"
    else
      printf '/%s (%s bytes)\n' "$f" "$(stat -c %s "$root/$f" 2>/dev/null || echo ?)"
    fi
  done
  echo "${#files[@]} entries; section: $([ "$system" = 1 ] && echo user+system || echo user)"
  exit 0
fi

# Recipients are required: there is no plaintext output.
if [ ! -s "$recipients" ] || ! grep -qv '^[[:space:]]*\(#.*\)\?$' "$recipients"; then
  echo "pi-backup: no age recipient in $recipients; refusing to write a bundle" >&2; exit 3
fi
command -v age >/dev/null || { echo "pi-backup: age is not installed (apt install age)" >&2; exit 3; }

umask 077
work="$(mktemp -d)"; trap 'rm -rf "$work"' EXIT
meta="$work/.pi-backup"; mkdir -p "$meta"

# Inventory: what is not a file but is needed to rebuild (repos, enabled units, packages).
printf '%s\n' "${files[@]+"${files[@]}"}" > "$meta/files.txt"
{
  echo "created=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "host=$host"; echo "user=$user"; echo "home=$home"
  echo "sections=$([ "$system" = 1 ] && echo user,system || echo user)"
} > "$meta/info.txt"
: > "$meta/repos.tsv"
for d in "$root$home"/apps/*/; do
  [ -d "$d/.git" ] || continue
  name="$(basename "$d")"
  url="$(git -C "$d" remote get-url origin 2>/dev/null || true)"
  branch="$(git -C "$d" rev-parse --abbrev-ref HEAD 2>/dev/null || true)"
  commit="$(git -C "$d" rev-parse HEAD 2>/dev/null || true)"
  printf '%s\t%s\t%s\t%s\n' "$name" "$url" "$branch" "$commit" >> "$meta/repos.tsv"
done
probe() { local name="$1"; shift; "$@" > "$meta/$name" 2>/dev/null || true; }
if [ "${PI_BACKUP_SKIP_PROBES:-0}" != 1 ]; then
  as_user() { if [ "$(id -u)" = 0 ] && [ "$user" != root ]; then sudo -u "$user" XDG_RUNTIME_DIR="/run/user/$(id -u "$user")" "$@"; else "$@"; fi; }
  probe systemd-user-enabled.txt as_user systemctl --user list-unit-files --state=enabled --no-legend
  probe linger.txt loginctl show-user "$user" -p Linger
  probe apt-manual.txt apt-mark showmanual
  probe crontab.txt as_user crontab -l
  probe versions.txt sh -c 'cat /etc/os-release; uname -a; echo "node $(node -v 2>/dev/null)"; echo "pnpm $(pnpm -v 2>/dev/null)"'
  probe pnpm-global.txt as_user pnpm ls -g --depth=0
  if [ "$system" = 1 ]; then
    probe users.txt sh -c 'getent passwd | awk -F: "\$3>=1000 && \$3<60000" | while IFS=: read -r n _ u g _ h s; do echo "$n:$u:$h:$s:$(id -nG "$n" | tr " " ",")"; done'
    probe systemd-system-enabled.txt systemctl list-unit-files --state=enabled --no-legend
  fi
fi

kind="$([ "$system" = 1 ] && echo full || echo user)"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$out"
dest="$out/$host-$kind-$stamp.tar.age"
# Stream straight into age: no plaintext archive is written to disk.
tar -cf - --numeric-owner -C "${root:-/}" "${files[@]+"${files[@]}"}" -C "$work" .pi-backup \
  | age -R "$recipients" -o "$dest.part"
mv "$dest.part" "$dest"
chmod 600 "$dest"
if [ "$(id -u)" = 0 ] && [ "$user" != root ] && [ -z "$root" ]; then chown "$user": "$dest" "$out" 2>/dev/null || true; fi

# Keep the newest N of this kind.
mapfile -t old < <(ls -1 "$out"/"$host-$kind-"*.tar.age 2>/dev/null | sort -r | tail -n +"$((keep + 1))")
for f in "${old[@]+"${old[@]}"}"; do rm -f -- "$f"; done

echo "$dest (${#files[@]} entries)"
