import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

function initials(name) {
  return String(name || 'A').trim().charAt(0).toUpperCase() || 'A';
}

export default function UserListModal({ isOpen, onClose, title, fetchData, emptyMessage = 'No users found.' }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    
    let mounted = true;
    setLoading(true);
    setError(null);
    
    fetchData()
      .then(data => {
        if (mounted) setUsers(data || []);
      })
      .catch(err => {
        console.error(err);
        if (mounted) setError('Failed to load users.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
      
    return () => { mounted = false; };
  }, [isOpen, fetchData]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal Card */}
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--panel)] shadow-2xl animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4 bg-[var(--panel-soft)]/50 backdrop-blur">
          <h2 className="text-xl font-black text-[var(--text)]">{title}</h2>
          <button 
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[var(--panel)] transition-colors text-[var(--muted-strong)] hover:text-[var(--text)]"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Content Area */}
        <div className="max-h-[60vh] overflow-y-auto p-4 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-[var(--muted-strong)]">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--border)] border-t-[var(--accent)]" />
              <p className="mt-4 text-sm font-semibold animate-pulse">Loading {title.toLowerCase()}...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--warning-soft)] text-[var(--warning-text)]">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-sm font-bold text-[var(--text)]">{error}</p>
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center text-[var(--muted-strong)]">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-[var(--border)] bg-[var(--panel-soft)]">
                <svg className="h-6 w-6 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <p className="text-sm font-bold">{emptyMessage}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {users.map(user => (
                <div key={user.id} className="flex items-center gap-4 rounded-2xl border border-transparent p-3 transition-colors hover:bg-[var(--panel-soft)] hover:border-[var(--border)] group">
                  <Link to={`/u/${user.username}`} className="shrink-0 relative" onClick={onClose}>
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.name} className="h-12 w-12 rounded-full object-cover border-2 border-transparent group-hover:border-[var(--accent)] transition-colors shadow-sm" />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-strong)] text-lg font-black text-white shadow-sm">
                        {initials(user.name || user.username)}
                      </div>
                    )}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link to={`/u/${user.username}`} className="block truncate text-sm font-bold text-[var(--text)] hover:text-[var(--accent)] transition-colors" onClick={onClose}>
                      {user.name || user.username}
                    </Link>
                    {user.headline && (
                      <p className="truncate text-xs font-medium text-[var(--muted-strong)] mt-0.5">
                        {user.headline}
                      </p>
                    )}
                  </div>
                  <Link 
                    to={`/u/${user.username}`}
                    className="shrink-0 rounded-full bg-[var(--panel)] border border-[var(--border)] px-4 py-1.5 text-xs font-bold text-[var(--text)] transition-all hover:bg-[var(--panel-soft)] hover:border-[var(--muted-strong)] shadow-sm"
                    onClick={onClose}
                  >
                    View
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
