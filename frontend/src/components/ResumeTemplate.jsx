import React from 'react';

const Icons = {
  MapPin: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  Mail: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
  Phone: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>,
  Link: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" /></svg>,
};

function SectionTitle({ children }) {
  return (
    <div className="mb-4 mt-8 flex items-center gap-4">
      <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-[#1a202c] shrink-0 border-b-2 border-[#1a202c] pb-0.5">{children}</h2>
      <div className="h-px w-full bg-[#cbd5e0]"></div>
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
  const fullName = `${profile.firstName} ${profile.lastName}`.trim();
  const initials = `${profile.firstName?.[0] || 'A'}${profile.lastName?.[0] || 'U'}`.toUpperCase();
  
  const contactInfo = [
    { value: profile.email, icon: Icons.Mail, show: profile.showEmail },
    { value: profile.phone, icon: Icons.Phone, show: profile.showPhone },
    { value: profile.location, icon: Icons.MapPin, show: true },
    { value: profile.linkedin, icon: Icons.Link, show: !!profile.linkedin, label: 'LinkedIn' },
    { value: profile.portfolio, icon: Icons.Link, show: !!profile.portfolio, label: 'Portfolio' },
  ].filter(item => item.show && item.value);

  return (
    <div className="resume-print-view bg-white text-[#2d3748] font-sans leading-relaxed p-0">
      {/* CSS for print injection */}
      <style>{`
        @media screen {
          .resume-print-view { display: none; }
        }
        @media print {
          .resume-print-view { display: block !important; padding: 40px; }
          body { background: white !important; }
        }
        .resume-print-view h1 { color: #1a202c; }
        .resume-print-view h2 { color: #2d3748; }
        .resume-print-view .text-primary { color: #2563eb; }
      `}</style>
      
      {/* Header */}
      <header className="flex justify-between items-center bg-[#1a202c] text-white p-8 rounded-tr-3xl mb-10">
        <div>
          <h1 className="text-4xl font-black tracking-tight mb-2 uppercase">{fullName}</h1>
          <p className="text-lg font-medium text-[#4edea3] tracking-wide opacity-90">{profile.headline || 'Professional Graduate'}</p>
          
          <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-[13px] font-medium opacity-80">
            {contactInfo.map((info, idx) => (
              <div key={idx} className="flex items-center gap-2.5">
                <span className="text-[#4edea3]"><info.icon /></span>
                <span>{info.label ? `${info.label}: ${info.value}` : info.value}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-white text-[#1a202c] text-3xl font-black shadow-[8px_8px_0px_#4edea3]">
          {initials}
        </div>
      </header>

      {/* Summary */}
      <section>
        <SectionTitle>Summary</SectionTitle>
        <p className="text-[15px] text-[#4a5568] font-medium leading-[1.8]">
          {profile.bio || 'Dynamic and results-driven professional with a focus on delivering excellence.'}
        </p>
      </section>

      {/* Experience */}
      <section>
        <SectionTitle>Professional Experience</SectionTitle>
        <div className="mb-6">
          <div className="flex justify-between items-baseline mb-2">
            <div>
              <h3 className="text-lg font-black text-[#1a202c]">{profile.currentTitle || 'Professional Role'}</h3>
              <p className="text-md font-bold text-[#4a5568]">{profile.currentCompany || 'Established Organization'}</p>
            </div>
            <div className="text-right">
              <span className="text-sm font-black text-[#1a202c] uppercase">
                {profile.yearsExperience ? `${profile.yearsExperience} Years Experience` : 'Current'}
              </span>
              <p className="text-xs font-bold text-[#a0aec0] uppercase tracking-wider">{formatLabel(profile.employmentType)}</p>
            </div>
          </div>
          
          <div className="mt-4 space-y-3">
             {profile.achievements.length > 0 ? (
               profile.achievements.map((achievement, i) => (
                 <div key={i} className="flex gap-3">
                   <div className="mt-2 h-1.5 w-1.5 rounded-full bg-[#2563eb] shrink-0"></div>
                   <p className="text-[14px] text-[#4a5568] font-medium leading-normal">{achievement}</p>
                 </div>
               ))
             ) : (
               <div className="flex gap-3">
                 <div className="mt-2 h-1.5 w-1.5 rounded-full bg-[#2563eb] shrink-0"></div>
                 <p className="text-[14px] text-[#4a5568] font-medium leading-normal italic">Key achievements and core responsibilities demonstrating professional impact.</p>
               </div>
             )}
          </div>
        </div>
      </section>

      {/* Skills Grid */}
      <section>
        <SectionTitle>Technical Expertise</SectionTitle>
        <div className="grid grid-cols-2 gap-x-12 gap-y-6">
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#a0aec0] mb-3">Core Skills</h4>
            <div className="flex flex-wrap gap-2">
              {profile.topSkills.map(skill => (
                <span key={skill} className="px-3 py-1 bg-[#f7fafc] border border-[#e2e8f0] text-[#1a202c] text-xs font-bold rounded-md">
                  {skill}
                </span>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#a0aec0] mb-3">Tools & Systems</h4>
            <div className="flex flex-wrap gap-2">
              {profile.tools.map(tool => (
                <span key={tool} className="px-3 py-1 bg-[#f7fafc] border border-[#e2e8f0] text-[#1a202c] text-xs font-bold rounded-md">
                  {tool}
                </span>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#a0aec0] mb-3">Languages</h4>
            <div className="flex flex-wrap gap-2">
              {profile.languages.map(lang => (
                <span key={lang} className="px-3 py-1 bg-[#f7fafc] border border-[#e2e8f0] text-[#1a202c] text-xs font-bold rounded-md">
                   {lang}
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#a0aec0] mb-1">Work Mode & Intent</h4>
            <div className="text-[13px] font-bold text-[#4a5568]">
              {profile.preferredWorkModes.map(mode => formatLabel(mode)).join(', ') || 'Remote/Hybrid'}
            </div>
            <div className="text-[11px] font-medium text-[#718096]">
              {profile.availability || 'Available for professional opportunities'}
            </div>
          </div>
        </div>
      </section>

      {/* Education */}
      <section>
        <SectionTitle>Education</SectionTitle>
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-black text-[#1a202c]">{[profile.degree, profile.fieldOfStudy].filter(Boolean).join(' in ') || 'Academic Degree'}</h3>
            <p className="text-[#4a5568] font-bold">{profile.school || 'Premier Educational Institution'}</p>
            {profile.learningFocus && <p className="text-sm text-[#718096] italic mt-2">Specialization: {profile.learningFocus}</p>}
          </div>
          <div className="text-right">
            <span className="text-sm font-black text-[#1a202c] uppercase">{profile.graduationYear ? `Class of ${profile.graduationYear}` : ''}</span>
          </div>
        </div>
      </section>

      {/* Footer / Branding */}
      <footer className="mt-12 pt-8 border-t border-[#edf2f7] flex justify-between items-center text-[10px] font-bold text-[#cbd5e0] uppercase tracking-widest">
        <div>Generated via Aptico Career Intelligence</div>
        <div>{new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}</div>
      </footer>
    </div>
  );
}
