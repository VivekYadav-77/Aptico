import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '../components/AppShell.jsx';
import { getConnectionStatus, searchPeople, sendConnectionRequest } from '../api/socialApi.js';

function initials(name) {
  return String(name || 'A').trim().charAt(0).toUpperCase() || 'A';
}

function PersonCard({ person }) {
  const [status, setStatus] = useState('not_connected');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    getConnectionStatus(person.username).then((data) => setStatus(data.status)).catch(() => setStatus('not_connected'));
  }, [person.username]);

  async function connect() {
    setSending(true);
    try {
      await sendConnectionRequest(person.username, '');
      setStatus('pending_sent');
    } finally {
      setSending(false);
    }
  }

  const buttonLabel = {
    self: 'You',
    connected: 'Connected',
    pending_sent: 'Pending',
    pending_received: 'Respond',
    not_connected: sending ? 'Sending...' : 'Connect'
  }[status] || 'Connect';

  return (
    <article className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5">
      <div className="flex items-start gap-4">
        {person.avatar_url ? (
          <img src={person.avatar_url} alt="" className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent)] text-xl font-black text-[#003824]">{initials(person.name || person.username)}</div>
        )}
        <div className="min-w-0">
          <h2 className="truncate text-lg font-black text-[var(--text)]">{person.name || person.username}</h2>
          <p className="truncate text-sm text-[var(--muted-strong)]">{person.headline || 'Career builder'}</p>
          {person.location ? <p className="mt-1 text-xs text-[var(--muted)]">{person.location}</p> : null}
        </div>
      </div>
      {person.skills?.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {person.skills.slice(0, 3).map((skill) => <span key={skill} className="app-chip">{skill}</span>)}
          {person.skills.length > 3 ? <span className="app-chip">+{person.skills.length - 3} more</span> : null}
        </div>
      ) : null}
      <div className="mt-5 flex gap-2">
        <button type="button" className={status === 'not_connected' ? 'app-button flex-1' : 'app-button-secondary flex-1'} disabled={status !== 'not_connected' || sending} onClick={connect}>
          {buttonLabel}
        </button>
        <Link to={`/u/${person.username}`} className="app-button-secondary flex-1">View Profile</Link>
      </div>
    </article>
  );
}

export default function PeopleDiscovery() {
  const [query, setQuery] = useState('');
  const [searchedQuery, setSearchedQuery] = useState('');
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchPeople = (searchTerm) => {
    const q = searchTerm.trim();

    if (q.length === 1) {
      setPeople([]);
      setLoading(false);
      setError('');
      return;
    }

    setLoading(true);
    setError('');

    searchPeople(q.length >= 2 ? { q } : {})
      .then((results) => {
        setPeople(Array.isArray(results) ? results : []);
      })
      .catch((err) => {
        console.error('People search failed:', err);
        setPeople([]);
        setError(err?.response?.data?.error || err?.message || 'Search failed. Please try again.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPeople('');
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchedQuery(query);
    fetchPeople(query);
  };

  return (
    <AppShell title="People" description="Find people who are learning, applying, and growing in the same career lanes.">
      <div className="mx-auto max-w-6xl">
        <form onSubmit={handleSearch} className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4">
          <span className="app-field-label">Search people</span>
          <div className="mt-2 flex gap-3">
            <input className="app-input flex-1" placeholder="Search by name, role, or skill" value={query} onChange={(event) => setQuery(event.target.value)} />
            <button type="submit" className="app-button" disabled={loading}>
              Search
            </button>
          </div>
        </form>
        <h2 className="mt-8 text-2xl font-black text-[var(--text)]">{searchedQuery.trim() ? 'Search Results' : 'Suggested People'}</h2>
        {loading ? <p className="mt-5 text-sm text-[var(--muted-strong)]">Finding people...</p> : null}
        {error ? <p className="mt-5 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">{error}</p> : null}
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {people.map((person) => <PersonCard key={person.username} person={person} />)}
        </div>
        {!loading && !error && !people.length ? <p className="mt-5 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-8 text-center text-sm text-[var(--muted-strong)]">No people found yet.</p> : null}
      </div>
    </AppShell>
  );
}

