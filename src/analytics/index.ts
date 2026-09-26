/** Vendor-neutral analytics: typed events, a single pluggable sink, no network. */
export type AnalyticsEvent =
  | { name: 'app_open' }
  | { name: 'level_start'; levelId: string }
  | {
      name: 'level_end';
      levelId: string;
      won: boolean;
      score: number;
      stars: number;
      shotsUsed: number;
      durationMs: number;
    }
  | { name: 'level_skip'; levelId: string }
  | { name: 'achievement_unlock'; id: string }
  | { name: 'daily_start'; levelId: string; date: string }
  | {
      name: 'daily_end';
      levelId: string;
      date: string;
      won: boolean;
      score: number;
      durationMs: number;
    };

export type AnalyticsName = AnalyticsEvent['name'];
export type AnalyticsProps<N extends AnalyticsName> = Omit<
  Extract<AnalyticsEvent, { name: N }>,
  'name'
>;
export type AnalyticsSink = <N extends AnalyticsName>(
  name: N,
  props: AnalyticsProps<N>
) => void;

const noop: AnalyticsSink = () => {};
let sink: AnalyticsSink = noop;

/** Install a vendor sink; pass null to reset to the no-op default. */
export function setAnalyticsSink(fn: AnalyticsSink | null): void {
  sink = fn ?? noop;
}

export function track<N extends AnalyticsName>(name: N, props: AnalyticsProps<N>): void {
  try {
    sink(name, props);
  } catch {
    /* a broken sink must never crash the game */
  }
}

if (import.meta.env.DEV) {
  setAnalyticsSink((name, props) => console.debug('[analytics]', name, props));
}
