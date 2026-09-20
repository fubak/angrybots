# 08 — Audio

Goal: every action has a distinct, varied sound; characters have voices; music sets the mood; nothing clips or spams.

## What a model can and can't produce

| Asset | Who makes it | How |
| --- | --- | --- |
| Sound effects (impacts, breaks, sling, UI) | Implementing model | Rendered offline from code recipes in a headless browser (`OfflineAudioContext`), then encoded ([AUD-04](#aud-04--generated-sfx-pipeline-m)) |
| Bot voices | Implementing model | The bots are robots, so synthesized chirps and bleeps fit the fiction (recipes below) |
| Pig voices | Model placeholder, **human upgrade recommended** | Synthesized snorts; replace with recorded or licensed voices when available |
| Music (title, level) | **Human** | Commission, or license CC0 / CC-BY tracks ([AUD-06](#aud-06--music-human-s-for-the-integration-part)) |
| Ambience | Human picks a CC0 recording; the model integrates it | |
| Win/lose jingles | Model placeholder, human upgrade recommended | Synthesized melodies |

Tasks marked **HUMAN** can't be finished by the implementing model. It prepares everything around them and stops.

## Runtime

- **Library:** Howler.js (`howler` is already a dependency; add `@types/howler`, delete `src/types/howler.d.ts`).
- **Formats:** every sound ships as `.ogg` (Vorbis q5) and `.m4a` (AAC 128 kbps). Howler picks the one the browser supports.
- **Location:** `public/audio/<bus>/<id>_<n>.<ext>`, for example `public/audio/sfx/wood_hit_2.ogg`.

```ts
// src/audio/SoundBank.ts
export type Bus = 'music' | 'sfx' | 'voice';
export type SoundDef = {
  id: string; bus: Bus; files: string[];       // variation base names, without extension
  volume: number;                              // 0..1, before bus volume
  pitchJitter?: number;                        // ± fraction, e.g. 0.06
  maxInstances?: number;                       // concurrent cap (default 4)
  cooldownMs?: number;                         // minimum gap between plays (default 0)
  loop?: boolean; stream?: boolean;            // music: stream = html5 true
  priority?: 1 | 2 | 3;                        // 3 = never dropped for the voice cap
};
export class SoundBank {
  load(manifest: SoundDef[], onProgress: (p: number) => void): Promise<void>;
  play(id: string, opts?: { volume?: number; rate?: number; pan?: number }): number | null;
  stop(id: string): void;
  setBusVolume(bus: Bus, v: number): void;
  duck(bus: Bus, toGain: number, attackMs: number, holdMs: number, releaseMs: number): void;
}
```

Rules:

- **Unlock:** create the Howler context on the first user gesture (title screen tap). Before that, `play()` is a no-op that returns null.
- **Variation:** pick a random file from `files`, but never the same index twice in a row. Rate = `1 ± pitchJitter` (uniform), multiplied by `opts.rate`.
- **Pan:** `pan = clamp((x − camera.cx) / (viewWidth / 2), −1, 1) × 0.6` for world sounds.
- **Voice cap:** at most 16 sounds playing at once. When full, drop the new sound unless its priority is higher than the lowest-priority playing sound, which then stops.
- **Ducking:** explosions and the win jingle duck the music bus to 0.5 (attack 30 ms, hold 400 ms, release 600 ms).
- **Pause:** pausing the game pauses sfx and voice; music drops to 0.4× until resume. `visibilitychange` hidden → mute everything.
- **Fallback:** `audio/SynthFallback.ts` (the current `AudioSystem.ts`, renamed) plays when a sound id has no loaded files. Delete it at AUD-05.

## Sound list

`src/audio/manifest.json`. **Count** is the number of variation files. **Recipe** tells AUD-04 how to generate it.

| Id | Bus | Count | Vol | Jitter | Cap / cooldown | Trigger | Recipe |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `ui_tap` | sfx | 2 | 0.5 | 0.03 | 2 / 40 ms | Any button | Short sine blip 880 → 660 Hz, 60 ms |
| `ui_back` | sfx | 1 | 0.5 | 0 | 1 | Back/close | Blip 660 → 440 Hz |
| `sling_stretch` | sfx | 1 (loop) | 0.35 | 0 | 1 | While dragging; rate = 0.8 + 0.6 × tension | Rubber creak: filtered noise (bandpass 300 Hz, Q 4) with 7 Hz amplitude wobble, 1.5 s loopable |
| `sling_release` | sfx | 3 | 0.8 | 0.05 | 2 | `bot:launched` | Snap: square click 140 → 55 Hz, 60 ms, + whoosh (noise, bandpass sweep 280 → 2,400 → 400 Hz over 0.35 s) |
| `sling_cancel` | sfx | 1 | 0.4 | 0 | 1 | `sling:cancel` | Sine 220 → 95 Hz, 140 ms |
| `bot_launch_<kind>` | voice | 3 per kind | 0.7 | 0.04 | 1 | `bot:launched` | Robot chirp: 3–5 square-wave notes, 40 ms each, pitch per kind (grok 520 Hz, dash 700, split 820, heavy 300, blast 420), random intervals from {+3, +5, +7, −2} semitones, ring-modulated at 80 Hz |
| `bot_ability_<kind>` | sfx | 2 per kind | 0.9 | 0.04 | 1 | `bot:ability` | dash: rising jet noise 0.5 s; split: 3 quick pops 0.02 s apart; heavy: descending whistle 1,200 → 200 Hz over 0.4 s; blast: short fuse hiss |
| `bot_hit` | voice | 3 | 0.6 | 0.06 | 1 / 150 ms | `bot:firstImpact` | Robot "ow": 2 falling notes + noise burst |
| `wood_hit` | sfx | 4 | vol ∝ impulse | 0.08 | 4 / 30 ms | `contact:impact` on wood | Knock: noise burst bandpass 600 Hz (Q 2), 50 ms, + sine 180 Hz with 60 ms decay |
| `wood_break` | sfx | 3 | 0.9 | 0.06 | 3 | wood destroyed | Crack: 3–4 overlapping wood hits in 80 ms + a noise snap (highpass 2 kHz) |
| `glass_hit` | sfx | 3 | vol ∝ impulse | 0.05 | 4 / 30 ms | glass impact | Tink: sines at 2.3, 3.7, 5.1 kHz, ±3% random detune, 250 ms decay |
| `glass_break` | sfx | 3 | 0.9 | 0.05 | 3 | glass destroyed | Shatter: 12–18 random tinks over 350 ms + a highpassed noise burst |
| `stone_hit` | sfx | 3 | vol ∝ impulse | 0.06 | 4 / 30 ms | stone impact | Thud: lowpass noise 180 Hz, 90 ms, + sine 90 Hz |
| `stone_break` | sfx | 2 | 1.0 | 0.05 | 2 | stone destroyed | Crumble: 6 thuds over 250 ms + gravel noise (bandpass 1.2 kHz, 0.4 s) |
| `tnt_explode` | sfx | 2 | 1.0 | 0.04 | 3 / 60 ms | `explosion` | Noise with a lowpass sweep 4 kHz → 150 Hz over 0.9 s + a sub sine 45 Hz (0.5 s) + a clipped transient |
| `pig_idle` | voice | 4 | 0.35 | 0.08 | 2 / 1,500 ms | Random during `aim`, 1 per 4 s per level | Snort: 2 bursts of noise through a formant filter (bandpass 400 Hz and 1.1 kHz), 120 ms each |
| `pig_snicker` | voice | 3 | 0.45 | 0.06 | 1 | Pig smug state | 3 rapid snorts, rising pitch |
| `pig_hurt` | voice | 3 | 0.6 | 0.06 | 2 / 200 ms | `pig:damaged` | Squeal: sine 600 → 900 → 500 Hz, 250 ms, vibrato 12 Hz |
| `pig_pop` | sfx | 3 | 0.9 | 0.05 | 4 | `pig:destroyed` | Pop: sine 300 → 1,200 Hz in 30 ms + a noise puff |
| `pig_laugh` | voice | 2 | 0.8 | 0.03 | 1 | `game:lost` | 5 snort-chuckles in 1.2 s |
| `score_tick` | sfx | 1 | 0.25 | 0.02 | 1 / 50 ms | Results count-up | Blip 1,500 Hz, 20 ms |
| `star_1` / `star_2` / `star_3` | sfx | 1 each | 0.8 | 0 | 1 | Results stars | Bell: 3 sine partials; root C6 / E6 / G6 |
| `bonus_bot` | sfx | 1 | 0.7 | 0 | 2 | Each bonus bot | Coin: 988 Hz then 1,319 Hz square, 80 ms each |
| `jingle_win` | music | 1 | 0.8 | 0 | 1 | `game:won` | Placeholder: an ascending major arpeggio C–E–G–C, then a chord, triangle + square, 2.5 s. **Human upgrade.** |
| `jingle_lose` | music | 1 | 0.7 | 0 | 1 | `game:lost` | Placeholder: a descending minor motif, 2 s. **Human upgrade.** |
| `music_title` | music | 1 (loop, stream) | 0.6 | 0 | 1 | `title`, `levelSelect` | **HUMAN** ([AUD-06](#aud-06--music-human-s-for-the-integration-part)) |
| `music_level` | music | 1 (loop, stream) | 0.35 | 0 | 1 | Play states | **HUMAN** |
| `amb_meadow` | music | 1 (loop, stream) | 0.25 | 0 | 1 | Play states, under the music | **HUMAN** picks a CC0 recording |

**Impact volume:** `vol = clamp((impulse − 1) / 14, 0.15, 1) × def.volume`. At most 12 impact sounds per second across all materials; beyond that, drop the quietest.

## Loudness

`tools/audio-build.mjs` (needs `ffmpeg` on the machine; the task checks for it and stops with instructions if it's missing):

- SFX and voice: peak-normalize to −1 dBFS, trim silence (> −50 dB) at both ends, add a 5 ms fade in and 20 ms fade out.
- Music and ambience: `loudnorm` to −16 LUFS integrated (music) or −24 LUFS (ambience), true peak −1.5 dB.
- Encode `.ogg` (`-q:a 5`) and `.m4a` (`-b:a 128k`).
- Write `public/audio/LICENSES.md`: one row per file with source, license, author, and URL (for generated files: "generated by tools/sfx-render, CC0").

## Tasks

### AUD-01 — SoundBank and buses (M)

- **Depends on:** APP-02
- **Do:** SoundBank, AudioBus, the manifest loader, variation, cap, pan, ducking, unlock. Rename `systems/AudioSystem.ts` → `audio/SynthFallback.ts`.
- **Tests:** unit with a Howler mock: no repeat index; the cap drops the lowest priority; cooldown; ducking envelope values at t = 0 / 30 / 430 / 1030 ms; `play` before unlock → null.

### AUD-02 — Settings and lifecycle (S)

- **Depends on:** AUD-01, UI-02
- **Tests:** e2e: changing the Effects slider changes `Howler` bus gain (read through `__debug.snapshot().audio`); pause lowers the music; tab hidden → muted.

### AUD-03 — Event mapping (S)

- **Depends on:** AUD-01, GAME-02
- **Do:** `src/audio/AudioDirector.ts` subscribes to bus events and plays per the table.
- **Tests:** unit with a mock bank: each event plays the right id; the impact volume formula; the 12/s impact limit.

### AUD-04 — Generated SFX pipeline (M)

- **Depends on:** AUD-03
- **Do:**
  - `tools/sfx-recipes.ts`: one function per recipe above, `(ctx: OfflineAudioContext, seed: number) => void`, reusing the synthesis code from `SynthFallback.ts` where it matches
  - `tools/sfx-render.spec.ts`: a Playwright script, not a test, that opens a blank page, renders every (id, variation) with seed = variation index into a WAV via `OfflineAudioContext` (44.1 kHz mono, 2 s max), and returns the bytes to Node, which writes `tools/out/wav/*.wav`
  - `npm run audio:build` runs the render, then `audio-build.mjs`
- **Tests:** every non-HUMAN id in the manifest has its files present; no file is silent (RMS > −45 dBFS); none clips (peak ≤ −0.9 dBFS).
- **Human check:** the Gate 3 listening session ([10-qa.md](10-qa.md#human-gates)).

### AUD-05 — Remove the synth fallback (S)

- **Depends on:** AUD-04, AUD-07
- **Do:** delete `SynthFallback.ts` once every non-HUMAN manifest id has files. Music ids stay silent until AUD-06.

### AUD-06 — Music (HUMAN, S for the integration part)

- **Human delivers:**
  - `music_title`: a 60–90 s seamless loop, 110–125 BPM, playful and mischievous (pizzicato strings, woodwinds, light percussion; think cartoon heist)
  - `music_level`: a 90–120 s calmer loop in the same palette, low-key so effects cut through
  - `amb_meadow`: a 60 s CC0 meadow ambience (birds, light wind)
  - license: CC0, CC-BY (credit in LICENSES.md and the title screen credits), or commissioned with full rights
- **Model does:** integration, loop points (Howler `sprite` if the file has intro + loop), `audio-build` normalization, the credits line.
- **Until delivered:** music ids play nothing (not the synth fallback).

### AUD-07 — Voices (model placeholder; HUMAN upgrade)

- **Model:** generate `bot_*` and `pig_*` per the recipes (done in AUD-04).
- **Human (optional, recommended before release):** replace `pig_*` with recorded or licensed voices; same ids and counts.

### AUD-08 — Listening gate (HUMAN)

Fill in `docs/AUDIO_LISTENING_NOTES.md` on headphones and a phone speaker for all 5 slice levels. Pass criteria are in [10-qa.md](10-qa.md#human-gates).
