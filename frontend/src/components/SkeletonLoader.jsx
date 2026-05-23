// ─────────────────────────────────────────────────────────────
// SkeletonLoader — Pulse-animated loading placeholders
// Matches the shape of the actual content for zero-layout-shift
// ─────────────────────────────────────────────────────────────

/**
 * @param {'card' | 'list' | 'profile' | 'text' | 'stat'} variant
 * @param {number} count  — how many skeletons to render
 */
export default function SkeletonLoader({ variant = 'card', count = 1 }) {
  const items = Array.from({ length: count }, (_, i) => i);

  if (variant === 'text') {
    return (
      <div className="space-y-3">
        {items.map((i) => (
          <div key={i} className="space-y-2">
            <div className="skeleton skeleton-text w-full" />
            <div className="skeleton skeleton-text-sm" />
            <div className="skeleton skeleton-text w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'profile') {
    return (
      <div className="flex items-center gap-3">
        <div className="skeleton skeleton-avatar" />
        <div className="flex-1 space-y-2">
          <div className="skeleton skeleton-text w-1/2" />
          <div className="skeleton skeleton-text-sm w-1/3" />
        </div>
      </div>
    );
  }

  if (variant === 'stat') {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((i) => (
          <div key={i} className="app-panel-soft flex flex-col items-center gap-2 py-6">
            <div className="skeleton h-8 w-20 rounded-lg" />
            <div className="skeleton h-3 w-16 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'list') {
    return (
      <div className="space-y-3">
        {items.map((i) => (
          <div key={i} className="flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4">
            <div className="skeleton skeleton-avatar shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="skeleton skeleton-text w-2/3" />
              <div className="skeleton skeleton-text-sm w-1/2" />
            </div>
            <div className="skeleton h-6 w-16 rounded" />
          </div>
        ))}
      </div>
    );
  }

  // Default: card variant
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((i) => (
        <div key={i} className="skeleton skeleton-card" />
      ))}
    </div>
  );
}
