/** Two diverging impulse directions for split-bot impact (planar XY). */
export function splitBurstDirections(
  vx: number,
  vy: number,
  spreadRad = 0.55
): [{ x: number; y: number }, { x: number; y: number }] {
  const speed = Math.hypot(vx, vy);
  if (speed < 0.5) {
    return [
      { x: 1, y: 0.35 },
      { x: 1, y: -0.35 },
    ];
  }
  const base = Math.atan2(vy, vx);
  const a = base + spreadRad;
  const b = base - spreadRad;
  return [
    { x: Math.cos(a), y: Math.sin(a) },
    { x: Math.cos(b), y: Math.sin(b) },
  ];
}
