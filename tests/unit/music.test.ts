import { describe, expect, it } from 'vitest';
import {
  generateSting,
  generateTrack,
  sequencePeakBound,
  type MusicTrackId,
} from '../../src/audio/music';

const TRACKS: MusicTrackId[] = ['title', 'training', 'workshop', 'citadel'];

describe('procedural music sequences', () => {
  it('is deterministic — same track id renders the same events twice', () => {
    for (const id of TRACKS) {
      expect(generateTrack(id)).toEqual(generateTrack(id));
    }
    expect(generateSting('victory')).toEqual(generateSting('victory'));
    expect(generateSting('defeat')).toEqual(generateSting('defeat'));
  });

  it('keeps every track inside the 60–90s loop length', () => {
    for (const id of TRACKS) {
      const seq = generateTrack(id);
      expect(seq.duration).toBeGreaterThanOrEqual(60);
      expect(seq.duration).toBeLessThanOrEqual(90);
      for (const e of seq.events) {
        expect(e.t).toBeGreaterThanOrEqual(0);
        expect(e.t + e.dur).toBeLessThanOrEqual(seq.duration + 1e-6);
        expect(e.freq).toBeGreaterThan(0);
        expect(e.gain).toBeGreaterThan(0);
      }
    }
  });

  it('makes the four tracks musically distinct (tempo, key, arrangement)', () => {
    const barDur = (id: MusicTrackId) =>
      generateTrack(id).events.filter((e) => e.voice === 'pad' && e.t === 0).length;
    const root = (id: MusicTrackId) =>
      Math.min(...generateTrack(id).events.map((e) => e.freq));
    const durs = TRACKS.map((id) => generateTrack(id).duration);
    expect(new Set(durs.map((d) => d.toFixed(2))).size).toBe(4);
    expect(new Set(TRACKS.map(root)).size).toBeGreaterThanOrEqual(3);
    expect(generateTrack('citadel').events.some((e) => e.voice === 'arp')).toBe(true);
    expect(generateTrack('title').events.some((e) => e.voice === 'arp')).toBe(false);
    expect(barDur('title')).toBeGreaterThan(0);
  });

  it('stays under the 0.9 clip ceiling on the gain-sum bound', () => {
    for (const id of TRACKS) {
      expect(sequencePeakBound(generateTrack(id))).toBeLessThanOrEqual(0.9);
    }
    expect(sequencePeakBound(generateSting('victory'))).toBeLessThanOrEqual(0.9);
    expect(sequencePeakBound(generateSting('defeat'))).toBeLessThanOrEqual(0.9);
  });

  it('loops seamlessly — pads tile the track with no gaps or overhang', () => {
    for (const id of TRACKS) {
      const seq = generateTrack(id);
      const pads = seq.events.filter((e) => e.voice === 'pad').sort((a, b) => a.t - b.t);
      const barDur = pads[3]!.t - pads[0]!.t;
      // Bar count = pad triads; chord cycle of 4 divides bars, so the loop point
      // lands on the same chord as bar 0.
      const bars = pads.length / 3;
      expect(bars % 4).toBe(0);
      expect(bars * barDur).toBeCloseTo(seq.duration, 6);
      for (const e of pads) expect(e.t + e.dur).toBeLessThanOrEqual(seq.duration + 1e-6);
      const leads = seq.events.filter((e) => e.voice === 'lead');
      expect(leads.length).toBeGreaterThan(10);
      const last = leads[leads.length - 1]!;
      expect(last.t + last.dur).toBeLessThanOrEqual(seq.duration);
    }
  });

  it('renders 2–4s stings distinct from each other', () => {
    const v = generateSting('victory');
    const d = generateSting('defeat');
    for (const s of [v, d]) {
      expect(s.duration).toBeGreaterThanOrEqual(2);
      expect(s.duration).toBeLessThanOrEqual(4);
      expect(s.loop).toBe(false);
      expect(s.events.length).toBeGreaterThan(3);
    }
    expect(v).not.toEqual(d);
  });
});
