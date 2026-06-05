import { useEffect, useRef, useState } from 'react';

export default function ContainedSelect({ value, onChange, options, className = '', buttonClassName = '' }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const selected = options.find((option) => option.value === value) || options[0];

  useEffect(() => {
    function handlePointerDown(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div ref={rootRef} className={`relative min-w-0 ${className}`}>
      <button
        type="button"
        className={`app-input flex min-h-[44px] w-full min-w-0 items-center justify-between gap-3 pr-3 text-left text-sm ${buttonClassName}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="min-w-0 truncate">{selected?.label}</span>
        <span className={`material-symbols-outlined shrink-0 text-[18px] text-[var(--muted)] transition-transform ${open ? 'rotate-180' : ''}`}>
          expand_more
        </span>
      </button>

      {open && (
        <div
          className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-50 max-h-64 w-full min-w-0 overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-1 shadow-2xl shadow-black/20"
          role="listbox"
        >
          {options.map((option) => {
            const active = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={active}
                className={`flex w-full min-w-0 items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors ${
                  active
                    ? 'bg-[var(--accent-soft)] text-[var(--accent-strong)]'
                    : 'text-[var(--text)] hover:bg-[var(--panel-soft)]'
                }`}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                <span className="min-w-0 truncate">{option.label}</span>
                {active ? <span className="material-symbols-outlined shrink-0 text-[18px]">check</span> : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
