// Temporary, PIN-protected projector page. Zero dependencies, Node >= 22, ESM.
// Allow-list only: Atlona routing to outputs 1 and 2, projector 1/2 power, status.
import { createServer } from "node:http";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const PAGE = readFileSync(new URL("./page.html", import.meta.url), "utf8");
const INPUTS = [1, 2, 3, 4];
const TARGETS = { proj1: [1], proj2: [2], both: [1, 2] };
const PROJ = ["proj1", "proj2"];
const COOKIE = "proj_session";

export function createRelay(env = process.env, deps = {}) {
  const pin = String(env.PROJECTOR_PIN ?? "");
  if (pin.length < 4) throw new Error("PROJECTOR_PIN (at least 4 characters) is required");
  const expiresAt = Date.parse(env.PROJECTOR_EXPIRES_AT ?? "");
  if (!Number.isFinite(expiresAt)) throw new Error("PROJECTOR_EXPIRES_AT (ISO time) is required");
  const upstream = (env.PIGATEWAY_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
  const apiKey = env.PIGATEWAY_API_KEY ?? "";
  const trustProxy = env.TRUST_PROXY === "1";
  const now = deps.now ?? (() => Date.now());
  const doFetch = deps.fetch ?? fetch;
  const secret = randomBytes(32); // sessions die with the process
  const SESSION_MS = 12 * 3600e3;
  const fails = new Map(); // ip -> { n, until }
  const hits = new Map(); // ip -> timestamps

  const sign = (v) => createHmac("sha256", secret).update(v).digest("base64url");
  const safeEq = (a, b) => {
    const x = Buffer.from(String(a)), y = Buffer.from(String(b));
    return x.length === y.length && timingSafeEqual(x, y);
  };
  const makeToken = () => { const e = String(Math.min(now() + SESSION_MS, expiresAt)); return `${e}.${sign(e)}`; };
  const validToken = (t) => {
    const [e, s] = String(t ?? "").split(".");
    return Boolean(e && s && safeEq(s, sign(e)) && Number(e) > now());
  };
  const clientIp = (req) => {
    if (trustProxy) {
      const xff = String(req.headers["x-forwarded-for"] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
      if (xff.length) return xff[xff.length - 1];
    }
    return req.socket.remoteAddress ?? "?";
  };
  const rateLimited = (ip) => {
    const t = now(), list = (hits.get(ip) ?? []).filter((x) => t - x < 60e3);
    list.push(t); hits.set(ip, list);
    return list.length > 60;
  };
  const cookies = (req) => Object.fromEntries(String(req.headers.cookie ?? "").split(";").map((c) => c.trim().split("=")).filter((p) => p[0]));

  async function up(path, init = {}) {
    const headers = { "content-type": "application/json" };
    if (apiKey) headers.authorization = `Bearer ${apiKey}`;
    const r = await doFetch(upstream + path, { ...init, headers, signal: AbortSignal.timeout(8000) });
    const text = await r.text();
    let body; try { body = JSON.parse(text); } catch { body = null; }
    return { ok: r.ok, status: r.status, body };
  }

  async function status() {
    const [m, p1, p2] = await Promise.allSettled([up("/api/v1/matrix"), up("/api/v1/projectors/proj1"), up("/api/v1/projectors/proj2")]);
    const val = (x) => (x.status === "fulfilled" && x.value.ok ? x.value.body : null);
    const routes = val(m)?.routes ?? null;
    const proj = (b) => (b ? { power: b.power, source: b.sourceName ?? b.source ?? null } : null);
    return {
      routes: routes ? { proj1: routes[1] ?? null, proj2: routes[2] ?? null } : null,
      proj1: proj(val(p1)), proj2: proj(val(p2)), expiresAt: new Date(expiresAt).toISOString(),
    };
  }

  const json = (res, code, obj, extra = {}) => {
    res.writeHead(code, { "content-type": "application/json", "cache-control": "no-store", ...extra });
    res.end(JSON.stringify(obj));
  };
  const readJson = (req) => new Promise((resolve) => {
    let s = ""; req.on("data", (c) => { s += c; if (s.length > 2000) req.destroy(); });
    req.on("end", () => { try { resolve(JSON.parse(s || "{}")); } catch { resolve(null); } });
    req.on("error", () => resolve(null));
  });

  const handler = async (req, res) => {
    const ip = clientIp(req);
    const url = new URL(req.url, "http://x");
    if (now() >= expiresAt) return json(res, 410, { error: "Sivu on suljettu." });
    if (rateLimited(ip)) return json(res, 429, { error: "Liian monta pyyntöä, odota hetki." });
    res.setHeader("x-content-type-options", "nosniff");
    if (req.method === "GET" && url.pathname === "/") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex", "content-security-policy": "default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'" });
      return res.end(PAGE);
    }
    if (req.method === "GET" && url.pathname === "/health") return json(res, 200, { ok: true });
    if (req.method === "POST" && url.pathname === "/api/login") {
      const f = fails.get(ip);
      if (f && f.until > now()) return json(res, 429, { error: "Liian monta yritystä. Yritä 10 minuutin kuluttua." });
      const body = await readJson(req);
      if (body && safeEq(String(body.pin ?? ""), pin)) {
        fails.delete(ip);
        const secure = req.headers["x-forwarded-proto"] === "https" ? "; Secure" : "";
        return json(res, 200, { ok: true }, { "set-cookie": `${COOKIE}=${makeToken()}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200${secure}` });
      }
      const n = (f?.n ?? 0) + 1;
      fails.set(ip, { n, until: n >= 5 ? now() + 600e3 : 0 });
      return json(res, 401, { error: "Väärä PIN." });
    }
    if (!url.pathname.startsWith("/api/")) return json(res, 404, { error: "Ei löydy." });
    if (!validToken(cookies(req)[COOKIE])) return json(res, 401, { error: "Kirjaudu PIN-koodilla." });
    try {
      if (req.method === "GET" && url.pathname === "/api/status") return json(res, 200, await status());
      const body = req.method === "POST" ? await readJson(req) : null;
      if (req.method === "POST" && url.pathname === "/api/route") {
        const input = Number(body?.input), outs = TARGETS[body?.target];
        if (!INPUTS.includes(input) || !outs) return json(res, 422, { error: "Virheellinen valinta." });
        for (const o of outs) {
          const r = await up("/api/v1/matrix/route", { method: "POST", body: JSON.stringify({ input, output: o }) });
          if (!r.ok) return json(res, 502, { error: "Reititys epäonnistui (AMX ei vastaa?)." });
        }
        return json(res, 200, { ok: true });
      }
      if (req.method === "POST" && url.pathname === "/api/power") {
        const targets = body?.target === "both" ? PROJ : PROJ.includes(body?.target) ? [body.target] : null;
        if (!targets || !["on", "off"].includes(body?.power)) return json(res, 422, { error: "Virheellinen valinta." });
        for (const t of targets) {
          const r = await up(`/api/v1/projectors/${t}/power`, { method: "POST", body: JSON.stringify({ power: body.power }) });
          if (!r.ok) return json(res, 502, { error: "Komento epäonnistui (AMX ei vastaa?)." });
        }
        return json(res, 200, { ok: true });
      }
      return json(res, 404, { error: "Ei löydy." });
    } catch {
      return json(res, 502, { error: "Yhteys laitteisiin ei toimi." });
    }
  };

  const server = createServer((req, res) => { handler(req, res).catch(() => json(res, 500, { error: "Virhe." })); });
  return { server, expiresAt };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { server, expiresAt } = createRelay();
  const port = Number(process.env.PORT ?? 3180);
  server.listen(port, process.env.HOST ?? "127.0.0.1", () => console.log(`projector-relay on :${port}, closes ${new Date(expiresAt).toISOString()}`));
  setTimeout(() => { console.log("expired, exiting"); process.exit(0); }, Math.max(expiresAt - Date.now(), 0) + 1000).unref();
}
