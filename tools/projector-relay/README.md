# projector-relay (temporary)

A small PIN-protected web page so volunteers on mobile data can route the Atlona to the two projectors and switch them on and off. Created 2026-11-02 for the Monday evening gathering; it closes itself at `PROJECTOR_EXPIRES_AT`.

Allow-list only. The relay calls these pigateway endpoints and nothing else:
`GET /api/v1/matrix`, `GET /api/v1/projectors/{proj1,proj2}`, `POST /api/v1/matrix/route` (input 1-4, output 1 and/or 2), `POST /api/v1/projectors/{proj1,proj2}/power`.

## Layout
```
phone --https--> VPS Traefik (TLS) --> 127.0.0.1/bridge:<tunnel port> --reverse ssh--> Pi projector-relay :3180 --> pigateway :3000 --> AMX
```
The relay runs on the Pi, so the pigateway API key and the PIN never leave it. The VPS only terminates TLS and forwards. Rate limits: 60 requests/min per address, 5 wrong PINs lock the address for 10 minutes. Sessions last 12 h at most and never past the expiry.

## Run (Pi)
`cp projector-relay.env.example /home/pi/apps/projector-relay.env`, fill in `PROJECTOR_PIN` and `PIGATEWAY_API_KEY` (if pigateway requires one for writes), then `node server.mjs` (Node 24, no dependencies). `deploy/projector-relay.service` is a user unit. Tests: `npm test` at the repo root.

## Remove afterwards
Stop and disable the unit, delete the env file, remove the VPS proxy rule and the extra tunnel forward.
