import { setAnalyticsSink } from './index';

declare global {
  interface ImportMetaEnv {
    readonly VITE_GA_MEASUREMENT_ID?: string;
  }
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/** Installs Google Analytics 4 (gtag.js) as the analytics sink when a
 *  measurement id is configured at build time (`VITE_GA_MEASUREMENT_ID`). */
export function installGoogleAnalytics(measurementId: string | undefined): boolean {
  if (!measurementId || !/^G-[A-Z0-9]+$/.test(measurementId)) return false;
  if (navigator.doNotTrack === '1') return false;

  window.dataLayer = window.dataLayer ?? [];
  window.gtag =
    window.gtag ??
    function gtag(...args: unknown[]) {
      window.dataLayer!.push(args);
    };
  window.gtag('js', new Date());
  window.gtag('config', measurementId, { send_page_view: true, anonymize_ip: true });

  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(s);

  setAnalyticsSink((name, props) => window.gtag?.('event', name, props));
  return true;
}
