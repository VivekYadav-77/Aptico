export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  tone = 'danger',
  loading = false,
  onCancel,
  onConfirm
}) {
  if (!open) {
    return null;
  }

  const isDanger = tone === 'danger';

  return (
    <div className="fixed inset-0 z-[260] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--panel)] shadow-[0_24px_70px_rgba(0,0,0,0.45)]">
        <div className={`h-1.5 w-full ${isDanger ? 'bg-red-500' : 'bg-[var(--accent)]'}`} />
        <div className="p-7">
          <div className="flex items-start gap-4">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${isDanger ? 'bg-red-500/10 text-red-500' : 'bg-[var(--accent-soft)] text-[var(--accent-strong)]'}`}>
              <span className="material-symbols-outlined text-[22px]">{isDanger ? 'delete' : 'help'}</span>
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-black tracking-tight text-[var(--text)]">{title}</h2>
              <p className="mt-2 text-sm font-medium leading-6 text-[var(--muted-strong)]">{description}</p>
            </div>
          </div>

          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="app-button-secondary justify-center px-5 py-3"
              onClick={onCancel}
              disabled={loading}
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-black uppercase tracking-widest transition-all disabled:cursor-not-allowed disabled:opacity-70 ${
                isDanger
                  ? 'bg-red-500 text-white shadow-[0_10px_30px_rgba(239,68,68,0.25)] hover:bg-red-600'
                  : 'bg-[var(--accent)] text-[#003824] shadow-[0_10px_30px_rgba(78,222,163,0.25)] hover:brightness-105'
              }`}
              onClick={onConfirm}
              disabled={loading}
            >
              <span className="material-symbols-outlined text-[18px]">{isDanger ? 'delete' : 'check'}</span>
              {loading ? 'Working...' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
