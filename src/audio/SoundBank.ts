import { oneShotIdForEvent, renderOneShot, type OneShotId } from './oneshots';

function panFor(id: OneShotId): number {
  if (id === 'wood') return -0.22;
  if (id === 'glass') return 0.28;
  if (id === 'stone') return -0.08;
  if (id === 'pig' || id === 'yell') return 0.12;
  if (id === 'tnt') return 0.05;
  return 0;
}

export class SoundBank {
  musicGain = 0.8;
  sfxGain = 0.8;
  voiceGain = 0.8;
  lastPlayed: string[] = [];
  private ctx: AudioContext | null = null;
  private unlocked = false;
  private master: GainNode | null = null;
  private shelf: BiquadFilterNode | null = null;
  private music: GainNode | null = null;
  private sfx: GainNode | null = null;
  private voice: GainNode | null = null;
  private creak: AudioBufferSourceNode | null = null;
  private creakGain: GainNode | null = null;
  private musicSrc: AudioBufferSourceNode | null = null;
  private chapter = 'training';
  private lastImpactAt = 0;
  private readonly buffers = new Map<string, AudioBuffer>();
  muted = false;

  preload(): Promise<void> {
    return Promise.resolve();
  }

  unlock(): void {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') void ctx.resume();
    this.unlocked = true;
    this.startMusic();
  }

  setChapter(chapter: string): void {
    this.chapter = chapter;
    if (this.unlocked) this.startMusic();
  }

  play(id: string): void {
    this.lastPlayed.push(id);
    if (this.lastPlayed.length > 64) this.lastPlayed.splice(0, 32);
    if (this.muted || !this.unlocked) return;
    const sample = oneShotIdForEvent(id);
    if (sample) {
      if (sample === 'wood' && id === 'impact') {
        this.throttledImpact();
        return;
      }
      const variant =
        sample === 'wood' || sample === 'glass' || sample === 'stone'
          ? Math.floor(Math.random() * 3)
          : 0;
      const bus = sample === 'pig' || sample === 'yell' ? 'voice' : 'sfx';
      const level = sample === 'ui' ? 0.4 : sample === 'yell' ? 0.34 : sample === 'launch' ? 0.7 : 0.62;
      this.playSample(sample, bus, level, variant);
      return;
    }
  }

  tension(amount: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfx || this.muted) return;
    if (amount < 0.05) {
      this.stopTension();
      return;
    }
    if (!this.creak) this.startCreak();
    const now = ctx.currentTime;
    this.creak?.playbackRate.setTargetAtTime(0.72 + amount * 1.15, now, 0.05);
    this.creakGain?.gain.setTargetAtTime(0.05 + amount * 0.2, now, 0.05);
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
      const low = this.ctx.createBiquadFilter();
      low.type = 'lowshelf';
      low.frequency.value = 110;
      low.gain.value = 2.5;
      this.shelf = this.ctx.createBiquadFilter();
      this.shelf.type = 'highshelf';
      this.shelf.frequency.value = 6500;
      this.shelf.gain.value = -4.5;
      const wide = this.ctx.createChannelMerger(2);
      const delay = this.ctx.createDelay(0.03);
      delay.delayTime.value = 0.013;
      this.music.connect(wide, 0, 0);
      this.music.connect(delay);
      delay.connect(wide, 0, 1);
      wide.connect(this.master);
      this.sfx.connect(this.master);
      this.voice.connect(this.master);
      this.master.connect(low);
      low.connect(this.shelf);
      this.shelf.connect(this.ctx.destination);
      this.applyGains();
    }
    return this.ctx;
  }

  private applyGains(): void {
    if (!this.master || !this.music || !this.sfx || !this.voice) return;
    this.master.gain.value = this.muted ? 0 : 1;
    this.music.gain.value = this.musicGain * 0.18;
    this.sfx.gain.value = this.sfxGain;
    this.voice.gain.value = this.voiceGain;
  }

  private throttledImpact(): void {
    const now = this.ctx?.currentTime ?? 0;
    if (now - this.lastImpactAt < 0.04) return;
    this.lastImpactAt = now;
    this.playSample('wood', 'sfx', 0.45);
  }

  private playSample(id: OneShotId, bus: 'sfx' | 'voice', gain = 0.8, variant = 0): void {
    const ctx = this.ensureCtx();
    const dest = bus === 'voice' ? this.voice : this.sfx;
    if (!ctx || !dest) return;
    const buf = this.cached(id, variant);
    if (!buf) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = 0.9 + Math.random() * 0.2;
    const g = ctx.createGain();
    g.gain.value = gain;
    const pan = ctx.createStereoPanner();
    pan.pan.value = panFor(id);
    src.connect(g);
    g.connect(pan);
    pan.connect(dest);
    src.start();
    if (bus === 'sfx' && gain >= 0.55) this.duckMusic();
  }

  private duckMusic(): void {
    const ctx = this.ctx;
    if (!ctx || !this.music) return;
    const now = ctx.currentTime;
    const base = this.musicGain * 0.18;
    this.music.gain.cancelScheduledValues(now);
    this.music.gain.setValueAtTime(Math.max(0.02, this.music.gain.value), now);
    this.music.gain.linearRampToValueAtTime(base * 0.35, now + 0.04);
    this.music.gain.linearRampToValueAtTime(base, now + 0.55);
  }

  private cached(id: OneShotId, variant: number): AudioBuffer | null {
    const ctx = this.ctx;
    if (!ctx) return null;
    const key = `${id}:${variant}`;
    let buf = this.buffers.get(key);
    if (!buf) {
      const pcm = renderOneShot(id, ctx.sampleRate, variant);
      buf = ctx.createBuffer(1, pcm.length, ctx.sampleRate);
      buf.getChannelData(0).set(pcm);
      this.buffers.set(key, buf);
    }
    return buf;
  }

  private startCreak(): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfx || this.creak) return;
    const buf = this.cached('creak', 0);
    if (!buf) return;
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    src.buffer = buf;
    src.loop = true;
    gain.gain.value = 0;
    src.connect(gain);
    gain.connect(this.sfx);
    src.start();
    this.creak = src;
    this.creakGain = gain;
  }

  private stopTension(): void {
    if (!this.creak) return;
    try {
      this.creak.stop();
    } catch {
      /* already stopped */
    }
    this.creak.disconnect();
    this.creakGain?.disconnect();
    this.creak = null;
    this.creakGain = null;
  }

  private startMusic(): void {
    const ctx = this.ctx;
    if (!ctx || !this.music) return;
    if (this.musicSrc) {
      try {
        this.musicSrc.stop();
      } catch {
        /* already stopped */
      }
      this.musicSrc.disconnect();
      this.musicSrc = null;
    }
    const id = this.chapter === 'workshop' ? 'musicDust' : this.chapter === 'citadel' ? 'musicNight' : 'musicGreen';
    const buf = this.cached(id, 0);
    if (!buf) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.connect(this.music);
    src.start();
    this.musicSrc = src;
  }
}
