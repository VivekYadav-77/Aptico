import React, { useEffect } from 'react';

function normalizeUrl(url) {
  if (!url) return '';
  return url.startsWith('http') ? url : `https://${url}`;
}

export default function TopProjectDetailsModal({ project, onClose }) {
  useEffect(() => {
    if (!project) return undefined;

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [project, onClose]);

  if (!project) return null;

  const links = [
    project.githubUrl ? { label: 'GitHub', url: project.githubUrl } : null,
    project.liveUrl ? { label: 'Live Demo', url: project.liveUrl } : null
  ].filter(Boolean);

  return (
    <div className="fixed inset-0 z-[240] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-fade-in" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="top-project-dialog-title"
        className="relative w-full max-w-xl overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--panel)] p-6 shadow-2xl sm:p-7"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close project details"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--panel-soft)] text-[var(--muted-strong)] transition-colors hover:bg-[var(--panel-strong)] hover:text-[var(--text)]"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>

        <div className="flex items-start gap-3 pr-10">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#14b8a6]/20 bg-[#14b8a6]/10 text-[#14b8a6]">
            <span className="material-symbols-outlined text-[22px]">code_blocks</span>
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#14b8a6]">Top Project</p>
            <h2 id="top-project-dialog-title" className="mt-1 break-words text-xl font-black leading-tight text-[var(--text)]">
              {project.title}
            </h2>
          </div>
        </div>

        <p className="mt-5 whitespace-pre-wrap break-words text-sm font-medium leading-7 text-[var(--muted-strong)]">
          {project.description}
        </p>

        {project.techStack?.length ? (
          <div className="mt-5 flex flex-wrap gap-2">
            {project.techStack.slice(0, 4).map((tech) => (
              <span key={tech} className="rounded-lg border border-[#14b8a6]/20 bg-[#14b8a6]/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#14b8a6]">
                {tech}
              </span>
            ))}
          </div>
        ) : null}

        {links.length ? (
          <div className="mt-6 flex flex-wrap gap-2 border-t border-[var(--border)] pt-4">
            {links.map((link) => (
              <a
                key={`${link.label}-${link.url}`}
                href={normalizeUrl(link.url)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-2 text-xs font-bold text-[var(--text)] transition-all hover:border-[#14b8a6]/50 hover:text-[#14b8a6]"
              >
                <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                <span className="truncate">{link.label}</span>
              </a>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
