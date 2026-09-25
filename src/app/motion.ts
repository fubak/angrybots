/** Saved override wins; otherwise follow the OS reduced-motion preference. */
export function effectiveReducedMotion(saved: boolean | null): boolean {
  if (saved !== null) return saved;
  return (
    typeof matchMedia !== 'undefined' &&
    matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}
