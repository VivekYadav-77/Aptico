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

function validateSupportForm(form) {
  const nextErrors = {};
  const email = form.email.trim();
  const subject = form.subject.trim();
  const message = form.message.trim();

  if (!email) {
    nextErrors.email = 'Please enter your email address.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    nextErrors.email = 'Please enter a valid email address.';
  }

  if (subject.length < 6) {
    nextErrors.subject = 'Subject must be at least 6 characters.';
  }

  if (message.length < 12) {
    nextErrors.message = 'Message must be at least 12 characters.';
  }

  return nextErrors;
}

export default function ContactSupport() {
  const [form, setForm] = useState({ email: '', category: 'email_access', subject: '', message: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState('');

  async function submitTicket(event) {
    event.preventDefault();
    setSuccess(null);
    setError('');
    const validationErrors = validateSupportForm(form);

    if (Object.keys(validationErrors).length) {
      setFieldErrors(validationErrors);
      setError('Please fix the highlighted fields before submitting.');
      return;
    }

    setFieldErrors({});
    setBusy(true);

    try {
      const result = await createPublicSupportTicket(form);
      setSuccess(result);
      setForm({ email: '', category: 'email_access', subject: '', message: '' });
      setFieldErrors({});
    } catch (requestError) {
      const apiFieldErrors = requestError?.response?.data?.fieldErrors;
      if (apiFieldErrors && typeof apiFieldErrors === 'object') {
        setFieldErrors(Object.fromEntries(
          Object.entries(apiFieldErrors).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]).filter(([, value]) => Boolean(value))
        ));
      }
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
            <label className="grid gap-1">
              <span className="text-xs font-black uppercase tracking-[0.16em] text-[var(--muted-strong)]">Email address</span>
              <input className="app-input" type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="Your email address" aria-invalid={Boolean(fieldErrors.email)} />
              {fieldErrors.email ? <span className="text-xs font-bold text-red-500">{fieldErrors.email}</span> : null}
            </label>
            <select className="app-input" value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}>
              {CATEGORIES.map((category) => <option key={category} value={category}>{humanize(category)}</option>)}
            </select>
            <label className="grid gap-1">
              <span className="text-xs font-black uppercase tracking-[0.16em] text-[var(--muted-strong)]">Subject</span>
              <input className="app-input" value={form.subject} onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))} placeholder="Short subject" aria-invalid={Boolean(fieldErrors.subject)} />
              {fieldErrors.subject ? <span className="text-xs font-bold text-red-500">{fieldErrors.subject}</span> : <span className="text-xs text-[var(--muted-strong)]">Use at least 6 characters.</span>}
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-black uppercase tracking-[0.16em] text-[var(--muted-strong)]">Issue details</span>
              <textarea className="app-input min-h-40" value={form.message} onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))} placeholder="Describe the issue. Do not include passwords, reset links, tokens, or secrets." aria-invalid={Boolean(fieldErrors.message)} />
              {fieldErrors.message ? <span className="text-xs font-bold text-red-500">{fieldErrors.message}</span> : <span className="text-xs text-[var(--muted-strong)]">Use at least 12 characters.</span>}
            </label>
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
