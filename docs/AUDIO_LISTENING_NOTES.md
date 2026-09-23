# Audio listening checklist (Gate 2 / G01 / K09)

**Status:** sample routing verified in code and in one browser session. **Human listen not recorded.**

**Implementation:** `src/audio/SoundBank.ts` plays buffers from `src/audio/oneshots.ts`. Cancel, ability, defeat, UI clicks, and sling tension are still oscillators.

Playback check on 2026-09-21, Playwright Chromium, no headphones: a First Flight clear and a Powder Row collapse started `AudioBufferSourceNode`s whose durations match the rendered samples.

| Buffer | Duration (s) | Heard? |
|--------|----------------|--------|
| launch | 0.26 | not listened |
| wood / glass / stone | 0.20 | not listened |
| pig | 0.24 | not listened |
| tnt | 0.48 | not listened |
| victory | 0.62 | not listened |

Impact reuses the wood buffer and is throttled. Powder Row recorded the TNT duration. First Flight recorded launch, pig, and victory.

## Listening matrix (fill after a human session)

| Moment | Expected cue | Pass? | Notes |
|--------|----------------|-------|-------|
| Draw sling | Rising tension (still a tone) | | |
| Cancel aim | Soft drop | | |
| Release | Launch sample | | |
| Wood hit | Wood sample | | |
| Glass hit | Glass sample | | |
| Stone hit | Stone sample | | |
| Pig pop | Pig sample | | |
| TNT | TNT sample | | |
| Victory | Four-note sample | | |
| Defeat | Falling tone | | |

Record date, device, output (headphones / speaker), and volume %. Buffer durations do not pass this table.
