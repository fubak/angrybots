import { rng } from '../core/rng';

export type MusicTrackId = 'title' | 'training' | 'workshop' | 'citadel';
export type StingId = 'victory' | 'defeat';
export type MusicVoice = 'lead' | 'pad' | 'bass' | 'arp' | 'perc';

export type NoteEvent = {
  t: number;
  dur: number;
  freq: number;
  gain: number;
  osc: OscillatorType;
  voice: MusicVoice;
};

export type MusicSequence = {
  id: string;
  duration: number;
  loop: boolean;
  events: NoteEvent[];
};

type TrackSpec = {
  seed: number;
  bpm: number;
  /** multiple of 8 so the seeded melody resolves before the loop point */
  bars: number;
  /** scale root in Hz */
  root: number;
  /** semitone offsets of the scale */
  scale: number[];
  /** chord root as a scale-degree index, cycled per bar */
  chords: number[];
  leadOsc: OscillatorType;
  padOsc: OscillatorType;
  bassOsc: OscillatorType;
  leadOct: number;
  melodyDensity: number;
  bassEighths: boolean;
  arp: boolean;
  perc: 'none' | 'beats' | 'eighths';
  gains: { lead: number; pad: number; bass: number; arp: number; perc: number };
};

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10];
const DORIAN = [0, 2, 3, 5, 7, 9, 10];

const TRACKS: Record<MusicTrackId, TrackSpec> = {
  title: {
    seed: 0x71b1e,
    bpm: 88,
    bars: 24,
    root: 261.63, // C4
    scale: MAJOR,
    chords: [0, 5, 3, 4], // I vi IV V
    leadOsc: 'triangle',
    padOsc: 'sine',
    bassOsc: 'triangle',
    leadOct: 1,
    melodyDensity: 0.58,
    bassEighths: false,
    arp: false,
    perc: 'none',
    gains: { lead: 0.3, pad: 0.1, bass: 0.22, arp: 0, perc: 0 },
  },
  training: {
    seed: 0x7a1d1e6,
    bpm: 126,
    bars: 32,
    root: 196.0, // G3
    scale: MAJOR,
    chords: [0, 3, 4, 3], // I IV V IV
    leadOsc: 'square',
    padOsc: 'triangle',
    bassOsc: 'triangle',
    leadOct: 1,
    melodyDensity: 0.7,
    bassEighths: true,
    arp: false,
    perc: 'beats',
    gains: { lead: 0.2, pad: 0.08, bass: 0.2, arp: 0, perc: 0.12 },
  },
  workshop: {
    seed: 0xcc0ffee,
    bpm: 104,
    bars: 32,
    root: 293.66, // D4
    scale: DORIAN,
    chords: [0, 0, 3, 5], // i i IV VI
    leadOsc: 'sawtooth',
    padOsc: 'triangle',
    bassOsc: 'square',
    leadOct: 0,
    melodyDensity: 0.5,
    bassEighths: true,
    arp: false,
    perc: 'eighths',
    gains: { lead: 0.16, pad: 0.07, bass: 0.16, arp: 0, perc: 0.14 },
  },
  citadel: {
    seed: 0xdeadf00d,
    bpm: 76,
    bars: 24,
    root: 220.0, // A3
    scale: MINOR,
    chords: [0, 5, 3, 4], // i VI III VII
    leadOsc: 'sine',
    padOsc: 'triangle',
    bassOsc: 'sine',
    leadOct: 1,
    melodyDensity: 0.36,
    bassEighths: false,
    arp: true,
    perc: 'beats',
    gains: { lead: 0.2, pad: 0.09, bass: 0.18, arp: 0.11, perc: 0.06 },
  },
};

function freqOf(root: number, scale: readonly number[], deg: number, oct = 0): number {
  const l = scale.length;
  const q = Math.floor(deg / l);
  const semi = scale[((deg % l) + l) % l]! + 12 * (q + oct);
  return root * Math.pow(2, semi / 12);
}

