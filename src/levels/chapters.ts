export type ChapterMeta = { id: string; name: string; color: string; order: number };

export const CHAPTERS: ChapterMeta[] = [
  { id: 'training', name: 'Training Green', color: '#6ecf68', order: 1 },
  { id: 'workshop', name: 'Dust Workshop', color: '#d4a24a', order: 2 },
  { id: 'citadel', name: 'Night Citadel', color: '#6a7bb8', order: 3 },
];

export function chapterOrder(id: string): number {
  return CHAPTERS.find((c) => c.id === id)?.order ?? 99;
}
