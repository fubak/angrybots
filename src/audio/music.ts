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
  /** percussion flavor: kick is a sine pitch-drop, shake is bandpassed noise */
  drum?: 'kick' | 'shake';
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
  /** 'hold' = sustained root per bar, 'oompah' = staccato root–5th–octave–5th beats */
  bass: 'hold' | 'oompah';
  arp: boolean;
  perc: 'none' | 'sparse' | 'beats' | 'eighths';
  gains: { lead: number; pad: number; bass: number; arp: number; perc: number };
};

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10];
const DORIAN = [0, 2, 3, 5, 7, 9, 10];

/** Swung off-beat eighths sit ~59% into the beat pair (classic triplet swing). */
const SWING = 0.59;

const TRACKS: Record<MusicTrackId, TrackSpec> = {
  title: {
    seed: 0x71b1e,
    bpm: 88,
    bars: 24,
    root: 130.81, // C3
    scale: MAJOR,
    chords: [0, 5, 3, 4], // I vi IV V
    leadOsc: 'sine',
    padOsc: 'sine',
    bassOsc: 'sine',
    leadOct: 0,
    melodyDensity: 0.4,
    bass: 'hold',
    arp: false,
    perc: 'none',
    gains: { lead: 0.17, pad: 0.11, bass: 0.24, arp: 0, perc: 0 },
  },
  training: {
    seed: 0x7a1d1e6,
    bpm: 126,
    bars: 32,
    root: 98.0, // G2
    scale: MAJOR,
    chords: [0, 3, 4, 3], // I IV V IV
    leadOsc: 'triangle',
    padOsc: 'sine',
    bassOsc: 'sine',
    leadOct: 0,
    melodyDensity: 0.45,
    bass: 'oompah',
    arp: false,
    perc: 'beats',
    gains: { lead: 0.12, pad: 0.09, bass: 0.22, arp: 0, perc: 0.1 },
  },
  workshop: {
    seed: 0xcc0ffee,
    bpm: 104,
    bars: 32,
    root: 146.83, // D3
    scale: DORIAN,
    chords: [0, 0, 3, 5], // i i IV VI
    leadOsc: 'triangle',
    padOsc: 'sine',
    bassOsc: 'triangle',
    leadOct: 0,
    melodyDensity: 0.38,
    bass: 'oompah',
    arp: false,
    perc: 'eighths',
    gains: { lead: 0.1, pad: 0.08, bass: 0.2, arp: 0, perc: 0.1 },
  },
  citadel: {
    seed: 0xdeadf00d,
    bpm: 76,
    bars: 24,
    root: 110.0, // A2
    scale: MINOR,
    chords: [0, 5, 3, 4], // i VI III VII
    leadOsc: 'sine',
    padOsc: 'sine',
    bassOsc: 'sine',
    leadOct: 0,
    melodyDensity: 0.35,
    bass: 'hold',
    arp: true,
    perc: 'sparse',
    gains: { lead: 0.12, pad: 0.1, bass: 0.2, arp: 0.09, perc: 0.06 },
  },
};

function freqOf(root: number, scale: readonly number[], deg: number, oct = 0): number {
  const l = scale.length;
  const q = Math.floor(deg / l);
  const semi = scale[((deg % l) + l) % l]! + 12 * (q + oct);
  return root * Math.pow(2, semi / 12);
}

/** Seeded 2-bar melodic cell: eighth slots, each a note or a rest. */
type MotifNote = { slot: number; len: number; deg: number; vel: number };

