#!/usr/bin/env node
// Renders Chaos Blaster's v1 sound set (synthesized chip-style audio) to WAV,
// then encodes OGG + MP3 via ffmpeg. Re-run any time to regenerate the
// committed files under assets/audio/chaos-blaster/.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', '..', 'assets', 'audio', 'chaos-blaster');
const TMP = join(HERE, 'tmp');
const SR = 44100;
const TAU = Math.PI * 2;

// ---------------------------------------------------------------- synth
const buf = (sec) => new Float32Array(Math.round(sec * SR));

function tone(sec, f0, f1 = f0, type = 'square', gain = 1) {
  const b = buf(sec);
  let phase = 0;
  for (let i = 0; i < b.length; i++) {
    const t = i / b.length;
    const f = type === 'noise' ? 0 : f0 * Math.pow(f1 / f0 || 1, t);
    phase += (TAU * f) / SR;
    const v =
      type === 'sine' ? Math.sin(phase)
      : type === 'square' ? (Math.sin(phase) > 0 ? 1 : -1)
      : type === 'saw' ? 2 * ((phase / TAU) % 1) - 1
      : Math.random() * 2 - 1; // noise
    b[i] = v * gain;
  }
  return b;
}

function decay(b, k = 5) {
  for (let i = 0; i < b.length; i++) b[i] *= Math.exp((-k * i) / b.length);
  return b;
}

function shaped(b, attack = 0.004, release = 0.02) {
  const a = Math.max(1, Math.round(attack * SR));
  const r = Math.max(1, Math.round(release * SR));
  for (let i = 0; i < b.length; i++) {
    let g = 1;
    if (i < a) g = i / a;
    if (b.length - i < r) g = Math.min(g, (b.length - i) / r);
    b[i] *= g;
  }
  return b;
}

function mix(dst, src, atSec = 0, gain = 1) {
  const o = Math.round(atSec * SR);
  for (let i = 0; i < src.length && o + i < dst.length; i++) dst[o + i] += src[i] * gain;
  return dst;
}

function seq(notes, type, gain) {
  const total = notes.reduce((s, n) => s + n[1], 0);
  const out = buf(total + 0.1);
  let t = 0;
  for (const [freq, dur] of notes) {
    mix(out, shaped(decay(tone(dur, freq, freq, type, gain), 2.5)), t);
    t += dur;
  }
  return out;
}

const SOUNDS = {
  // Richer arcade "pew": two detuned square sweeps (one an octave down for
  // body) + a short noise transient at the attack. Evocative of a Galaga
  // shot without copying it.
  fire: () => {
    const a = tone(0.18, 1500, 300, 'square', 0.5);
    mix(a, tone(0.18, 760, 150, 'square', 0.28));   // sub-octave body
    mix(a, tone(0.16, 2100, 520, 'square', 0.12));  // bright detuned overtone
    mix(a, decay(tone(0.02, 0, 0, 'noise', 0.45), 8)); // click transient
    return shaped(decay(a, 3.4), 0.001, 0.05);
  },
  hit: () => {
    const b = tone(0.1, 640, 460, 'square', 0.55);
    mix(b, tone(0.05, 0, 0, 'noise', 0.35));
    return shaped(decay(b, 5));
  },
  split: () => {
    const b = tone(0.22, 330, 70, 'sine', 0.9);
    mix(b, tone(0.07, 0, 0, 'noise', 0.3));
    return shaped(decay(b, 4));
  },
  wave: () => seq([[220, 0.12], [261.63, 0.12], [329.63, 0.12], [440, 0.3]], 'square', 0.5),
  dive: () => shaped(decay(tone(0.42, 1150, 260, 'saw', 0.55), 1.6), 0.008, 0.1),
  playerhit: () => {
    const b = tone(0.4, 380, 55, 'saw', 0.7);
    mix(b, tone(0.25, 0, 0, 'noise', 0.5));
    return shaped(decay(b, 3));
  },
  gameover: () => seq([[440, 0.22], [329.63, 0.22], [261.63, 0.22], [220, 0.5]], 'square', 0.45),
  victory: () => seq([[440, 0.14], [523.25, 0.14], [659.25, 0.14], [880, 0.4]], 'square', 0.5),
  // NOTE: soundtrack.ogg/.mp3 is NOT generated here — it's the licensed track
  // trimmed to a seamless loop by trim-soundtrack.mjs. Re-running this script
  // regenerates only the SFX and leaves the soundtrack files untouched.
};

// ------------------------------------------------------------ WAV writer
function wav(samples) {
  let peak = 0;
  for (const v of samples) peak = Math.max(peak, Math.abs(v));
  const g = peak > 0 ? 0.9 / peak : 1;
  const d = Buffer.alloc(44 + samples.length * 2);
  d.write('RIFF', 0);
  d.writeUInt32LE(36 + samples.length * 2, 4);
  d.write('WAVEfmt ', 8);
  d.writeUInt32LE(16, 16);
  d.writeUInt16LE(1, 20);
  d.writeUInt16LE(1, 22);
  d.writeUInt32LE(SR, 24);
  d.writeUInt32LE(SR * 2, 28);
  d.writeUInt16LE(2, 32);
  d.writeUInt16LE(16, 34);
  d.write('data', 36);
  d.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++)
    d.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(samples[i] * g * 32767))), 44 + i * 2);
  return d;
}

// ---------------------------------------------------------------- encode
try {
  execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
} catch {
  console.error('ffmpeg not found on PATH — install it (brew install ffmpeg) and re-run.');
  process.exit(1);
}
mkdirSync(OUT, { recursive: true });
mkdirSync(TMP, { recursive: true });
for (const [name, render] of Object.entries(SOUNDS)) {
  const wavPath = join(TMP, name + '.wav');
  writeFileSync(wavPath, wav(render()));
  const quality = name === 'soundtrack' ? ['-qscale:a', '3'] : ['-qscale:a', '4'];
  execFileSync('ffmpeg', ['-y', '-i', wavPath, '-ac', '2', '-c:a', 'vorbis', '-strict', '-2', ...quality, join(OUT, name + '.ogg')], { stdio: 'ignore' });
  execFileSync('ffmpeg', ['-y', '-i', wavPath, '-ac', '1', '-c:a', 'libmp3lame', '-qscale:a', '5', join(OUT, name + '.mp3')], { stdio: 'ignore' });
  const kb = (p) => Math.round(statSync(p).size / 1024);
  console.log(`${name}: ${kb(join(OUT, name + '.ogg'))} KB ogg, ${kb(join(OUT, name + '.mp3'))} KB mp3`);
}
rmSync(TMP, { recursive: true, force: true });
console.log('done →', OUT);
