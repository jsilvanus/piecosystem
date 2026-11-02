import { spawn } from 'node:child_process';

/**
 * "Web page to stream" as an fffleet job type (`type: "page"`), for
 * `FFFLEET_EXECUTORS=pieco-page/fffleet-executor` on an fffleet worker. The spec carries the plan in `spec.page`:
 *
 *   { url, output: { url }, width?, height?, fps?, audio?, encoder?, background?, userAgent? }
 *
 * The worker opens `url` (any http or https page it can reach) in its own headless Chromium, screenshots it at `fps`
 * and pipes the frames into a local ffmpeg that publishes to `output.url` (rtsp:// for MediaMTX, or rtmp(s)://).
 * With `audio: true` the sound the page plays is captured from the worker's virtual PulseAudio sink and published
 * with the picture; without it Chromium is muted and the stream has no audio track. The page keeps itself up to date,
 * so no state travels with the job. The job runs until it is cancelled; a crashed Chromium or ffmpeg fails it.
 *
 * `encoder` is "x264" (CPU, default) or "nvenc" (NVIDIA GPU, h264_nvenc; needs an ffmpeg with NVENC and a GPU
 * passed to the container). Frames travel as JPEG (much cheaper than PNG), which is fine because they are re-encoded.
 *
 * Environment: PIECO_PAGE_ENCODER (default encoder), PIECO_SINK (default "pieco", set up by the image's entrypoint), PIECO_AUDIO=0 (no PulseAudio on this
 * worker), PIECO_PAGE_ALLOW_HOSTS (comma-separated host names; when set, both the page and the output must be on one),
 * PLAYWRIGHT_DSK_CHROMIUM or CHROMIUM_PATH (browser binary), FFMPEG_PATH.
 *
 * Credentials in output URLs are removed from errors and from the stderr tail the job returns.
 */

const DEFAULT_FPS = 10;

export function buildEncodeArgs({ fps, audio, sink, output, encoder = 'x264' }) {
  const args = ['-hide_banner', '-nostdin', '-loglevel', 'warning', '-y',
    '-use_wallclock_as_timestamps', '1', '-f', 'image2pipe', '-c:v', 'mjpeg', '-i', 'pipe:0'];
  if (audio) args.push('-use_wallclock_as_timestamps', '1', '-f', 'pulse', '-i', `${sink}.monitor`);
  args.push('-map', '0:v');
  if (audio) args.push('-map', '1:a');
  args.push('-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p',
    ...(encoder === 'nvenc'
      ? ['-c:v', 'h264_nvenc', '-preset', 'p1', '-tune', 'ull', '-b:v', '4M', '-bf', '0']
      : ['-c:v', 'libx264', '-preset', 'ultrafast', '-tune', 'zerolatency']),
    '-r', String(fps), '-g', String(fps * 2));
  if (audio) args.push('-c:a', 'aac', '-b:a', '128k', '-ar', '48000', '-ac', '2', '-af', 'aresample=async=1000');
  else args.push('-an');
  if (/^rtsps?:/i.test(output.url)) args.push('-f', 'rtsp', '-rtsp_transport', 'tcp', output.url);
  else args.push('-f', 'flv', output.url);
  return args;
}

/** Removes `user:password@` from any URL in a text. */
export function scrub(text) {
  return String(text).replace(/(\b[a-z][a-z0-9+.-]*:\/\/)[^/\s@]+@/gi, '$1***@');
}

function hostOf(url) {
  try { return new URL(url).hostname.toLowerCase(); } catch { return ''; }
}

