import { GIFT_WINDOW_DAYS } from "@/lib/ledger-core";

/**
 * The koa mark: growth rings, like the rings in a piece of timber and the
 * rings a family and a community make around one person.
 */
export function RingsMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" fill="none" strokeLinecap="round">
      <circle cx="32" cy="32" r="27" stroke="var(--color-ink)" strokeWidth="3" />
      <path d="M32 13a19 19 0 1 1-15.4 7.9" stroke="var(--color-ink)" strokeWidth="3" />
      <path d="M32 21a11 11 0 1 0 10.3 7.2" stroke="var(--color-brass)" strokeWidth="3.5" />
      <circle cx="32" cy="32" r="4" fill="var(--color-ink)" />
    </svg>
  );
}

/**
 * The gifting-expiry countdown as a ring that empties. Brass, because brass
 * is the colour for expiry. The number is always written beside it as well.
 */
export function ExpiryRing({ daysLeft, className = "size-16" }: { daysLeft: number; className?: string }) {
  const radius = 26;
  const round = 2 * Math.PI * radius;
  const left = Math.max(0, Math.min(1, daysLeft / GIFT_WINDOW_DAYS));
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" fill="none">
      <circle cx="32" cy="32" r={radius} stroke="var(--color-line)" strokeWidth="6" />
      <circle
        cx="32"
        cy="32"
        r={radius}
        stroke="var(--color-brass)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${round * left} ${round}`}
        transform="rotate(-90 32 32)"
      />
    </svg>
  );
}
