import { useState } from 'react';
import { Link } from '@/lib/router-compat.jsx';
import AppShell from '../components/AppShell.jsx';
import { createPublicSupportTicket } from '../api/supportApi.js';
import { getRequestErrorMessage } from '../utils/requestError.js';

const CATEGORIES = [
  'account_restriction',
  'feature_restriction_appeal',
  'email_access',
  'job_search',
  'analysis',
  'squad_community',
  'bug_report',
  'feedback',
  'other'
];

function humanize(value) {
  return String(value || '').replaceAll('_', ' ');
}

export default function ContactSupport() {
  const [form, setForm] = useState({ email: '', category: 'email_access', subject: '', message: '' });
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState('');

  async function submitTicket(event) {
    event.preventDefault();
    setBusy(true);
    setSuccess(null);
    setError('');

    try {
      const result = await createPublicSupportTicket(form);
      setSuccess(result);
      setForm({ email: '', category: 'email_access', subject: '', message: '' });
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, 'Could not submit support request.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="Contact Support" description="Reach Aptico support when you cannot sign in or need account access help.">
      <div className="mx-auto max-w-3xl space-y-6">
        <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--accent-strong)]">Public support</p>
          <h1 className="mt-2 text-3xl font-black text-[var(--text)]">Cannot access your account?</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted-strong)]">
            Submit a support request for account blocks, email verification, password reset issues, restrictions, bugs, or feedback. This form is submit-only.
          </p>
        </section>

        {success ? (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-500">
            {success.message || 'Support request submitted.'}
          </div>
        ) : null}
        {error ? <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-red-500">{error}</div> : null}

        <form className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5" onSubmit={submitTicket}>
          <div className="grid gap-3">
            <input className="app-input" type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="Your email address" />
            <select className="app-input" value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}>
              {CATEGORIES.map((category) => <option key={category} value={category}>{humanize(category)}</option>)}
            </select>
            <input className="app-input" value={form.subject} onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))} placeholder="Short subject" />
            <textarea className="app-input min-h-40" value={form.message} onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))} placeholder="Describe the issue. Do not include passwords, reset links, tokens, or secrets." />
            <button type="submit" className="app-button w-fit" disabled={busy}>{busy ? 'Submitting...' : 'Submit support request'}</button>
          </div>
        </form>

        <p className="text-center text-sm text-[var(--muted-strong)]">
          Can sign in? <Link to="/support" className="font-bold text-[var(--accent-strong)] hover:underline">Use Support Center</Link>
        </p>
      </div>
    </AppShell>
  );
}
