# pitally → pitally rename (2026-11-02)

The tally light service `pitally` is now `pitally`. The name `pitally` is reserved for a future church room-lighting service.

## What changed

| Old | New |
|---|---|
| repo `jsilvanus/pitally` | `jsilvanus/pitally` |
| npm package, CLI binary `pitally` | `pitally` (`bin/pitally.mjs`) |
| `PITALLY_PORT`, `PITALLY_HOST`, `PITALLY_CLOUD_BROKER`, `PITALLY_DEVICES` | `PITALLY_*` (same meaning, port still 3107) |
| `/health` service name `pitally` | `pitally` |
| picontrol: `PITALLY_URL`, `VITE_PITALLY_URL`, `?pitally=` query | `PITALLY_URL`, `VITE_PITALLY_URL`, `?pitally=` |
| picontrol-mcp: `PITALLY_URL`, `PITALLY_API_KEY` | `PITALLY_URL`, `PITALLY_API_KEY` |
| pigateway: `PIGATEWAY_PITALLY_API_URL`, ecosystem component id `pitally` | `PIGATEWAY_PITALLY_API_URL`, id `pitally` |
| pirundown: `PIRUNDOWN_PITALLY_URL`, `PITALLY_URL` | `PIRUNDOWN_PITALLY_URL`, `PITALLY_URL` |

Old env var names are **not** read any more. A service still using them falls back to the default (`http://127.0.0.1:3107`).

## Pi-side steps (apply in the "Move Pi services to pnpm" thread, not yet done)

1. Rename the repo on GitHub first (Settings → General → Repository name → `pitally`); GitHub redirects the old URL.
2. On kirkonpi: `cd /home/pi/apps && mv pitally pitally && cd pitally && git remote set-url origin https://github.com/jsilvanus/pitally.git && git pull`.
3. Rename the env file (e.g. `pitally.env` → `pitally.env`) and rename every `PITALLY_*` variable inside to `PITALLY_*`.
4. Rename the systemd user unit: `systemctl --user disable --now pitally`, move `~/.config/systemd/user/pitally.service` to `pitally.service`, fix `WorkingDirectory`, `EnvironmentFile`, `ExecStart` (`dist/main.js` path), then `systemctl --user daemon-reload && systemctl --user enable --now pitally`.
5. In the env files of pigateway, pirundown, picontrol, picontrol-mcp rename `PIGATEWAY_PITALLY_API_URL`, `PIRUNDOWN_PITALLY_URL`, `PITALLY_URL`, `PITALLY_API_KEY` as in the table, rebuild picontrol UI (`ui/dist` is committed, already updated), restart those units.
6. Check `curl http://127.0.0.1:3107/health` returns `"service":"pitally"` and that pigateway's ecosystem shows component `pitally`. Remember: any thread that stops pigateway must start it again.
