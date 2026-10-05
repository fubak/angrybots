/**
 * Procedural WebAudio SFX — no binary assets. All sounds are synthesized
 * from oscillators and noise buffers, Doom-ish bleeps and thuds.
 */
export class Audio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;

  private ensure(): AudioContext | null {
    if (typeof AudioContext === 'undefined') return null;
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.25;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  private tone(
    freq: number,
    dur: number,
    type: OscillatorType = 'square',
    slide = 0,
    gain = 1,
  ): void {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slide !== 0) {
      o.frequency.exponentialRampToValueAtTime(
        Math.max(20, freq + slide),
        ctx.currentTime + dur,
      );
    }
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g).connect(this.master);
    o.start();
    o.stop(ctx.currentTime + dur);
  }

  private noise(dur: number, gain = 0.6): void {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const n = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(g).connect(this.master);
    src.start();
  }

  sfx(name: 'fire' | 'keyboard' | 'scan' | 'clean' | 'door' | 'denied' | 'hurt' | 'pickup' | 'inspect' | 'win' | 'lose' | 'click'): void {
    switch (name) {
      case 'fire': this.noise(0.12, 0.5); this.tone(180, 0.1, 'sawtooth', -120); break;
      case 'keyboard': this.tone(1400, 0.05, 'square', 0, 0.4); this.tone(1800, 0.05, 'square', 0, 0.3); break;
      case 'scan': this.tone(600, 0.25, 'sine', 900, 0.5); break;
      case 'clean': this.tone(500, 0.3, 'sine', 800, 0.6); break;
      case 'door': this.noise(0.3, 0.35); this.tone(90, 0.3, 'sawtooth', 40, 0.4); break;
      case 'denied': this.tone(200, 0.18, 'square', -60); this.tone(150, 0.22, 'square', -40, 0.8); break;
      case 'hurt': this.tone(110, 0.2, 'sawtooth', -60, 0.9); this.noise(0.1, 0.3); break;
      case 'pickup': this.tone(700, 0.1, 'square', 400, 0.4); break;
      case 'inspect': this.tone(1100, 0.08, 'sine', 200, 0.35); break;
      case 'win': this.tone(500, 0.4, 'square', 700, 0.5); break;
      case 'lose': this.tone(300, 0.6, 'sawtooth', -200, 0.6); break;
      case 'click': this.tone(900, 0.04, 'square', 0, 0.3); break;
    }
  }
}