function buildMotif(r: () => number, spec: TrackSpec, startDeg: number): MotifNote[] {
  const l = spec.scale.length;
  const lo = Math.floor(l / 2);
  const hi = l + 4;
  const notes: MotifNote[] = [];
  let deg = startDeg;
  let i = 0;
  while (i < 16) {
    if (r() < spec.melodyDensity) {
      // a 2-slot note must stay inside its own bar — slot 7/15 can't lengthen
      const len = i % 8 <= 6 && r() < 0.22 ? 2 : 1;
      notes.push({ slot: i, len, deg, vel: 0.75 + r() * 0.35 });
      i += len;
      const step =
        r() < 0.72 ? (r() < 0.5 ? -1 : 1) * (r() < 0.25 ? 2 : 1) : Math.floor(r() * 5) - 2;
      deg = Math.max(lo, Math.min(hi, deg + step));
    } else {
      i += 1;
    }
  }
  return notes;
}

/** Eighth-slot time within a bar; odd slots swing late. */
function slotT(barStart: number, barDur: number, i: number): number {
  const beat = barDur / 4;
  return barStart + Math.floor(i / 2) * beat + (i % 2) * SWING * beat;
}

/**
 * Deterministic generative track: pads + bass per bar, a seeded 2-bar melody
 * motif repeated AABA over each 8-bar phrase, cadence on the final bar. The
 * last phrase of each track drops the lead (pads + bass only).
 */
