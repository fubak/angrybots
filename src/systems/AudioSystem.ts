import type { BlockMaterial } from '../config';

export class AudioSystem {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private lastImpactAt = 0;
  private masterVolume = 1;
  private sfxVolume = 1;

  setVolumes(master: number, sfx = master) {
    this.masterVolume = Math.min(Math.max(master, 0), 1);
    this.sfxVolume = Math.min(Math.max(sfx, 0), 1);
    if (this.master) {
      this.master.gain.value = 0.9 * this.masterVolume * this.sfxVolume;
    }
  }

  private ensure() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  private out(): GainNode {
    this.ensure();
    return this.master!;
  }

  unlock() {
    const c = this.ensure();
    if (c.state === 'suspended') void c.resume();
  }

  /** Aim cancelled — soft rubber relax (distinct from release). */
  slingCancel() {
    const c = this.ensure();
    const t = c.currentTime;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(95, t + 0.12);
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(0.055, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc.connect(g);
    g.connect(this.out());
    osc.start(t);
    osc.stop(t + 0.15);
  }

  /** Stretch cue while drawing (sparse buckets to avoid spam). */
  slingTension(tension01: number) {
    const c = this.ensure();
    const t = c.currentTime;
    const p = Math.min(Math.max(tension01, 0), 1);
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(90 + p * 110, t);
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(0.028 + p * 0.035, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    osc.connect(g);
    g.connect(this.out());
    osc.start(t);
    osc.stop(t + 0.1);
  }

  /** Slingshot release: rubber snap + rising whoosh. */
  launch(power = 1) {
    const c = this.ensure();
    const t = c.currentTime;
    const p = Math.min(Math.max(power / 28, 0.35), 1.35);

    const snap = c.createOscillator();
    const snapG = c.createGain();
    snap.type = 'square';
    snap.frequency.setValueAtTime(140 + p * 80, t);
    snap.frequency.exponentialRampToValueAtTime(55, t + 0.06);
    snapG.gain.setValueAtTime(0.001, t);
    snapG.gain.linearRampToValueAtTime(0.095 * p, t + 0.004);
    snapG.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    snap.connect(snapG);
    snapG.connect(this.out());
    snap.start(t);
    snap.stop(t + 0.08);

    const whooshLen = 0.22 + p * 0.18;
    const noise = this.noiseBuffer(0.35);
    const src = c.createBufferSource();
    src.buffer = noise;
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(280, t + 0.02);
    bp.frequency.exponentialRampToValueAtTime(2200 + p * 600, t + whooshLen * 0.55);
    bp.frequency.exponentialRampToValueAtTime(400, t + whooshLen);
    const wg = c.createGain();
    wg.gain.setValueAtTime(0.001, t + 0.02);
    wg.gain.linearRampToValueAtTime(0.13 * p, t + 0.05);
    wg.gain.exponentialRampToValueAtTime(0.001, t + whooshLen);
    src.connect(bp);
    bp.connect(wg);
    wg.connect(this.out());
    src.start(t + 0.02);
    src.stop(t + whooshLen + 0.02);

    const tail = c.createOscillator();
    const tailG = c.createGain();
    tail.type = 'triangle';
    tail.frequency.setValueAtTime(320 + p * 120, t + 0.04);
    tail.frequency.exponentialRampToValueAtTime(90, t + 0.2);
    tailG.gain.setValueAtTime(0.001, t + 0.04);
    tailG.gain.linearRampToValueAtTime(0.035 * p, t + 0.06);
    tailG.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    tail.connect(tailG);
    tailG.connect(this.out());
    tail.start(t + 0.04);
    tail.stop(t + 0.24);
  }

  /** Collision thwack scaled by intensity; material tint on top. */
  impact(intensity: number, material?: BlockMaterial) {
    const c = this.ensure();
    const now = c.currentTime;
    if (now - this.lastImpactAt < 0.028) return;
    this.lastImpactAt = now;

    const i = Math.min(Math.max(intensity, 0), 1);
    this.thwack(i, material === 'glass' ? 'bright' : material === 'stone' ? 'dull' : 'mid');

    if (material === 'glass') {
      this.glassTinkle(i * 0.7, now);
    } else if (material === 'wood') {
      this.woodKnock(i * 0.5, now);
    }
  }

  breakBlock(material: BlockMaterial = 'wood') {
    const c = this.ensure();
    const t = c.currentTime;
    if (material === 'glass') {
      this.glassShatter(t);
    } else if (material === 'stone') {
      this.thwack(0.85, 'dull');
      this.debrisRumble(t, 0.12, 90, 0.08);
    } else if (material === 'explosive') {
      this.explosion(0.55);
    } else {
      this.thwack(0.65, 'mid');
      this.splinterCrack(t);
    }
  }

  explosion(intensity = 1) {
    const c = this.ensure();
    const t = c.currentTime;
    const p = Math.min(Math.max(intensity, 0.35), 1.4);

    const boom = c.createOscillator();
    const boomG = c.createGain();
    boom.type = 'sine';
    boom.frequency.setValueAtTime(110, t);
    boom.frequency.exponentialRampToValueAtTime(28, t + 0.35);
    boomG.gain.setValueAtTime(0.001, t);
    boomG.gain.linearRampToValueAtTime(0.22 * p, t + 0.02);
    boomG.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    boom.connect(boomG);
    boomG.connect(this.out());
    boom.start(t);
    boom.stop(t + 0.5);

    const noise = this.noiseBuffer(0.5);
    const src = c.createBufferSource();
    src.buffer = noise;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(900, t);
    lp.frequency.exponentialRampToValueAtTime(120, t + 0.4);
    const ng = c.createGain();
    ng.gain.setValueAtTime(0.001, t);
    ng.gain.linearRampToValueAtTime(0.18 * p, t + 0.01);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
    src.connect(lp);
    lp.connect(ng);
    ng.connect(this.out());
    src.start(t);
    src.stop(t + 0.45);
  }

  pigPop() {
    const c = this.ensure();
    const t = c.currentTime;

    const pop = c.createOscillator();
    const popG = c.createGain();
    pop.type = 'sine';
    pop.frequency.setValueAtTime(680, t);
    pop.frequency.exponentialRampToValueAtTime(180, t + 0.14);
    popG.gain.setValueAtTime(0.001, t);
    popG.gain.linearRampToValueAtTime(0.12, t + 0.008);
    popG.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    pop.connect(popG);
    popG.connect(this.out());
    pop.start(t);
    pop.stop(t + 0.18);

    const squeak = c.createOscillator();
    const sqG = c.createGain();
    squeak.type = 'triangle';
    squeak.frequency.setValueAtTime(920, t + 0.02);
    squeak.frequency.exponentialRampToValueAtTime(420, t + 0.1);
    sqG.gain.setValueAtTime(0.001, t + 0.02);
    sqG.gain.linearRampToValueAtTime(0.045, t + 0.03);
    sqG.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    squeak.connect(sqG);
    sqG.connect(this.out());
    squeak.start(t + 0.02);
    squeak.stop(t + 0.14);

    const puff = this.noiseBuffer(0.08);
    const src = c.createBufferSource();
    src.buffer = puff;
    const hp = c.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1200;
    const pg = c.createGain();
    pg.gain.setValueAtTime(0.06, t);
    pg.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    src.connect(hp);
    hp.connect(pg);
    pg.connect(this.out());
    src.start(t);
    src.stop(t + 0.08);
  }

  win() {
    const c = this.ensure();
    const t = c.currentTime;
    const notes = [
      { f: 523.25, at: 0, dur: 0.28, g: 0.07 },
      { f: 659.25, at: 0.1, dur: 0.28, g: 0.075 },
      { f: 783.99, at: 0.2, dur: 0.32, g: 0.08 },
      { f: 1046.5, at: 0.32, dur: 0.45, g: 0.09 },
    ];

    for (const n of notes) {
      const start = t + n.at;
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = 'sine';
      osc.frequency.value = n.f;
      g.gain.setValueAtTime(0.001, start);
      g.gain.linearRampToValueAtTime(n.g, start + 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, start + n.dur);
      osc.connect(g);
      g.connect(this.out());
      osc.start(start);
      osc.stop(start + n.dur + 0.02);

      const harm = c.createOscillator();
      const hg = c.createGain();
      harm.type = 'triangle';
      harm.frequency.value = n.f * 2;
      hg.gain.setValueAtTime(0.001, start);
      hg.gain.linearRampToValueAtTime(n.g * 0.35, start + 0.02);
      hg.gain.exponentialRampToValueAtTime(0.001, start + n.dur * 0.85);
      harm.connect(hg);
      hg.connect(this.out());
      harm.start(start);
      harm.stop(start + n.dur);
    }

    const bass = c.createOscillator();
    const bg = c.createGain();
    bass.type = 'sine';
    bass.frequency.setValueAtTime(130.81, t + 0.32);
    bass.frequency.linearRampToValueAtTime(146.83, t + 0.55);
    bg.gain.setValueAtTime(0.001, t + 0.32);
    bg.gain.linearRampToValueAtTime(0.1, t + 0.36);
    bg.gain.exponentialRampToValueAtTime(0.001, t + 0.75);
    bass.connect(bg);
    bg.connect(this.out());
    bass.start(t + 0.32);
    bass.stop(t + 0.78);

    const shimmer = this.noiseBuffer(0.25);
    const src = c.createBufferSource();
    src.buffer = shimmer;
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 4000;
    bp.Q.value = 0.8;
    const sg = c.createGain();
    sg.gain.setValueAtTime(0.001, t + 0.34);
    sg.gain.linearRampToValueAtTime(0.04, t + 0.38);
    sg.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
    src.connect(bp);
    bp.connect(sg);
    sg.connect(this.out());
    src.start(t + 0.34);
    src.stop(t + 0.72);
  }

  private noiseBuffer(seconds: number): AudioBuffer {
    const c = this.ensure();
    const len = Math.ceil(c.sampleRate * seconds);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = last * 0.92 + white * 0.08;
      data[i] = last;
    }
    return buf;
  }

  private thwack(intensity: number, tone: 'bright' | 'mid' | 'dull') {
    const c = this.ensure();
    const t = c.currentTime;
    const i = 0.25 + intensity * 0.75;

    const click = this.noiseBuffer(0.04);
    const src = c.createBufferSource();
    src.buffer = click;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = tone === 'bright' ? 4200 : tone === 'dull' ? 900 : 2200;
    const cg = c.createGain();
    cg.gain.setValueAtTime(0.14 * i, t);
    cg.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
    src.connect(lp);
    lp.connect(cg);
    cg.connect(this.out());
    src.start(t);
    src.stop(t + 0.05);

    const body = c.createOscillator();
    const bg = c.createGain();
    body.type = 'triangle';
    const base =
      tone === 'bright' ? 140 + i * 80 : tone === 'dull' ? 55 + i * 40 : 90 + i * 60;
    body.frequency.setValueAtTime(base * 1.4, t);
    body.frequency.exponentialRampToValueAtTime(base, t + 0.04);
    bg.gain.setValueAtTime(0.001, t);
    bg.gain.linearRampToValueAtTime(0.09 * i, t + 0.003);
    bg.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
    body.connect(bg);
    bg.connect(this.out());
    body.start(t);
    body.stop(t + 0.12);
  }

  private glassTinkle(amount: number, t: number) {
    const c = this.ensure();
    for (let n = 0; n < 2 + Math.floor(amount * 3); n++) {
      const start = t + n * 0.012;
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = 'sine';
      osc.frequency.value = 1800 + Math.random() * 2400;
      g.gain.setValueAtTime(0.001, start);
      g.gain.linearRampToValueAtTime(0.025 * amount, start + 0.002);
      g.gain.exponentialRampToValueAtTime(0.001, start + 0.06);
      osc.connect(g);
      g.connect(this.out());
      osc.start(start);
      osc.stop(start + 0.07);
    }
  }

  private glassShatter(t: number) {
    const c = this.ensure();
    this.glassTinkle(1, t);

    const shard = this.noiseBuffer(0.18);
    const src = c.createBufferSource();
    src.buffer = shard;
    const hp = c.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 2800;
    const g = c.createGain();
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    src.connect(hp);
    hp.connect(g);
    g.connect(this.out());
    src.start(t);
    src.stop(t + 0.18);

    this.debrisRumble(t + 0.02, 0.08, 120, 0.05);
  }

  private woodKnock(amount: number, t: number) {
    const c = this.ensure();
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(220 + amount * 60, t);
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.05);
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(0.04 * amount, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    osc.connect(g);
    g.connect(this.out());
    osc.start(t);
    osc.stop(t + 0.08);
  }

  private splinterCrack(t: number) {
    const c = this.ensure();
    const crack = this.noiseBuffer(0.1);
    const src = c.createBufferSource();
    src.buffer = crack;
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 600;
    bp.Q.value = 2;
    const g = c.createGain();
    g.gain.setValueAtTime(0.08, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    src.connect(bp);
    bp.connect(g);
    g.connect(this.out());
    src.start(t);
    src.stop(t + 0.1);
  }

  private debrisRumble(
    t: number,
    dur: number,
    freq: number,
    peak: number
  ) {
    const c = this.ensure();
    const rumble = this.noiseBuffer(dur);
    const src = c.createBufferSource();
    src.buffer = rumble;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = freq;
    const g = c.createGain();
    g.gain.setValueAtTime(peak, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(lp);
    lp.connect(g);
    g.connect(this.out());
    src.start(t);
    src.stop(t + dur);
  }
}
