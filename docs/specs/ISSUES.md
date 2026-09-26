# Open issues

| id | found in task | description | status |
| --- | --- | --- | --- |
| I-01 | CNT | Only 5 slice levels are polished; 25 extra levels are duplicated layouts for count, not unique designs | implemented — 30 unique authored files; listening/device still unverified |
| I-02 | QA-03 | Visual baseline CI and `tests/visual/*` not added (deterministic debug hooks only) | resolved — `tests/e2e/visual.spec.ts` baselines title + level 1 idle (desktop only, 3× stable) |
| I-03 | QA-04 | `npm run verify` excludes e2e; suite passes locally (see `docs/BROWSER_TEST_REPORT.md`) | resolved — `verify:full` runs verify + level:curve + build + size + e2e |
| I-04 | AUD | Real SFX/music/voice assets require human or AUD-04 pipeline output | open |
| I-05 | LVL-02 | Full invalid-fixture matrix from spec not complete | resolved — 9 fixtures in `tests/levels/invalid/` incl. camera-margin S5; iterated in `validate-static.test.ts` |
