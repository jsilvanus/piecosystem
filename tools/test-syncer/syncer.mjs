#!/usr/bin/env node
/**
 * test-syncer: Video & caption synchronization test utility for piecosystem.
 *
 * Takes a video file, acquires speech-to-text transcript from liturgos-auditor
 * (or existing/fallback VTT), applies video delay compensation, and produces:
 * 1. A playable MP4 or MKV with embedded closed captions for VLC, or
 * 2. A live RTMP stream to MediaMTX with synchronized captions and video delay.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawnSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { AuditorClient } from './auditor-client.mjs';
import { parseVtt, shiftCues, clipCues, cuesToSrt, cuesToVtt } from './vtt-utils.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function parseArgs(argv) {
  const args = {
    video: null,
    vtt: null,
    auditor: 'http://localhost:8090',
    delay: 2.5, // 2.5s default delay compensation
    clipStart: 0,
    duration: 30, // 30s default for quick testing
    output: null,
    format: 'mp4',
    burnIn: false,
    rtmp: null, // RTMP target URL (e.g. rtmp://127.0.0.1:1935/live/test)
    loop: false, // Loop stream continuously
    launchVlc: false,
    help: false,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') args.help = true;
    else if (arg === '--video' || arg === '-i') args.video = argv[++i];
    else if (arg === '--vtt' || arg === '-s') args.vtt = argv[++i];
    else if (arg === '--auditor') args.auditor = argv[++i];
    else if (arg === '--delay' || arg === '-d') args.delay = parseFloat(argv[++i]);
    else if (arg === '--clip-start' || arg === '-ss') args.clipStart = parseFloat(argv[++i]);
    else if (arg === '--duration' || arg === '-t') args.duration = parseFloat(argv[++i]);
    else if (arg === '--output' || arg === '-o') args.output = argv[++i];
    else if (arg === '--format') args.format = argv[++i];
    else if (arg === '--burn-in') args.burnIn = true;
    else if (arg === '--rtmp' || arg === '--stream') {
      const next = argv[i + 1];
      if (next && !next.startsWith('-')) {
        args.rtmp = next;
        i++;
      } else {
        args.rtmp = 'rtmp://127.0.0.1:1935/live/test';
      }
    }
    else if (arg === '--loop') args.loop = true;
    else if (arg === '--vlc' || arg === '--launch-vlc') args.launchVlc = true;
  }

  return args;
}

export function findVlcPath() {
  const candidates = [
    'vlc',
    'C:\\Program Files\\VideoLAN\\VLC\\vlc.exe',
    'C:\\Program Files (x86)\\VideoLAN\\VLC\\vlc.exe',
  ];

  for (const c of candidates) {
    try {
      const probe = spawnSync(c, ['--version'], { stdio: 'ignore' });
      if (probe.status === 0 || !probe.error) return c;
    } catch {}
  }
  return null;
}

export function findDefaultVideo() {
  const candidates = [
    'D:\\liturgos-auditor\\mass13.9.mp4.mp4',
    'D:\\liturgos-auditor\\mass16.8.mp4.mp4',
    'D:\\liturgos-auditor\\messu11.8.mp4',
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

export async function runSyncer(opts = {}) {
  const videoPath = opts.video || findDefaultVideo();
  if (!videoPath || !fs.existsSync(videoPath)) {
    throw new Error(`Video file not found: ${videoPath}. Please provide --video <path>.`);
  }

  console.log(`[test-syncer] Input video: ${videoPath}`);
  const baseName = path.basename(videoPath, path.extname(videoPath));
  const workDir = path.resolve(__dirname, 'tmp');
  if (!fs.existsSync(workDir)) fs.mkdirSync(workDir, { recursive: true });

  const clipStart = opts.clipStart ?? 0;
  const duration = opts.duration ?? 30;
  const delaySec = opts.delay ?? 2.5;
  const isRtmp = Boolean(opts.rtmp);
  // In RTMP mode, FLV cannot carry soft mov_text tracks, so default to burned-in visual captions
  const isBurnIn = isRtmp ? true : Boolean(opts.burnIn);
  const outExt = opts.format === 'mkv' ? 'mkv' : 'mp4';
  const outPath = opts.output ? path.resolve(opts.output) : path.resolve(workDir, `${baseName}-synced.${outExt}`);

  console.log(`[test-syncer] Window: offset ${clipStart}s, duration ${duration}s, delay ${delaySec}s${isRtmp ? ` (RTMP -> ${opts.rtmp})` : ''}`);

  // Step 1: Discover or extract transcript cues
  let cues = [];
  const adjacentVtt = videoPath.replace(/\.mp4(\.mp4)?$/, '') + (videoPath.endsWith('.mp4.mp4') ? '.mp4.vtt' : '.vtt');
  const vttSource = opts.vtt || (fs.existsSync(adjacentVtt) ? adjacentVtt : null);

  if (vttSource && fs.existsSync(vttSource)) {
    console.log(`[test-syncer] Loading transcript from VTT: ${vttSource}`);
    const vttContent = fs.readFileSync(vttSource, 'utf8');
    const allCues = parseVtt(vttContent);
    cues = clipCues(allCues, clipStart, duration);
    console.log(`[test-syncer] Parsed ${allCues.length} total cues; ${cues.length} within this window.`);
  } else {
    // Attempt liturgos-auditor ASR
    console.log(`[test-syncer] Checking liturgos-auditor at ${opts.auditor}...`);
    const auditor = new AuditorClient(opts.auditor);
    const health = await auditor.checkHealth(1500);

    if (health.ok) {
      console.log(`[test-syncer] liturgos-auditor is ONLINE. Extracting audio chunk...`);
      const tempWav = path.join(workDir, `chunk_${Date.now()}.wav`);
      const extractArgs = [
        '-y',
        '-ss', String(clipStart),
        '-i', videoPath,
        '-t', String(duration),
        '-vn',
        '-ar', '16000',
        '-ac', '1',
        '-c:a', 'pcm_s16le',
        tempWav,
      ];
      spawnSync('ffmpeg', extractArgs, { stdio: 'inherit' });

      try {
        cues = await auditor.transcribeAudioFile(tempWav, { language: 'fi' });
        console.log(`[test-syncer] Auditor returned ${cues.length} cues.`);
      } finally {
        if (fs.existsSync(tempWav)) fs.unlinkSync(tempWav);
      }
    } else {
      console.log(`[test-syncer] liturgos-auditor offline (${health.error || 'unreachable'}). Using sample liturgy cues.`);
      cues = [
        { startMs: 2000, endMs: 6500, text: 'Huomenta kaikille. Tervetuloa jumalanpalvelukseen.' },
        { startMs: 7500, endMs: 14000, text: 'Lauletaan alkuvirtenä virsi 524, säkeistöt yksi ja kaksi.' },
        { startMs: 16000, endMs: 22000, text: 'Isän ja Pojan ja Pyhän Hengen nimeen. Aamen.' },
        { startMs: 23500, endMs: 28000, text: 'Herra olkoon teidän kanssanne. Niin myös sinun henkesi kanssa.' },
      ];
    }
  }

  if (cues.length === 0) {
    console.warn(`[test-syncer] No cues found in window [${clipStart}s, ${clipStart + duration}s]. Adding test cue.`);
    cues = [
      { startMs: 1000, endMs: 6000, text: '[Example Church - Live Caption Sync Test]' },
      { startMs: 7000, endMs: 12000, text: 'Synkronoitu tekstitys: Viivekorjaus aktivoitu.' },
    ];
  }

  // Step 2: Apply video delay compensation
  // Shifting the cues by +delaySec aligns them with video delayed by delaySec
  const syncedCues = shiftCues(cues, delaySec);
  const srtPath = path.join(workDir, `synced_${Date.now()}.srt`);
  fs.writeFileSync(srtPath, cuesToSrt(syncedCues), 'utf8');

  console.log(`[test-syncer] Cues aligned with +${delaySec}s video delay:`);
  for (const c of syncedCues.slice(0, 4)) {
    console.log(`  [${c.startMs}ms -> ${c.endMs}ms]: ${c.text.replace(/\n/g, ' ')}`);
  }
  if (syncedCues.length > 4) console.log(`  ... and ${syncedCues.length - 4} more cues.`);

  // Step 3: Run FFmpeg to delay video and mux captions or push to RTMP
  const ffmpegArgs = ['-y'];

  if (isRtmp) {
    // Realtime pacing is mandatory for RTMP push
    ffmpegArgs.push('-re');
  }

  if (opts.loop) {
    ffmpegArgs.push('-stream_loop', '-1');
  }

  if (clipStart > 0) {
    ffmpegArgs.push('-ss', String(clipStart));
  }
  ffmpegArgs.push('-i', videoPath);

  if (!isBurnIn && !isRtmp) {
    ffmpegArgs.push('-i', srtPath);
  }

  if (duration > 0 && !opts.loop) {
    ffmpegArgs.push('-t', String(duration));
  }

  if (isBurnIn) {
    // Burn-in mode: apply video delay filter AND subtitles filter
    const escapedSrt = srtPath.replace(/\\/g, '/').replace(/:/g, '\\:');
    const filter = `setpts=PTS+(${delaySec}/TB),subtitles='${escapedSrt}':force_style='FontSize=22,PrimaryColour=&H00FFFFFF,BackColour=&H80000000,BorderStyle=4,MarginV=30'`;
    ffmpegArgs.push(
      '-vf', filter,
      '-af', `asetpts=PTS+(${delaySec}/TB)`,
      '-c:v', 'libx264', '-preset', 'veryfast',
    );
    if (isRtmp) {
      ffmpegArgs.push(
        '-tune', 'zerolatency',
        '-b:v', '2500k',
        '-maxrate', '2500k',
        '-bufsize', '5000k',
        '-g', '60',
      );
    }
    ffmpegArgs.push('-c:a', 'aac', '-b:a', '128k', '-ar', '44100');
  } else {
    // Soft captions: delay video/audio and mux soft caption track
    ffmpegArgs.push(
      '-vf', `setpts=PTS+(${delaySec}/TB)`,
      '-af', `asetpts=PTS+(${delaySec}/TB)`,
      '-c:v', 'libx264', '-preset', 'ultrafast',
      '-c:a', 'aac', '-b:a', '128k',
      '-map', '0:v',
      '-map', '0:a',
      '-map', '1:s',
    );

    if (outExt === 'mkv') {
      ffmpegArgs.push('-c:s', 'subrip');
    } else {
      ffmpegArgs.push('-c:s', 'mov_text');
    }
    ffmpegArgs.push('-metadata:s:s:0', 'language=fin', '-metadata:s:s:0', 'handler_name=Suomi CC');
  }

  if (isRtmp) {
    ffmpegArgs.push('-f', 'flv', opts.rtmp);
  } else {
    ffmpegArgs.push(outPath);
  }

  const vlcPath = findVlcPath();

  if (isRtmp) {
    console.log(`\n============================================================`);
    console.log(`[test-syncer] Pushing RTMP stream to MediaMTX!`);
    console.log(`Target RTMP: ${opts.rtmp}`);
    console.log(`Video Delay Applied: ${delaySec}s`);
    console.log(`Looping: ${opts.loop ? 'YES (continuous)' : 'NO'}`);
    console.log(`============================================================`);
    console.log(`\nTo play the stream in VLC from MediaMTX, open:`);
    console.log(`  RTMP:   ${opts.rtmp}`);
    const streamName = opts.rtmp.replace(/^rtmp:\/\/[^/]+\//, '');
    console.log(`  RTSP:   rtsp://127.0.0.1:8554/${streamName}`);
    console.log(`  HLS:    http://127.0.0.1:8888/${streamName}/index.m3u8`);
    if (vlcPath) {
      console.log(`\nOr run: & "${vlcPath}" "${opts.rtmp}"`);
    }

    if (opts.launchVlc && vlcPath) {
      console.log(`[test-syncer] Launching VLC with RTMP stream in 2 seconds...`);
      setTimeout(() => {
        spawn(vlcPath, [opts.rtmp], { detached: true, stdio: 'ignore' }).unref();
      }, 2000);
    }

    console.log(`[test-syncer] Starting FFmpeg RTMP publisher (Press Ctrl+C to stop)...`);
    const proc = spawn('ffmpeg', ffmpegArgs, { stdio: 'inherit' });

    return new Promise((resolve, reject) => {
      const cleanUp = () => {
        if (fs.existsSync(srtPath)) fs.unlinkSync(srtPath);
      };
      process.on('SIGINT', () => {
        cleanUp();
        proc.kill('SIGINT');
        resolve({ rtmp: opts.rtmp, stopped: true });
      });
      proc.on('close', code => {
        cleanUp();
        if (code === 0 || code === null) {
          resolve({ rtmp: opts.rtmp, code });
        } else {
          reject(new Error(`FFmpeg exited with error code ${code}`));
        }
      });
      proc.on('error', err => {
        cleanUp();
        reject(err);
      });
    });
  }

  // File output mode
  console.log(`[test-syncer] Running FFmpeg to generate ${outPath}...`);
  const proc = spawnSync('ffmpeg', ffmpegArgs, { stdio: 'inherit' });
  if (proc.status !== 0) {
    if (fs.existsSync(srtPath)) fs.unlinkSync(srtPath);
    throw new Error(`FFmpeg exited with error code ${proc.status}`);
  }

  // Cleanup temporary SRT
  if (fs.existsSync(srtPath)) fs.unlinkSync(srtPath);

  console.log(`\n============================================================`);
  console.log(`[test-syncer] SUCCESS: Output file created!`);
  console.log(`File: ${outPath}`);
  console.log(`Video Delay Applied: ${delaySec}s`);
  console.log(`Caption Language: Finnish (fin)`);
  console.log(`============================================================`);

  if (opts.launchVlc) {
    if (vlcPath) {
      console.log(`[test-syncer] Launching in VLC: ${vlcPath}`);
      spawn(vlcPath, [outPath], { detached: true, stdio: 'ignore' }).unref();
    } else {
      console.warn(`[test-syncer] VLC executable not found in PATH or standard install dirs.`);
    }
  } else {
    console.log(`To open and verify in VLC:`);
    if (vlcPath) {
      console.log(`  & "${vlcPath}" "${outPath}"`);
    } else {
      console.log(`  vlc "${outPath}"`);
    }
    console.log(`In VLC: Subtitle -> Sub Track -> 'Suomi CC [Finnish]'`);
  }

  return {
    outPath,
    cuesCount: syncedCues.length,
    delaySec,
  };
}

// CLI entrypoint if executed directly
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log(`
test-syncer: Video & live caption synchronization tester for piecosystem

Usage:
  node syncer.mjs [options]

Options:
  --video, -i <path>       Input video file (default: sample from liturgos-auditor)
  --vtt, -s <path>         Input VTT transcript file (auto-detected if adjacent)
  --auditor <url>          liturgos-auditor base URL (default: http://localhost:8090)
  --delay, -d <seconds>    Video delay compensation in seconds (default: 2.5)
  --clip-start, -ss <sec>  Start time offset in video in seconds (default: 0)
  --duration, -t <sec>     Duration of clip to test in seconds (default: 30)
  --output, -o <path>      Output file path (default: tmp/<name>-synced.mp4)
  --format <mp4|mkv>       Output container format (default: mp4)
  --burn-in                Burn captions directly into video pixels (hardsubs)
  --rtmp, --stream [url]   Stream via RTMP to MediaMTX (default: rtmp://127.0.0.1:1935/live/test)
  --loop                   Loop RTMP stream continuously
  --vlc, --launch-vlc      Automatically launch VLC with the output file or stream
  --help, -h               Show this help message
`);
    process.exit(0);
  }

  runSyncer(args).catch(err => {
    console.error(`[test-syncer] Error:`, err.message);
    process.exit(1);
  });
}
