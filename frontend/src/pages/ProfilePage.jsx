import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import AppShell from '../components/AppShell.jsx';
import { useProfileSettings } from '../hooks/useProfileSettings.js';
import { selectAuth } from '../store/authSlice.js';
import { selectCurrentAnalysis } from '../store/historySlice.js';

function InfoCard({ label, value, tone = 'default' }) {
  const toneClass =
    tone === 'accent'
      ? 'border-[var(--accent)]/30 bg-[var(--accent-soft)]'
      : tone === 'warning'
        ? 'border-[var(--warning-border)] bg-[var(--warning-soft)]'
        : 'border-[var(--border)] bg-[var(--panel-soft)]';

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <p className="app-field-label">{label}</p>
      <p className="mt-3 text-sm leading-7 text-[var(--text)]">{value}</p>
    </div>
  );
}

function ChipList({ items, emptyLabel, accent = false }) {
  if (!items.length) {
    return <p className="text-sm text-[var(--muted-strong)]">{emptyLabel}</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
            accent
              ? 'border-[var(--accent)]/20 bg-[var(--accent-soft)] text-[var(--accent-strong)]'
              : 'border-[var(--border)] bg-[var(--panel-soft)] text-[var(--text)]'
          }`}
        >
          {item}
        </span>
      ))}
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

export default function ProfilePage() {
  const auth = useSelector(selectAuth);
  const analysis = useSelector(selectCurrentAnalysis);
  const { profile, isLoadingProfile, profileError } = useProfileSettings(auth, analysis);
  const fullName = `${profile.firstName} ${profile.lastName}`.trim();
  const initials = `${profile.firstName?.[0] || 'A'}${profile.lastName?.[0] || 'U'}`.toUpperCase();
  const matchScore = analysis?.confidenceScore ? `${analysis.confidenceScore}%` : 'Pending';
  const visibleContact = [
    profile.location,
    profile.showEmail ? profile.email : '',
    profile.showPhone ? profile.phone : ''
  ].filter(Boolean);
  const publicLinks = [profile.website, profile.portfolio, profile.linkedin, profile.github].filter(Boolean);

  return (
    <AppShell
      title="Profile"
      description="A platform-ready profile view inspired by your Profile reference, with richer identity, career, education, and discovery signals that can all be managed from Settings."
      actions={
        <>
          <Link to="/settings" className="app-button">
            Edit in settings
          </Link>
          <Link to="/jobs" className="app-button-secondary">
            Explore roles
          </Link>
        </>
      }
    >
      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          {isLoadingProfile ? (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-4 text-sm text-[var(--muted-strong)]">
              Loading your saved profile...
            </div>
          ) : null}

          {profileError ? (
            <div className="rounded-2xl border border-[var(--warning-border)] bg-[var(--warning-soft)] p-4 text-sm text-[var(--warning-text)]">
              {profileError}
            </div>
          ) : null}

          <article className="app-panel relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-[var(--accent-soft)] via-transparent to-[var(--warning-soft)]" />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex flex-1 gap-4">
                <div className="flex shrink-0 h-20 w-20 items-center justify-center rounded-3xl border border-[var(--border)] bg-[var(--panel-soft)] text-2xl font-black text-[var(--text)]">
                  {initials}
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <p className="app-kicker">Professional identity</p>
                    <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-[var(--text)]">{fullName}</h2>
                    <p className="mt-2 text-base font-medium text-[var(--accent-strong)]">{profile.headline}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-[var(--accent)]/20 bg-[var(--accent-soft)] px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                      {formatLabel(profile.currentStatus)}
                    </span>
                    {profile.openToWork ? (
                      <span className="rounded-full border border-[var(--warning-border)] bg-[var(--warning-soft)] px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[var(--warning-text)]">
                        Open to work
                      </span>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-[var(--muted-strong)]">
                    {visibleContact.map((item) => (
                      <span key={item}>{item}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:w-[320px] lg:grid-cols-1">
                <InfoCard label="Target role" value={profile.targetRole || 'Set your preferred role in settings'} tone="accent" />
                <InfoCard label="Current focus" value={profile.availability || 'Add your current availability'} />
                <InfoCard label="Latest match score" value={matchScore} tone="warning" />
              </div>
            </div>
          </article>

          <article className="app-panel">
            <p className="app-kicker">About</p>
            <div className="mt-4 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
              <div>
                <h3 className="text-xl font-bold text-[var(--text)]">Profile summary</h3>
                <p className="mt-4 text-sm leading-8 text-[var(--muted-strong)]">{profile.bio}</p>
              </div>
              <div className="space-y-3">
                <InfoCard
                  label="Current role"
                  value={[profile.currentTitle, profile.currentCompany].filter(Boolean).join(' at ') || 'Add current title and company'}
                />
                <InfoCard
                  label="Experience"
                  value={profile.yearsExperience ? `${profile.yearsExperience} years of experience` : 'Add total experience'}
                />
                <InfoCard label="Employment type" value={formatLabel(profile.employmentType) || 'Not set'} />
              </div>
            </div>
          </article>

          <article className="app-panel">
            <p className="app-kicker">Expertise</p>
            <div className="mt-4 space-y-6">
              <div>
                <h3 className="text-lg font-bold text-[var(--text)]">Top skills</h3>
                <div className="mt-4">
                  <ChipList items={profile.topSkills} emptyLabel="Add your strongest skills from settings." accent />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-[var(--text)]">Tools and platforms</h3>
                <div className="mt-4">
                  <ChipList items={profile.tools} emptyLabel="Add tools, platforms, and systems you use." />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-[var(--text)]">Languages</h3>
                <div className="mt-4">
                  <ChipList items={profile.languages} emptyLabel="Add spoken or working languages." />
                </div>
              </div>
            </div>
          </article>

          <article className="app-panel">
            <p className="app-kicker">Education and wins</p>
            <div className="mt-4 grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-5">
                <h3 className="text-lg font-bold text-[var(--text)]">Education</h3>
                <p className="mt-4 text-sm font-medium text-[var(--text)]">
                  {[profile.degree, profile.fieldOfStudy].filter(Boolean).join(' in ') || 'Add your degree and field of study'}
                </p>
                <p className="mt-2 text-sm text-[var(--muted-strong)]">{profile.school || 'Add your school or university'}</p>
                <p className="mt-2 text-sm text-[var(--muted-strong)]">
                  {profile.graduationYear ? `Graduation year: ${profile.graduationYear}` : 'Add graduation year'}
                </p>
                <p className="mt-3 text-sm leading-7 text-[var(--muted-strong)]">
                  {profile.learningFocus || 'Use settings to add learning focus, certifications, and continuing education plans.'}
                </p>
              </div>

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-5">
                <h3 className="text-lg font-bold text-[var(--text)]">Achievements</h3>
                <div className="mt-4 space-y-3">
                  {profile.achievements.length ? (
                    profile.achievements.map((item) => (
                      <div key={item} className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-3 text-sm leading-7 text-[var(--muted-strong)]">
                        {item}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-[var(--muted-strong)]">Add impact-focused wins and highlights in settings.</p>
                  )}
                </div>
              </div>
            </div>
          </article>
        </div>

        <aside className="space-y-6">
          <article className="app-panel xl:sticky xl:top-24">
            <p className="app-kicker">Profile readiness</p>
            <div className="mt-4 space-y-4">
              <InfoCard
                label="Discovery strength"
                value={profile.profileStrengthNotes}
                tone="accent"
              />
              <InfoCard
                label="Preferred work modes"
                value={profile.preferredWorkModes.length ? profile.preferredWorkModes.join(', ') : 'Add remote, hybrid, or on-site preferences'}
              />
              <InfoCard
                label="Recruiter access"
                value={profile.allowRecruiterMessages ? 'Recruiter messages enabled' : 'Recruiter messages disabled'}
              />
              <InfoCard
                label="Profile visibility"
                value={profile.publicProfile ? 'Public profile enabled' : 'Private profile'}
              />
            </div>

            <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--panel-soft)] p-5">
              <p className="app-field-label">Public links</p>
              <div className="mt-4 space-y-3 text-sm">
                {publicLinks.length ? (
                  publicLinks.map((link) => (
                    <a
                      key={link}
                      href={link.startsWith('http') ? link : `https://${link}`}
                      target="_blank"
                      rel="noreferrer"
                      className="block break-all text-[var(--accent-strong)] underline underline-offset-4 hover:text-[var(--accent)]"
                    >
                      {link}
                    </a>
                  ))
                ) : (
                  <p className="text-[var(--muted-strong)]">Add portfolio, LinkedIn, GitHub, or personal website links in settings.</p>
                )}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/settings" className="app-button">
                Update profile
              </Link>
              <Link to="/analysis" className="app-button-secondary">
                Refresh insights
              </Link>
            </div>
          </article>
        </aside>
      </section>
    </AppShell>
  );
}
