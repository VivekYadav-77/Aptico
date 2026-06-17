import { useEffect, useMemo, useState } from 'react';
import { useLocation } from '@/lib/router-compat.jsx';
import AppShell from '../components/AppShell.jsx';
import { createSupportTicket, getSupportTicket, getSupportTickets, replyToSupportTicket } from '../api/supportApi.js';
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

function formatDate(value) {
  if (!value) return 'Never';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function StatusBadge({ value }) {
  const status = String(value || '').toLowerCase();
  const tone =
    status === 'resolved' || status === 'closed'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500'
      : status === 'waiting_user'
        ? 'border-amber-500/30 bg-amber-500/10 text-amber-500'
        : 'border-[var(--border)] bg-[var(--panel-soft)] text-[var(--muted-strong)]';

  return <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.14em] ${tone}`}>{humanize(value)}</span>;
}

export default function SupportCenter() {
  const location = useLocation();
  const [tickets, setTickets] = useState([]);
  const [selectedTicketId, setSelectedTicketId] = useState('');
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [form, setForm] = useState({ category: 'account_restriction', subject: '', message: '', relatedFeature: '' });
  const [reply, setReply] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const selectedTicket = useMemo(
    () => tickets.find((ticket) => ticket.id === selectedTicketId) || tickets[0] || null,
    [tickets, selectedTicketId]
  );

  async function loadTickets() {
    setError('');
    try {
      const rows = await getSupportTickets();
      setTickets(rows);
      if (!selectedTicketId && rows[0]) setSelectedTicketId(rows[0].id);
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, 'Could not load support tickets.'));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadTickets();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search || '');
    const category = params.get('category');
    const relatedFeature = params.get('feature') || params.get('relatedFeature');
    const message = params.get('message');

    if (!category && !relatedFeature && !message) return;

    setForm((current) => ({
      ...current,
      category: CATEGORIES.includes(category) ? category : current.category,
      relatedFeature: relatedFeature || current.relatedFeature,
      message: message || current.message,
      subject: current.subject || (relatedFeature ? `Help with ${humanize(relatedFeature)}` : current.subject)
    }));
  }, [location.search]);

  useEffect(() => {
    if (!selectedTicket?.id) {
      setSelectedDetail(null);
      return;
    }

    let active = true;
    getSupportTicket(selectedTicket.id)
      .then((detail) => {
        if (active) setSelectedDetail(detail);
      })
      .catch((requestError) => {
        if (active) setError(getRequestErrorMessage(requestError, 'Could not load support conversation.'));
      });

    return () => {
      active = false;
    };
  }, [selectedTicket?.id]);

  async function submitTicket(event) {
    event.preventDefault();
    setBusy('create');
    setMessage('');
    setError('');

    try {
      const ticket = await createSupportTicket({
        category: form.category,
        subject: form.subject,
        message: form.message,
        relatedFeature: form.relatedFeature || null
      });
      setForm({ category: 'account_restriction', subject: '', message: '', relatedFeature: '' });
      setSelectedTicketId(ticket.id);
      setMessage('Support ticket created. Admin can now review it.');
      await loadTickets();
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, 'Could not create support ticket.'));
    } finally {
      setBusy('');
    }
  }

  async function submitReply(event) {
    event.preventDefault();
    if (!selectedTicket?.id) return;
    setBusy('reply');
    setMessage('');
    setError('');

    try {
      await replyToSupportTicket(selectedTicket.id, { message: reply });
      setReply('');
      setMessage('Reply added to your support ticket.');
      await loadTickets();
      const detail = await getSupportTicket(selectedTicket.id);
      setSelectedDetail(detail);
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, 'Could not add reply.'));
    } finally {
      setBusy('');
    }
  }

  return (
    <AppShell title="Support Center" description="Contact Aptico admin support about account access, restrictions, bugs, and platform issues.">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--accent-strong)]">Aptico support</p>
              <h1 className="mt-2 text-3xl font-black text-[var(--text)]">Contact admin support</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-strong)]">
                Use this when you need help with restrictions, account access, email delivery, analysis, jobs, squads, bugs, or feedback.
              </p>
            </div>
            <button type="button" className="app-button-secondary" onClick={loadTickets}>Refresh</button>
          </div>
        </section>

        {message ? <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-500">{message}</p> : null}
        {error ? <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-red-500">{error}</p> : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5">
            <h2 className="text-lg font-black text-[var(--text)]">New ticket</h2>
            <form className="mt-5 grid gap-3" onSubmit={submitTicket}>
              <select className="app-input" value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}>
                {CATEGORIES.map((category) => <option key={category} value={category}>{humanize(category)}</option>)}
              </select>
              <input className="app-input" value={form.subject} onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))} placeholder="Short subject" />
              <input className="app-input" value={form.relatedFeature} onChange={(event) => setForm((current) => ({ ...current, relatedFeature: event.target.value }))} placeholder="Related feature or page (optional)" />
              <textarea className="app-input min-h-36" value={form.message} onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))} placeholder="Describe the issue clearly. Do not include passwords, tokens, or secrets." />
              <button type="submit" className="app-button w-fit" disabled={busy === 'create'}>Submit ticket</button>
            </form>
          </section>

          <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5">
            <h2 className="text-lg font-black text-[var(--text)]">Your tickets</h2>
            <div className="mt-5 grid gap-3">
              {isLoading ? <p className="text-sm text-[var(--muted-strong)]">Loading tickets...</p> : null}
              {!isLoading && tickets.length ? tickets.map((ticket) => (
                <button
                  key={ticket.id}
                  type="button"
                  onClick={() => setSelectedTicketId(ticket.id)}
                  className={`rounded-lg border p-4 text-left transition ${selectedTicket?.id === ticket.id ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-[var(--border)] bg-[var(--panel-soft)] hover:border-[var(--accent)]'}`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge value={ticket.status} />
                    <span className="rounded-full border border-[var(--border)] px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-[var(--muted-strong)]">{humanize(ticket.category)}</span>
                  </div>
                  <p className="mt-3 font-black text-[var(--text)]">{ticket.subject}</p>
                  <p className="mt-1 text-xs text-[var(--muted-strong)]">Updated {formatDate(ticket.updatedAt)}</p>
                </button>
              )) : null}
              {!isLoading && !tickets.length ? <p className="rounded-lg border border-[var(--border)] p-5 text-center text-sm text-[var(--muted-strong)]">No support tickets yet.</p> : null}
            </div>
          </section>
        </div>

        {selectedTicket ? (
          <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge value={selectedTicket.status} />
                  <StatusBadge value={selectedTicket.priority} />
                </div>
                <h2 className="mt-3 text-xl font-black text-[var(--text)]">{selectedTicket.subject}</h2>
                <p className="mt-1 text-xs text-[var(--muted-strong)]">Created {formatDate(selectedTicket.createdAt)}</p>
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              {(selectedDetail?.messages || []).map((item) => (
                <article key={item.id} className={`rounded-lg border p-4 ${item.senderRole === 'admin' ? 'border-emerald-500/25 bg-emerald-500/10' : 'border-[var(--border)] bg-[var(--panel-soft)]'}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--muted)]">{item.senderRole === 'admin' ? 'Admin' : 'You'}</p>
                    <time className="text-xs font-semibold text-[var(--muted-strong)]">{formatDate(item.createdAt)}</time>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--text)]">{item.message}</p>
                </article>
              ))}
            </div>
            {selectedTicket.status !== 'closed' ? (
              <form className="mt-5 grid gap-3" onSubmit={submitReply}>
                <textarea className="app-input min-h-28" value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Add a reply for admin support" />
                <button type="submit" className="app-button w-fit" disabled={busy === 'reply'}>Send reply</button>
              </form>
            ) : null}
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}
