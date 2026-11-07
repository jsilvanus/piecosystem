import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseTimeString, formatVttTime, formatSrtTime, parseVtt, shiftCues, clipCues, cuesToSrt, cuesToVtt } from '../vtt-utils.mjs';
import { parseArgs } from '../syncer.mjs';

describe('vtt-utils', () => {
  it('parses timestamps accurately with commas and dots', () => {
    assert.equal(parseTimeString('00:03:03.485'), 183485);
    assert.equal(parseTimeString('00:03:03,485'), 183485);
    assert.equal(parseTimeString('01:10.500'), 70500);
    assert.equal(parseTimeString('5.250'), 5250);
  });

  it('formats VTT and SRT timecodes', () => {
    assert.equal(formatVttTime(183485), '00:03:03.485');
    assert.equal(formatSrtTime(183485), '00:03:03,485');
  });

  it('parses WebVTT content into cues', () => {
    const sampleVtt = `WEBVTT

00:01:00.000 --> 00:01:04.500
Tervetuloa jumalanpalvelukseen.

00:01:05.000 --> 00:01:08.200
Lauletaan virsi 524.
`;
    const cues = parseVtt(sampleVtt);
    assert.equal(cues.length, 2);
    assert.equal(cues[0].startMs, 60000);
    assert.equal(cues[0].endMs, 64500);
    assert.equal(cues[0].text, 'Tervetuloa jumalanpalvelukseen.');
    assert.equal(cues[1].text, 'Lauletaan virsi 524.');
  });

  it('shifts cues by positive delay', () => {
    const cues = [
      { startMs: 1000, endMs: 4000, text: 'Ensimmäinen' },
    ];
    const shifted = shiftCues(cues, 2.5); // +2.5s
    assert.equal(shifted.length, 1);
    assert.equal(shifted[0].startMs, 3500);
    assert.equal(shifted[0].endMs, 6500);
  });

  it('clips cues within a start and duration window', () => {
    const cues = [
      { startMs: 50000, endMs: 55000, text: 'Outside before' },
      { startMs: 62000, endMs: 68000, text: 'Inside window' },
      { startMs: 150000, endMs: 155000, text: 'Outside after' },
    ];
    // window 60s to 90s
    const clipped = clipCues(cues, 60, 30);
    assert.equal(clipped.length, 1);
    assert.equal(clipped[0].startMs, 2000);
    assert.equal(clipped[0].endMs, 8000);
    assert.equal(clipped[0].text, 'Inside window');
  });

  it('converts cues to valid SRT and VTT formats', () => {
    const cues = [{ startMs: 1000, endMs: 3500, text: 'Test text' }];
    const srt = cuesToSrt(cues);
    const vtt = cuesToVtt(cues);
    assert.ok(srt.includes('00:00:01,000 --> 00:00:03,500'));
    assert.ok(srt.includes('Test text'));
    assert.ok(vtt.startsWith('WEBVTT'));
    assert.ok(vtt.includes('00:00:01.000 --> 00:00:03.500'));
  });
});

describe('syncer CLI parser', () => {
  it('parses command line arguments properly', () => {
    const parsed = parseArgs(['node', 'syncer.mjs', '--video', 'test.mp4', '--delay', '3.5', '--burn-in', '--duration', '15']);
    assert.equal(parsed.video, 'test.mp4');
    assert.equal(parsed.delay, 3.5);
    assert.equal(parsed.burnIn, true);
    assert.equal(parsed.duration, 15);
  });

  it('parses RTMP streaming options with custom or default URL and loop', () => {
    const custom = parseArgs(['node', 'syncer.mjs', '--rtmp', 'rtmp://192.168.1.14:1935/live/cam1', '--loop']);
    assert.equal(custom.rtmp, 'rtmp://192.168.1.14:1935/live/cam1');
    assert.equal(custom.loop, true);

    const defaultRtmp = parseArgs(['node', 'syncer.mjs', '--stream']);
    assert.equal(defaultRtmp.rtmp, 'rtmp://127.0.0.1:1935/live/test');
  });
});
