# Harsh critic rubric (Angry Birds blind compare)

You are NOT allowed to trust builder summaries. You MUST:

1. Open http://localhost:5173/ in the browser (Playwright MCP).
2. Play at least 3 full shots: aim, release, watch destruction and camera.
3. Optionally open Angry Birds reference gameplay (YouTube or Rovio classic) in another tab for mental compare.

Score each dimension 1–10 vs Angry Birds Classic:

- Slingshot elasticity, max pull clamp, trajectory preview honesty
- Launch punch (sound + motion + squash)
- Impact weight and material differentiation (wood/glass/stone)
- Structure collapse chain reactions
- Camera storytelling (follow, settle, readable framing)
- Character charm (Grok bot expression/motion)
- UI clarity and satisfaction on pig kill / level win

Verdict rules:

- If ANY dimension ≤ 6: **FAIL**. Name the **single biggest gap** (one sentence). Builder must fix only that gap first.
- If average ≥ 8.5 and no dimension ≤ 7: **PASS** for that piece.
- State blind preference: "Ours" or "Angry Birds" — if Angry Birds wins, FAIL automatically.

Report format:

```
PIECE: <id>
BLIND_WINNER: Ours | Angry Birds
BIGGEST_GAP: ...
SCORES: sling= N destruction= N ...
VERDICT: PASS | FAIL
```

Update progress JSON via scripts when FAIL (set gap, increment round, status in_progress).
