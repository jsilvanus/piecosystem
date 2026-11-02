import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { buildEncodeArgs, readPlan, runPage, scrub } from '../src/fffleet-executor.js';

const spec = (page = {}) => ({ page: { url: 'http://pi:3200/pipgm/PiPGM1/stage', output: { url: 'rtsp://127.0.0.1:8554/live1' }, ...page } });

test('readPlan applies defaults and clamps', () => {
  const plan = readPlan(spec({ fps: 99, width: 10 }), {});
  assert.equal(plan.fps, 30);
  assert.equal(plan.width, 128);
  assert.equal(plan.height, 1080);
  assert.equal(plan.audio, false);
  assert.equal(readPlan(spec(), {}).fps, 10);
});

test('readPlan refuses a non-http page and an unknown output scheme', () => {
  assert.throws(() => readPlan(spec({ url: 'file:///etc/passwd' }), {}), /http or https/);
  assert.throws(() => readPlan(spec({ output: { url: 'http://x/y' } }), {}), /rtsp/);
  assert.throws(() => readPlan({}, {}), /spec\.page\.url/);
});

test('the host allow-list covers the page and the output', () => {
  const env = { PIECO_PAGE_ALLOW_HOSTS: 'pi, 127.0.0.1' };
  assert.doesNotThrow(() => readPlan(spec(), env));
  assert.throws(() => readPlan(spec({ url: 'http://evil.example/x' }), env), /page host/);
  assert.throws(() => readPlan(spec({ output: { url: 'rtmp://evil.example/x' } }), env), /output host/);
});

test('audio needs the virtual sound card', () => {
  assert.throws(() => readPlan(spec({ audio: true }), { PIECO_AUDIO: '0' }), /sound card/);
  assert.equal(readPlan(spec({ audio: true }), {}).audio, true);
  assert.throws(() => readPlan(spec({ audio: true }), { PIECO_SINK: 'a b;c' }), /PIECO_SINK/);
});

test('encode args: picture only has no audio track, rtsp goes over tcp', () => {
  const args = buildEncodeArgs(readPlan(spec(), {}));
  assert.ok(args.includes('-an'));
  assert.ok(!args.includes('pulse'));
  assert.equal(args.at(-1), 'rtsp://127.0.0.1:8554/live1');
  assert.ok(args.join(' ').includes('-f rtsp -rtsp_transport tcp'));
});

test('encode args: audio captures the sink monitor and publishes aac; rtmp uses flv', () => {
  const args = buildEncodeArgs(readPlan(spec({ audio: true, output: { url: 'rtmp://host/app/key' } }), { PIECO_SINK: 'pieco' }));
  const text = args.join(' ');
  assert.ok(text.includes('-f pulse -i pieco.monitor'));
  assert.ok(text.includes('-map 0:v') && text.includes('-map 1:a'));
  assert.ok(text.includes('-c:a aac'));
  assert.ok(text.includes('-f flv rtmp://host/app/key'));
});

test('scrub removes credentials from URLs', () => {
  assert.equal(scrub('failed rtsp://user:secret@host:8554/x ok'), 'failed rtsp://***@host:8554/x ok');
  assert.equal(scrub('rtmp://host/app/key'), 'rtmp://host/app/key');
});

function fakeDeps({ exitAfter = null } = {}) {
  const calls = { launch: null, goto: null, frames: 0, written: 0, closed: false, spawnArgs: null, killed: false };
  const ffmpeg = new EventEmitter();
  ffmpeg.exitCode = null;
  ffmpeg.stderr = new EventEmitter();
  ffmpeg.stdin = Object.assign(new EventEmitter(), {
    write: () => { calls.written += 1; if (exitAfter && calls.written >= exitAfter) { ffmpeg.stderr.emit('data', Buffer.from('boom rtsp://u:p@h/x')); ffmpeg.exitCode = 1; setImmediate(() => ffmpeg.emit('exit', 1, null)); } return true; },
    end: () => {}
  });
  ffmpeg.kill = () => { calls.killed = true; ffmpeg.exitCode = 0; return true; };
  const page = { goto: async (url) => { calls.goto = url; }, evaluate: async () => {}, screenshot: async () => { calls.frames += 1; return Buffer.from('png'); } };
  const browser = { newContext: async () => ({ newPage: async () => page }), close: async () => { calls.closed = true; } };
  return {
    calls,
    deps: {
      executablePath: '/usr/bin/chromium',
      launch: async (opts) => { calls.launch = opts; return browser; },
      spawn: (cmd, args) => { calls.spawnArgs = args; return ffmpeg; }
    }
  };
}

