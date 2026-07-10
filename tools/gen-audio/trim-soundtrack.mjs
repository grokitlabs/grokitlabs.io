#!/usr/bin/env node
// Trims the licensed source track down to a short, seamlessly-looping sample
// for the Chaos Blaster soundtrack. Finds a low-energy cut point near the
// target length (a natural phrase boundary) and crossfades the tail onto the
// head so the loop seam is inaudible. Re-run to regenerate soundtrack.ogg/.mp3.
//
// Usage: node tools/gen-audio/trim-soundtrack.mjs [targetSeconds]
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, rmSync, mkdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, 'source', 'Space_Main_Theme.mp3');
const OUT = join(HERE, '..', '..', 'assets', 'audio', 'chaos-blaster');
const TMP = join(HERE, 'tmp');
const SR = 44100;
const CH = 2;

const TARGET = Number(process.argv[2]) || 40; // seconds of loop body
const SEARCH = 6;    // ± window (s) around target to hunt for a quiet cut
const XFADE = 1.6;   // crossfade length (s)

mkdirSync(TMP, { recursive: true });
const rawPath = join(TMP, 'src.s16le');
// Decode the source to raw interleaved 16-bit stereo PCM.
execFileSync('ffmpeg', ['-y', '-i', SRC, '-ac', String(CH), '-ar', String(SR), '-f', 's16le', rawPath], { stdio: 'ignore' });
const pcm = new Int16Array(readFileSync(rawPath).buffer);
const frames = Math.floor(pcm.length / CH); // stereo frames

// Short-term RMS envelope (20 ms frames) to locate a natural quiet point.
const win = Math.round(0.02 * SR);
function rmsAt(frame) {
  let s = 0, n = 0;
  for (let i = frame; i < frame + win && i < frames; i++) {
    const l = pcm[i * CH], r = pcm[i * CH + 1];
    s += l * l + r * r; n += 2;
  }
  return n ? Math.sqrt(s / n) : Infinity;
}

// Search a window around the target length for the lowest-energy frame — a
// phrase boundary or breath makes the crossfaded seam disappear.
const lo = Math.round((TARGET - SEARCH) * SR);
const hi = Math.min(frames - Math.round(XFADE * SR) - 1, Math.round((TARGET + SEARCH) * SR));
let cut = lo, best = Infinity;
for (let f = lo; f <= hi; f += Math.round(0.01 * SR)) {
  const e = rmsAt(f);
  if (e < best) { best = e; cut = f; }
}

const xf = Math.round(XFADE * SR);
const bodyLen = cut - xf; // final loop length in frames
const out = new Int16Array(bodyLen * CH);
for (let i = 0; i < bodyLen; i++) {
  for (let c = 0; c < CH; c++) {
    let v = pcm[i * CH + c];
    if (i < xf) {
      // blend the tail (just before the cut) onto the head so end→start is smooth
      const t = i / xf;
      v = v * t + pcm[(bodyLen + i) * CH + c] * (1 - t);
    }
    out[i * CH + c] = Math.max(-32768, Math.min(32767, Math.round(v)));
  }
}

const outRaw = join(TMP, 'loop.s16le');
writeFileSync(outRaw, Buffer.from(out.buffer));
const enc = (ext, args) =>
  execFileSync('ffmpeg', ['-y', '-f', 's16le', '-ar', String(SR), '-ac', String(CH), '-i', outRaw, ...args, join(OUT, 'soundtrack.' + ext)], { stdio: 'ignore' });
enc('ogg', ['-c:a', 'vorbis', '-strict', '-2', '-qscale:a', '3']);
enc('mp3', ['-c:a', 'libmp3lame', '-qscale:a', '5']);
rmSync(TMP, { recursive: true, force: true });

const kb = (p) => Math.round(statSync(join(OUT, p)).size / 1024);
console.log(`cut at ${(cut / SR).toFixed(1)}s  →  loop body ${(bodyLen / SR).toFixed(1)}s`);
console.log(`soundtrack.ogg ${kb('soundtrack.ogg')} KB, soundtrack.mp3 ${kb('soundtrack.mp3')} KB`);
