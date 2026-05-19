import React, { useState, useRef, useCallback } from 'react';

/* ───── helpers ───── */
function normalizeUrl(u) { return u && !u.startsWith('http') ? `https://${u}` : u || ''; }
function strip(u) { return (u || '').replace(/^https?:\/\//, ''); }

function useResumeData(profile, educationEntries) {
  const es = profile.enriched_settings || profile;
  const fullName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Your Name';
  const contact = [profile.email, profile.phone, profile.location].filter(Boolean);
  const links = [
    profile.linkedin ? `LinkedIn: ${strip(profile.linkedin)}` : null,
    profile.github ? `GitHub: ${strip(profile.github)}` : null,
    profile.portfolio ? `Portfolio: ${strip(profile.portfolio)}` : null,
  ].filter(Boolean);
  const experiences = (es.experiences || []).length ? es.experiences
    : profile.currentCompany ? [{ title: profile.currentTitle, company: profile.currentCompany, endDate: 'Present', description: profile.achievements?.join('. ') || '' }] : [];
  const education = educationEntries?.length ? educationEntries
    : profile.school ? [{ school: profile.school, degree: profile.degree, field: profile.fieldOfStudy, endYear: profile.graduationYear }] : [];
  const skills = [...new Set([...(es.topSkills || []), ...(es.tools || []), ...(es.languages || [])])];
  const licenses = es.licenses || [];
  const awards = es.honorsAwards || [];
  const bio = es.bio || profile.bio || '';
  return { fullName, contact, links, experiences, education, skills, licenses, awards, bio };
}

/* ─────────────────────────────────────────────
   TEMPLATE 1 — EXECUTIVE (ATS Classic)
   ───────────────────────────────────────────── */
function ExecutiveTemplate({ data }) {
  const s = {
    page: { fontFamily: 'Arial, Helvetica, sans-serif', color: '#222', fontSize: '11pt', lineHeight: '1.45', padding: '40px 48px', maxWidth: '800px', margin: '0 auto', background: '#fff' },
    header: { background: '#1e293b', color: '#fff', margin: '-40px -48px 24px', padding: '32px 48px' },
    name: { fontSize: '22pt', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 },
    contactRow: { marginTop: 8, fontSize: '9.5pt', color: '#cbd5e1', display: 'flex', flexWrap: 'wrap', gap: '6px 14px' },
    sectionTitle: { fontSize: '11pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '2px solid #1e293b', paddingBottom: 4, marginTop: 22, marginBottom: 10, color: '#1e293b' },
    expTitle: { fontWeight: 700, fontSize: '11.5pt', margin: 0 },
    expMeta: { display: 'flex', justifyContent: 'space-between', marginBottom: 4 },
    expCompany: { fontStyle: 'italic', margin: 0, fontSize: '11pt', color: '#444' },
    text: { margin: '0 0 4px', fontSize: '11pt', color: '#333' },
    bullet: { margin: '0 0 3px', paddingLeft: 4, fontSize: '11pt', color: '#333' },
    skillPill: { display: 'inline-block', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 4, padding: '2px 8px', fontSize: '9.5pt', marginRight: 6, marginBottom: 5 },
  };

  return (
    <div style={s.page}>
      <header style={s.header}>
        <h1 style={s.name}>{data.fullName}</h1>
        <div style={s.contactRow}>
          {[...data.contact, ...data.links].map((c, i) => <span key={i}>{c}</span>)}
        </div>
      </header>

      {data.bio && (<><h2 style={s.sectionTitle}>Professional Summary</h2><p style={s.text}>{data.bio}</p></>)}

      {data.experiences.length > 0 && (
        <><h2 style={s.sectionTitle}>Professional Experience</h2>
          {data.experiences.map((exp, i) => (
            <div key={i} style={{ marginBottom: 16 }}>
              <div style={s.expMeta}>
                <h3 style={s.expTitle}>{exp.title || 'Role'}</h3>
                <span style={{ fontSize: '10pt', whiteSpace: 'nowrap' }}>{[exp.startDate, exp.isCurrent ? 'Present' : exp.endDate].filter(Boolean).join(' – ')}</span>
              </div>
              <p style={s.expCompany}>{exp.company}</p>
              {exp.description && exp.description.split('\n').filter(l => l.trim()).map((line, j) => (
                <p key={j} style={s.bullet}>• {line.trim().replace(/^•\s*/, '')}</p>
              ))}
            </div>
          ))}
        </>
      )}

      {data.skills.length > 0 && (
        <><h2 style={s.sectionTitle}>Skills &amp; Expertise</h2>
          <div>{data.skills.map((sk, i) => <span key={i} style={s.skillPill}>{sk}</span>)}</div>
        </>
      )}

      {data.education.length > 0 && (
        <><h2 style={s.sectionTitle}>Education</h2>
          {data.education.map((ed, i) => (
            <div key={i} style={{ marginBottom: 10, display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ ...s.expTitle, fontSize: '11pt' }}>{ed.school || 'Institution'}</h3>
                <p style={{ ...s.expCompany, margin: 0 }}>{[ed.degree, ed.field].filter(Boolean).join(' in ')}</p>
              </div>
              <span style={{ fontSize: '10pt', whiteSpace: 'nowrap' }}>{[ed.startYear, ed.endYear].filter(Boolean).join(' – ')}</span>
            </div>
          ))}
        </>
      )}

      {data.licenses.length > 0 && (
        <><h2 style={s.sectionTitle}>Certifications</h2>
          {data.licenses.map((l, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <div style={s.expMeta}><h3 style={{ ...s.expTitle, fontSize: '11pt' }}>{l.name}</h3><span style={{ fontSize: '10pt' }}>{l.issueDate}</span></div>
              {l.issuingOrg && <p style={{ ...s.expCompany, margin: 0 }}>{l.issuingOrg}</p>}
            </div>
          ))}
        </>
      )}

      {data.awards.length > 0 && (
        <><h2 style={s.sectionTitle}>Honors &amp; Awards</h2>
          {data.awards.map((a, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <div style={s.expMeta}><h3 style={{ ...s.expTitle, fontSize: '11pt' }}>{a.title}</h3><span style={{ fontSize: '10pt' }}>{a.date}</span></div>
              {a.issuer && <p style={{ ...s.expCompany, margin: 0 }}>{a.issuer}</p>}
              {a.description && <p style={s.text}>{a.description}</p>}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   TEMPLATE 2 — MODERN (Two-Column)
   ───────────────────────────────────────────── */
function ModernTemplate({ data }) {
  const accent = '#0d9488';
  const s = {
    page: { fontFamily: "'Segoe UI', system-ui, sans-serif", fontSize: '10.5pt', color: '#1e293b', display: 'flex', minHeight: '100%', background: '#fff' },
    sidebar: { width: '32%', background: '#0f172a', color: '#e2e8f0', padding: '36px 24px', flexShrink: 0 },
    main: { flex: 1, padding: '36px 32px' },
    sidebarName: { fontSize: '18pt', fontWeight: 800, color: '#fff', marginBottom: 4 },
    sidebarHeadline: { fontSize: '10pt', color: accent, fontWeight: 600, marginBottom: 20 },
    sideLabel: { fontSize: '8.5pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: accent, marginTop: 20, marginBottom: 8 },
    sideItem: { fontSize: '9.5pt', color: '#cbd5e1', marginBottom: 5, wordBreak: 'break-word' },
    sideSkill: { display: 'inline-block', background: 'rgba(13,148,136,0.15)', border: '1px solid rgba(13,148,136,0.3)', borderRadius: 4, padding: '2px 8px', fontSize: '9pt', color: '#5eead4', marginRight: 5, marginBottom: 5 },
    mainSection: { fontSize: '10.5pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: accent, borderBottom: `2px solid ${accent}`, paddingBottom: 4, marginTop: 22, marginBottom: 12 },
    entryTitle: { fontWeight: 700, fontSize: '11pt', margin: 0, color: '#0f172a' },
    entryMeta: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 },
    entryCompany: { fontSize: '10pt', color: '#475569', fontWeight: 600, margin: 0 },
    text: { fontSize: '10.5pt', color: '#334155', margin: '0 0 4px', lineHeight: 1.5 },
  };

  return (
    <div style={s.page}>
      <aside style={s.sidebar}>
        <h1 style={s.sidebarName}>{data.fullName}</h1>
        <p style={s.sidebarHeadline}>Professional Profile</p>

        {data.contact.length > 0 && (<><p style={s.sideLabel}>Contact</p>{data.contact.map((c, i) => <p key={i} style={s.sideItem}>{c}</p>)}</>)}
        {data.links.length > 0 && (<><p style={s.sideLabel}>Links</p>{data.links.map((l, i) => <p key={i} style={s.sideItem}>{l}</p>)}</>)}

        {data.skills.length > 0 && (
          <><p style={s.sideLabel}>Skills</p><div>{data.skills.map((sk, i) => <span key={i} style={s.sideSkill}>{sk}</span>)}</div></>
        )}

        {data.education.length > 0 && (
          <><p style={s.sideLabel}>Education</p>
            {data.education.map((ed, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <p style={{ ...s.sideItem, fontWeight: 700, color: '#fff', marginBottom: 2 }}>{ed.school}</p>
                <p style={s.sideItem}>{[ed.degree, ed.field].filter(Boolean).join(' in ')}</p>
                <p style={{ ...s.sideItem, fontSize: '9pt', color: '#94a3b8' }}>{[ed.startYear, ed.endYear].filter(Boolean).join(' – ')}</p>
              </div>
            ))}
          </>
        )}
      </aside>

      <main style={s.main}>
        {data.bio && (<><h2 style={s.mainSection}>Summary</h2><p style={s.text}>{data.bio}</p></>)}

        {data.experiences.length > 0 && (
          <><h2 style={s.mainSection}>Experience</h2>
            {data.experiences.map((exp, i) => (
              <div key={i} style={{ marginBottom: 16 }}>
                <div style={s.entryMeta}>
                  <h3 style={s.entryTitle}>{exp.title}</h3>
                  <span style={{ fontSize: '9.5pt', color: '#64748b', whiteSpace: 'nowrap' }}>{[exp.startDate, exp.isCurrent ? 'Present' : exp.endDate].filter(Boolean).join(' – ')}</span>
                </div>
                <p style={s.entryCompany}>{exp.company}</p>
                {exp.description && exp.description.split('\n').filter(l => l.trim()).map((line, j) => (
                  <p key={j} style={{ ...s.text, paddingLeft: 4 }}>• {line.trim().replace(/^•\s*/, '')}</p>
                ))}
              </div>
            ))}
          </>
        )}

        {data.licenses.length > 0 && (
          <><h2 style={s.mainSection}>Certifications</h2>
            {data.licenses.map((l, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <div style={s.entryMeta}><h3 style={{ ...s.entryTitle, fontSize: '10.5pt' }}>{l.name}</h3><span style={{ fontSize: '9.5pt', color: '#64748b' }}>{l.issueDate}</span></div>
                {l.issuingOrg && <p style={s.entryCompany}>{l.issuingOrg}</p>}
              </div>
            ))}
          </>
        )}

        {data.awards.length > 0 && (
          <><h2 style={s.mainSection}>Awards</h2>
            {data.awards.map((a, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <h3 style={{ ...s.entryTitle, fontSize: '10.5pt' }}>{a.title} {a.issuer ? `— ${a.issuer}` : ''}</h3>
                {a.description && <p style={s.text}>{a.description}</p>}
              </div>
            ))}
          </>
        )}
      </main>
    </div>
  );
}

/* ─────────────────────────────────────────────
   TEMPLATE 3 — MINIMAL (Swiss Clean)
   ───────────────────────────────────────────── */
function MinimalTemplate({ data }) {
  const s = {
    page: { fontFamily: 'Georgia, "Times New Roman", serif', fontSize: '11pt', color: '#111', padding: '44px 52px', maxWidth: '800px', margin: '0 auto', background: '#fff', lineHeight: 1.55 },
    name: { fontSize: '26pt', fontWeight: 400, letterSpacing: '-0.01em', margin: '0 0 6px', color: '#000' },
    contactRow: { display: 'flex', flexWrap: 'wrap', gap: '4px 16px', fontSize: '9.5pt', color: '#555', marginBottom: 6 },
    hr: { border: 'none', borderTop: '1px solid #d1d5db', margin: '18px 0 14px' },
    sectionTitle: { fontSize: '10pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#000', marginBottom: 10, marginTop: 0 },
    entryWrap: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 },
    entryTitle: { fontWeight: 700, fontSize: '11pt', margin: 0 },
    entryCompany: { fontStyle: 'italic', color: '#444', margin: '0 0 3px', fontSize: '10.5pt' },
    dateTxt: { fontSize: '10pt', color: '#666', whiteSpace: 'nowrap', fontStyle: 'italic' },
    text: { fontSize: '10.5pt', color: '#333', margin: '0 0 4px' },
    skillText: { fontSize: '10.5pt', color: '#333' },
  };

  return (
    <div style={s.page}>
      <h1 style={s.name}>{data.fullName}</h1>
      <div style={s.contactRow}>
        {[...data.contact, ...data.links].map((c, i) => <span key={i}>{c}</span>)}
      </div>

      {data.bio && (<><hr style={s.hr} /><h2 style={s.sectionTitle}>Profile</h2><p style={s.text}>{data.bio}</p></>)}

      {data.experiences.length > 0 && (
        <><hr style={s.hr} /><h2 style={s.sectionTitle}>Experience</h2>
          {data.experiences.map((exp, i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              <div style={s.entryWrap}>
                <h3 style={s.entryTitle}>{exp.title}</h3>
                <span style={s.dateTxt}>{[exp.startDate, exp.isCurrent ? 'Present' : exp.endDate].filter(Boolean).join(' – ')}</span>
              </div>
              <p style={s.entryCompany}>{exp.company}</p>
              {exp.description && exp.description.split('\n').filter(l => l.trim()).map((line, j) => (
                <p key={j} style={{ ...s.text, paddingLeft: 4 }}>• {line.trim().replace(/^•\s*/, '')}</p>
              ))}
            </div>
          ))}
        </>
      )}

      {data.skills.length > 0 && (<><hr style={s.hr} /><h2 style={s.sectionTitle}>Skills</h2><p style={s.skillText}>{data.skills.join('  ·  ')}</p></>)}

      {data.education.length > 0 && (
        <><hr style={s.hr} /><h2 style={s.sectionTitle}>Education</h2>
          {data.education.map((ed, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={s.entryWrap}>
                <h3 style={{ ...s.entryTitle, fontSize: '11pt' }}>{ed.school}</h3>
                <span style={s.dateTxt}>{[ed.startYear, ed.endYear].filter(Boolean).join(' – ')}</span>
              </div>
              <p style={s.entryCompany}>{[ed.degree, ed.field].filter(Boolean).join(' in ')}</p>
            </div>
          ))}
        </>
      )}

      {data.licenses.length > 0 && (
        <><hr style={s.hr} /><h2 style={s.sectionTitle}>Certifications</h2>
          {data.licenses.map((l, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <div style={s.entryWrap}><h3 style={{ ...s.entryTitle, fontSize: '10.5pt' }}>{l.name}</h3><span style={s.dateTxt}>{l.issueDate}</span></div>
              {l.issuingOrg && <p style={s.entryCompany}>{l.issuingOrg}</p>}
            </div>
          ))}
        </>
      )}

      {data.awards.length > 0 && (
        <><hr style={s.hr} /><h2 style={s.sectionTitle}>Honors &amp; Awards</h2>
          {data.awards.map((a, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <div style={s.entryWrap}><h3 style={{ ...s.entryTitle, fontSize: '10.5pt' }}>{a.title}</h3><span style={s.dateTxt}>{a.date}</span></div>
              {a.issuer && <p style={s.entryCompany}>{a.issuer}</p>}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   TEMPLATE CONFIG
   ───────────────────────────────────────────── */
const TEMPLATES = [
  { id: 'executive', label: 'Executive', desc: 'ATS-classic single column with navy header', icon: 'description', Component: ExecutiveTemplate },
  { id: 'modern', label: 'Modern', desc: 'Two-column layout with teal sidebar', icon: 'dashboard', Component: ModernTemplate },
  { id: 'minimal', label: 'Minimal', desc: 'Swiss-clean serif with generous whitespace', icon: 'article', Component: MinimalTemplate },
];

/* ─────────────────────────────────────────────
   MAIN MODAL
   ───────────────────────────────────────────── */
export default function ResumeBuilderModal({ open, onClose, profile, educationEntries }) {
  const [selectedId, setSelectedId] = useState('executive');
  const [downloading, setDownloading] = useState(false);
  const previewRef = useRef(null);

  const data = useResumeData(profile, educationEntries);
  const selected = TEMPLATES.find(t => t.id === selectedId);

  const handleDownload = useCallback(async () => {
    if (!previewRef.current || downloading) return;
    setDownloading(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const el = previewRef.current;
      const opt = {
        margin: 0,
        filename: `${data.fullName.replace(/\s+/g, '_')}_Resume.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      };
      await html2pdf().set(opt).from(el).save();
    } catch (err) {
      console.error('PDF generation failed:', err);
    } finally {
      setDownloading(false);
    }
  }, [data.fullName, downloading]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[300] flex flex-col bg-black/60 backdrop-blur-md animate-fade-in">
      {/* ── Top bar ── */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--panel)]/95 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)]/20">
            <span className="material-symbols-outlined text-[18px] text-[var(--accent-strong)]">description</span>
          </span>
          <h2 className="text-lg font-black tracking-tight text-[var(--text)]">Resume Builder</h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="app-button flex items-center gap-2 shadow-lg shadow-[var(--accent)]/20 disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[18px]">{downloading ? 'progress_activity' : 'download'}</span>
            {downloading ? 'Generating...' : 'Download PDF'}
          </button>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-[var(--panel-strong)] transition text-[var(--muted-strong)] hover:text-[var(--text)]">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — template selector */}
        <aside className="w-[280px] shrink-0 border-r border-[var(--border)] bg-[var(--panel)]/80 backdrop-blur-xl overflow-y-auto p-5 space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted)] mb-2">Choose Template</p>
          {TEMPLATES.map(t => (
            <button
              key={t.id}
              onClick={() => setSelectedId(t.id)}
              className={`w-full rounded-2xl border p-4 text-left transition-all ${
                selectedId === t.id
                  ? 'border-[var(--accent)]/50 bg-[var(--accent-soft)] shadow-[0_4px_20px_rgba(78,222,163,0.1)] ring-1 ring-[var(--accent)]'
                  : 'border-[var(--border)] bg-[var(--panel)] hover:border-[var(--accent)]/30 hover:bg-[var(--panel-soft)]'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${selectedId === t.id ? 'bg-[var(--accent)]/20' : 'bg-[var(--panel-soft)]'}`}>
                  <span className={`material-symbols-outlined text-[16px] ${selectedId === t.id ? 'text-[var(--accent-strong)]' : 'text-[var(--muted)]'}`}>{t.icon}</span>
                </span>
                <span className="text-sm font-black text-[var(--text)]">{t.label}</span>
              </div>
              <p className="text-xs font-medium text-[var(--muted-strong)] leading-relaxed">{t.desc}</p>
            </button>
          ))}
        </aside>

        {/* Preview area */}
        <div className="flex-1 overflow-auto bg-[var(--panel-strong)]/50 p-8 flex justify-center">
          <div className="w-[210mm] min-h-[297mm] bg-white shadow-2xl rounded-lg overflow-hidden" style={{ transform: 'scale(0.72)', transformOrigin: 'top center' }}>
            <div ref={previewRef}>
              <selected.Component data={data} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
