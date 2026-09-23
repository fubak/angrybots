export type OneShotId =
  | 'launch'
  | 'wood'
  | 'glass'
  | 'stone'
  | 'tnt'
  | 'pig'
  | 'victory'
  | 'defeat'
  | 'cancel'
  | 'ability'
  | 'ui'
  | 'yell'
  | 'creak'
  | 'musicGreen'
  | 'musicDust'
  | 'musicNight';

function hash(i: number): number {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function env(t: number, decay: number): number {
  return Math.exp(-t * decay);
}

function duration(id: OneShotId): number {
  if (id === 'victory') return 0.62;
  if (id === 'tnt') return 0.48;
  if (id === 'launch') return 0.26;
  if (id === 'pig' || id === 'yell') return 0.24;
  if (id === 'creak') return 0.5;
  if (id.startsWith('music')) return 2.4;
  if (id === 'defeat') return 0.4;
  return 0.2;
}

function tone(t: number, freq: number): number {
  return Math.sin(2 * Math.PI * freq * t);
}

function pluck(t: number, freq: number, bright: number): number {
  const u = Math.max(0, t);
  const attack = u < 0.02 ? u / 0.02 : 1;
  return (tone(u, freq) * 0.62 + tone(u, freq * 2) * bright + tone(u, freq * 3) * bright * 0.35) * attack * env(u, 3.4);
}

function soft(x: number): number {
  return Math.tanh(x) * 0.82;
}

/** Authored one-shots rendered to PCM. Variant detunes material hits. */
export function renderOneShot(id: OneShotId, sampleRate = 22050, variant = 0): Float32Array {
  const dur = duration(id);
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  const body = variant === 1 ? 1.16 : variant === 2 ? 0.86 : 1;
  let low = 0;
  let air = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const nz = hash(i + id.length * 19 + variant * 97) * 2 - 1;
    low = low * 0.86 + nz * 0.14;
    let s = 0;
    const open = Math.pow(Math.max(0, 1 - t / dur), 1.6);
    if (id === 'launch') {
      const follow = 0.05 + open * 0.42;
      air += (nz - air) * follow;
      const snap = t < 0.008 ? nz * (1 - t / 0.008) * 0.35 : 0;
      const bodyTone = tone(t, 180 * Math.pow(0.32, t / dur)) * 0.18 * env(t, 7);
      s = snap + air * 0.55 * env(t, 5) + bodyTone;
    } else if (id === 'wood') {
      const f = 210 * body;
      const click = t < 0.005 ? nz * 0.4 : 0;
      s =
        click +
        tone(t, f) * 0.32 * env(t, 11) +
        tone(t, f * 2.03) * 0.14 * env(t, 16) +
        tone(t, f * 2.97) * 0.05 * env(t, 20);
    } else if (id === 'glass') {
      const f = 2100 * body;
      const crack = t < 0.006 ? nz * (1 - t / 0.006) * 0.22 : 0;
      s =
        crack +
        tone(t, f) * 0.16 * env(t, 7) +
        tone(t, f * 1.41) * 0.11 * env(t, 9) +
        tone(t, f * 1.93) * 0.06 * env(t, 12) +
        tone(t, f * 2.71) * 0.03 * env(t, 15);
    } else if (id === 'stone') {
      const f = 58 * body * Math.pow(0.62, t / dur);
      air += (nz - air) * 0.03;
      s = tone(t, f) * 0.46 * env(t, 5.5) + air * 0.22 * env(t, 8) + tone(t, f * 1.5) * 0.06 * env(t, 7);
    } else if (id === 'tnt') {
      const crack = t < 0.02 ? nz * (1 - t / 0.02) * 0.35 : 0;
      const boom = tone(t, 42 * Math.pow(0.45, t / dur)) * 0.42 * env(t, 3.2);
      s = crack + boom + low * 0.7 * env(t, 2.6) + nz * 0.12 * env(t, 4);
    } else if (id === 'victory') {
      const notes = [523, 659, 784, 1046];
      for (let k = 0; k < notes.length; k++) {
        const start = k * 0.11;
        if (t < start) continue;
        s += pluck(t - start, notes[k]!, 0.28) * 0.34;
      }
      if (t > 0.4) s += (tone(t, 523) * 0.08 + tone(t, 784) * 0.06) * env(t - 0.4, 3);
    } else if (id === 'pig') {
      const f = 520 * Math.pow(0.38, t / dur);
      const pop = t < 0.012 ? nz * 0.35 : 0;
      s =
        pop +
        tone(t, f) * 0.22 * env(t, 7) +
        tone(t, f * 2.15) * 0.16 * env(t, 8) +
        tone(t, f * 3.3) * 0.08 * env(t, 10) +
        low * 0.12 * env(t, 12);
    } else if (id === 'yell') {
      const f = 380 * Math.pow(0.62, t / dur);
      s = tone(t, f) * 0.2 * env(t, 6) + tone(t, f * 2.4) * 0.1 * env(t, 8) + nz * 0.03 * env(t, 10);
    } else if (id === 'defeat') {
      const f = 280 * Math.pow(0.3, t / dur);
      s = tone(t, f) * 0.24 * env(t, 3) + low * 0.25 * env(t, 4);
    } else if (id === 'cancel') {
      s = tone(t, 200 * Math.pow(0.5, t / dur)) * 0.12 * env(t, 10) + low * 0.12 * env(t, 14);
    } else if (id === 'ability') {
      const f = 280 + t * 1400;
      s = tone(t, f) * 0.16 * env(t, 6) + nz * 0.04 * env(t, 12);
    } else if (id === 'ui') {
      s = (t < 0.028 ? tone(t, 880) : t > 0.05 && t < 0.09 ? tone(t, 620) : 0) * 0.16 * env(t, 14);
    } else if (id === 'creak') {
      air += (nz - air) * 0.03;
      const loop = Math.abs(Math.sin(Math.PI * (t / dur) * 2));
      const rub = 95 + 55 * loop;
      s = air * 0.7 * loop + tone(t, rub) * 0.2 * loop;
    } else {
      const pad =
        id === 'musicNight' ? [174, 220] : id === 'musicDust' ? [196, 247] : [220, 330];
      const scale =
        id === 'musicNight'
          ? [220, 262, 196, 247, 174, 220]
          : id === 'musicDust'
            ? [247, 294, 220, 330, 196, 247]
            : [330, 392, 262, 440, 294, 392];
      const edge = Math.min(1, t / 0.05, (dur - t) / 0.05);
      s = (tone(t, pad[0]!) * 0.045 + tone(t, pad[1]!) * 0.03) * edge;
      const notes = scale.length;
      for (let k = 0; k < notes; k++) {
        const start = (k / notes) * dur;
        if (t < start) continue;
        s += pluck(t - start, scale[k]!, 0.12) * 0.16 * edge;
      }
    }
    data[i] = soft(s);
  }
  return data;
}

export function oneShotIdForEvent(id: string): OneShotId | null {
  if (id === 'launch') return 'launch';
  if (id === 'impact' || id === 'break:wood') return 'wood';
  if (id === 'break:glass') return 'glass';
  if (id === 'break:stone') return 'stone';
  if (id === 'break:tnt' || id === 'explosion') return 'tnt';
  if (id === 'pig') return 'pig';
  if (id === 'victory') return 'victory';
  if (id === 'defeat') return 'defeat';
  if (id === 'cancel') return 'cancel';
  if (id === 'ability') return 'ability';
  if (id === 'ui') return 'ui';
  if (id === 'yell') return 'yell';
  return null;
}