export function readPlan(spec, env = process.env) {
  const plan = spec?.page;
  if (!plan || typeof plan.url !== 'string' || !/^https?:\/\//i.test(plan.url)) throw new Error('page job needs spec.page.url (http or https)');
  const outUrl = String(plan.output?.url ?? '');
  if (!/^(rtsps?|rtmps?):\/\//i.test(outUrl)) throw new Error('page job needs spec.page.output.url (rtsp://, rtsps://, rtmp:// or rtmps://)');
  const allow = String(env.PIECO_PAGE_ALLOW_HOSTS ?? '').split(',').map(h => h.trim().toLowerCase()).filter(Boolean);
  if (allow.length) {
    for (const [what, url] of [['page', plan.url], ['output', outUrl]]) {
      if (!allow.includes(hostOf(url))) throw new Error(`the ${what} host is not in PIECO_PAGE_ALLOW_HOSTS`);
    }
  }
  const encoder = String(plan.encoder ?? env.PIECO_PAGE_ENCODER ?? 'x264');
  if (encoder !== 'x264' && encoder !== 'nvenc') throw new Error('encoder must be x264 or nvenc');
  const audio = plan.audio === true;
  if (audio && env.PIECO_AUDIO === '0') throw new Error('audio was asked for but this worker has no virtual sound card (PIECO_AUDIO=0)');
  const sink = String(env.PIECO_SINK || 'pieco');
  if (!/^[A-Za-z0-9_.-]+$/.test(sink)) throw new Error('PIECO_SINK must be letters, digits, . _ -');
  const dimension = (value, fallback) => {
    const n = Math.round(Number(value)) || fallback;
    return Math.min(3840, Math.max(128, n));
  };
  return {
    url: plan.url,
    output: { url: outUrl },
    width: dimension(plan.width, 1920),
    height: dimension(plan.height, 1080),
    fps: Math.min(30, Math.max(1, Math.round(Number(plan.fps) || DEFAULT_FPS))),
    audio,
    encoder,
    sink,
    background: typeof plan.background === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(plan.background) ? plan.background : null,
    userAgent: typeof plan.userAgent === 'string' ? plan.userAgent.slice(0, 300) : null
  };
}

function chromiumPath(env) {
  return env.PLAYWRIGHT_DSK_CHROMIUM || env.CHROMIUM_PATH || '/usr/bin/chromium';
}

export async function runPage(spec, rt, deps = {}) {
  const env = rt.env ?? process.env;
  const plan = readPlan(spec, env);
  const spawnImpl = deps.spawn ?? spawn;
  const launch = deps.launch ?? (async opts => (await import('playwright-core')).chromium.launch(opts));
  const executablePath = 'executablePath' in deps ? deps.executablePath : chromiumPath(env);

  const chromiumArgs = ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--hide-scrollbars'];
  if (plan.audio) chromiumArgs.push('--autoplay-policy=no-user-gesture-required');
  else chromiumArgs.push('--mute-audio');

  const browser = await launch({ headless: true, executablePath, args: chromiumArgs });
  let ffmpeg = null;
  let stderrTail = '';
  try {
    const context = await browser.newContext({ viewport: { width: plan.width, height: plan.height }, ...(plan.userAgent ? { userAgent: plan.userAgent } : {}) });
    const page = await context.newPage();
    await page.goto(plan.url, { waitUntil: 'domcontentloaded' });
    if (plan.background) {
      await page.evaluate(bg => { document.documentElement.style.background = bg; if (document.body) document.body.style.background = bg; }, plan.background).catch(() => {});
    }

    ffmpeg = spawnImpl(env.FFMPEG_PATH || 'ffmpeg', buildEncodeArgs(plan), { stdio: ['pipe', 'ignore', 'pipe'] });
    ffmpeg.stderr?.on('data', b => { stderrTail = (stderrTail + b.toString()).slice(-2000); });
    const exited = new Promise(resolve => ffmpeg.once('exit', (code, signal) => resolve({ code, signal })));
    ffmpeg.stdin.on('error', () => {}); // an ffmpeg that died shows up through `exited`

    rt.setState?.('running');
    const interval = Math.floor(1000 / plan.fps);
    let ended = null;
    exited.then(e => { ended = e; });
    while (!rt.signal.aborted && !ended) {
      const t0 = Date.now();
      const frame = await page.screenshot({ type: 'jpeg', quality: 90 });
      if (rt.signal.aborted || ended) break;
      if (!ffmpeg.stdin.write(frame)) await Promise.race([new Promise(r => ffmpeg.stdin.once('drain', r)), exited]);
      const wait = interval - (Date.now() - t0);
      if (wait > 0) await new Promise(r => setTimeout(r, wait));
    }
    try { ffmpeg.stdin.end(); } catch { /* already closed */ }
    if (ended && !rt.signal.aborted) {
      const tail = scrub(stderrTail.trim().split('\n').slice(-3).join(' | '));
      throw new Error(`ffmpeg exited (code=${ended.code}, signal=${ended.signal}): ${tail}`);
    }
  } finally {
    if (ffmpeg && ffmpeg.exitCode === null) { try { ffmpeg.kill('SIGTERM'); } catch { /* gone */ } }
    await browser.close().catch(() => {});
  }
  rt.signal.throwIfAborted();
  return { exitCode: 0, outputs: [], stderrTail: scrub(stderrTail.trim()) || null };
}

export default { type: 'page', run: runPage };
