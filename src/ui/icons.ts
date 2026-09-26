export type IconName =
  | 'pause'
  | 'restart'
  | 'play'
  | 'next'
  | 'levels'
  | 'settings'
  | 'sound'
  | 'mute'
  | 'close'
  | 'back'
  | 'star'
  | 'lock'
  | 'trophy'
  | 'target'
  | 'check';

const S = 'stroke="#23180f" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"';
const F = 'fill="#23180f"';

const PATHS: Record<IconName, string> = {
  pause: `<path d="M9 5v14M15 5v14" ${S}/>`,
  restart: `<path d="M4 12a8 8 0 1 1 2.3 5.7" ${S} fill="none"/><path d="M4 18v-6h6" ${S} fill="none"/>`,
  play: `<path d="M8 5.5v13l10-6.5z" ${F}/>`,
  next: `<path d="M7 5.5v13l8-6.5zM17 5.5v13" ${F}/>`,
  levels: `<rect x="4" y="4" width="6.5" height="6.5" rx="1.5" ${F}/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" ${F}/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" ${F}/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" ${F}/>`,
  settings: `<circle cx="12" cy="12" r="3.2" ${S} fill="none"/><path d="M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3M6 6l2.1 2.1M15.9 15.9 18 18M18 6l-2.1 2.1M8.1 15.9 6 18" ${S}/>`,
  sound: `<path d="M4 9.5v5h3.4L12 18.6V5.4L7.4 9.5z" ${F}/><path d="M15 8.5a5 5 0 0 1 0 7M17.5 6a8.5 8.5 0 0 1 0 12" ${S} fill="none"/>`,
  mute: `<path d="M4 9.5v5h3.4L12 18.6V5.4L7.4 9.5z" ${F}/><path d="M15.5 9.5l5 5M20.5 9.5l-5 5" ${S}/>`,
  close: `<path d="M6 6l12 12M18 6 6 18" ${S}/>`,
  back: `<path d="M14.5 5.5 8 12l6.5 6.5" ${S} fill="none"/>`,
  star: `<path d="M12 3.4l2.7 5.5 6 .9-4.4 4.3 1 6-5.3-2.8-5.3 2.8 1-6L3.4 9.8l6-.9z" ${F}/>`,
  lock: `<rect x="6" y="10.5" width="12" height="9.5" rx="2" ${F}/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" ${S} fill="none"/>`,
  trophy: `<path d="M8 4h8v5a4 4 0 0 1-8 0z" ${F}/><path d="M8 5.5H4.5a3.5 3.5 0 0 0 3.7 3.5M16 5.5h3.5a3.5 3.5 0 0 1-3.7 3.5" ${S} fill="none"/><path d="M12 13v3M8.5 20h7M12 16h-2.5v4M12 16h2.5v4" ${S} fill="none"/>`,
  target: `<circle cx="12" cy="12" r="7.5" ${S} fill="none"/><circle cx="12" cy="12" r="3.4" ${S} fill="none"/><circle cx="12" cy="12" r="1.1" ${F}/>`,
  check: `<path d="M5 12.5l4.5 4.5L19 7.5" ${S} fill="none"/>`,
};

export function iconSvg(name: IconName, size = 22): string {
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true">${PATHS[name]}</svg>`;
}

/** Chunky icon button — 48px+ target, aria-label, focus ring via .ui-btn. */
export function iconButton(
  name: IconName,
  label: string,
  cls = ''
): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `ui-btn icon-btn ${cls}`.trim();
  btn.setAttribute('aria-label', label);
  btn.title = label;
  btn.innerHTML = iconSvg(name);
  return btn;
}
