import { oneShotIdForEvent, renderOneShot, type OneShotId } from './oneshots';
import {
  generateSting,
  generateTrack,
  renderMusicBuffer,
  type MusicSequence,
  type MusicTrackId,
  type StingId,
} from './music';

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
  private trackId: MusicTrackId = 'title';
  private musicToken = 0;
  private readonly trackSeqs = new Map<string, MusicSequence>();
  private readonly trackBufs = new Map<string, AudioBuffer>();
  private readonly trackPending = new Map<string, Promise<AudioBuffer | null>>();
  private lastImpactAt = new Map<string, number>();
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
    this.setTrack(chapter === 'workshop' || chapter === 'citadel' ? chapter : 'training');
  }

  setTrack(id: MusicTrackId): void {
    if (this.trackId === id && this.musicSrc) return;
    this.trackId = id;
    if (this.unlocked) this.startMusic();
  }

  /** Results-screen sting (2–4 s, rendered lazily) with the music ducked under it. */
  playSting(id: StingId): void {
    this.lastPlayed.push(`sting:${id}`);
    if (this.muted || !this.unlocked) return;
    void this.trackBuffer(id).then((buf) => {
      if (!buf || !this.ctx || !this.sfx) return;
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const g = this.ctx.createGain();
      g.gain.value = 0.5;
      src.connect(g);
      g.connect(this.sfx);
      src.start();
    });
    this.duckMusic(3.5);
  }

  play(id: string): void {
    this.lastPlayed.push(id);
    if (this.lastPlayed.length > 64) this.lastPlayed.splice(0, 32);
    if (this.muted || !this.unlocked) return;
    const sample = oneShotIdForEvent(id);
    if (sample) {
      if (id.startsWith('impact')) {
        this.throttledImpact(id.split(':')[1] ?? 'generic', sample);
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

  /** Play a one-shot at an explicit playback rate (results-screen star chimes). */
  playRate(id: string, rate: number): void {
    this.lastPlayed.push(`${id}@${rate}`);
    if (this.muted || !this.unlocked) return;
    const sample = oneShotIdForEvent(id);
    if (!sample) return;
    const ctx = this.ensureCtx();
    if (!ctx || !this.sfx) return;
    const buf = this.cached(sample, 0);
    if (!buf) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate;
    const g = ctx.createGain();
    g.gain.value = 0.5;
    src.connect(g);
    g.connect(this.sfx);
    src.start();
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

  private throttledImpact(key: string, sample: OneShotId): void {
    const now = this.ctx?.currentTime ?? 0;
    const last = this.lastImpactAt.get(key) ?? -1;
    if (now - last < 0.04) return;
    this.lastImpactAt.set(key, now);
    this.playSample(sample, 'sfx', 0.45);
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

  private duckMusic(holdSec = 0): void {
    const ctx = this.ctx;
    if (!ctx || !this.music) return;
    const now = ctx.currentTime;
    const base = this.musicGain * 0.18;
    const dip = holdSec > 0 ? base * 0.08 : base * 0.35;
    const back = holdSec > 0 ? now + holdSec : now + 0.55;
    this.music.gain.cancelScheduledValues(now);
    this.music.gain.setValueAtTime(Math.max(0.02, this.music.gain.value), now);
    this.music.gain.linearRampToValueAtTime(dip, now + 0.04);
    this.music.gain.setValueAtTime(dip, Math.max(now + 0.04, back - 0.5));
    this.music.gain.linearRampToValueAtTime(base, back);
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

  /** Lazy offline render of a track/sting, cached and deduped while in flight. */
  private trackBuffer(id: MusicTrackId | StingId): Promise<AudioBuffer | null> {
    const cached = this.trackBufs.get(id);
    if (cached) return Promise.resolve(cached);
    let p = this.trackPending.get(id);
    if (!p) {
      let seq = this.trackSeqs.get(id);
      if (!seq) {
        seq =
          id === 'victory' || id === 'defeat'
            ? generateSting(id)
            : generateTrack(id as MusicTrackId);
        this.trackSeqs.set(id, seq);
      }
      p = renderMusicBuffer(seq, 44100).then((buf) => {
        this.trackPending.delete(id);
        if (buf) this.trackBufs.set(id, buf);
        return buf;
      });
      this.trackPending.set(id, p);
    }
    return p;
  }

  private startMusic(): void {
    const ctx = this.ctx;
    if (!ctx || !this.music) return;
    const token = ++this.musicToken;
    if (this.musicSrc) {
      try {
        this.musicSrc.stop();
      } catch {
        /* already stopped */
      }
      this.musicSrc.disconnect();
      this.musicSrc = null;
    }
    const id = this.trackId;
    void this.trackBuffer(id).then((buf) => {
      if (!buf || token !== this.musicToken || !this.ctx || !this.music) return;
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      src.connect(this.music);
      src.start();
      this.musicSrc = src;
    });
  }
}
