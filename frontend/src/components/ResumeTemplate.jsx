import React from 'react';

/**
 * ATS-Friendly Resume Template
 * Features: Single column layout, standard web-safe fonts, clear hierarchy, easily parsable text blocks without complex layouts.
 */

function SectionTitle({ children }) {
  return (
    <div className="mb-3 mt-6">
      <h2 className="text-sm font-bold uppercase tracking-wider text-black border-b border-gray-400 pb-1 mb-2">
        {children}
      </h2>
    </div>
  );
}

function formatLabel(value) {
  return `${value || ''}`
    .split('-')
    .filter(Boolean)
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .join(' ');
}

export default function ResumeTemplate({ profile }) {
  const es = profile.enriched_settings || profile; // Support both flat profile and enriched_settings

  const fullName = `${profile.firstName || profile.name?.split(' ')[0] || ''} ${profile.lastName || profile.name?.split(' ').slice(1).join(' ') || ''}`.trim() || profile.name || 'Professional Name';
  
  const contactInfo = [
    profile.email,
    profile.phone,
    profile.location,
    profile.linkedin ? `LinkedIn: ${profile.linkedin.replace('https://','')}` : null,
    profile.portfolio ? `Portfolio: ${profile.portfolio.replace('https://','')}` : null,
    profile.github ? `GitHub: ${profile.github.replace('https://','')}` : null,
  ].filter(Boolean);

  const experiences = es.experiences || [];
  const educationEntries = es.educationEntries || [];
  const licenses = es.licenses || [];
  const honorsAwards = es.honorsAwards || [];
  
  // Legacy support for single entries if arrays are empty
  if (experiences.length === 0 && profile.currentCompany) {
    experiences.push({
      title: profile.currentTitle,
      company: profile.currentCompany,
      startDate: '',
      endDate: 'Present',
      description: profile.achievements?.join('. ') || ''
    });
  }

  if (educationEntries.length === 0 && profile.school) {
    educationEntries.push({
      school: profile.school,
      degree: profile.degree,
      field: profile.fieldOfStudy,
      endYear: profile.graduationYear
    });
  }

  const allSkills = [
    ...(es.topSkills || profile.topSkills || []),
    ...(profile.skills || []),
    ...(es.tools || profile.tools || []),
    ...(es.languages || profile.languages || [])
  ].filter(Boolean);

  // remove duplicates
  const uniqueSkills = [...new Set(allSkills)];

  return (
    <div className="resume-print-view bg-white text-black font-sans leading-normal p-0 max-w-4xl mx-auto">
      {/* CSS for print injection */}
      <style>{`
        @media screen {
          .resume-print-view { display: none; }
        }
        @media print {
          @page { margin: 0.5in; }
          .resume-print-view { display: block !important; padding: 0; margin: 0; width: 100%; font-family: Arial, Helvetica, sans-serif !important; }
          body, html { background: white !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
        .resume-print-view h1, .resume-print-view h2, .resume-print-view h3 { color: black; margin: 0; }
        .resume-print-view p { margin: 0 0 4px 0; font-size: 11pt; color: #333; }
        .resume-print-view a { color: black; text-decoration: none; }
        .resume-print-view ul { margin: 4px 0 12px 16px; padding: 0; list-style-type: disc; }
        .resume-print-view li { margin-bottom: 4px; font-size: 11pt; color: #333; }
      `}</style>
      
      {/* Header */}
      <header className="text-center mb-6">
        <h1 className="text-2xl font-bold uppercase mb-1">{fullName}</h1>
        {contactInfo.length > 0 && (
          <p className="text-[10pt] text-gray-700 mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1">
            {contactInfo.map((info, idx) => (
              <span key={idx} className="whitespace-nowrap">
                {info}{idx < contactInfo.length - 1 ? ' | ' : ''}
              </span>
            ))}
          </p>
        )}
      </header>

      {/* Summary */}
      {(es.bio || profile.bio) && (
        <section>
          <SectionTitle>Professional Summary</SectionTitle>
          <p className="text-[11pt] leading-snug">{es.bio || profile.bio}</p>
        </section>
      )}

      {/* Experience */}
      {experiences.length > 0 && (
        <section>
          <SectionTitle>Professional Experience</SectionTitle>
          {experiences.map((exp, idx) => (
            <div key={idx} className="mb-4">
              <div className="flex justify-between items-baseline mb-1">
                <h3 className="font-bold text-[12pt]">{exp.title}</h3>
                <span className="text-[11pt] font-semibold whitespace-nowrap">
                  {[exp.startDate, exp.isCurrent ? 'Present' : exp.endDate].filter(Boolean).join(' - ')}
                </span>
              </div>
              <div className="flex justify-between items-baseline mb-2">
                <p className="font-semibold italic text-[11pt] m-0">{exp.company}</p>
                {exp.location && <span className="text-[10pt] text-gray-600">{exp.location}</span>}
              </div>
              {exp.description && (
                <div className="text-[11pt] leading-snug whitespace-pre-wrap">
                  {exp.description.split('\n').map((line, i) => (
                    line.trim() ? <div key={i}>• {line.trim().replace(/^•\s*/, '')}</div> : null
                  ))}
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Skills Grid */}
      {uniqueSkills.length > 0 && (
        <section>
          <SectionTitle>Areas of Expertise & Technical Skills</SectionTitle>
          <p className="text-[11pt] leading-snug">
            {uniqueSkills.join(', ')}
          </p>
        </section>
      )}

      {/* Education */}
      {educationEntries.length > 0 && (
        <section>
          <SectionTitle>Education</SectionTitle>
          {educationEntries.map((edu, idx) => (
            <div key={idx} className="mb-3 flex justify-between items-start">
              <div>
                <h3 className="font-bold text-[11pt] m-0">{edu.school}</h3>
                <p className="italic text-[11pt] m-0">{[edu.degree, edu.field].filter(Boolean).join(' in ')}</p>
                {edu.activities && <p className="text-[10pt] mt-1 m-0">Activities: {edu.activities}</p>}
              </div>
              <div className="text-right">
                <span className="text-[11pt] font-semibold">
                  {[edu.startYear, edu.endYear].filter(Boolean).join(' - ')}
                </span>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Licenses & Certifications */}
      {licenses.length > 0 && (
        <section>
          <SectionTitle>Licenses & Certifications</SectionTitle>
          {licenses.map((lic, idx) => (
            <div key={idx} className="mb-2">
              <div className="flex justify-between items-baseline">
                <h3 className="font-bold text-[11pt] m-0">{lic.name}</h3>
                <span className="text-[11pt]">
                  {lic.issueDate}{lic.expiryDate ? ` - expires ${lic.expiryDate}` : ''}
                </span>
              </div>
              <p className="italic text-[11pt] m-0">{lic.issuingOrg}</p>
            </div>
          ))}
        </section>
      )}

      {/* Honors & Awards */}
      {honorsAwards.length > 0 && (
        <section>
          <SectionTitle>Honors & Awards</SectionTitle>
          {honorsAwards.map((award, idx) => (
            <div key={idx} className="mb-2">
              <div className="flex justify-between items-baseline">
                <h3 className="font-bold text-[11pt] m-0">{award.title}</h3>
                <span className="text-[11pt]">{award.date}</span>
              </div>
              <p className="italic text-[11pt] m-0">{award.issuer}</p>
              {award.description && <p className="text-[11pt] mt-1 m-0">{award.description}</p>}
            </div>
          ))}
        </section>
      )}

    </div>
  );
}