export function generateTrack(id: MusicTrackId): MusicSequence {
  const spec = TRACKS[id];
  const barDur = 240 / spec.bpm;
  const beat = barDur / 4;
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
    if (spec.bass === 'oompah') {
      // Staccato root–fifth–octave–fifth bounce, one note per beat.
      for (const [b, d2] of [
        [0, 0],
        [1, 4],
        [2, 7],
        [3, 4],
      ] as const) {
        events.push({
          t: t0 + b * beat,
          dur: beat * 0.5,
          freq: freqOf(spec.root, spec.scale, deg + d2, -1),
          gain: g.bass * (b === 0 ? 1 : 0.8),
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
    // Arpeggio on swung eighths, up-down over the bar. Odd slots get the short
    // (1-SWING) half of the beat so nothing overhangs the bar line.
    if (spec.arp) {
      const pat = [0, 2, 4, 7, 4, 2, 4, 7];
      for (let i = 0; i < 8; i++) {
        events.push({
          t: slotT(t0, barDur, i),
          dur: (i % 2 === 0 ? SWING : 1 - SWING) * beat * 0.9,
          freq: freqOf(spec.root, spec.scale, deg + pat[i]!),
          gain: g.arp * (i % 2 === 0 ? 1 : 0.7),
          osc: 'triangle',
          voice: 'arp',
        });
      }
    }
    // Percussion: soft sine kick pitch-drop on downbeats, quiet dark shaker
    // (bandpassed noise ~2.8 kHz) on the swung off-beats.
    if (spec.perc !== 'none') {
      const kicks =
        spec.perc === 'sparse' ? [0] : [0, 2]; // beat indices
      for (const b of kicks) {
        events.push({
          t: t0 + b * beat,
          dur: 0.14,
          freq: 140,
          gain: g.perc,
          osc: 'sine',
          voice: 'perc',
          drum: 'kick',
        });
      }
      if (spec.perc === 'eighths') {
        for (const b of [0, 1, 2, 3]) {
          events.push({
            t: t0 + b * beat + SWING * beat,
            dur: 0.05,
            freq: 2800,
            gain: g.perc * 0.4,
            osc: 'sine',
            voice: 'perc',
            drum: 'shake',
          });
        }
      }
    }
  }

  // Melody: a seeded 2-bar motif played AABA per 8-bar phrase. The last phrase
  // drops the lead entirely; the final bar cadences on the root.
  const r = rng(spec.seed);
  const l = spec.scale.length;
  const motifA = buildMotif(r, spec, l + spec.chords[0]!);
  const motifB = buildMotif(r, spec, Math.floor(l / 2) + spec.chords[0]! + 4);
  const phrases = spec.bars / 8;
  for (let bar = 0; bar < spec.bars; bar++) {
    if (bar === spec.bars - 1) break;
    const phrase = Math.floor(bar / 8);
    if (phrase === phrases - 1) continue; // lead dropout: pads + bass only
    const block = Math.floor((bar % 8) / 2);
    const motif = block === 2 ? motifB : motifA; // A A B A
    const blockStart = bar * barDur;
    // The motif is 16 slots over 2 bars — slots 0..7 play on the even bar of
    // each block, 8..15 on the odd bar.
    for (const n of motif) {
      const inBar = n.slot >= 8 ? 1 : 0;
      if (inBar !== bar % 2) continue;
      const s = n.slot - inBar * 8;
      events.push({
        t: slotT(blockStart, barDur, s),
        // len 2 spans a whole beat from an even slot; single odd slots get the
        // short swing half so nothing overhangs the bar line
        dur: (n.len === 2 ? beat : (s % 2 === 0 ? SWING : 1 - SWING) * beat) * 0.9,
        freq: freqOf(spec.root, spec.scale, n.deg, spec.leadOct),
        gain: g.lead * n.vel,
        osc: spec.leadOsc,
        voice: 'lead',
      });
    }
  }
  events.push({
    t: (spec.bars - 1) * barDur,
    dur: barDur * 0.9,
    freq: spec.root * 2,
    gain: g.lead,
    osc: spec.leadOsc,
    voice: 'lead',
  });

  return { id, duration, loop: true, events };
}

/** Short authored stings (2–4 s) for the results screen. */
export function generateSting(id: StingId): MusicSequence {
  const events: NoteEvent[] = [];
  const push = (t: number, dur: number, freq: number, gain: number, osc: OscillatorType, voice: MusicVoice) =>
    events.push({ t, dur, freq, gain, osc, voice });
  if (id === 'victory') {
    const run = [164.81, 196.0, 261.63, 329.63]; // E3 G3 C4 E4
    run.forEach((f, i) => push(i * 0.16, 0.42, f, 0.22, 'sine', 'lead'));
    const t0 = run.length * 0.16;
    for (const f of [261.63, 329.63, 392.0]) {
      push(t0, 1.9 - t0 * 0.4, f, 0.1, 'sine', 'pad');
    }
    events.push({
      t: t0 + 0.02,
      dur: 0.09,
      freq: 2800,
      gain: 0.06,
      osc: 'sine',
      voice: 'perc',
      drum: 'shake',
    });
    return { id, duration: 2.6, loop: false, events };
  }
  const run = [110.0, 87.31, 73.42]; // A2 F2 D2
  run.forEach((f, i) => push(i * 0.5, 0.7, f, 0.26, 'sine', 'lead'));
  const t0 = run.length * 0.5;
  push(t0, 1.6, 55.0, 0.3, 'sine', 'bass');
  push(t0, 1.6, 110.0, 0.12, 'sine', 'pad');
  push(t0, 1.6, 130.81, 0.08, 'sine', 'pad');
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
      if (e.drum === 'kick') {
        // Soft low kick: sine pitch-drop 140 → 50 Hz.
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(e.freq, t);
        osc.frequency.exponentialRampToValueAtTime(50, t + 0.11);
        osc.connect(g);
        osc.start(t);
        osc.stop(t + Math.max(e.dur, 0.14));
        continue;
      }
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

/** Warm lowpass on the music bus — same corner in live and offline paths. */
export const MUSIC_LP_HZ = 2000;

export function musicLowpass(ctx: BaseAudioContext): BiquadFilterNode {
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = MUSIC_LP_HZ;
  lp.Q.value = 0.6;
  return lp;
}

/**
 * Renders a sequence offline into an AudioBuffer, master gain normalized so the
 * gain-sum bound stays ≤0.85 (headroom below the 0.9 clip ceiling), through the
 * same music-bus lowpass as the live path.
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
  const lp = musicLowpass(ctx);
  master.connect(lp);
  lp.connect(ctx.destination);
  scheduleEvents(ctx, seq, master);
  try {
    return await ctx.startRendering();
  } catch {
    return null;
  }
}
