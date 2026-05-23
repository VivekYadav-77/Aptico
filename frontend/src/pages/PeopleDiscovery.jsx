import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '../components/AppShell.jsx';
import { getConnectionStatus, searchPeople, sendConnectionRequest } from '../api/socialApi.js';

// Generate dynamic, beautiful neon colors based on the username hash
function getAvatarColor(username) {
  let hash = 0;
  const str = username || 'A';
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    'from-emerald-400 to-teal-500 text-teal-950',
    'from-rose-400 to-pink-500 text-rose-950',
    'from-amber-400 to-orange-500 text-amber-950',
    'from-indigo-400 to-blue-500 text-indigo-950',
    'from-purple-400 to-fuchsia-500 text-purple-950',
    'from-cyan-400 to-sky-500 text-cyan-950',
  ];
  return colors[Math.abs(hash) % colors.length];
}

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
    <article className="group relative overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--panel)] p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
      {/* Background glow effect on hover */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[var(--accent)]/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" />
      
      <div className="relative z-10 flex items-start gap-4">
        <div className="relative shrink-0">
          {person.avatar_url ? (
            <img src={person.avatar_url} alt="" className="h-16 w-16 rounded-full object-cover ring-2 ring-[var(--panel-strong)] group-hover:ring-[var(--accent)]/50 transition-all duration-300 shadow-xl" />
          ) : (
            <div className={`flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br ${getAvatarColor(person.username)} text-xl font-black ring-2 ring-[var(--panel-strong)] group-hover:ring-[var(--accent)]/50 transition-all duration-300 shadow-xl`}>
              {initials(person.name || person.username)}
            </div>
          )}
          {status === 'connected' && (
            <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--panel)]">
              <span className="material-symbols-outlined text-[14px] text-[var(--accent-strong)]">check_circle</span>
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-black text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">{person.name || person.username}</h2>
          <p className="truncate text-sm font-semibold text-[var(--muted-strong)]">{person.headline || 'Career builder'}</p>
          {person.location ? (
            <p className="mt-1 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
              <span className="material-symbols-outlined text-[12px]">location_on</span>
              {person.location}
            </p>
          ) : null}
        </div>
      </div>
      
      {person.skills?.length ? (
        <div className="relative z-10 mt-5 flex flex-wrap gap-2">
          {person.skills.slice(0, 3).map((skill) => (
            <span key={skill} className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--panel-soft)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--muted-strong)] transition-all hover:border-[var(--accent)]/50 hover:text-[var(--text)] hover:shadow-[0_0_15px_rgba(78,222,163,0.15)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]/50 mr-1.5" />
              {skill}
            </span>
          ))}
          {person.skills.length > 3 ? (
            <span className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--panel-soft)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--muted-strong)]">
              +{person.skills.length - 3}
            </span>
          ) : null}
        </div>
      ) : null}
      
      <div className="relative z-10 mt-6 flex gap-3">
        <button 
          type="button" 
          className={status === 'not_connected' ? 'app-button flex-1 text-sm py-2' : 'app-button-secondary flex-1 text-sm py-2'} 
          disabled={status !== 'not_connected' || sending} 
          onClick={connect}
        >
          {buttonLabel}
        </button>
        <Link to={`/u/${person.username}`} className="app-button-secondary flex-1 text-sm py-2 flex items-center justify-center gap-1">
          Profile
          <span className="material-symbols-outlined text-[16px] transition-transform group-hover:translate-x-0.5">arrow_forward</span>
        </Link>
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
  const [isFocused, setIsFocused] = useState(false);

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
        
        {/* Premium Search Hub Hero */}
        <div className="relative mb-12 overflow-hidden rounded-[2.5rem] border border-[var(--border)] bg-[var(--panel)] p-8 sm:p-12 shadow-2xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(78,222,163,0.08),transparent_50%)] pointer-events-none" />
          
          <div className="relative z-10 mx-auto max-w-2xl text-center">
            <h1 className="mb-4 text-3xl sm:text-4xl font-black tracking-tight text-[var(--text)] drop-shadow-md">
              Discover <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent)] to-[#71a1ff]">Your Network</span>
            </h1>
            <p className="mb-8 text-sm sm:text-base text-[var(--muted-strong)]">
              Find and connect with peers targeting the same roles and building similar skill sets.
            </p>
            
            <form onSubmit={handleSearch} className="relative mx-auto max-w-xl group">
              <div className={`absolute -inset-1 rounded-full bg-gradient-to-r from-[var(--accent)] to-[#71a1ff] opacity-20 blur-md transition-opacity duration-500 pointer-events-none ${isFocused ? 'opacity-40' : 'opacity-0 group-hover:opacity-20'}`} />
              <div className="relative flex items-center overflow-hidden rounded-full border border-[var(--border)] bg-[var(--panel-strong)] p-1.5 shadow-inner transition-all focus-within:border-[var(--accent)]">
                <span className="material-symbols-outlined ml-4 text-[var(--muted)]">search</span>
                <input
                  className="flex-1 bg-transparent px-4 py-3 text-sm font-semibold text-[var(--text)] outline-none placeholder:text-[var(--muted-strong)]"
                  placeholder="Search by name, role, or skill..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="mr-1 flex items-center justify-center rounded-full bg-[var(--accent)] px-6 py-3 text-xs font-black uppercase tracking-widest text-[#003824] transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                >
                  Search
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="app-kicker text-sm">{searchedQuery.trim() ? 'Search Results' : 'Suggested Connections'}</h2>
          <div className="flex items-center gap-2">
            {loading && <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent)] animate-pulse">Syncing...</span>}
          </div>
        </div>

        {/* Error State */}
        {error ? (
          <div className="mb-8 rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-400 shadow-xl flex items-center gap-3">
            <span className="material-symbols-outlined text-red-400">error</span>
            {error}
          </div>
        ) : null}

        {/* Grid Area */}
        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="rounded-[2rem] border border-[var(--border)] bg-[var(--panel)] p-6 shadow-xl animate-pulse">
                <div className="flex items-start gap-4 mb-6">
                  <div className="h-16 w-16 shrink-0 rounded-full bg-[var(--panel-strong)]" />
                  <div className="flex-1 space-y-3 py-1">
                    <div className="h-4 w-3/4 rounded bg-[var(--panel-strong)]" />
                    <div className="h-3 w-1/2 rounded bg-[var(--panel-strong)]" />
                  </div>
                </div>
                <div className="flex gap-2 mb-6">
                  <div className="h-6 w-16 rounded-lg bg-[var(--panel-strong)]" />
                  <div className="h-6 w-20 rounded-lg bg-[var(--panel-strong)]" />
                </div>
                <div className="flex gap-3">
                  <div className="h-10 flex-1 rounded-xl bg-[var(--panel-strong)]" />
                  <div className="h-10 flex-1 rounded-xl bg-[var(--panel-strong)]" />
                </div>
              </div>
            ))}
          </div>
        ) : people.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {people.map((person) => <PersonCard key={person.username} person={person} />)}
          </div>
        ) : !error ? (
          <div className="flex flex-col items-center justify-center rounded-[2rem] border border-[var(--border)] bg-[var(--panel)] py-20 px-4 text-center shadow-xl">
            <div className="relative mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-[var(--panel-soft)]">
              <span className="material-symbols-outlined text-5xl text-[var(--muted)] opacity-50">person_search</span>
              <div className="absolute inset-0 rounded-full border border-[var(--border)] animate-ping opacity-20" style={{ animationDuration: '3s' }} />
            </div>
            <h3 className="mb-2 text-lg font-black text-[var(--text)]">No Telemetry Found</h3>
            <p className="max-w-md text-sm text-[var(--muted-strong)]">
              We couldn't find anyone matching your exact search parameters. Try adjusting your keywords or clearing your filters.
            </p>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
