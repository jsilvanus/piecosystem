# Tunnus integration for the Pi ecosystem

Status: plan only, nothing implemented. First written 2026-11-23, revised the same day (groups from env, mail and SMS relay, MCP front door, Canva).

[Tunnus](https://github.com/jsilvanus/tunnus) is the parish's self-hosted OpenID Connect provider (email one-time code, no passwords, stable `sub`, `email`, `name`, `groups`). It already runs for the parish's other apps. This plan says how the Pi ecosystem uses it for **people and AI clients**, what Tunnus will offer as **mail and SMS relays**, and what stays as keys for **machines**.

**Nothing church-specific in this repo.** The issuer URL, client ids and secrets, the real group names, redirect hosts, relay tokens and IPs are set in the environment of the Pi and in the private `jsilvanus/keskuskirkko` repo. This document uses placeholders such as `<group>` and `<issuer>`.

## 1. What Tunnus gives us (read from its repo, not run)

- Authorization code flow with PKCE, discovery, JWKS (RS256), userinfo, refresh tokens (only with `offline_access` and `prompt=consent`), RP-initiated logout, back-channel logout (`backchannel_logout_uri` per client).
- Claims: `sub` (random UUID, never reused), `email` (always verified), `name`, `groups` (array of plain strings). A client with `always_include_groups` gets `groups` in the ID token without asking.
- Access tokens are JWTs (RS256). Tunnus supports resource indicators (RFC 8707) for MCP, today for one configured resource; its own MCP plan extends that to several.
- Clients are declared in a JSON file, no dynamic registration. Groups are managed through the admin API, the `tunnus` CLI or `tunnus-mcp`.
- A transactional **mail relay** exists: `POST <issuer>/api/mail`, bearer token, audited without addresses or content. An **SMS relay** will be added to Tunnus by the Tunnus developer (Juha), separately from this plan.
- Sign-up is open to addresses matching the parish's allow rules, and every new user joins `DEFAULT_GROUPS`. **A group that grants access to the AV stack must never be a default group.** Only an admin grants it.
- Unverified: we have not run Tunnus against our apps. Token lifetimes in its docs (access 10 min, refresh 30 days, session 14 days sliding) are defaults.

## 2. Today's auth landscape

| Surface | Auth now | People or machines |
|---|---|---|
| picontrol UI via pigateway UI listeners (LAN and relay) | One shared PIN, 24 h sliding session, role from the listener socket (`lan` or `relay`), operator-PC IP exemption on LAN only | People |
| pigateway full API and its upstreams (pitube, pimatrix, piprogram, pistorage, ...) | `PIGATEWAY_API_KEY` and per-service keys | Machines |
| `picontrol-mcp` (and other Pi MCP servers) | Own users file with scrypt passwords, personal access tokens (`pcm_...`), its own OAuth (PKCE, password sign-in, consent), per-area permissions (`<area>:read` / `<area>:write`) | AI clients and people |
| pinotify | Admin token and send token, contacts in an encrypted file, brevo or SMTP adapters through notify-core | Machines and an admin |
| Canva tunnel listener | Bearer key | Machine (the Canva plugin) |
| AMX link, FreeD, MediaMTX | Network trust | Machines |
| web-radio-relay admin, LCYT, saarnavideo, Sissi | Own keys or shared secret | Mixed |

`pigateway/docs/picontrol-ui.md` already says the auth is pluggable (`UiAuthAdapter`) and that an OIDC adapter can replace the PIN. `picontrol-mcp` has a good permission model (areas with read/write levels, deny rules) that the rights table below reuses.

## 3. Shape of the integration

pigateway is **the Tunnus connector of the Pi**. The capabilities are needed by many apps, so they live once, in the gateway, and picontrol is the UI for them.

| Capability | Where it lives |
|---|---|
| Sign-in of people (OIDC code flow, sessions, rights) | pigateway UI listeners; picontrol shows the login, the person, and controls by right |
| Verification of Tunnus tokens for other services | pigateway (a shared verifier module and an internal endpoint, see section 8) |
| MCP front door for AI clients | pigateway (section 9) |
| Mail and SMS relay for notifications | pinotify calls Tunnus directly with its own relay token (section 10) |
| Admin of users and groups | Tunnus itself (CLI, `tunnus-mcp`); picontrol only shows who is signed in |

Principles:

1. **One place holds the Tunnus client credentials for people and AI: pigateway.** Apps behind it never see user tokens or the Tunnus client secret.
2. **Machines keep keys.** Service-to-service calls, AMX, MediaMTX, fffleet and the Canva Bearer key stay as they are. OIDC would only add a dependency to a daemon.
3. **The Pi works without the internet or without Tunnus.** Every Pi app keeps working with no login at the device level, and the LAN UI keeps a break-glass path (section 7).
4. **Least privilege, two caps.** What a person may do is the intersection of (a) the cap of the listener they came through and (b) their rights from groups. With a Tunnus login, the relay also serves the **presentation controls** (piprogram go live, the live toggles, and **projector routing**, the left and right outputs) to people who hold `operate` on those modules (`piprogram:operate`, `matrix:operate`); people without it can only publish content (`write`). Setup, destructive and other device-level actions (cameras, ATEM) stay LAN only. No group lifts the relay above that.
5. **Data minimisation.** pigateway keeps `sub` and display name in the session and logs `sub`, never the email address. Group membership in a church context can hint at religious activity, so it is not copied to other systems.
6. **Public repo hygiene.** Only env var names and placeholders in the `pi*` repos and `piecosystem`.

## 4. Module-level rights: mapping lives in an env var

Rights are **per module and level**, written `<module>:<level>`. Modules are the ones the gateway already knows (`matrix`, `pivoice`, `piencoder`, `pitube`, `picam`, `piswitch`, `piprogram`, `pinotify`, ...). Four levels:

| Level | Meaning | Examples |
|---|---|---|
| `read` | See status and events; no changes | Matrix state, encoder status, playlists |
| `write` | Change content or stored configuration, not the live show | piprogram: add items, use-at, prepare, playlist order and save, generate and replace |
| `operate` | Do live actions during a service | Matrix routing, pivoice/encoder/pitube start and stop, camera moves and preset recall, ATEM program and preview |
| `admin` | Setup and destructive actions | Setup routes, deleting items and playlists, feed config, audio arm and play, TTS, pinotify contacts and provider |

The levels are **not a single ladder**. `admin` includes the other three. Every level includes `read`. But `write` and `operate` are independent: a person who edits playlists need not move cameras, and an operator need not rewrite content. A right is granted explicitly, so `piprogram:write` never gives `piprogram:operate`.

Tunnus groups are the only source of rights. The parish names its groups by its own convention, one group per app and role. **The names are not in any public repo.** pigateway reads the mapping from the environment:

```
PIGATEWAY_OIDC_GROUP_RIGHTS=<group>=<module>:<level>[,<module>:<level>...];<group>=...
```

`*` stands for every **Pi** module (`*:read`); the Sissi module is never included in it (see below). To keep the private value short there are **presets**, defined in code with generic names, that expand to a set of rights and can be used in the same value (`<group>=@operator`):

| Preset | Expands to |
|---|---|
| `@viewer` | `*:read` |
| `@operator` | `*:read` plus `operate` on the live modules (matrix, pivoice, piencoder, pitube, picam, piswitch) and `canva:operate` |
| `@content` | `*:read` plus `piprogram:write` and `canva:write` |
| `@admin` | `*:admin` |

The value is kept in the private `keskuskirkko` repo and set in the Pi env file. Renaming a group needs no code change. A group not listed gives nothing. A user whose groups give no right gets a "no access" page, not a session. A person with several groups gets the union.

**Route rules** carry `module` and a required `level` (replacing the earlier single `minRole`). Defaults when a rule does not say: GET gives `read`; `setup: true` or a delete gives `admin`; other writes give `operate` for the live modules and `write` for piprogram content. The check is `listenerAllows(rule) && rightsAllow(rule, session.rights)`. The listener keeps its role as the cap and is independent of the person's rights: the relay never serves a `lanOnly` or `admin` route, whatever the rights say. **Presentation controls are not `lanOnly`:** the piprogram routes for go live and the live toggles, and the matrix routes that send a feed to the left or right projector, are `operate` routes that the relay serves **only to a Tunnus session** (a PIN session on the relay never gets `operate`). Without `operate` a person on the relay can add and publish content but cannot go live or route a projector. The matrix routes for the projector outputs only; routes for other outputs, and the matrix lock and setup routes, stay LAN only.

**Sissi (signage) is a separate module with its own rights, not part of Pi operate.** `sissi:write` (publish and edit signage content) and `sissi:operate` (live signage actions) are explicit. The wildcard `*` means the **Pi modules only**, so `*:read`, `*:admin` and the `@operator`, `@content` and `@admin` presets never grant a `sissi` right; a group has to name `sissi:...` itself. The same holds the other way: Pi rights do not follow from Sissi rights. Sissi runs on the server, not on the Pi, and is its own Tunnus client (phase 7). **Sissi content goes from Canva straight to the server, not through pigateway**, so Sissi verifies the Tunnus JWT itself (its own `aud`, the same shared verifier module and the same JWKS) and checks `sissi:write` and `sissi:operate` from the `groups` claim with its own mapping env var. Both rights are reserved in the vocabulary now, even though `sissi:operate` has no route yet. The Canva app's Sissi target is checked against `sissi:*`, not `canva:*` (the Canva listener only covers pushes to the Pi).

**The Canva listener is its own module, `canva`.** `canva:write` covers pushing slides and saving playlists and action lists; `canva:operate` covers go live, playback controls and projector routing. Each `/api/v1/canva/*` route requires its own right, and pigateway then calls piprogram and pimatrix with its own keys. The rights are explicit: `piprogram:*` does not imply `canva:*`, and the other way round. (The Canva thread called these "content" and "operate"; "content" is the `write` level here, to keep one scheme.)

**MCP tools** are tagged with the same `<module>:<level>`; `picontrol-mcp` already uses `<area>:read|write` with per-user deny rules, so its tags map directly (the new `operate` and `admin` levels are added). The gateway filters `tools/list` and refuses `tools/call` by the same check.

**Sessions and PIN:** the session carries `rights` (not roles). PIN and trusted-IP sessions get a fixed configurable set (`PIGATEWAY_UI_PIN_RIGHTS`, default = what the LAN has today, so nothing changes for the operator PC). `GET /ui/api/session` returns `{ name, rights, listener }` and picontrol hides controls the person lacks.

**pinotify:** managing contacts and the provider is `pinotify:admin`; sending stays a machine key.

### Environment variables (names follow the parish's deploy template)

The deploy template for the parish's server apps uses `AUTH_MODE`, `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`. pigateway uses the same names with its prefix so an operator who knows one knows the other:

| Variable | Meaning |
|---|---|
| `PIGATEWAY_AUTH_MODE` | `pin` (today, default), `both`, `oidc` |
| `PIGATEWAY_OIDC_ISSUER` | Tunnus issuer URL |
| `PIGATEWAY_OIDC_CLIENT_ID`, `PIGATEWAY_OIDC_CLIENT_SECRET` | The LAN-listener client; a second pair for the relay listener |
| `PIGATEWAY_OIDC_GROUP_RIGHTS` | The group-to-rights mapping above |
| `PIGATEWAY_OIDC_SESSION_MAX_HOURS` | Absolute session cap |
| `PIGATEWAY_MCP_RESOURCE_URI` | The resource URI that MCP access tokens must carry as `aud` |

All values stay in the Pi env file. Nothing here is a secret except the client secrets, and none of them is committed.

## 5. Sign-in flow for people (picontrol UI)

pigateway is a confidential OIDC client (backend for the frontend), not a browser SPA client: no tokens reach the browser and the client secret stays in the Pi env.

1. picontrol shows "Sign in with Tunnus" (and, on the LAN only, "Use PIN").
2. `GET /ui/api/oidc/login` on the listener builds the authorize request: PKCE (S256), `state`, `nonce`, `scope=openid profile email groups`, kept in a short-lived signed cookie.
3. The browser goes to Tunnus and signs in with an email code.
4. Tunnus redirects to `<listener-origin>/ui/api/oidc/callback`. pigateway exchanges the code server side and verifies the ID token: signature from cached JWKS, `iss`, `aud`, `exp`, `nonce`, `email_verified`; it reads `sub`, `name`, `groups`.
5. pigateway maps groups to rights and creates its own session (same cookie as today, 24 h sliding, plus an absolute cap), then redirects back to the UI.
6. `GET /ui/api/session` returns `{ name, rights, listener }` so picontrol can hide controls the person may not use. Hiding is cosmetic; the server enforces.
7. Logout: the lock button ends the pigateway session; an optional "sign out everywhere" goes through Tunnus RP-initiated logout.

Two Tunnus clients (LAN and relay listener) with their own secrets, callback URIs and `backchannel_logout_uri`, so a leaked relay secret does not touch the LAN and each can be revoked alone. Refresh tokens are **not** used: pigateway's session is the session; group changes apply at the next sign-in, or at once with back-channel logout.

## 6. Token validation

- ID tokens are verified at the callback, once. Per request pigateway checks only its own session (in memory), so there is no per-request call to Tunnus.
- Apps behind pigateway keep trusting pigateway by key. pigateway forwards `x-ui-role` (existing) and may add `x-ui-subject` (the `sub`) for their logs.
- JWKS is cached by HTTP cache headers and also written to a local file, so a restart while the internet is down can still verify tokens until the keys rotate.
- One shared verifier module in pigateway (`jose`) serves the UI login, the MCP front door and the verify endpoint, so there is a single implementation to review.

## 7. Offline and failure behaviour

| Situation | Behaviour |
|---|---|
| Tunnus or the internet down, people already signed in | Sessions keep working; validation is local. |
| Tunnus down, someone must sign in on the LAN | PIN and the trusted operator-PC address still work on the **LAN listener**. This break-glass path is never removed from LAN. |
| Tunnus down, someone wants to sign in on the relay | Not possible. Acceptable: with no internet the relay is not reachable either. The relay drops its PIN in phase 4. |
| pigateway restarts while Tunnus is down | Sessions are in memory, so LAN users use the PIN. Optional later: persist sessions in a small local file (hashed ids). |
| Discovery fetch fails at start | pigateway still starts; OIDC login answers 503 and the UI shows the PIN form on the LAN. Discovery retries with back-off. No boot dependency on Tunnus. |
| `groups` claim missing or empty | No session on the relay; PIN offered on the LAN. Never a default right. |
| User disabled in Tunnus | The session lasts until it expires (24 h idle, absolute cap) unless back-channel logout is in place (phase 4). |
| MCP client, Tunnus unreachable | Tokens already issued verify against the cached JWKS until they expire; new sign-ins fail. Local stdio MCP use on the operator PC is not affected. |
| Mail or SMS relay unreachable | pinotify keeps its cooldown and logging, reports the failure to its caller, and may fall back to a direct provider if one is configured (section 10). |

The operator PC rule stands: the operator PC always has direct LAN access without a login (`PIGATEWAY_UI_LAN_TRUSTED_IPS`, socket address only).

## 8. Other Pi services that need to know who is calling

Most Pi apps never need a user identity; pigateway authenticates and they trust it by key. For the few that do (pinotify's contact admin UI, picontrol-mcp's audit), pigateway offers one internal route, `POST /api/v1/identity/verify` (service key required): it takes a Tunnus access or ID token and returns `{ sub, name, rights }` or 401. It uses the same verifier, the same group-to-rights map and the same cached JWKS, so an app does not need its own OIDC code, secret or env mapping. An app that is itself exposed to a browser or AI client and cannot sit behind the gateway may use the shared verifier module directly.

## 9. MCP servers: one front door through pigateway to Tunnus

Today each MCP server has its own users file, passwords and OAuth (`picontrol-mcp` does). With Tunnus there is one identity, so MCP access moves behind the gateway.

- **A new MCP listener on pigateway** (an extra listener on a 301x port, loopback-bound like the relay, reached from outside through the same kind of tunnel and proxy path as the relay) serves `/mcp/<server>` for each registered Pi MCP server (`picontrol-mcp` first, then the others).
- **The gateway is the OAuth resource server**, Tunnus the authorization server. It answers an unauthenticated call with `401` and `WWW-Authenticate` pointing at `/.well-known/oauth-protected-resource` (RFC 9728), which names Tunnus as authorization server and `PIGATEWAY_MCP_RESOURCE_URI` as the resource. The AI client signs in at Tunnus (resource indicator, RFC 8707) and then calls the gateway with the Tunnus JWT.
- **Validation at the gateway only:** signature, `iss`, `aud` equal to the gateway's resource URI, `exp`, groups to rights with the same map as the UI.
- **Per-tool rights:** each upstream tool is tagged with `<module>:<level>` (section 4). The gateway filters `tools/list` by the caller's rights and refuses a `tools/call` that they do not allow. The listener cap applies: tools that are LAN-only or setup stay out of reach on the public MCP path.
- **Upstream MCP servers become internal:** bound to loopback, authenticated by a service key held by pigateway, with their own user stores and OAuth switched off (`AUTH_MODE=token` with only the gateway's key). They are never exposed publicly any more. `stdio` use on the operator PC is unchanged.
- **Revocation:** back-channel logout from Tunnus drops the MCP sessions for that `sub` the same way as UI sessions.
- **Audit:** the gateway logs `sub`, tool name and outcome, never arguments that carry secrets (the upstream already masks them).
- **Outside the Pi:** MCP servers that live elsewhere (the PTV MCP, `tunnus-mcp`, the LCYT MCP) stay their own resource servers against Tunnus, as Tunnus's own MCP plan describes. They do not go through the Pi gateway. (Assumption; Juha to confirm.)
- **Dependency on Tunnus:** a resource indicator for the gateway's URI must be accepted by Tunnus (today it accepts one configured resource; its MCP plan makes that a list). That is Tunnus work, tracked there.

## 10. Mail and SMS relay for pinotify

pinotify sends email and SMS through notify-core with a provider adapter (Brevo or SMTP). With Tunnus relays, the provider key lives **only in Tunnus**, and pinotify holds one relay token.

- Add a **`tunnus` provider** to notify-core (an adapter that posts to Tunnus's relay) and a `tunnus` option in pinotify's provider setting. pinotify keeps everything it already does: consent per channel, cooldown, hourly and daily caps, attempt log without addresses. Tunnus only delivers.
- **Mail:** `POST <issuer>/api/mail` as it exists (bearer relay token, `from`, `to`, `subject`, `text`, optional `html` or template id). 200 sent, 400 invalid, 401 bad token, 429, 502 provider failure.
- **SMS (proposed contract for the Tunnus developer to confirm):** `POST <issuer>/api/sms` with the same bearer scheme and a body such as `{ "to": ["<number in E.164>"], "text": "...", "sender": "..." }`, answering the same codes, audited as `sms_relay.sent` with the recipient count only. Tunnus decides the SMS provider; pinotify does not care which.
- **A relay token per client, scoped to one channel** (mail or SMS) would be better than the single `MAIL_RELAY_TOKEN` it has now: a leaked pinotify token then cannot be used by another app, and revoking it affects only pinotify. Suggested for the Tunnus side.
- **Where the token lives:** pinotify's own env (`PINOTIFY_TUNNUS_RELAY_URL`, `PINOTIFY_TUNNUS_RELAY_TOKEN`), not pigateway. This keeps the rule that every Pi app works without pigateway. pigateway is not in the mail path.
- **Who may manage contacts:** pinotify's "anyone with the admin token" becomes the `pinotify:admin` right: picontrol shows the contacts UI, pigateway passes the verified rights through, pinotify keeps its admin token only as a service credential for the gateway.
- **Personal data:** addresses and numbers go to Tunnus's relay only at send time; Tunnus audits counts, not recipients, and its processors are listed in its own privacy notice.
- **Offline:** with no internet, the relay is unreachable. pinotify reports the failure to the caller (a candle alarm cannot wait). A direct provider as backup stays possible in notify-core, but is optional and off by default.

## 11. Service-to-service keys stay separate

No change to `PIGATEWAY_API_KEY`, the pimatrix, pitube and piprogram keys, the Canva Bearer key and its listener, or fffleet tokens. pigateway keeps adding its own key server side and the browser never sees it. Tunnus tokens are never accepted on machine routes, and machine keys are never accepted as a person.

## 12. The Canva app

Juha develops the Canva app's own Tunnus OIDC/OAuth sign-in separately. This plan fixes what it plugs into: the Canva listener is its own module `canva` with `canva:write` and `canva:operate` (section 4), explicit rights that no `piprogram` right implies. The Canva-only listener keeps its Bearer key until the app signs in through Tunnus; after that the app is a separate Tunnus client (a public PKCE client, since it runs in the Canva sandbox), verified by the same shared verifier and group-to-rights map. Not built here.

### Open: one Tunnus login, one token or two audiences

The Canva app signs in at one Tunnus (one login, one set of groups). It then needs tokens for two resources: the Pi gateway and Sissi. Recommendation: **one Tunnus provider, one login, a separate access token per resource** (RFC 8707 resource indicator per token request), so a token for Sissi is never valid at the Pi and the other way round. A single token with both audiences is possible but widens what a leaked token can do. This needs Tunnus to accept both resource URIs (already needed for the MCP gateway). Two Tunnus providers is not worth it: it would split the groups.

## 13. Phased rollout

**Phase 0: prepare (Tunnus side).**
- Create the groups per the parish convention; confirm none is a default group; put the real mapping in `keskuskirkko` and the Pi env.
- Add the two client entries to the Tunnus clients file (`first_party`, `always_include_groups`, `authorization_code`, callbacks, post-logout URIs, back-channel URI); client secrets as environment references, like the other apps.
- Settle where the relay callback lives (question 3).
- Tunnus developer: SMS relay and per-client relay tokens; accept a second resource indicator for the gateway.

**Phase 1: pigateway adapter behind a flag, PIN still the default.**
- `OidcUiAuth` implementing `UiAuthAdapter`, `PIGATEWAY_OIDC_*` env, `rights` on the session, `module` and `level` on route rules, `PIGATEWAY_UI_PIN_RIGHTS`.
- The shared verifier module with the JWKS file cache.
- Tests with a fake OIDC provider (a local Node HTTP server issuing signed tokens): good login, wrong nonce, expired, wrong `aud`, missing groups, JWKS rotation, discovery down. Unit tests only.
- Both PIN and Tunnus accepted on LAN. Relay unchanged.

**Phase 2: picontrol UI.** Login button, `GET /ui/api/session`, controls hidden by right, the person's name, sign-out. OpenAPI updated in pigateway.

**Phase 3: relay on Tunnus.** Enable OIDC on the relay listener, PIN kept as fallback for one release. Test from outside the church network with real accounts, and confirm that `lanOnly` and `setup` routes answer 403 for every group, that the piprogram go-live, live-toggle and projector-routing routes answer 403 for a person with only `piprogram:write`, and that they work for a person with `operate`. A Pi deploy needs Juha's go in the Pi session, from `main` only.

**Phase 4: tighten.** Remove the relay PIN. Add the back-channel logout endpoint so disabling a user or removing a group ends sessions at once. LAN keeps the PIN and trusted IP.

**Phase 5: MCP front door.** MCP listener, protected-resource metadata, per-tool permissions, `picontrol-mcp` moved behind the gateway and its own users and OAuth switched off. Other Pi MCP servers follow one at a time.

**Phase 6: pinotify relay.** `tunnus` provider in notify-core and pinotify; contact admin through `notify-admin`. Starts when Tunnus has the SMS relay; mail can go first.

**Phase 7: other apps.** web-radio-relay admin and Sissi as their own Tunnus clients; saarnavideo in its own plan; the Canva app in Juha's separate work.

Deploys follow the existing rule: from `main` only, Pi changes need Juha's go in the Pi session.

## 14. Open questions for Juha

1. Are the four levels (`read`, `write`, `operate`, `admin`, with `write` and `operate` independent) and the four presets the right size? The group names are the parish's own and not needed here.
2. On the LAN, keep the shared PIN for everyone until phase 4? Recommendation: accept both, PIN stays as break-glass.
3. Where does the relay callback live: the relay path on the server (proxied to the relay listener) or the Pi's own domain? The relay cookie is `SameSite=None; Secure` because page and API sit on different sites; the callback must set it on the API origin. One check against the real proxy routing before phase 1 is final.
4. Absolute session cap. Recommendation: 7 days, 24 h idle as today.
5. MCP servers outside the Pi (PTV, Tunnus, LCYT): confirm they stay their own resource servers and do not go through the Pi gateway.
6. Mail and SMS: pinotify calls Tunnus directly with its own token (recommended, keeps the Pi apps independent of pigateway) or through pigateway?

## 15. Risks

- Tunnus sign-up is open to the parish's addresses, so a mistake in `DEFAULT_GROUPS` would become an AV access problem. Phase 0 reviews the Tunnus config for exactly this.
- A disabled user keeps a gateway session until it expires, before phase 4.
- Putting every MCP behind one gateway makes it a single point of failure for AI access (not for operation: the UI and local stdio use do not depend on it).
- Everything here is unverified against a real Tunnus and the real Pi network; the first end-to-end run is phase 3. The SMS relay does not exist yet; its contract above is a proposal.
