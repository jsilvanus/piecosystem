/**
 * WebVTT and SubRip (SRT) subtitle utilities for test-syncer.
 */

export function parseTimeString(str) {
  if (!str) return 0;
  const cleaned = str.trim().replace(',', '.');
  const parts = cleaned.split(':');
  let hours = 0;
  let minutes = 0;
  let seconds = 0;

  if (parts.length === 3) {
    hours = parseFloat(parts[0]) || 0;
    minutes = parseFloat(parts[1]) || 0;
    seconds = parseFloat(parts[2]) || 0;
  } else if (parts.length === 2) {
    minutes = parseFloat(parts[0]) || 0;
    seconds = parseFloat(parts[1]) || 0;
  } else {
    seconds = parseFloat(cleaned) || 0;
  }

  return Math.round((hours * 3600 + minutes * 60 + seconds) * 1000);
}

export function formatVttTime(ms) {
  const safeMs = Math.max(0, Math.round(ms));
  const hours = Math.floor(safeMs / 3600000);
  const minutes = Math.floor((safeMs % 3600000) / 60000);
  const seconds = Math.floor((safeMs % 60000) / 1000);
  const millis = safeMs % 1000;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}

export function formatSrtTime(ms) {
  return formatVttTime(ms).replace('.', ',');
}

export function parseVtt(content) {
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const cues = [];
  let currentCue = null;
  const timeRegex = /((?:\d{1,2}:)?\d{2}:\d{2}[\.,]\d{3})\s*-->\s*((?:\d{1,2}:)?\d{2}:\d{2}[\.,]\d{3})/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line === 'WEBVTT' || line.startsWith('NOTE') || line.startsWith('STYLE')) {
      if (currentCue && currentCue.text.length > 0) {
        cues.push({
          startMs: currentCue.startMs,
          endMs: currentCue.endMs,
          text: currentCue.text.join('\n').trim(),
        });
        currentCue = null;
      }
      continue;
    }

    const match = line.match(timeRegex);
    if (match) {
      if (currentCue && currentCue.text.length > 0) {
        cues.push({
          startMs: currentCue.startMs,
          endMs: currentCue.endMs,
          text: currentCue.text.join('\n').trim(),
        });
      }
      currentCue = {
        startMs: parseTimeString(match[1]),
        endMs: parseTimeString(match[2]),
        text: [],
      };
      continue;
    }

    if (currentCue) {
      currentCue.text.push(line);
    }
  }

  if (currentCue && currentCue.text.length > 0) {
    cues.push({
      startMs: currentCue.startMs,
      endMs: currentCue.endMs,
      text: currentCue.text.join('\n').trim(),
    });
  }

  return cues;
}

export function shiftCues(cues, shiftSeconds) {
  const shiftMs = Math.round(shiftSeconds * 1000);
  const shifted = [];

  for (const cue of cues) {
    const newStart = cue.startMs + shiftMs;
    const newEnd = cue.endMs + shiftMs;
    if (newEnd <= 0) continue; // Passed before video started
    shifted.push({
      startMs: Math.max(0, newStart),
      endMs: Math.max(10, newEnd),
      text: cue.text,
    });
  }

  return shifted;
}

export function clipCues(cues, startSeconds, durationSeconds) {
  const windowStartMs = Math.round(startSeconds * 1000);
  const windowEndMs = windowStartMs + Math.round(durationSeconds * 1000);
  const clipped = [];

  for (const cue of cues) {
    if (cue.endMs <= windowStartMs || cue.startMs >= windowEndMs) {
      continue;
    }
    const relStart = Math.max(0, cue.startMs - windowStartMs);
    const relEnd = Math.min(windowEndMs - windowStartMs, cue.endMs - windowStartMs);

    clipped.push({
      startMs: relStart,
      endMs: relEnd,
      text: cue.text,
    });
  }

  return clipped;
}

export function cuesToVtt(cues) {
  const out = ['WEBVTT', ''];
  for (const cue of cues) {
    out.push(`${formatVttTime(cue.startMs)} --> ${formatVttTime(cue.endMs)}`);
    out.push(cue.text);
    out.push('');
  }
  return out.join('\n');
}

export function cuesToSrt(cues) {
  const out = [];
  let index = 1;
  for (const cue of cues) {
    out.push(String(index++));
    out.push(`${formatSrtTime(cue.startMs)} --> ${formatSrtTime(cue.endMs)}`);
    out.push(cue.text);
    out.push('');
  }
  return out.join('\n');
}