/** Deterministic generative track: pads + bass per bar, seeded melody walk, cadence on the final bar. */
export function generateTrack(id: MusicTrackId): MusicSequence {
  const spec = TRACKS[id];
  const barDur = 240 / spec.bpm;
  const eighth = barDur / 8;
  const duration = spec.bars * barDur;
  const events: NoteEvent[] = [];
  const g = spec.gains;

  for (let bar = 0; bar < spec.bars; bar++) {
    const deg = spec.chords[bar % spec.chords.length]!;
    const t0 = bar * barDur;
    // Pad triad, held the whole bar; same chord at the seam bar 0, so the loop is seamless.
    for (const off of [0, 2, 4]) {
      events.push({
        t: t0,
        dur: barDur,
        freq: freqOf(spec.root, spec.scale, deg + off),
        gain: g.pad,
        osc: spec.padOsc,
        voice: 'pad',
      });
    }
    // Bass.
    const bassFreq = freqOf(spec.root, spec.scale, deg, -1);
    if (spec.bassEighths) {
      for (const [beat, d2] of [
        [0, 0],
        [2, 4],
      ] as const) {
        events.push({
          t: t0 + (beat * barDur) / 4,
          dur: (barDur / 4) * 0.9,
          freq: freqOf(spec.root, spec.scale, deg + d2, -1),
          gain: g.bass,
          osc: spec.bassOsc,
          voice: 'bass',
        });
      }
    } else {
      events.push({
        t: t0,
        dur: barDur * 0.92,
        freq: bassFreq,
        gain: g.bass,
        osc: spec.bassOsc,
        voice: 'bass',
      });
    }
    // Arpeggio on eighths, up-down over the bar.
    if (spec.arp) {
      const pat = [0, 2, 4, 7, 4, 2, 4, 7];
      for (let i = 0; i < 8; i++) {
        events.push({
          t: t0 + i * eighth,
          dur: eighth * 0.9,
          freq: freqOf(spec.root, spec.scale, deg + pat[i]!),
          gain: g.arp * (i % 2 === 0 ? 1 : 0.7),
          osc: 'triangle',
          voice: 'arp',
        });
      }
    }
    // Percussion ticks: band-passed noise at render time; freq is the band center.
    if (spec.perc !== 'none') {
      const slots = spec.perc === 'eighths' ? 8 : 4;
      for (let i = 0; i < slots; i++) {
        const down = spec.perc === 'eighths' ? i === 0 || i === 4 : i === 0;
        events.push({
          t: t0 + i * (barDur / slots),
          dur: 0.05,
          freq: i % 2 === 0 ? 5200 : 7200,
          gain: g.perc * (down ? 1 : 0.55),
          osc: 'sine',
          voice: 'perc',
        });
      }
    }
  }

  // Seeded melody walk on eighth slots, resolving to the root on the last bar.
  const r = rng(spec.seed);
  const l = spec.scale.length;
  let deg = l + spec.chords[0]!;
  const lo = Math.floor(l / 2);
  const hi = l + 4;
  const lastBarStart = (spec.bars - 1) * barDur;
  for (let bar = 0; bar < spec.bars; bar++) {
    if (bar === spec.bars - 1) {
      events.push({
        t: lastBarStart,
        dur: barDur * 0.9,
        freq: spec.root * 2,
        gain: g.lead,
        osc: spec.leadOsc,
        voice: 'lead',
      });
      break;
    }
    let i = 0;
    while (i < 8) {
      if (r() < spec.melodyDensity) {
        const len = i <= 6 && r() < 0.22 ? 2 : 1;
        events.push({
          t: bar * barDur + i * eighth,
          dur: len * eighth * 0.92,
          freq: freqOf(spec.root, spec.scale, deg, spec.leadOct),
          gain: g.lead * (0.75 + r() * 0.35),
          osc: spec.leadOsc,
          voice: 'lead',
        });
        i += len;
        const step =
          r() < 0.72 ? (r() < 0.5 ? -1 : 1) * (r() < 0.25 ? 2 : 1) : Math.floor(r() * 5) - 2;
        deg = Math.max(lo, Math.min(hi, deg + step));
      } else {
        i += 1;
      }
    }
  }

  return { id, duration, loop: true, events };
}

