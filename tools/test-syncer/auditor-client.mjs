/**
 * Client for interacting with liturgos-auditor (FastAPI + faster-whisper).
 */

import * as fs from 'node:fs';

export class AuditorClient {
  constructor(baseUrl = 'http://localhost:8090') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  /**
   * Check if auditor is healthy and responding.
   */
  async checkHealth(timeoutMs = 2500) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(`${this.baseUrl}/health`, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) return { ok: false, status: res.status };
      const data = await res.json().catch(() => ({}));
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  /**
   * Transcribe an audio file via OpenAI-compatible endpoint (/v1/audio/transcriptions).
   * Returns cue list [{ startMs, endMs, text }]
   */
  async transcribeAudioFile(audioFilePath, { language = 'fi', prompt } = {}) {
    if (!fs.existsSync(audioFilePath)) {
      throw new Error(`Audio file does not exist: ${audioFilePath}`);
    }

    const fileBuffer = fs.readFileSync(audioFilePath);
    const blob = new Blob([fileBuffer], { type: 'audio/wav' });

    const form = new FormData();
    form.append('file', blob, 'audio.wav');
    form.append('language', language);
    form.append('response_format', 'verbose_json');
    if (prompt) form.append('prompt', prompt);

    const res = await fetch(`${this.baseUrl}/v1/audio/transcriptions`, {
      method: 'POST',
      body: form,
    });

    if (!res.ok) {
      // Fallback to /inference endpoint if /v1/audio/transcriptions fails
      return this.transcribeInference(audioFilePath, { language });
    }

    const data = await res.json();
    if (Array.isArray(data.segments)) {
      return data.segments.map(seg => ({
        startMs: Math.round(seg.start * 1000),
        endMs: Math.round(seg.end * 1000),
        text: (seg.text || '').trim(),
      }));
    }

    return [{
      startMs: 0,
      endMs: 5000,
      text: (data.text || '').trim(),
    }];
  }

  /**
   * Fallback to /inference endpoint (whisper.cpp format).
   */
  async transcribeInference(audioFilePath, { language = 'fi' } = {}) {
    const fileBuffer = fs.readFileSync(audioFilePath);
    const blob = new Blob([fileBuffer], { type: 'audio/wav' });

    const form = new FormData();
    form.append('file', blob, 'audio.wav');
    form.append('language', language);
    form.append('response_format', 'json');

    const res = await fetch(`${this.baseUrl}/inference`, {
      method: 'POST',
      body: form,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Auditor /inference failed (${res.status}): ${text}`);
    }

    const data = await res.json();
    return [{
      startMs: 0,
      endMs: 5000,
      text: (data.text || '').trim(),
    }];
  }
}
