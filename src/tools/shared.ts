import type { Gender } from '../core/types';

/**
 * Shared viewmodel drawing helpers for tools (ARSENAL).
 * Tools draw themselves onto the HUD canvas each frame — chunky 2D pixel art.
 */

export function drawHand(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  gender: Gender,
): void {
  // sleeve + hand block; female gets a slimmer hand / different sleeve color
  const skin = gender === 'female' ? '#f0c8a0' : '#e8b98a';
  const sleeve = gender === 'female' ? '#7a2d8e' : '#27407a';
  g.fillStyle = sleeve;
  g.fillRect(x - 6, y + 8, 22, 14);
  g.fillStyle = skin;
  g.fillRect(x - 4, y, 18, 10);
}
