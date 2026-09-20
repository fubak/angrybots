/** Stub sound bank — real assets wired in AUD-04. */
export class SoundBank {
  musicGain = 1;
  sfxGain = 1;
  voiceGain = 1;

  preload(): Promise<void> {
    return Promise.resolve();
  }

  play(_id: string): void {
    /* no-op until manifest loads */
  }

  setMusicVolume(v: number): void {
    this.musicGain = v;
  }

  setSfxVolume(v: number): void {
    this.sfxGain = v;
  }

  setVoiceVolume(v: number): void {
    this.voiceGain = v;
  }

  onPause(): void {}
  onResume(): void {}
}
