export type Rect = { x0: number; x1: number; y0: number; y1: number };
export type View = { cx: number; cy: number; h: number };

/** On a narrow screen, keep the world width small enough that characters stay readable. */
export function capWidth(r: Rect, aspect: number, maxW: number, anchor: 'left' | 'center'): Rect {
  if (aspect >= 0.9) return r;
  const w = r.x1 - r.x0;
  if (w <= maxW) return r;
  if (anchor === 'left') {
    const x0 = r.x0 - 1.8;
    return { ...r, x0, x1: x0 + maxW };
  }
  const mid = (r.x0 + r.x1) / 2;
  return { ...r, x0: mid - maxW / 2, x1: mid + maxW / 2 };
}

export function unionRect(a: Rect, b: Rect): Rect {
  return {
    x0: Math.min(a.x0, b.x0),
    x1: Math.max(a.x1, b.x1),
    y0: Math.min(a.y0, b.y0),
    y1: Math.max(a.y1, b.y1),
  };
}

export function fitRect(
  r: Rect,
  aspect: number,
  pad = 0.5,
  topHudPx = 0,
  canvasPxH = 1
): View {
  const w = r.x1 - r.x0;
  const hRect = r.y1 - r.y0;
  let h = Math.max(hRect + 2 * pad, (w + 2 * pad) / aspect);
  const cx = (r.x0 + r.x1) / 2;
  let cy = (r.y0 + r.y1) / 2;

  if (topHudPx > 0 && canvasPxH > 0) {
    const add = h * (topHudPx / canvasPxH);
    h += add;
    cy += add / 2;
  }

  return { cx, cy, h };
}

export function clampView(v: View, bounds: Rect, aspect: number): View {
  const boundsW = bounds.x1 - bounds.x0;
  const boundsH = bounds.y1 - bounds.y0;

  const oversizedY = v.h > boundsH;
  const oversizedX = v.h * aspect > boundsW;

  let { cx, cy, h } = v;
  let w = h * aspect;

  if (h > boundsH) {
    h = boundsH;
    w = h * aspect;
  }
  if (w > boundsW) {
    w = boundsW;
    h = w / aspect;
  }

  if (oversizedY) {
    cy = (bounds.y0 + bounds.y1) / 2;
  } else {
    const minCy = bounds.y0 + h / 2;
    const maxCy = bounds.y1 - h / 2;
    cy = Math.min(Math.max(cy, minCy), maxCy);
  }

  if (oversizedX) {
    cx = (bounds.x0 + bounds.x1) / 2;
  } else {
    const minCx = bounds.x0 + w / 2;
    const maxCx = bounds.x1 - w / 2;
    cx = Math.min(Math.max(cx, minCx), maxCx);
  }

  return { cx, cy, h };
}
