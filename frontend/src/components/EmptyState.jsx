// ─────────────────────────────────────────────────────────────
// EmptyState — Standardized "nothing here yet" component
// Every list/table uses this for a consistent empty experience.
// ─────────────────────────────────────────────────────────────
import { Link } from 'react-router-dom';

/**
 * @param {string}  icon    — Material Symbols icon name
 * @param {string}  title   — Primary message
 * @param {string}  message — Secondary description
 * @param {string}  ctaLabel — Button text (optional)
 * @param {string}  ctaTo    — React Router path (optional)
 * @param {Function} onCtaClick — Callback for non-link CTA (optional)
 */
export default function EmptyState({
  icon = 'inbox',
  title = 'Nothing here yet',
  message = '',
  ctaLabel = '',
  ctaTo = '',
  onCtaClick,
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--panel-soft)] px-8 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent-soft)]">
        <span className="material-symbols-outlined text-[28px] text-[var(--accent-strong)]">{icon}</span>
      </div>
      <h3 className="text-base font-bold text-[var(--text)]">{title}</h3>
      {message && (
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-[var(--muted-strong)]">{message}</p>
      )}
      {ctaLabel && ctaTo && (
        <Link to={ctaTo} className="app-button mt-6 px-6 py-2.5 text-sm">
          {ctaLabel} →
        </Link>
      )}
      {ctaLabel && onCtaClick && !ctaTo && (
        <button type="button" onClick={onCtaClick} className="app-button mt-6 px-6 py-2.5 text-sm">
          {ctaLabel} →
        </button>
      )}
    </div>
  );
}
