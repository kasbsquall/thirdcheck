// The ThirdCheck isotype (concept "Triad"): three ascending bars, the third carrying the check.
// Reads as "the third check" and as raising the floor for every consumer of the precompile.
export function Mark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-label="ThirdCheck" role="img">
      <rect x="7" y="26" width="7" height="15" rx="3.5" fill="var(--ink-faint, #8a8f98)" />
      <rect x="18" y="19" width="7" height="22" rx="3.5" fill="var(--ink-dim, #c2c7cf)" />
      <rect x="29" y="9" width="7" height="32" rx="3.5" fill="var(--vuln, #e0913a)" />
      <path
        d="M30 22.5 l3.4 3.4 l6.2 -6.6"
        fill="none"
        stroke="var(--bg, #0d0f12)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
