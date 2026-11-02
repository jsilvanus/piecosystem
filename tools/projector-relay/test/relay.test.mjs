import test from "node:test";
import assert from "node:assert/strict";
import { createRelay } from "../server.mjs";

function setup(extra = {}, t0 = Date.parse("2026-11-02T18:00:00Z")) {
  const calls = [];
  let clock = t0;
  const fetchStub = async (url, init = {}) => {
    calls.push({ url, method: init.method ?? "GET", body: init.body ? JSON.parse(init.body) : null, auth: init.headers?.authorization });
    const u = new URL(url).pathname;
    const body = u === "/api/v1/matrix" ? { routes: { 1: 3, 2: 2 } } : u.startsWith("/api/v1/projectors/") && !init.method ? { power: "on", sourceName: "HDBaseT" } : { ok: true };
    return new Response(JSON.stringify(body), { status: 200 });
  };
  const { server } = createRelay({ PROJECTOR_PIN: "4321", PROJECTOR_EXPIRES_AT: "2026-11-03T04:00:00Z", PIGATEWAY_API_KEY: "k", ...extra }, { fetch: fetchStub, now: () => clock });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => {
    const base = `http://127.0.0.1:${server.address().port}`;
    const req = (path, o = {}) => fetch(base + path, { ...o, headers: { "content-type": "application/json", ...(o.headers ?? {}) } });
    resolve({ server, calls, req, setClock: (v) => (clock = v) });
  }));
}
const login = async (req, pin = "4321") => {
  const r = await req("/api/login", { method: "POST", body: JSON.stringify({ pin }) });
  return { r, cookie: (r.headers.get("set-cookie") ?? "").split(";")[0] };
};

test("api needs a session; wrong pin is refused", async () => {
  const s = await setup();
  assert.equal((await s.req("/api/status")).status, 401);
  assert.equal((await login(s.req, "0000")).r.status, 401);
  const { r, cookie } = await login(s.req);
  assert.equal(r.status, 200);
  assert.equal((await s.req("/api/status", { headers: { cookie } })).status, 200);
  s.server.close();
});

test("five wrong pins lock the address out, even for the right pin", async () => {
  const s = await setup();
  for (let i = 0; i < 5; i++) await login(s.req, "bad");
  assert.equal((await login(s.req)).r.status, 429);
  s.server.close();
});

test("route both sends outputs 1 and 2 only; bad input rejected", async () => {
  const s = await setup();
  const { cookie } = await login(s.req);
  const ok = await s.req("/api/route", { method: "POST", headers: { cookie }, body: JSON.stringify({ input: 2, target: "both" }) });
  assert.equal(ok.status, 200);
  const posts = s.calls.filter((c) => c.method === "POST");
  assert.deepEqual(posts.map((c) => c.body), [{ input: 2, output: 1 }, { input: 2, output: 2 }]);
  assert.equal(posts[0].auth, "Bearer k");
  for (const b of [{ input: 5, target: "both" }, { input: 1, target: "all" }, { input: 1, output: 4, target: "x" }])
    assert.equal((await s.req("/api/route", { method: "POST", headers: { cookie }, body: JSON.stringify(b) })).status, 422);
  s.server.close();
});

test("power allow-list and status shape; other paths closed", async () => {
  const s = await setup();
  const { cookie } = await login(s.req);
  const h = { cookie };
  assert.equal((await s.req("/api/power", { method: "POST", headers: h, body: JSON.stringify({ target: "proj2", power: "off" }) })).status, 200);
  assert.equal(s.calls.at(-1).url.endsWith("/api/v1/projectors/proj2/power"), true);
  assert.equal((await s.req("/api/power", { method: "POST", headers: h, body: JSON.stringify({ target: "proj1", power: "raw" }) })).status, 422);
  const st = await (await s.req("/api/status", { headers: h })).json();
  assert.deepEqual(st.routes, { proj1: 3, proj2: 2 });
  assert.equal(st.proj1.power, "on");
  for (const p of ["/api/v1/atem", "/api/raw", "/etc/passwd"]) assert.equal((await s.req(p, { headers: h })).status, 404);
  s.server.close();
});

test("closed after the expiry time", async () => {
  const s = await setup();
  const { cookie } = await login(s.req);
  s.setClock(Date.parse("2026-11-03T04:00:01Z"));
  assert.equal((await s.req("/", { headers: { cookie } })).status, 410);
  assert.equal((await s.req("/api/status", { headers: { cookie } })).status, 410);
  s.server.close();
});

test("refuses to start without pin or expiry", () => {
  assert.throws(() => createRelay({ PROJECTOR_EXPIRES_AT: "2026-11-03T04:00:00Z" }));
  assert.throws(() => createRelay({ PROJECTOR_PIN: "4321" }));
});
