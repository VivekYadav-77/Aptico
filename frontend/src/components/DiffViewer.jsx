export default function DiffViewer({ items = [] }) {
  if (!items.length) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-700 px-5 py-6 text-sm text-slate-400">
        Rewrite suggestions will appear here after analysis.
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {items.map((item, index) => (
        <article key={`${item.original}-${index}`} className="grid gap-4 rounded-3xl border border-white/10 bg-slate-950/70 p-5 lg:grid-cols-2">
          <div className="space-y-3 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4">
            <p className="text-xs uppercase tracking-[0.25em] text-rose-200">Original</p>
            <p className="text-sm leading-6 text-slate-200">{item.original}</p>
          </div>
          <div className="space-y-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <p className="text-xs uppercase tracking-[0.25em] text-emerald-200">Rewrite</p>
            <p className="text-sm leading-6 text-slate-100">{item.rewritten}</p>
            <p className="text-xs leading-5 text-slate-400">{item.reason}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
