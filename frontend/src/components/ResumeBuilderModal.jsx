import React, { useState, useRef, useCallback, useEffect } from 'react';

/* ───── helpers ───── */
function normalizeUrl(u) { return u && !u.startsWith('http') ? `https://${u}` : u || ''; }
function strip(u) { return (u || '').replace(/^https?:\/\//, ''); }

function pick(a, b) { return a?.length ? a : b?.length ? b : []; }

const projectWrapStyle = { overflowWrap: 'anywhere', wordBreak: 'break-word' };

function normalizeResumeProjects(projects) {
  if (!Array.isArray(projects)) return [];

  return projects
    .map((project) => {
      const profileDescription = String(project?.description || '').replace(/\s+/g, ' ').trim();
      const resumeDescription = String(project?.resumeDescription || '').replace(/\s+/g, ' ').trim();

      return {
        title: String(project?.title || '').trim().slice(0, 80),
        description: (resumeDescription || profileDescription).slice(0, resumeDescription ? 160 : 120),
        techStack: Array.isArray(project?.techStack)
          ? project.techStack.map((tech) => String(tech || '').trim().slice(0, 20)).filter(Boolean).slice(0, 4)
          : [],
        githubUrl: String(project?.githubUrl || '').trim().slice(0, 240),
        liveUrl: String(project?.liveUrl || '').trim().slice(0, 240)
      };
    })
    .filter((project) => project.title && project.description)
    .slice(0, 3);
}

function projectLinks(project) {
  return [
    project.githubUrl ? `GitHub: ${strip(project.githubUrl)}` : null,
    project.liveUrl ? `Live: ${strip(project.liveUrl)}` : null
  ].filter(Boolean);
}

function projectMeta(project) {
  return [
    project.techStack?.length ? project.techStack.join(', ') : null,
    ...projectLinks(project)
  ].filter(Boolean).join(' | ');
}

function projectHeading(project) {
  return [project.title, projectMeta(project)].filter(Boolean).join(' | ');
}

function useResumeData(profile, educationEntries) {
  const es = profile.enriched_settings || {};
  const fullName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Your Name';
  const headline = profile.headline || profile.currentTitle || '';
  const contact = [profile.email, profile.phone, profile.location].filter(Boolean);
  const links = [
    profile.linkedin ? `LinkedIn: ${strip(profile.linkedin)}` : null,
    profile.github ? `GitHub: ${strip(profile.github)}` : null,
    profile.portfolio ? `Portfolio: ${strip(profile.portfolio)}` : null,
  ].filter(Boolean);
  const expRaw = pick(es.experiences, profile.experiences);
  const experiences = expRaw.length ? expRaw
    : profile.currentCompany ? [{ title: profile.currentTitle, company: profile.currentCompany, endDate: 'Present', description: profile.achievements?.join('. ') || '' }] : [];
  const education = educationEntries?.length ? educationEntries
    : profile.school ? [{ school: profile.school, degree: profile.degree, field: profile.fieldOfStudy, endYear: profile.graduationYear }] : [];
  const skills = [...new Set([
    ...pick(es.topSkills, profile.topSkills),
    ...pick(es.tools, profile.tools),
    ...pick(es.languages, profile.languages),
  ])];
  const licenses = pick(es.licenses, profile.licenses);
  const awards = pick(es.honorsAwards, profile.honorsAwards);
  const bio = es.bio || profile.bio || '';
  const featured = pick(es.featured, profile.featured);
  const projects = normalizeResumeProjects(pick(es.topProjects, profile.topProjects));
  return { fullName, headline, contact, links, experiences, education, skills, licenses, awards, bio, featured, projects };
}

/* ── shared date range ── */
function dateRange(start, end, isCurrent) {
  return [start, isCurrent ? 'Present' : end].filter(Boolean).join(' \u2013 ');
}

/* ── bullet-split description lines ── */
function bulletLines(desc) {
  if (!desc) return [];
  return desc.split('\n').filter(l => l.trim()).map(l => l.trim().replace(/^•\s*/, ''));
}

/* ─────────────────────────────────────────────
   TEMPLATE 1 - EXECUTIVE (ATS Classic)
   ───────────────────────────────────────────── */
function ExecutiveTemplate({ data }) {
  const s = {
    page: { fontFamily: 'Arial, Helvetica, sans-serif', color: '#222', fontSize: '11pt', lineHeight: '1.45', padding: '40px 48px', maxWidth: '800px', margin: '0 auto', background: '#fff' },
    header: { background: '#1e293b', color: '#fff', margin: '-40px -48px 24px', padding: '32px 48px' },
    name: { fontSize: '22pt', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 },
    headline: { fontSize: '11pt', color: '#94a3b8', fontWeight: 400, margin: '4px 0 0' },
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
        {data.headline && <p style={s.headline}>{data.headline}</p>}
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
                <span style={{ fontSize: '10pt', whiteSpace: 'nowrap' }}>{dateRange(exp.startDate, exp.endDate, exp.isCurrent)}</span>
              </div>
              <p style={s.expCompany}>{exp.company || 'Company'}</p>
              {bulletLines(exp.description).map((line, j) => (
                <p key={j} style={s.bullet}>• {line}</p>
              ))}
            </div>
          ))}
        </>
      )}

      {data.skills.length > 0 && (
        <><h2 style={s.sectionTitle}>Skills & Expertise</h2>
          <div>{data.skills.map((sk, i) => <span key={i} style={s.skillPill}>{sk}</span>)}</div>
        </>
      )}

      {data.projects.length > 0 && (
        <><h2 style={s.sectionTitle}>Projects</h2>
          {data.projects.map((project, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <h3 style={{ ...s.expTitle, ...projectWrapStyle }}>{projectHeading(project)}</h3>
              <p style={{ ...s.text, ...projectWrapStyle }}>{project.description}</p>
            </div>
          ))}
        </>
      )}

      {data.education.length > 0 && (
        <><h2 style={s.sectionTitle}>Education</h2>
          {data.education.map((ed, i) => (
            <div key={i} style={{ marginBottom: 10, display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ ...s.expTitle, fontSize: '11pt' }}>{ed.school || 'Institution'}</h3>
                <p style={{ ...s.expCompany, margin: 0 }}>{[ed.degree, ed.field].filter(Boolean).join(' in ') || 'Degree'}</p>
              </div>
              <span style={{ fontSize: '10pt', whiteSpace: 'nowrap' }}>{[ed.startYear, ed.endYear].filter(Boolean).join(' \u2013 ')}</span>
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
        <><h2 style={s.sectionTitle}>Honors & Awards</h2>
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
   TEMPLATE 2 - MODERN (Professional Two-Column)
   Polished, recruiter-ready layout with refined
   typography, warm neutrals, and elegant spacing.
   Uses table for reliable PDF rendering.
   ───────────────────────────────────────────── */
function ModernTemplate({ data }) {
  const accent = '#2563eb';
  const accentLight = '#3b82f6';
  const sidebar = '#1e293b';
  const sidebarText = '#e2e8f0';
  const bodyText = '#1e293b';

  const s = {
    page: { fontFamily: "'Calibri', 'Segoe UI', system-ui, sans-serif", fontSize: '10.5pt', color: bodyText, background: '#fff', width: '100%' },
    table: { width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' },

    // ── Full-width header band ──
    headerBand: { background: sidebar, color: '#fff', padding: '34px 40px 28px' },
    headerTable: { width: '100%', borderCollapse: 'collapse' },
    headerLeft: { verticalAlign: 'bottom' },
    headerRight: { verticalAlign: 'bottom', textAlign: 'right', paddingLeft: 24 },
    name: { fontSize: '24pt', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 2px', color: '#fff' },
    headline: { fontSize: '11pt', fontWeight: 500, color: '#93c5fd', margin: '0 0 8px' },
    contactInline: { fontSize: '9pt', color: '#94a3b8', lineHeight: 1.8 },
    contactP: { margin: 0, fontSize: '9pt', color: '#94a3b8' },
    linkColor: { color: '#93c5fd' },

    // ── Sidebar cell ──
    sidebarCell: { width: '35%', background: '#f8fafc', padding: '28px 22px', verticalAlign: 'top', borderRight: '1px solid #e2e8f0' },
    sideLabel: { fontSize: '8pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: accent, margin: '0 0 8px', paddingBottom: 5, borderBottom: `2px solid ${accent}` },
    sideLabelSpaced: { fontSize: '8pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: accent, margin: '22px 0 8px', paddingBottom: 5, borderBottom: `2px solid ${accent}` },
    sideItem: { fontSize: '9.5pt', color: '#475569', margin: '0 0 4px', wordBreak: 'break-word', lineHeight: 1.5 },
    skillTag: { display: 'inline-block', background: '#fff', border: '1px solid #cbd5e1', borderRadius: 4, padding: '3px 9px', fontSize: '8.5pt', color: '#334155', fontWeight: 600, marginRight: 5, marginBottom: 5 },

    // ── Main cell ──
    mainCell: { width: '65%', padding: '28px 32px', verticalAlign: 'top' },
    mainSection: { fontSize: '9pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: accent, borderBottom: `2px solid ${accent}`, paddingBottom: 5, marginTop: 24, marginBottom: 12 },
    firstMainSection: { fontSize: '9pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: accent, borderBottom: `2px solid ${accent}`, paddingBottom: 5, marginTop: 0, marginBottom: 12 },
    entryTitle: { fontWeight: 700, fontSize: '11pt', margin: 0, color: '#0f172a' },
    entryMeta: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 },
    entryCompany: { fontSize: '10pt', color: accent, fontWeight: 600, margin: '1px 0 4px' },
    dateTxt: { fontSize: '9pt', color: '#64748b', whiteSpace: 'nowrap' },
    text: { fontSize: '10.5pt', color: '#334155', margin: '0 0 4px', lineHeight: 1.6 },
    bulletText: { fontSize: '10pt', color: '#334155', margin: '0 0 3px', paddingLeft: 6, lineHeight: 1.55 },
  };

  let isFirst = true;
  function secStyle() {
    if (isFirst) { isFirst = false; return s.firstMainSection; }
    return s.mainSection;
  }

  return (
    <div style={s.page}>
      {/* ── Full-width header ── */}
      <div style={s.headerBand}>
        <table style={s.headerTable}>
          <tbody>
            <tr>
              <td style={s.headerLeft}>
                <h1 style={s.name}>{data.fullName}</h1>
                {data.headline ? <p style={s.headline}>{data.headline}</p> : <p style={s.headline}>Professional Profile</p>}
              </td>
              <td style={s.headerRight}>
                {data.contact.map((c, i) => <p key={i} style={s.contactP}>{c}</p>)}
                {data.links.map((l, i) => <p key={`l${i}`} style={{ ...s.contactP, color: '#93c5fd' }}>{l}</p>)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Two-column body ── */}
      <table style={s.table}>
        <tbody>
          <tr>
            {/* ── Sidebar ── */}
            <td style={s.sidebarCell}>
              {data.skills.length > 0 && (
                <><p style={s.sideLabel}>Core Skills</p>
                  <div>{data.skills.map((sk, i) => <span key={i} style={s.skillTag}>{sk}</span>)}</div>
                </>
              )}
            </td>

            {/* ── Main Content ── */}
            <td style={s.mainCell}>
              {data.bio && (
                <><h2 style={secStyle()}>Professional Summary</h2><p style={s.text}>{data.bio}</p></>
              )}

              {data.experiences.length > 0 && (
                <><h2 style={secStyle()}>Professional Experience</h2>
                  {data.experiences.map((exp, i) => (
                    <div key={i} style={{ marginBottom: 18 }}>
                      <div style={s.entryMeta}>
                        <h3 style={s.entryTitle}>{exp.title || 'Role'}</h3>
                        <span style={s.dateTxt}>{dateRange(exp.startDate, exp.endDate, exp.isCurrent)}</span>
                      </div>
                      <p style={s.entryCompany}>{exp.company || 'Company'}</p>
                      {bulletLines(exp.description).map((line, j) => (
                        <p key={j} style={s.bulletText}>{`\u2022 `}{line}</p>
                      ))}
                    </div>
                  ))}
                </>
              )}

              {data.projects.length > 0 && (
                <><h2 style={secStyle()}>Projects</h2>
                  {data.projects.map((project, i) => (
                    <div key={i} style={{ marginBottom: 14 }}>
                      <h3 style={{ ...s.entryTitle, ...projectWrapStyle }}>{projectHeading(project)}</h3>
                      <p style={{ ...s.text, ...projectWrapStyle }}>{project.description}</p>
                    </div>
                  ))}
                </>
              )}

              {data.education.length > 0 && (
                <><h2 style={secStyle()}>Education</h2>
                  {data.education.map((ed, i) => (
                    <div key={i} style={{ marginBottom: 14 }}>
                      <div style={s.entryMeta}>
                        <h3 style={s.entryTitle}>{ed.school || 'Institution'}</h3>
                        <span style={s.dateTxt}>{[ed.startYear, ed.endYear].filter(Boolean).join(' \u2013 ')}</span>
                      </div>
                      <p style={s.entryCompany}>{[ed.degree, ed.field].filter(Boolean).join(' in ') || 'Degree'}</p>
                    </div>
                  ))}
                </>
              )}

              {data.licenses.length > 0 && (
                <><h2 style={secStyle()}>Certifications</h2>
                  {data.licenses.map((l, i) => (
                    <div key={i} style={{ marginBottom: 12 }}>
                      <div style={s.entryMeta}>
                        <h3 style={s.entryTitle}>{l.name}</h3>
                        <span style={s.dateTxt}>{l.issueDate}</span>
                      </div>
                      {l.issuingOrg && <p style={s.entryCompany}>{l.issuingOrg}</p>}
                    </div>
                  ))}
                </>
              )}

              {data.awards.length > 0 && (
                <><h2 style={secStyle()}>Honors & Awards</h2>
                  {data.awards.map((a, i) => (
                    <div key={i} style={{ marginBottom: 12 }}>
                      <div style={s.entryMeta}>
                        <h3 style={s.entryTitle}>{a.title}</h3>
                        <span style={s.dateTxt}>{a.date}</span>
                      </div>
                      {a.issuer && <p style={s.entryCompany}>{a.issuer}</p>}
                      {a.description && <p style={s.text}>{a.description}</p>}
                    </div>
                  ))}
                </>
              )}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/* ─────────────────────────────────────────────
   TEMPLATE 3 - MINIMAL (Swiss Clean)
   ───────────────────────────────────────────── */
function MinimalTemplate({ data }) {
  const s = {
    page: { fontFamily: 'Georgia, "Times New Roman", serif', fontSize: '11pt', color: '#111', padding: '44px 52px', maxWidth: '800px', margin: '0 auto', background: '#fff', lineHeight: 1.55 },
    name: { fontSize: '26pt', fontWeight: 400, letterSpacing: '-0.01em', margin: '0 0 4px', color: '#000' },
    headline: { fontSize: '11pt', color: '#666', fontWeight: 400, fontStyle: 'italic', margin: '0 0 6px' },
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
      {data.headline && <p style={s.headline}>{data.headline}</p>}
      <div style={s.contactRow}>
        {[...data.contact, ...data.links].map((c, i) => <span key={i}>{c}</span>)}
      </div>

      {data.bio && (<><hr style={s.hr} /><h2 style={s.sectionTitle}>Profile</h2><p style={s.text}>{data.bio}</p></>)}

      {data.experiences.length > 0 && (
        <><hr style={s.hr} /><h2 style={s.sectionTitle}>Experience</h2>
          {data.experiences.map((exp, i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              <div style={s.entryWrap}>
                <h3 style={s.entryTitle}>{exp.title || 'Role'}</h3>
                <span style={s.dateTxt}>{dateRange(exp.startDate, exp.endDate, exp.isCurrent)}</span>
              </div>
              <p style={s.entryCompany}>{exp.company || 'Company'}</p>
              {bulletLines(exp.description).map((line, j) => (
                <p key={j} style={{ ...s.text, paddingLeft: 4 }}>• {line}</p>
              ))}
            </div>
          ))}
        </>
      )}

      {data.skills.length > 0 && (<><hr style={s.hr} /><h2 style={s.sectionTitle}>Skills</h2><p style={s.skillText}>{data.skills.join('  ·  ')}</p></>)}

      {data.projects.length > 0 && (
        <><hr style={s.hr} /><h2 style={s.sectionTitle}>Projects</h2>
          {data.projects.map((project, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <h3 style={{ ...s.entryTitle, ...projectWrapStyle }}>{projectHeading(project)}</h3>
              <p style={{ ...s.text, ...projectWrapStyle }}>{project.description}</p>
            </div>
          ))}
        </>
      )}

      {data.education.length > 0 && (
        <><hr style={s.hr} /><h2 style={s.sectionTitle}>Education</h2>
          {data.education.map((ed, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={s.entryWrap}>
                <h3 style={{ ...s.entryTitle, fontSize: '11pt' }}>{ed.school || 'Institution'}</h3>
                <span style={s.dateTxt}>{[ed.startYear, ed.endYear].filter(Boolean).join(' \u2013 ')}</span>
              </div>
              <p style={s.entryCompany}>{[ed.degree, ed.field].filter(Boolean).join(' in ') || 'Degree'}</p>
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
        <><hr style={s.hr} /><h2 style={s.sectionTitle}>Honors & Awards</h2>
          {data.awards.map((a, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <div style={s.entryWrap}><h3 style={{ ...s.entryTitle, fontSize: '10.5pt' }}>{a.title}</h3><span style={s.dateTxt}>{a.date}</span></div>
              {a.issuer && <p style={s.entryCompany}>{a.issuer}</p>}
              {a.description && <p style={s.text}>{a.description}</p>}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   TEMPLATE 4 - CREATIVE (Bold Gradient Accent)
   ───────────────────────────────────────────── */
function CreativeTemplate({ data }) {
  const primary = '#6d28d9';
  const primaryLight = '#a78bfa';
  const bg = '#faf7ff';

  const s = {
    page: { fontFamily: "'Segoe UI', system-ui, sans-serif", fontSize: '10.5pt', color: '#1e1b4b', padding: '0', maxWidth: '800px', margin: '0 auto', background: '#fff' },
    header: { background: `linear-gradient(135deg, ${primary} 0%, #7c3aed 50%, #a855f7 100%)`, color: '#fff', padding: '40px 48px 32px', position: 'relative' },
    headerOverlay: { position: 'absolute', top: 0, right: 0, width: '200px', height: '100%', background: 'radial-gradient(circle at top right, rgba(255,255,255,0.12), transparent 70%)' },
    name: { fontSize: '26pt', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 4px', position: 'relative', zIndex: 1 },
    headline: { fontSize: '12pt', fontWeight: 500, color: '#e9d5ff', margin: '0 0 14px', position: 'relative', zIndex: 1 },
    contactRow: { display: 'flex', flexWrap: 'wrap', gap: '6px 18px', fontSize: '9.5pt', color: '#ddd6fe', position: 'relative', zIndex: 1 },
    body: { padding: '28px 48px 40px', background: bg },
    sectionTitle: { fontSize: '11pt', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: primary, margin: '24px 0 12px', paddingBottom: 6, borderBottom: `3px solid ${primaryLight}40`, display: 'flex', alignItems: 'center', gap: '10px' },
    firstSectionTitle: { fontSize: '11pt', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: primary, margin: '0 0 12px', paddingBottom: 6, borderBottom: `3px solid ${primaryLight}40`, display: 'flex', alignItems: 'center', gap: '10px' },
    sectionDot: { display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: `linear-gradient(135deg, ${primary}, ${primaryLight})` },
    entryCard: { background: '#fff', border: '1px solid #e9d5ff', borderRadius: 10, padding: '14px 18px', marginBottom: 14, boxShadow: '0 1px 4px rgba(109,40,217,0.06)' },
    entryTitle: { fontWeight: 700, fontSize: '11.5pt', margin: 0, color: '#1e1b4b' },
    entryMeta: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 },
    entryCompany: { fontSize: '10pt', color: primary, fontWeight: 600, margin: '2px 0 4px' },
    text: { fontSize: '10.5pt', color: '#374151', margin: '0 0 4px', lineHeight: 1.55 },
    bulletText: { fontSize: '10.5pt', color: '#374151', margin: '0 0 3px', paddingLeft: 6, lineHeight: 1.5 },
    skillPill: { display: 'inline-block', background: `linear-gradient(135deg, ${primary}12, ${primaryLight}18)`, border: `1px solid ${primaryLight}40`, borderRadius: 20, padding: '4px 12px', fontSize: '9pt', color: primary, fontWeight: 600, marginRight: 6, marginBottom: 6 },
    eduCard: { background: '#fff', borderLeft: `4px solid ${primary}`, borderRadius: '0 8px 8px 0', padding: '12px 16px', marginBottom: 12, boxShadow: '0 1px 3px rgba(109,40,217,0.05)' },
    dateTxt: { fontSize: '9.5pt', color: '#7c3aed', whiteSpace: 'nowrap', fontWeight: 600 },
  };

  let isFirst = true;

  return (
    <div style={s.page}>
      <header style={s.header}>
        <div style={s.headerOverlay} />
        <h1 style={s.name}>{data.fullName}</h1>
        {data.headline && <p style={s.headline}>{data.headline}</p>}
        <div style={s.contactRow}>
          {[...data.contact, ...data.links].map((c, i) => <span key={i}>{c}</span>)}
        </div>
      </header>

      <div style={s.body}>
        {data.bio && (
          <><h2 style={(() => { if (isFirst) { isFirst = false; return s.firstSectionTitle; } return s.sectionTitle; })()}><span style={s.sectionDot} /> Summary</h2>
            <p style={{ ...s.text, background: '#fff', borderRadius: 10, padding: '14px 18px', border: '1px solid #e9d5ff', boxShadow: '0 1px 4px rgba(109,40,217,0.06)' }}>{data.bio}</p>
          </>
        )}

        {data.experiences.length > 0 && (
          <><h2 style={(() => { if (isFirst) { isFirst = false; return s.firstSectionTitle; } return s.sectionTitle; })()}><span style={s.sectionDot} /> Experience</h2>
            {data.experiences.map((exp, i) => (
              <div key={i} style={s.entryCard}>
                <div style={s.entryMeta}>
                  <h3 style={s.entryTitle}>{exp.title || 'Role'}</h3>
                  <span style={s.dateTxt}>{dateRange(exp.startDate, exp.endDate, exp.isCurrent)}</span>
                </div>
                <p style={s.entryCompany}>{exp.company || 'Company'}</p>
                {bulletLines(exp.description).map((line, j) => (
                  <p key={j} style={s.bulletText}>• {line}</p>
                ))}
              </div>
            ))}
          </>
        )}

        {data.skills.length > 0 && (
          <><h2 style={(() => { if (isFirst) { isFirst = false; return s.firstSectionTitle; } return s.sectionTitle; })()}><span style={s.sectionDot} /> Skills & Expertise</h2>
            <div>{data.skills.map((sk, i) => <span key={i} style={s.skillPill}>{sk}</span>)}</div>
          </>
        )}

        {data.projects.length > 0 && (
          <><h2 style={(() => { if (isFirst) { isFirst = false; return s.firstSectionTitle; } return s.sectionTitle; })()}><span style={s.sectionDot} /> Projects</h2>
            {data.projects.map((project, i) => (
              <div key={i} style={s.entryCard}>
                <h3 style={{ ...s.entryTitle, ...projectWrapStyle }}>{projectHeading(project)}</h3>
                <p style={{ ...s.text, ...projectWrapStyle }}>{project.description}</p>
              </div>
            ))}
          </>
        )}

        {data.education.length > 0 && (
          <><h2 style={(() => { if (isFirst) { isFirst = false; return s.firstSectionTitle; } return s.sectionTitle; })()}><span style={s.sectionDot} /> Education</h2>
            {data.education.map((ed, i) => (
              <div key={i} style={s.eduCard}>
                <div style={s.entryMeta}>
                  <h3 style={{ ...s.entryTitle, fontSize: '11pt' }}>{ed.school || 'Institution'}</h3>
                  <span style={s.dateTxt}>{[ed.startYear, ed.endYear].filter(Boolean).join(' \u2013 ')}</span>
                </div>
                <p style={{ ...s.entryCompany, color: '#6d28d9', margin: 0 }}>{[ed.degree, ed.field].filter(Boolean).join(' in ') || 'Degree'}</p>
              </div>
            ))}
          </>
        )}

        {data.licenses.length > 0 && (
          <><h2 style={s.sectionTitle}><span style={s.sectionDot} /> Certifications</h2>
            {data.licenses.map((l, i) => (
              <div key={i} style={{ ...s.entryCard, padding: '12px 18px' }}>
                <div style={s.entryMeta}>
                  <h3 style={{ ...s.entryTitle, fontSize: '10.5pt' }}>{l.name}</h3>
                  <span style={s.dateTxt}>{l.issueDate}</span>
                </div>
                {l.issuingOrg && <p style={{ ...s.entryCompany, margin: 0 }}>{l.issuingOrg}</p>}
              </div>
            ))}
          </>
        )}

        {data.awards.length > 0 && (
          <><h2 style={s.sectionTitle}><span style={s.sectionDot} /> Honors & Awards</h2>
            {data.awards.map((a, i) => (
              <div key={i} style={{ ...s.entryCard, padding: '12px 18px' }}>
                <div style={s.entryMeta}>
                  <h3 style={{ ...s.entryTitle, fontSize: '10.5pt' }}>{a.title}</h3>
                  <span style={s.dateTxt}>{a.date}</span>
                </div>
                {a.issuer && <p style={{ ...s.entryCompany, margin: 0 }}>{a.issuer}</p>}
                {a.description && <p style={{ ...s.text, marginTop: 4 }}>{a.description}</p>}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   TEMPLATE 5 - TECHNICAL (Developer-Focused)
   ───────────────────────────────────────────── */
function TechnicalTemplate({ data }) {
  const green = '#10b981';
  const greenDark = '#059669';
  const dark = '#111827';
  const codeBg = '#f8fafc';

  const s = {
    page: { fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace", fontSize: '10pt', color: dark, padding: '36px 44px', maxWidth: '800px', margin: '0 auto', background: '#fff', lineHeight: 1.55 },
    headerBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: `3px solid ${dark}`, paddingBottom: 16, marginBottom: 24 },
    name: { fontSize: '22pt', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 4px', color: dark },
    headline: { fontSize: '10.5pt', color: greenDark, fontWeight: 600, margin: '0 0 8px', fontFamily: "'Segoe UI', system-ui, sans-serif" },
    contactBlock: { textAlign: 'right', fontSize: '9pt', color: '#6b7280', lineHeight: 1.7 },
    contactItem: { margin: 0, fontSize: '9pt', color: '#6b7280' },
    sectionWrap: { marginBottom: 20 },
    sectionHeader: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, marginTop: 22 },
    firstSectionHeader: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, marginTop: 0 },
    sectionComment: { fontSize: '10pt', color: '#9ca3af', fontWeight: 400 },
    sectionLabel: { fontSize: '10.5pt', fontWeight: 700, color: dark, textTransform: 'uppercase', letterSpacing: '0.06em' },
    codeBlock: { background: codeBg, border: '1px solid #e5e7eb', borderRadius: 6, padding: '14px 18px', marginBottom: 12, fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace" },
    entryTitle: { fontWeight: 700, fontSize: '11pt', margin: 0, color: dark },
    entryMeta: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 },
    entryCompany: { fontSize: '10pt', color: greenDark, fontWeight: 600, margin: '2px 0 6px', fontFamily: "'Segoe UI', system-ui, sans-serif" },
    text: { fontSize: '10pt', color: '#374151', margin: '0 0 4px', lineHeight: 1.55, fontFamily: "'Segoe UI', system-ui, sans-serif" },
    bulletText: { fontSize: '10pt', color: '#374151', margin: '0 0 3px', paddingLeft: 6, lineHeight: 1.5, fontFamily: "'Segoe UI', system-ui, sans-serif" },
    dateTxt: { fontSize: '9pt', color: '#9ca3af', whiteSpace: 'nowrap', fontFamily: "'SF Mono', monospace" },
    skillGrid: { display: 'flex', flexWrap: 'wrap', gap: 6 },
    skillChip: { display: 'inline-block', background: `${green}10`, border: `1px solid ${green}30`, borderRadius: 4, padding: '3px 10px', fontSize: '8.5pt', color: greenDark, fontWeight: 600, fontFamily: "'SF Mono', monospace" },
    tag: { fontSize: '8pt', color: '#9ca3af', fontFamily: "'SF Mono', monospace", margin: 0, marginTop: 4 },
    lineNum: { display: 'inline-block', width: 24, color: '#d1d5db', fontSize: '9pt', textAlign: 'right', marginRight: 12, userSelect: 'none', fontFamily: "'SF Mono', monospace" },
  };

  let isFirst = true;
  function headerStyle() {
    if (isFirst) { isFirst = false; return s.firstSectionHeader; }
    return s.sectionHeader;
  }

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.headerBar}>
        <div>
          <h1 style={s.name}>{data.fullName}</h1>
          {data.headline && <p style={s.headline}>{data.headline}</p>}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', marginTop: 4 }}>
            {data.links.map((l, i) => <span key={i} style={{ fontSize: '9pt', color: green }}>{l}</span>)}
          </div>
        </div>
        <div style={s.contactBlock}>
          {data.contact.map((c, i) => <p key={i} style={s.contactItem}>{c}</p>)}
        </div>
      </div>

      {/* Summary */}
      {data.bio && (
        <div style={s.sectionWrap}>
          <div style={headerStyle()}>
            <span style={s.sectionComment}>{'// '}</span>
            <span style={s.sectionLabel}>About</span>
          </div>
          <div style={s.codeBlock}>
            <p style={s.text}>{data.bio}</p>
          </div>
        </div>
      )}

      {/* Skills */}
      {data.skills.length > 0 && (
        <div style={s.sectionWrap}>
          <div style={headerStyle()}>
            <span style={s.sectionComment}>{'// '}</span>
            <span style={s.sectionLabel}>Tech Stack</span>
          </div>
          <div style={s.skillGrid}>
            {data.skills.map((sk, i) => <span key={i} style={s.skillChip}>{sk}</span>)}
          </div>
        </div>
      )}

      {data.projects.length > 0 && (
        <div style={s.sectionWrap}>
          <div style={headerStyle()}>
            <span style={s.sectionComment}>{'// '}</span>
            <span style={s.sectionLabel}>Projects</span>
          </div>
          {data.projects.map((project, i) => (
            <div key={i} style={s.codeBlock}>
              <h3 style={{ ...s.entryTitle, ...projectWrapStyle }}>{projectHeading(project)}</h3>
              <p style={{ ...s.text, ...projectWrapStyle, marginTop: 6 }}>{project.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* Experience */}
      {data.experiences.length > 0 && (
        <div style={s.sectionWrap}>
          <div style={headerStyle()}>
            <span style={s.sectionComment}>{'// '}</span>
            <span style={s.sectionLabel}>Experience</span>
          </div>
          {data.experiences.map((exp, i) => (
            <div key={i} style={s.codeBlock}>
              <div style={s.entryMeta}>
                <h3 style={s.entryTitle}>{exp.title || 'Role'}</h3>
                <span style={s.dateTxt}>{dateRange(exp.startDate, exp.endDate, exp.isCurrent)}</span>
              </div>
              <p style={s.entryCompany}>{exp.company || 'Company'}</p>
              {bulletLines(exp.description).map((line, j) => (
                <p key={j} style={s.bulletText}>
                  <span style={s.lineNum}>{j + 1}</span>
                  {line}
                </p>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Education */}
      {data.education.length > 0 && (
        <div style={s.sectionWrap}>
          <div style={headerStyle()}>
            <span style={s.sectionComment}>{'// '}</span>
            <span style={s.sectionLabel}>Education</span>
          </div>
          {data.education.map((ed, i) => (
            <div key={i} style={{ ...s.codeBlock, padding: '12px 18px' }}>
              <div style={s.entryMeta}>
                <h3 style={{ ...s.entryTitle, fontSize: '10.5pt' }}>{ed.school || 'Institution'}</h3>
                <span style={s.dateTxt}>{[ed.startYear, ed.endYear].filter(Boolean).join(' \u2013 ')}</span>
              </div>
              <p style={{ ...s.entryCompany, margin: 0 }}>{[ed.degree, ed.field].filter(Boolean).join(' in ') || 'Degree'}</p>
            </div>
          ))}
        </div>
      )}

      {/* Certifications */}
      {data.licenses.length > 0 && (
        <div style={s.sectionWrap}>
          <div style={headerStyle()}>
            <span style={s.sectionComment}>{'// '}</span>
            <span style={s.sectionLabel}>Certifications</span>
          </div>
          {data.licenses.map((l, i) => (
            <div key={i} style={{ ...s.codeBlock, padding: '10px 18px' }}>
              <div style={s.entryMeta}>
                <h3 style={{ ...s.entryTitle, fontSize: '10pt' }}>{l.name}</h3>
                <span style={s.dateTxt}>{l.issueDate}</span>
              </div>
              {l.issuingOrg && <p style={{ ...s.tag, color: '#6b7280' }}>{l.issuingOrg}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Awards */}
      {data.awards.length > 0 && (
        <div style={s.sectionWrap}>
          <div style={headerStyle()}>
            <span style={s.sectionComment}>{'// '}</span>
            <span style={s.sectionLabel}>Honors & Awards</span>
          </div>
          {data.awards.map((a, i) => (
            <div key={i} style={{ ...s.codeBlock, padding: '10px 18px' }}>
              <div style={s.entryMeta}>
                <h3 style={{ ...s.entryTitle, fontSize: '10pt' }}>{a.title}</h3>
                <span style={s.dateTxt}>{a.date}</span>
              </div>
              {a.issuer && <p style={s.tag}>{a.issuer}</p>}
              {a.description && <p style={{ ...s.text, marginTop: 4 }}>{a.description}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div style={{ borderTop: `1px solid #e5e7eb`, paddingTop: 10, marginTop: 20, textAlign: 'center' }}>
        <p style={{ ...s.tag, color: '#d1d5db' }}>{'/* Generated with Aptico Resume Builder */'}</p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   TEMPLATE CONFIG
   ───────────────────────────────────────────── */
const TEMPLATES = [
  { id: 'executive', label: 'Executive', desc: 'ATS-optimized single-column with bold navy header. Best for traditional industries.', icon: 'description', color: '#1e293b', Component: ExecutiveTemplate },
  { id: 'modern', label: 'Modern', desc: 'Professional two-column layout with full-width header and clean sidebar. Recruiter-ready and ATS-friendly.', icon: 'dashboard', color: '#2563eb', Component: ModernTemplate },
  { id: 'minimal', label: 'Minimal', desc: 'Swiss-clean serif typography with generous whitespace. Ideal for academia and design roles.', icon: 'article', color: '#6b7280', Component: MinimalTemplate },
  { id: 'creative', label: 'Creative', desc: 'Bold purple gradient header with card-based layout. Perfect for standing out in creative fields.', icon: 'palette', color: '#7c3aed', Component: CreativeTemplate },
  { id: 'technical', label: 'Technical', desc: 'Developer-inspired layout with monospace accents and code-block styling. Built for tech roles.', icon: 'terminal', color: '#10b981', Component: TechnicalTemplate },
];

const COMPACT_RESUME_SCALE = 0.94;
const A4_HEIGHT_RATIO = 297 / 210;
const OVERFLOW_WARNING = 'This resume may export to 2 pages. Shorten summary, projects, or experience bullets for a one-page version.';
const FITS_ONE_PAGE_MESSAGE = 'Fits on 1 page';

function safeFileName(name) {
  return `${String(name || 'Your_Name').replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, '_') || 'Your_Name'}_Resume`;
}

function compactText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function buildResumeDocx(data) {
  const {
    AlignmentType,
    BorderStyle,
    Document,
    HeadingLevel,
    Packer,
    Paragraph,
    TextRun,
  } = await import('docx');

  const children = [];
  const sectionBorder = {
    bottom: { color: 'D1D5DB', size: 6, style: BorderStyle.SINGLE },
  };

  function paragraph(text, options = {}) {
    const clean = compactText(text);
    if (!clean) return;
    children.push(new Paragraph({
      spacing: { after: options.after ?? 90 },
      alignment: options.alignment,
      bullet: options.bullet ? { level: 0 } : undefined,
      children: [
        new TextRun({
          text: clean,
          bold: options.bold,
          italics: options.italics,
          size: options.size ?? 20,
          color: options.color ?? '111827',
        }),
      ],
    }));
  }

  function heading(text) {
    const clean = compactText(text);
    if (!clean) return;
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_2,
      border: sectionBorder,
      spacing: { before: 180, after: 100 },
      children: [new TextRun({ text: clean.toUpperCase(), bold: true, size: 22, color: '111827' })],
    }));
  }

  function entryTitle(left, right) {
    const leftText = compactText(left);
    const rightText = compactText(right);
    if (!leftText && !rightText) return;
    children.push(new Paragraph({
      spacing: { before: 80, after: 30 },
      children: [
        new TextRun({ text: leftText, bold: true, size: 21, color: '111827' }),
        ...(rightText ? [new TextRun({ text: ` | ${rightText}`, size: 19, color: '4B5563' })] : []),
      ],
    }));
  }

  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 50 },
    children: [new TextRun({ text: compactText(data.fullName), bold: true, size: 34, color: '111827' })],
  }));

  paragraph(data.headline, { alignment: AlignmentType.CENTER, color: '374151', size: 21, after: 50 });
  paragraph([...data.contact, ...data.links].map(compactText).filter(Boolean).join(' | '), {
    alignment: AlignmentType.CENTER,
    color: '4B5563',
    size: 18,
    after: 160,
  });

  if (data.bio) {
    heading('Professional Summary');
    paragraph(data.bio);
  }

  if (data.experiences.length) {
    heading('Professional Experience');
    data.experiences.forEach((exp) => {
      entryTitle([exp.title || 'Role', exp.company].filter(Boolean).join(', '), dateRange(exp.startDate, exp.endDate, exp.isCurrent));
      bulletLines(exp.description).forEach((line) => paragraph(line, { bullet: true, after: 40 }));
    });
  }

  if (data.skills.length) {
    heading('Skills');
    paragraph(data.skills.map(compactText).filter(Boolean).join(', '));
  }

  if (data.projects.length) {
    heading('Projects');
    data.projects.forEach((project) => {
      entryTitle(projectHeading(project));
      paragraph(project.description);
    });
  }

  if (data.education.length) {
    heading('Education');
    data.education.forEach((ed) => {
      entryTitle(ed.school || 'Institution', [ed.startYear, ed.endYear].filter(Boolean).join(' - '));
      paragraph([ed.degree, ed.field].filter(Boolean).join(' in ') || 'Degree', { color: '4B5563' });
    });
  }

  if (data.licenses.length) {
    heading('Certifications');
    data.licenses.forEach((license) => {
      entryTitle(license.name, license.issueDate);
      paragraph(license.issuingOrg, { color: '4B5563' });
    });
  }

  if (data.awards.length) {
    heading('Honors & Awards');
    data.awards.forEach((award) => {
      entryTitle(award.title, award.date);
      paragraph(award.issuer, { color: '4B5563' });
      paragraph(award.description);
    });
  }

  const doc = new Document({
    creator: 'Aptico Resume Builder',
    description: 'Editable resume generated from Aptico profile data.',
    title: `${data.fullName} Resume`,
    styles: {
      default: {
        document: {
          run: { font: 'Arial', size: 20 },
          paragraph: { spacing: { line: 240 } },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          margin: { top: 540, right: 540, bottom: 540, left: 540 },
        },
      },
      children,
    }],
  });

  return Packer.toBlob(doc);
}

/* ─────────────────────────────────────────────
   MAIN MODAL
   ───────────────────────────────────────────── */
export default function ResumeBuilderModal({ open, onClose, profile, educationEntries, readonly = false }) {
  const [selectedId, setSelectedId] = useState(profile?.resumeTemplate || 'executive');
  const [downloading, setDownloading] = useState(false);
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
  const [resumeOverflows, setResumeOverflows] = useState(false);
  const previewRef = useRef(null);
  const downloadMenuRef = useRef(null);

  useEffect(() => {
    if (open && profile?.resumeTemplate) {
      setSelectedId(profile.resumeTemplate);
    }
  }, [open, profile?.resumeTemplate]);

  useEffect(() => {
    if (!downloadMenuOpen) return undefined;

    function handlePointerDown(event) {
      if (!downloadMenuRef.current?.contains(event.target)) {
        setDownloadMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [downloadMenuOpen]);

  const data = useResumeData(profile, educationEntries);
  const selected = TEMPLATES.find(t => t.id === selectedId) || TEMPLATES[0];

  useEffect(() => {
    if (!open) return undefined;

    let frameId = 0;
    function measureResumeHeight() {
      frameId = window.requestAnimationFrame(() => {
        if (!previewRef.current) return;
        const rect = previewRef.current.getBoundingClientRect();
        const onePageHeight = rect.width * A4_HEIGHT_RATIO;
        const nextOverflows = rect.height > onePageHeight + 8;
        setResumeOverflows((current) => current === nextOverflows ? current : nextOverflows);
      });
    }

    measureResumeHeight();
    window.addEventListener('resize', measureResumeHeight);
    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', measureResumeHeight);
    };
  }, [open, selectedId, profile, educationEntries]);

  const downloadPdf = useCallback(async () => {
    if (!previewRef.current || downloading) return;
    setDownloading('pdf');
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const el = previewRef.current;
      const opt = {
        margin: 0,
        filename: `${safeFileName(data.fullName)}.pdf`,
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

  const downloadDocx = useCallback(async () => {
    if (downloading) return;
    setDownloading('docx');
    try {
      const blob = await buildResumeDocx(data);
      saveBlob(blob, `${safeFileName(data.fullName)}.docx`);
    } catch (err) {
      console.error('DOCX generation failed:', err);
    } finally {
      setDownloading(false);
    }
  }, [data, downloading]);

  const handleDownload = useCallback(async (format) => {
    setDownloadMenuOpen(false);
    if (format === 'docx') {
      await downloadDocx();
      return;
    }
    await downloadPdf();
  }, [downloadDocx, downloadPdf]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[300] flex flex-col bg-black/60 backdrop-blur-md animate-fade-in">
      {/* ── Top bar ── */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--panel)]/95 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)]/20">
            <span className="material-symbols-outlined text-[18px] text-[var(--accent-strong)]">description</span>
          </span>
          <div>
            <h2 className="text-lg font-black tracking-tight text-[var(--text)]">Resume Builder</h2>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--muted)]">{TEMPLATES.length} templates available</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div ref={downloadMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setDownloadMenuOpen((value) => !value)}
              disabled={Boolean(downloading)}
              aria-haspopup="menu"
              aria-expanded={downloadMenuOpen}
              className="app-button flex items-center gap-2 shadow-lg shadow-[var(--accent)]/20 disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-[18px]">{downloading ? 'progress_activity' : 'download'}</span>
              {downloading ? 'Generating...' : 'Download'}
              {!downloading && <span className="material-symbols-outlined text-[18px]">expand_more</span>}
            </button>
            {downloadMenuOpen && (
              <div role="menu" className="absolute right-0 top-[calc(100%+0.5rem)] z-20 w-44 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--panel)] shadow-2xl">
                <button type="button" role="menuitem" onClick={() => handleDownload('pdf')} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-bold text-[var(--text)] transition hover:bg-[var(--panel-soft)]">
                  <span className="material-symbols-outlined text-[18px] text-[var(--accent-strong)]">picture_as_pdf</span>
                  Download PDF
                </button>
                <button type="button" role="menuitem" onClick={() => handleDownload('docx')} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-bold text-[var(--text)] transition hover:bg-[var(--panel-soft)]">
                  <span className="material-symbols-outlined text-[18px] text-[var(--accent-strong)]">description</span>
                  Download DOCX
                </button>
              </div>
            )}
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-[var(--panel-strong)] transition text-[var(--muted-strong)] hover:text-[var(--text)]">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - template selector */}
        {!readonly && (
          <aside className="w-[280px] shrink-0 border-r border-[var(--border)] bg-[var(--panel)]/80 backdrop-blur-xl overflow-y-auto p-5 space-y-2.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted)] mb-3">Choose Template</p>
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
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{ background: selectedId === t.id ? `${t.color}20` : 'var(--panel-soft)' }}
                  >
                    <span
                      className="material-symbols-outlined text-[16px]"
                      style={{ color: selectedId === t.id ? t.color : 'var(--muted)' }}
                    >{t.icon}</span>
                  </span>
                  <span className="text-sm font-black text-[var(--text)]">{t.label}</span>
                  {selectedId === t.id && (
                    <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)] text-white">
                      <span className="material-symbols-outlined text-[12px]">check</span>
                    </span>
                  )}
                </div>
                <p className="text-[11px] font-medium text-[var(--muted-strong)] leading-relaxed">{t.desc}</p>
              </button>
            ))}
          </aside>
        )}

        {/* Preview area */}
        <div className="flex-1 overflow-auto bg-[var(--panel-strong)]/50 px-4 py-6 sm:px-8 flex flex-col items-center">
          <div className="mb-4 flex w-full max-w-[210mm] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--muted)]">A4 Preview</p>
              <p className="mt-1 text-xs font-semibold text-[var(--muted-strong)]">PDF keeps this visual layout. DOCX exports editable text.</p>
            </div>
            <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold ${
              resumeOverflows
                ? 'border-amber-400/40 bg-amber-500/10 text-amber-200'
                : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
            }`}>
              <span className="material-symbols-outlined text-[17px]">{resumeOverflows ? 'warning' : 'check_circle'}</span>
              <span>{resumeOverflows ? 'May export to 2 pages' : FITS_ONE_PAGE_MESSAGE}</span>
            </div>
          </div>

          {resumeOverflows && (
            <div className="mb-4 flex w-full max-w-[210mm] items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-xs font-semibold leading-relaxed text-amber-100">
              <span className="material-symbols-outlined text-[17px]">lightbulb</span>
              <span>{OVERFLOW_WARNING}</span>
            </div>
          )}

          <div className="relative w-[210mm] min-h-[297mm] bg-white shadow-2xl ring-1 ring-black/10">
            {resumeOverflows && (
              <div className="pointer-events-none absolute inset-x-0 top-[297mm] z-10 flex items-center">
                <span className="h-px flex-1 border-t border-dashed border-amber-400/80" />
                <span className="mx-3 rounded-full bg-amber-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-amber-800 shadow-sm">Page 1 ends here</span>
                <span className="h-px flex-1 border-t border-dashed border-amber-400/80" />
              </div>
            )}
            <div
              ref={previewRef}
              style={{
                transform: `scale(${COMPACT_RESUME_SCALE})`,
                transformOrigin: 'top left',
                width: `${100 / COMPACT_RESUME_SCALE}%`
              }}
            >
              <selected.Component data={data} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
