import { CHAPTERS } from '../levels/chapters';

/** Star gates for chapters beyond the first. */
export const PROGRESSION = {
  chapterStars: { workshop: 15, citadel: 35 } as Record<string, number>,
  maxSkips: 3,
  skipAfterFails: 3,
};

export type LevelRecord = {
  cleared: boolean;
  skipped?: boolean;
  stars?: number;
  fails?: number;
};

export type LevelRef = { id: string; chapter: string };

type Progress = (id: string) => LevelRecord | undefined;

function chapterOrder(chapter: string): number {
  return CHAPTERS.find((c) => c.id === chapter)?.order ?? 99;
}

export function totalStars(
  levels: readonly LevelRef[],
  progress: Progress
): number {
  let n = 0;
  for (const l of levels) n += progress(l.id)?.stars ?? 0;
  return n;
}

/** A chapter opens when the previous chapter's last level is truly cleared and the star gate is met. */
export function isChapterUnlocked(
  chapter: string,
  levels: readonly LevelRef[],
  progress: Progress
): boolean {
  const order = chapterOrder(chapter);
  if (order <= 1) return true;
  const prev = CHAPTERS.find((c) => c.order === order - 1);
  if (!prev) return false;
  const prevLevels = levels.filter((l) => l.chapter === prev.id);
  const last = prevLevels[prevLevels.length - 1];
  if (!last || !progress(last.id)?.cleared) return false;
  const need = PROGRESSION.chapterStars[chapter] ?? 0;
  return totalStars(levels, progress) >= need;
}

/**
 * Level 1 of an unlocked chapter is always open; later levels need the previous
 * level cleared or skipped. Chapter gates require real clears (no skips).
 */
export function isLevelUnlocked(
  levels: readonly LevelRef[],
  progress: Progress,
  levelId: string
): boolean {
  const idx = levels.findIndex((l) => l.id === levelId);
  if (idx < 0) return false;
  const level = levels[idx]!;
  if (!isChapterUnlocked(level.chapter, levels, progress)) return false;
  const prev = idx > 0 ? levels[idx - 1]! : null;
  if (!prev || prev.chapter !== level.chapter) return true;
  const p = progress(prev.id);
  return (p?.cleared ?? false) || (p?.skipped ?? false);
}

/** The first level that is unlocked but not yet cleared/skipped — the "current" level. */
export function currentLevelId(
  levels: readonly LevelRef[],
  progress: Progress
): string | null {
  for (const l of levels) {
    const p = progress(l.id);
    if (!isLevelUnlocked(levels, progress, l.id)) return null;
    if (!p?.cleared && !p?.skipped) return l.id;
  }
  return null;
}

export function activeSkips(
  levels: readonly LevelRef[],
  progress: Progress
): number {
  let n = 0;
  for (const l of levels) if (progress(l.id)?.skipped) n += 1;
  return n;
}

/** Skip is offered after PROGRESSION.skipAfterFails consecutive fails, capped at maxSkips active. */
export function canSkip(
  levels: readonly LevelRef[],
  progress: Progress,
  levelId: string
): boolean {
  const p = progress(levelId);
  if ((p?.fails ?? 0) < PROGRESSION.skipAfterFails) return false;
  if (p?.skipped) return false;
  return activeSkips(levels, progress) < PROGRESSION.maxSkips;
}
