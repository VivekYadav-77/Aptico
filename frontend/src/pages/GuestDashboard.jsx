export { default } from './GuestDashboardView.jsx';
/*
import { Link } from 'react-router-dom';
import AppShell from '../components/AppShell.jsx';

const lockedFeatures = [
  'Saved analyses and profile history',
  'Protected admin and authenticated API routes',
  'Persistent job bookmarks and session syncing'
];

export default function GuestDashboard() {
  return (
    <AppShell
      title="Guest dashboard"
      description="Guest mode is now framed around Aptico’s actual service: explore the analysis flow, job search UI, and product structure safely while staying clear about what requires an account and what is not saved."
      banner={
        <div className="border-b border-[var(--warning-border)] bg-[var(--warning-soft)] px-4 py-3 text-center text-sm text-[var(--warning-text)]">
          Guest mode is for exploration only. Progress, uploads, and protected routes are limited until you sign in.
        </div>
      }
      actions={
        <>
          <Link to="/auth" className="app-button">
            Create account
          </Link>
          <Link to="/analysis" className="app-button-secondary">
            Open analysis preview
          </Link>
        </>
      }
    >
      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="app-panel">
          <p className="app-kicker">Preview experience</p>
          <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-[var(--text)]">See the workflow before you commit</h2>
          <p className="mt-4 text-sm leading-7 text-[var(--muted-strong)]">
            You can inspect the redesigned screens, understand how analysis works, and browse the product without
            exposing billing or persistence features that require a real account.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              ['Analysis preview', 'Interactive layout and AI result structure'],
              ['Job search preview', 'Filters, cards, and multi-source UX'],
              ['Theme preview', 'Dark and light mode behavior on all screen sizes']
            ].map(([title, copy]) => (
              <div key={title} className="rounded-3xl border border-[var(--border)] bg-[var(--panel-soft)] p-5">
                <h3 className="font-semibold text-[var(--text)]">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-[var(--muted-strong)]">{copy}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="app-panel">
          <p className="app-kicker">Service terms</p>
          <div className="mt-4 space-y-4">
            {[
              'Guest sessions are temporary and should not be used for storing personal career documents.',
              'Protected API endpoints and account-specific data remain unavailable without authentication.',
              'Use the guest workspace to evaluate the product flow, then sign in to save real activity and unlock persistence.'
            ].map((rule) => (
              <div key={rule} className="rounded-3xl border border-[var(--border)] bg-[var(--panel-soft)] p-4 text-sm leading-7 text-[var(--muted-strong)]">
                {rule}
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <article className="app-panel relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(15,23,42,0.04))]" />
          <div className="relative">
            <p className="app-kicker">Locked until sign-in</p>
            <div className="mt-4 space-y-3">
              {lockedFeatures.map((feature) => (
                <div key={feature} className="flex items-center justify-between rounded-3xl border border-[var(--border)] bg-[var(--panel-soft)] px-4 py-3">
                  <span className="text-sm text-[var(--text)]">{feature}</span>
                  <span className="rounded-full border border-[var(--border)] px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
                    Locked
                  </span>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="app-panel">
          <p className="app-kicker">Next step</p>
          <h3 className="mt-3 text-2xl font-bold tracking-[-0.03em] text-[var(--text)]">Move from preview to a saved workspace</h3>
          <p className="mt-4 text-sm leading-7 text-[var(--muted-strong)]">
            Create an account to save analyses, keep your matched skills between sessions, search jobs with stored
            context, and access the full Aptico service.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/auth" className="app-button">
              Sign up now
            </Link>
            <Link to="/" className="app-button-secondary">
              Back to landing
            </Link>
          </div>
        </article>
      </section>
    </AppShell>
  );
}
*/
