
import { Link } from 'react-router-dom';
import ApticoLogo from './ApticoLogo.jsx';
import { APP_NAME, APP_COPYRIGHT, FOOTER_LINKS, SOCIAL_LINKS } from '../constants/index.js';

export default function Footer() {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--panel-soft)]">
      <div className="app-container py-12 md:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand & Social */}
          <div className="space-y-6">
            <Link to="/" className="flex items-center gap-3">
              <ApticoLogo className="h-9 w-9" />
              <span className="text-lg font-black tracking-tight text-[var(--text)]">{APP_NAME}</span>
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-[var(--muted-strong)]">
              Career intelligence for the modern job seeker. Analyze, match, and improve your career trajectory.
            </p>
            <div className="flex gap-2">
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
            {/* Status Indicator */}
            <div className="flex items-center gap-2 pt-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent)]"></span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">All systems operational</span>
            </div>
          </div>

          {/* Product links */}
          <div>
            <h4 className="app-kicker mb-6">Product</h4>
            <ul className="space-y-3">
              {FOOTER_LINKS.product.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    className="text-sm font-medium text-[var(--muted-strong)] transition hover:text-[var(--text)]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company links */}
          <div>
            <h4 className="app-kicker mb-6">Company</h4>
            <ul className="space-y-3">
              {FOOTER_LINKS.company.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm font-medium text-[var(--muted-strong)] transition hover:text-[var(--text)]"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Column */}
          <div className="space-y-6">
            <div>
              <h4 className="app-kicker mb-4">Contact Us</h4>
              <p className="text-xs leading-relaxed text-[var(--muted-strong)]">
                Have questions or feedback? Drop your email and we'll get back to you shortly.
              </p>
            </div>
            <form className="relative" onSubmit={(e) => e.preventDefault()}>
              <input 
                type="email" 
                placeholder="support@aptico.ai" 
                className="app-input pr-12 text-xs"
              />
              <button 
                type="submit" 
                className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)] text-[#003824] transition hover:brightness-110"
              >
                <span className="material-symbols-outlined text-[16px]">send</span>
              </button>
            </form>
            <div className="flex flex-col gap-3 pt-2">
               {FOOTER_LINKS.legal.map(link => (
                 <a key={link.label} href={link.href} className="text-[10px] font-bold text-[var(--muted)] transition hover:text-[var(--text)]">
                   {link.label}
                 </a>
               ))}
            </div>
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