test('runPage opens the page, streams frames, and stops cleanly when cancelled', async () => {
  const { calls, deps } = fakeDeps();
  const ac = new AbortController();
  const states = [];
  const run = runPage(spec({ fps: 30 }), { env: {}, signal: ac.signal, setState: s => states.push(s) }, deps);
  await new Promise(r => setTimeout(r, 120));
  ac.abort();
  await assert.rejects(run);
  assert.equal(calls.goto, 'http://pi:3200/pipgm/PiPGM1/stage');
  assert.ok(calls.frames >= 2 && calls.written >= 2);
  assert.ok(calls.launch.args.includes('--mute-audio'), 'muted without audio');
  assert.deepEqual(states, ['running']);
  assert.ok(calls.closed && calls.killed);
});

test('with audio the browser is not muted and may autoplay', async () => {
  const { calls, deps } = fakeDeps();
  const ac = new AbortController();
  const run = runPage(spec({ audio: true }), { env: {}, signal: ac.signal }, deps);
  await new Promise(r => setTimeout(r, 30));
  ac.abort();
  await assert.rejects(run);
  assert.ok(!calls.launch.args.includes('--mute-audio'));
  assert.ok(calls.launch.args.includes('--autoplay-policy=no-user-gesture-required'));
});

test('an ffmpeg that dies fails the job with a scrubbed message', async () => {
  const { deps } = fakeDeps({ exitAfter: 2 });
  const ac = new AbortController();
  await assert.rejects(runPage(spec({ fps: 30 }), { env: {}, signal: ac.signal }, deps), err => {
    assert.match(err.message, /ffmpeg exited \(code=1/);
    assert.ok(!err.message.includes('u:p@'));
    return true;
  });
});

test('the encoder is x264 by default, nvenc on request, and anything else is refused', () => {
  assert.equal(readPlan(spec(), {}).encoder, 'x264');
  assert.equal(readPlan(spec(), { PIECO_PAGE_ENCODER: 'nvenc' }).encoder, 'nvenc');
  assert.equal(readPlan(spec({ encoder: 'x264' }), { PIECO_PAGE_ENCODER: 'nvenc' }).encoder, 'x264', 'the job wins');
  assert.throws(() => readPlan(spec({ encoder: 'vaapi' }), {}), /encoder/);
  const text = buildEncodeArgs(readPlan(spec({ encoder: 'nvenc' }), {})).join(' ');
  assert.ok(text.includes('-c:v h264_nvenc') && !text.includes('libx264'));
  assert.ok(buildEncodeArgs(readPlan(spec(), {})).join(' ').includes('-f image2pipe -c:v mjpeg'));
});

test('background turns on keying: png frames over an exact flat colour', () => {
  const plan = readPlan(spec({ background: '#00B140', width: 640, height: 360, fps: 25 }), {});
  assert.equal(plan.frames, 'png');
  const text = buildEncodeArgs(plan).join(' ');
  assert.ok(text.includes('-f lavfi -i color=c=0x00B140:s=640x360:r=25'));
  assert.ok(text.includes('-f image2pipe -c:v png -i pipe:0'));
  assert.ok(text.includes('overlay=shortest=1'));
  assert.ok(text.includes('-map [v]'));
});

test('with keying and audio the sound is the third input', () => {
  const text = buildEncodeArgs(readPlan(spec({ background: '#00B140', audio: true }), {})).join(' ');
  assert.ok(text.includes('-f pulse -i pieco.monitor'));
  assert.ok(text.includes('-map 2:a'));
});

test('frames can be forced and bad colours are refused', () => {
  assert.equal(readPlan(spec({ background: '#112233', frames: 'jpeg' }), {}).frames, 'jpeg');
  assert.equal(readPlan(spec({ frames: 'png' }), {}).frames, 'png');
  assert.throws(() => readPlan(spec({ frames: 'gif' }), {}), /frames/);
  assert.throws(() => readPlan(spec({ background: 'green' }), {}), /hex colour/);
  assert.throws(() => readPlan(spec({ background: '#0f0' }), {}), /hex colour/);
});
