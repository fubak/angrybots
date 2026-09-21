/** Original synthesized bank — Howler-ready buffers, no silent stubs. */

export class SoundBank {
  musicGain = 0.8;
  sfxGain = 0.8;
  voiceGain = 0.8;
  lastPlayed: string[] = [];
  private ctx: AudioContext | null = null;
  private unlocked = false;
  private master: GainNode | null = null;
  private music: GainNode | null = null;
  private sfx: GainNode | null = null;
  private voice: GainNode | null = null;
  private tensionOsc: OscillatorNode | null = null;
  private tensionGain: GainNode | null = null;
  private musicTimer: number | null = null;
  private lastImpactAt = 0;
  muted = false;

  preload(): Promise<void> {
    this.ensureCtx();
    return Promise.resolve();
  }

  unlock(): void {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') void ctx.resume();
    this.unlocked = true;
    this.startAmbience();
  }

  play(id: string): void {
    this.lastPlayed.push(id);
    if (this.lastPlayed.length > 64) this.lastPlayed.splice(0, 32);
    if (this.muted) return;
    this.ensureCtx();
    if (!this.unlocked && id !== 'ui') this.unlock();
    switch (id) {
      case 'launch':
        this.blip(180, 90, 0.12, 'square', 0.18);
        this.noise(0.08, 0.12);
        break;
      case 'cancel':
        this.blip(140, 90, 0.08, 'sine', 0.1);
        break;
      case 'impact':
        this.throttledImpact();
        break;
      case 'break:wood':
        this.noise(0.12, 0.16);
        this.blip(220, 80, 0.1, 'sawtooth', 0.1);
        break;
      case 'break:glass':
        this.blip(880, 1400, 0.16, 'triangle', 0.12);
        this.blip(1320, 700, 0.12, 'sine', 0.08);
        break;
      case 'break:stone':
        this.noise(0.18, 0.2);
        this.blip(90, 50, 0.14, 'square', 0.12);
        break;
      case 'break:tnt':
      case 'explosion':
        this.noise(0.35, 0.35);
        this.blip(80, 30, 0.3, 'sawtooth', 0.22);
        break;
      case 'pig':
        this.blip(420, 180, 0.14, 'sine', 0.14);
        this.blip(260, 140, 0.1, 'triangle', 0.1);
        break;
      case 'ability':
        this.blip(300, 520, 0.12, 'square', 0.12);
        break;
      case 'victory':
        this.blip(440, 660, 0.18, 'triangle', 0.16);
        this.later(() => this.blip(660, 880, 0.2, 'triangle', 0.16), 0.16);
        break;
      case 'defeat':
        this.blip(240, 90, 0.28, 'sawtooth', 0.14);
        break;
      case 'ui':
        this.blip(520, 400, 0.05, 'sine', 0.08);
        break;
      default:
        this.blip(200, 160, 0.06, 'sine', 0.06);
    }
  }

  tension(amount: number): void {
    const ctx = this.ensureCtx();
    if (!ctx || !this.sfx || this.muted) return;
    if (amount < 0.05) {
      this.stopTension();
      return;
    }
    if (!this.tensionOsc) {
      this.tensionOsc = ctx.createOscillator();
      this.tensionGain = ctx.createGain();
      this.tensionOsc.type = 'sine';
      this.tensionGain.gain.value = 0;
      this.tensionOsc.connect(this.tensionGain);
      this.tensionGain.connect(this.sfx);
      this.tensionOsc.start();
    }
    const now = ctx.currentTime;
    this.tensionOsc.frequency.setTargetAtTime(140 + amount * 220, now, 0.05);
    this.tensionGain!.gain.setTargetAtTime(0.03 + amount * 0.06, now, 0.05);
  }

  setMusicVolume(v: number): void {
    this.musicGain = v;
    this.applyGains();
  }

  setSfxVolume(v: number): void {
    this.sfxGain = v;
    this.applyGains();
  }

  setVoiceVolume(v: number): void {
    this.voiceGain = v;
    this.applyGains();
  }

  onPause(): void {
    this.stopTension();
    const ctx = this.ctx;
    if (ctx && ctx.state === 'running') void ctx.suspend();
  }

  onResume(): void {
    if (this.ctx && this.unlocked) void this.ctx.resume();
  }

  private ensureCtx(): AudioContext | null {
    if (typeof AudioContext === 'undefined') return null;
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.music = this.ctx.createGain();
      this.sfx = this.ctx.createGain();
      this.voice = this.ctx.createGain();
      this.music.connect(this.master);
      this.sfx.connect(this.master);
      this.voice.connect(this.master);
      this.master.connect(this.ctx.destination);
      this.applyGains();
    }
    return this.ctx;
  }

  private applyGains(): void {
    if (!this.master || !this.music || !this.sfx || !this.voice) return;
    this.master.gain.value = this.muted ? 0 : 1;
    this.music.gain.value = this.musicGain * 0.35;
    this.sfx.gain.value = this.sfxGain;
    this.voice.gain.value = this.voiceGain;
  }

  private blip(
    f0: number,
    f1: number,
    dur: number,
    type: OscillatorType,
    gain: number
  ): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfx) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, f1), ctx.currentTime + dur);
    g.gain.setValueAtTime(gain * this.sfxGain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(g);
    g.connect(this.sfx);
    osc.start();
    osc.stop(ctx.currentTime + dur + 0.02);
  }

  private noise(dur: number, gain: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfx) return;
    const n = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ctx.createBufferSource();
    const g = ctx.createGain();
    src.buffer = buf;
    g.gain.value = gain * this.sfxGain * 0.35;
    src.connect(g);
    g.connect(this.sfx);
    src.start();
  }

  private throttledImpact(): void {
    const now = this.ctx?.currentTime ?? 0;
    if (now - this.lastImpactAt < 0.04) return;
    this.lastImpactAt = now;
    this.noise(0.06, 0.1);
    this.blip(160, 70, 0.06, 'square', 0.08);
  }

  private stopTension(): void {
    if (this.tensionOsc) {
      try {
        this.tensionOsc.stop();
      } catch {
        /* already stopped */
      }
      this.tensionOsc.disconnect();
      this.tensionGain?.disconnect();
      this.tensionOsc = null;
      this.tensionGain = null;
    }
  }

  private startAmbience(): void {
    if (this.musicTimer !== null || !this.ctx || !this.music) return;
    const tick = () => {
      if (!this.ctx || !this.music || this.muted) return;
      this.blip(196, 220, 1.6, 'sine', 0.03);
      this.later(() => this.blip(246, 262, 1.8, 'sine', 0.02), 0.8);
      if (typeof window === 'undefined') return;
      this.musicTimer = window.setTimeout(tick, 3200);
    };
    tick();
  }

  private later(fn: () => void, s: number): void {
    if (typeof window === 'undefined') return;
    window.setTimeout(fn, s * 1000);
  }
}
