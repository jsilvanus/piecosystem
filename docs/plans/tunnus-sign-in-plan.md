# Tunnus sign-in for the Pi ecosystem

Status: plan only, nothing implemented. Written 2026-11-23.

[Tunnus](https://github.com/jsilvanus/tunnus) is the parish's self-hosted OpenID Connect provider (email one-time code, no passwords, stable `sub`, `email`, `name`, `groups`). The parish already runs it. This plan says how the Pi ecosystem uses it for **people**, and what stays as it is for **machines**.

Church-specific values (issuer URL, client ids and secrets, group-to-person assignments, redirect hosts, IPs) are not written here. They live in the private `jsilvanus/keskuskirkko` repo and in the Pi and VPS environment files. This document uses placeholders.

## 1. What Tunnus gives us (read from its repo, not run)

- Authorization code flow with PKCE, discovery, JWKS (RS256), userinfo, refresh tokens (only with `offline_access` and `prompt=consent`), RP-initiated logout, back-channel logout (`backchannel_logout_uri` per client).
- Claims: `sub` (random UUID, never reused), `email` (always verified), `name`, `groups` (array of plain strings; `/` is only a naming convention). A client with `always_include_groups` gets `groups` in the ID token without asking.
- Access tokens are JWTs (RS256) and Tunnus supports resource indicators (RFC 8707) for MCP; this matters for `picontrol-mcp` later.
- Clients are declared in a JSON file (`CLIENTS_FILE`), no dynamic registration. Groups are managed through the admin API, the `tunnus` CLI or `tunnus-mcp`.
- Sign-up is open to every address matching `SIGNUP_EMAIL_ALLOW`, and every new user joins `DEFAULT_GROUPS`. **So a media group must never be a default group**, or every parish mailbox would get control of the church AV. Media groups are granted by an admin only.
- Unverified: we have not run Tunnus against our apps. Token lifetimes in its docs (access 10 min, refresh 30 days, session 14 days sliding) are defaults.

## 2. Today's auth landscape

| Surface | Auth now | People or machines |
|---|---|---|
| picontrol UI via pigateway UI listeners (LAN 3011, relay 3012) | One shared PIN, 24 h sliding session, role from the listener socket (`lan` or `relay`), operator-PC IP exemption on LAN only | People |
| pigateway full API and its upstreams (pitube, pimatrix, piprogram, pistorage, ...) | `PIGATEWAY_API_KEY` and per-service keys | Machines |
| Canva tunnel listener | Bearer key | Machine (the Canva plugin) |
| AMX link, FreeD, MediaMTX | Network trust | Machines |
| web-radio-relay (VPS) admin and API | Own keys | Both |
| LCYT | Own JWT and API keys | Both |
| saarnavideo | Shared `ACCESS_SECRET` gate, no accounts | People |
| Sissi signage, fffleet | Keys or none | Machines |

`pigateway/docs/picontrol-ui.md` already says the auth is pluggable (`UiAuthAdapter`) and that an OIDC adapter can replace the PIN without touching the routes. That is the first integration point.

## 3. Principles

1. **One enforcement point for people: pigateway.** The picontrol UI is the only human door into the Pi apps. pigateway verifies the Tunnus login once and then holds its own session; the apps behind it never see user tokens.
2. **Machines keep keys.** Service-to-service calls, the Canva Bearer key, AMX, MediaMTX and fffleet do not move to Tunnus. A key is the right tool for a daemon; OIDC would only add a dependency.
3. **The Pi must work without the internet or without Tunnus.** Tunnus is hosted off the Pi. Every Pi app keeps working with no login at the device level, and the LAN UI keeps a break-glass path.
4. **Least privilege, two caps.** What a person may do is the intersection of (a) the cap of the listener they came through and (b) their role from groups. The decision of 2026-11-19 stays: adding content works from outside through the relay; destructive and setup actions are LAN only. No group can lift the relay above that.
5. **Data minimisation.** pigateway keeps `sub` and display name in the session and logs `sub`, never the email address. Group membership in a church context can hint at religious activity, so it is not copied to other systems.
6. **Public repo hygiene.** Only env var names and placeholders in `pi*` repos and `piecosystem`.

## 4. Which apps use Tunnus, in order

1. **picontrol (through the pigateway UI listeners)**: first, and the only one the Pi stack needs. Covers the matrix, pivoice, piencoder, pitube, piprogram (content), picam and piswitch screens.
2. **picontrol-mcp** (AI access to the same operations): as an OAuth resource server for Tunnus (RFC 9728/8707, JWT `aud` check, JWKS verification). Phase 5; reuses the role table below.
3. **web-radio-relay admin and other VPS apps** (Sissi, canva-pieco-app admin if any): each as its own Tunnus client, after the Pi work is stable. Phase 5.
4. **saarnavideo**: replaces the `ACCESS_SECRET` gate with an OIDC login (group such as `media/editor`). Separate plan and thread; not needed for the Pi.
5. **LCYT**: out of scope here. It has its own accounts and serves other organisations too.
6. **Not Tunnus**: Canva plugin traffic, pimatrix/AMX/piprogram service calls, fffleet jobs, MediaMTX, signage player devices.

## 5. Roles and groups

Tunnus groups are the only source of roles. Proposed names (Juha to confirm; they are config):

| Tunnus group | Role | May do (within the listener cap) |
|---|---|---|
| `media/viewer` | `viewer` | Read status and the event stream; no changes |
| `media/operator` | `operator` | Operate during a service: matrix routing, pivoice/encoder/pitube start and stop, camera moves and preset recall, ATEM program/preview (LAN only, as today) |
| `media/content` | `content` | piprogram content: add items, use-at, prepare, playlist order and save, generate and replace. No delete |
| `media/setup` | `setup` | Setup routes (`setup: true`), deleting items and playlists, feed config, audio arm and play, TTS. LAN only in all cases |

A person can hold several groups; the effective role set is the union. A user who signs in with none of the groups gets a "no access" page, not a session. Group names are mapped in pigateway config (`PIGATEWAY_UI_GROUP_ROLES`, in the Pi env, kept in `keskuskirkko`), so renaming a group needs no code change.

Implementation in `ui-listener.ts`: route rules carry `module`, `setup?`, `lanOnly?` today. Add `minRole` (default derived: `setup: true` implies `setup`; GETs `viewer`; other writes `operator`; piprogram content writes `content`). The check becomes `listenerAllows(rule) && rolesAllow(rule, session.roles)`. The existing `lan`/`relay` role stays as the listener cap; the new `roles` field is separate.

PIN and trusted-IP sessions get a fixed configurable role set (`PIGATEWAY_UI_PIN_ROLES`, default = what the LAN has today, so nothing changes for the operator PC).

## 6. Flow

pigateway becomes a confidential OIDC client (backend-for-frontend), not a browser SPA client, so no tokens reach the browser and the client secret stays in the Pi env.

1. picontrol shows "Sign in with Tunnus" (and, on the LAN only, "Use PIN").
2. `GET /ui/api/oidc/login` on the listener builds the authorize request: PKCE (S256), `state`, `nonce`, `scope=openid profile email groups`, kept in a short-lived signed cookie.
3. The browser goes to Tunnus and signs in with an email code.
4. Tunnus redirects to `<listener-origin>/ui/api/oidc/callback`. pigateway exchanges the code server side and verifies the ID token: signature from cached JWKS, `iss`, `aud`, `exp`, `nonce`, `email_verified`; it reads `sub`, `name`, `groups`.
5. pigateway maps groups to roles and creates its own session (same cookie as today, 24 h sliding, plus an absolute cap), then redirects back to the UI.
6. `GET /ui/api/session` returns `{ name, roles, listener }` so picontrol can hide controls the person may not use. Hiding is cosmetic; the server enforces.
7. Logout: the lock button ends the pigateway session; an optional "sign out everywhere" goes through Tunnus RP-initiated logout.

Recommendation: **two Tunnus clients** (`pigateway-lan`, `pigateway-relay`) with their own secrets, redirect URIs and `backchannel_logout_uri`, so a leaked relay secret does not touch the LAN and each can be revoked alone.

Refresh tokens are **not** used. pigateway's session is the session; group changes apply at the next sign-in, or at once with back-channel logout (phase 4). This avoids storing refresh tokens on the Pi.

## 7. Token validation: pigateway only

- The ID token is verified at the callback, once. Per request pigateway checks only its own session (in memory, as now), so there is no per-request call to Tunnus and no dependency during a service.
- Apps behind pigateway (pitube, piprogram, picam, ...) keep trusting pigateway by key. pigateway forwards `x-ui-role` (existing) and may add `x-ui-subject` (the `sub`) for their logs. They do not validate JWTs.
- Exception: `picontrol-mcp` and any future app that AI clients or browsers reach directly validates Tunnus JWT access tokens itself (JWKS, `iss`, `aud` = its resource URI, `exp`), using the shared verifier from phase 1. It does not depend on pigateway sessions.
- JWKS is cached by HTTP cache headers and also written to a local file, so a restart while the internet is down can still verify tokens until the keys rotate.

## 8. Offline and failure behaviour

| Situation | Behaviour |
|---|---|
| Tunnus or the internet down, people already signed in | Their sessions keep working; validation is local. |
| Tunnus down, someone must sign in on the LAN | PIN and the trusted operator-PC address still work on the **LAN listener**. This break-glass path is never removed from LAN. |
| Tunnus down, someone wants to sign in on the relay | Not possible. Acceptable: with no internet the relay is not reachable either. The relay drops its PIN in phase 4. |
| pigateway restarts while Tunnus is down | Sessions are in memory, so LAN users use the PIN. Optional later: persist sessions in a small local file (hashed ids). |
| Discovery fetch fails at start | pigateway still starts; OIDC login answers 503 and the UI shows the PIN form on the LAN. Discovery retries lazily with back-off. No boot dependency on Tunnus. |
| `groups` claim missing or empty | No session on the relay; PIN offered on the LAN. Never a default role. |
| User disabled in Tunnus | The pigateway session lasts until it expires (24 h idle, absolute cap) unless back-channel logout is in place (phase 4). The absolute cap is the mitigation until then. |
| Clock skew on the Pi | `exp` and `nonce` checks allow 60 s; the Pi runs NTP. |

The operator PC rule of 2026-11-18 stands: the operator PC always has direct LAN access without a login (`PIGATEWAY_UI_LAN_TRUSTED_IPS`, socket address only).

## 9. Service-to-service keys stay separate

No change to `PIGATEWAY_API_KEY`, the pimatrix, pitube and piprogram keys, the Canva Bearer key and its listener, or fffleet tokens. pigateway keeps adding its own key server side and the browser never sees it. Tunnus tokens are never accepted on machine routes, and machine keys are never accepted as a person.

## 10. Phased rollout

**Phase 0: prepare (Tunnus side, no Pi repo code).**
- Decide group names with Juha. Create the groups in Tunnus; confirm none is in `DEFAULT_GROUPS`.
- Add the two client entries (`first_party: true`, `always_include_groups: true`, `grant_types: ["authorization_code"]`, callback and post-logout URIs, secrets as `${...}` env references) to the Tunnus clients file in the Tunnus deployment config, not here.
- Settle open question 3 (where the relay callback lives).

**Phase 1: pigateway adapter behind a flag, PIN still the default.**
- `OidcUiAuth` implementing `UiAuthAdapter` (login, callback, session) with `PIGATEWAY_UI_OIDC_*` env (issuer, client id and secret, redirect base, group-role map). Add `roles` to the session and `minRole` to route rules; PIN and trusted-IP sessions get `PIGATEWAY_UI_PIN_ROLES`.
- A small verifier module for ID and access JWTs with the JWKS file cache (`jose` is enough).
- Tests against a fake OIDC provider (a local Node HTTP server issuing signed tokens): good login, wrong nonce, expired, wrong `aud`, missing groups, JWKS rotation, discovery down. Unit tests only, no real Tunnus.
- Both PIN and Tunnus accepted on LAN. Relay unchanged.

**Phase 2: picontrol UI.** "Sign in with Tunnus" button, `GET /ui/api/session`, controls hidden by role, the person's name and the lock/sign-out button. OpenAPI updated in pigateway.

**Phase 3: relay on Tunnus.** Enable OIDC on the relay listener, with the PIN kept as fallback for one release. Test from outside the church network with a real account in `media/content` and in `media/viewer`, and confirm that `lanOnly` and `setup` routes still answer 403 for every group. A Pi deploy needs Juha's go in the Pi session, from `main` only.

**Phase 4: tighten.** Remove the relay PIN. Add `POST /ui/api/oidc/backchannel-logout` (verify the `logout_token`, drop sessions for that `sub`; reachable through the relay path) so disabling a user or removing a group ends sessions at once. LAN keeps the PIN and trusted IP.

**Phase 5: other apps.** `picontrol-mcp` as a resource server; web-radio-relay admin and Sissi as their own clients; saarnavideo in its own plan. Each a small separate PR.

## 11. Open questions for Juha

1. Group names, and whether four roles is the right size. A smaller start is `media/operator` and `media/content`, adding the rest later.
2. On the LAN, keep the shared PIN for everyone until phase 4? Recommendation: accept both Tunnus and PIN on the LAN, PIN stays as break-glass.
3. Where does the relay callback live: the relay path on the VPS (proxied to 3012) or the Pi's own domain? The relay cookie is `SameSite=None; Secure` today because the page and the API sit on different sites; the callback must set that cookie on the API origin. This needs one check against the real nginx and Traefik routing before phase 1 is final.
4. Absolute session cap. Recommendation: 7 days, 24 h idle as today.
5. Who administers Tunnus groups day to day. The `tunnus` CLI and `tunnus-mcp` exist; MCP mutations are guarded.

## 12. Risks

- Tunnus sign-up is open to the parish domain, so a mistake in `DEFAULT_GROUPS` would become an AV access problem. Phase 0 includes reviewing the Tunnus config for exactly this.
- A disabled user keeps a pigateway session until it expires, before phase 4.
- Everything here is unverified against a real Tunnus and the real Pi network; the first end-to-end run is phase 3.
