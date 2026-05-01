// ─────────────────────────────────────────────────────────────
// Footer — Public-facing footer for landing / unauthenticated pages
// Dark background, 3-column grid, social links, copyright
// NOT rendered inside authenticated dashboard (AppShell handles that)
// ─────────────────────────────────────────────────────────────
import { Link } from 'react-router-dom';
import { APP_NAME, APP_COPYRIGHT, FOOTER_LINKS, SOCIAL_LINKS } from '../constants/index.js';

export default function Footer() {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--panel-soft)]">
      <div className="app-container py-12 md:py-16">
        <div className="grid gap-10 md:grid-cols-3">
          {/* Brand column */}
          <div>
            <Link to="/" className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)] text-sm font-black text-[#003824]">
                A
              </div>
              <span className="text-lg font-black tracking-tight text-[var(--text)]">{APP_NAME}</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-[var(--muted-strong)]">
              Career intelligence for the modern job seeker. Analyze, match, and improve your career trajectory.
            </p>
            <div className="mt-5 flex gap-3">
              {SOCIAL_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--muted-strong)] transition hover:bg-[var(--panel-strong)] hover:text-[var(--text)]"
                  aria-label={link.label}
                >
                  <span className="material-symbols-outlined text-[18px]">{link.icon}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Product links */}
          <div>
            <h4 className="app-kicker mb-4">Product</h4>
            <ul className="space-y-2.5">
              {FOOTER_LINKS.product.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    className="text-sm text-[var(--muted-strong)] transition hover:text-[var(--text)]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal links */}
          <div>
            <h4 className="app-kicker mb-4">Legal</h4>
            <ul className="space-y-2.5">
              {FOOTER_LINKS.legal.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-[var(--muted-strong)] transition hover:text-[var(--text)]"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Copyright bar */}
        <div className="mt-12 border-t border-[var(--border)] pt-6">
          <p className="text-center text-xs text-[var(--muted)]">{APP_COPYRIGHT}</p>
        </div>
      </div>
    </footer>
  );
}
