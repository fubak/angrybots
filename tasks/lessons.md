# Lessons

- Long solver/search runs must be time-boxed, run in the background, and write milestone lines to a progress log. Commit WIP before long runs so interrupts lose nothing.
- Rater constraints of the form "≤ prev + k" are trivially satisfied by 0%; curve checks need floors too.
- Star thresholds from winning-score percentiles collapse to near-identical values when most wins score alike; calibrate on a different axis (bots spared / destruction).
- A screenshot captured on a fixed sleep can miss the event; poll for the state/event before snapping.