/** Short authored stings (2–4 s) for the results screen. */
export function generateSting(id: StingId): MusicSequence {
  const events: NoteEvent[] = [];
  const push = (t: number, dur: number, freq: number, gain: number, osc: OscillatorType, voice: MusicVoice) =>
    events.push({ t, dur, freq, gain, osc, voice });
  if (id === 'victory') {
    const run = [329.63, 392.0, 523.25, 659.25];
    run.forEach((f, i) => push(i * 0.16, 0.42, f, 0.24, 'triangle', 'lead'));
    const t0 = run.length * 0.16;
    for (const f of [523.25, 659.25, 784.0]) {
      push(t0, 1.9 - t0 * 0.4, f, 0.1, 'triangle', 'pad');
    }
    push(t0 + 0.02, 0.09, 7200, 0.08, 'sine', 'perc');
    return { id, duration: 2.6, loop: false, events };
  }
  const run = [220.0, 174.61, 146.83];
  run.forEach((f, i) => push(i * 0.5, 0.7, f, 0.28, 'triangle', 'lead'));
  const t0 = run.length * 0.5;
  push(t0, 1.6, 110.0, 0.3, 'sine', 'bass');
  push(t0, 1.6, 220.0, 0.12, 'triangle', 'pad');
  push(t0, 1.6, 261.63, 0.08, 'triangle', 'pad');
  return { id, duration: 3.2, loop: false, events };
}

/**
 * Upper bound on instantaneous amplitude: max over event boundaries of the sum
 * of gains of every event covering that instant (each osc tops out at its gain).
 */
export function sequencePeakBound(seq: MusicSequence): number {
  const bounds = new Set<number>();
  for (const e of seq.events) {
    bounds.add(e.t);
    bounds.add(e.t + e.dur);
  }
  let peak = 0;
  for (const t of bounds) {
    let s = 0;
    for (const e of seq.events) {
      // epsilon keeps bar-boundary float error from counting an ended note
      if (e.t <= t && t < e.t + e.dur - 1e-6) s += e.gain;
    }
    peak = Math.max(peak, s);
  }
  return peak;
}

const noiseCache = new WeakMap<BaseAudioContext, AudioBuffer>();

function noiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  const hit = noiseCache.get(ctx);
  if (hit) return hit;
  const n = Math.floor(ctx.sampleRate * 0.08);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  const r = rng(0x9e3779b9);
  for (let i = 0; i < n; i++) d[i] = r() * 2 - 1;
  noiseCache.set(ctx, buf);
  return buf;
}

function envelope(g: GainNode, t: number, dur: number, peak: number, voice: MusicVoice): void {
  const p = g.gain;
  const attack = voice === 'pad' ? Math.min(0.4, dur * 0.3) : voice === 'perc' ? 0.002 : 0.012;
  const release = voice === 'pad' ? Math.min(0.6, dur * 0.35) : Math.min(0.25, dur * 0.4);
  p.setValueAtTime(0, t);
  p.linearRampToValueAtTime(peak, t + attack);
  if (voice === 'perc') {
    p.exponentialRampToValueAtTime(0.001, t + Math.max(dur, 0.01));
    return;
  }
  p.setValueAtTime(peak, Math.max(t + attack, t + dur - release));
  p.linearRampToValueAtTime(0.0001, t + dur);
}

/** Schedule a sequence's events into any BaseAudioContext (live or offline). */
export function scheduleEvents(
  ctx: BaseAudioContext,
  seq: MusicSequence,
  dest: AudioNode,
  when = 0
): void {
  for (const e of seq.events) {
    const t = when + e.t;
    const g = ctx.createGain();
    envelope(g, t, e.dur, e.gain, e.voice);
    g.connect(dest);
    if (e.voice === 'perc') {
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer(ctx);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = e.freq;
      bp.Q.value = 1.2;
      src.connect(bp);
      bp.connect(g);
      src.start(t);
      src.stop(t + Math.max(e.dur, 0.08));
      continue;
    }
    const osc = ctx.createOscillator();
    osc.type = e.osc;
    osc.frequency.value = e.freq;
    osc.connect(g);
    osc.start(t);
    osc.stop(t + e.dur + 0.02);
  }
}

/**
 * Renders a sequence offline into an AudioBuffer, master gain normalized so the
 * gain-sum bound stays ≤0.85 (headroom below the 0.9 clip ceiling).
 */
export async function renderMusicBuffer(
  seq: MusicSequence,
  sampleRate = 44100
): Promise<AudioBuffer | null> {
  if (typeof OfflineAudioContext === 'undefined') return null;
  const frames = Math.ceil(seq.duration * sampleRate);
  const ctx = new OfflineAudioContext(1, frames, sampleRate);
  const master = ctx.createGain();
  master.gain.value = Math.min(1, 0.85 / Math.max(0.01, sequencePeakBound(seq)));
  master.connect(ctx.destination);
  scheduleEvents(ctx, seq, master);
  try {
    return await ctx.startRendering();
  } catch {
    return null;
  }
}
