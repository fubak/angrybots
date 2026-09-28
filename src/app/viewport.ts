/**
 * The *visible* viewport: on mobile browsers `position:fixed` and `100vh`
 * follow the layout viewport, which is taller than what's on screen while
 * the browser bar shows. visualViewport gives the real box — but reports
 * layout-viewport-relative values while pinch-zoomed (scale !== 1), so we
 * fall back to innerWidth/Height then.
 */
export type ViewportBox = { w: number; h: number; top: number; left: number };

export function visibleViewport(): ViewportBox {
  const vv = window.visualViewport;
  if (vv && Math.abs(vv.scale - 1) < 0.01) {
    return { w: vv.width, h: vv.height, top: vv.offsetTop, left: vv.offsetLeft };
  }
  return { w: window.innerWidth, h: window.innerHeight, top: 0, left: 0 };
}

/**
 * Mirrors the visible viewport into --vvw/--vvh/--vvt/--vvl on <html> and
 * calls onChange after each update (coalesced per frame).
 */
export function installVisibleViewport(onChange: () => void): () => void {
  let raf = 0;
  const apply = (): void => {
    raf = 0;
    const v = visibleViewport();
    const s = document.documentElement.style;
    s.setProperty('--vvw', `${v.w}px`);
    s.setProperty('--vvh', `${v.h}px`);
    s.setProperty('--vvt', `${v.top}px`);
    s.setProperty('--vvl', `${v.left}px`);
    onChange();
  };
  const schedule = (): void => {
    if (!raf) raf = requestAnimationFrame(apply);
  };
  const vv = window.visualViewport;
  window.addEventListener('resize', schedule);
  window.addEventListener('orientationchange', schedule);
  vv?.addEventListener('resize', schedule);
  vv?.addEventListener('scroll', schedule);
  apply();
  return () => {
    window.removeEventListener('resize', schedule);
    window.removeEventListener('orientationchange', schedule);
    vv?.removeEventListener('resize', schedule);
    vv?.removeEventListener('scroll', schedule);
    if (raf) cancelAnimationFrame(raf);
  };
}
