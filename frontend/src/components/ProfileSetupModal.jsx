import { useEffect, useState } from 'react';
import { checkUsername, saveSocialProfile } from '../api/socialApi.js';

const USERNAME_PATTERN = /^[a-z0-9_-]{3,30}$/;

export default function ProfileSetupModal({ open, onClose, onSaved }) {
  const [form, setForm] = useState({ username: '', headline: '', location: '', skills: [], is_public: true });
  const [skillDraft, setSkillDraft] = useState('');
  const [availability, setAvailability] = useState({ available: false, valid: false, error: null, checking: false });

  useEffect(() => {
    if (!open || !form.username) {
      setAvailability({ available: false, valid: false, error: null, checking: false });
      return;
    }

    const valid = USERNAME_PATTERN.test(form.username);
    if (!valid) {
      setAvailability({ available: false, valid: false, error: 'Use lowercase letters, numbers, hyphens or underscores.', checking: false });
      return;
    }

    setAvailability((current) => ({ ...current, checking: true }));
    const timer = setTimeout(() => {
      checkUsername(form.username)
        .then((result) => setAvailability({ ...result, checking: false }))
        .catch(() => setAvailability({ available: false, valid: true, error: 'Could not check username.', checking: false }));
    }, 600);

    return () => clearTimeout(timer);
  }, [form.username, open]);

  function addSkill() {
    const nextSkill = skillDraft.trim();
    if (!nextSkill || form.skills.length >= 20 || form.skills.includes(nextSkill)) return;
    setForm({ ...form, skills: [...form.skills, nextSkill] });
    setSkillDraft('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const saved = await saveSocialProfile({
      ...form,
      headline: form.headline || null,
      location: form.location || null
    });
    onSaved?.(saved);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <form onSubmit={handleSubmit} className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--panel)] p-6 shadow-[0_18px_38px_rgba(0,0,0,0.24)]">
        <h2 className="text-2xl font-black text-[var(--text)]">Set up your public profile</h2>
        <p className="mt-2 text-sm leading-7 text-[var(--muted-strong)]">Choose a username to get your public Aptico profile page.</p>

        <label className="mt-5 block">
          <span className="app-field-label">Username</span>
          <input className="app-input mt-2" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value.trim() })} />
        </label>
        <div className="mt-2 text-sm text-[var(--muted-strong)]">
          Your profile: aptico.vercel.app/u/{form.username || 'username'}
          {availability.checking ? <span className="ml-2">Checking...</span> : null}
          {!availability.checking && availability.valid ? <span className="ml-2 text-[var(--accent-strong)]">{availability.available ? 'Available' : availability.error}</span> : null}
          {!availability.valid && availability.error ? <span className="ml-2 text-red-500">{availability.error}</span> : null}
        </div>

        <label className="mt-4 block">
          <span className="app-field-label">Headline</span>
          <input className="app-input mt-2" placeholder="e.g. React Developer | Open to opportunities" value={form.headline} onChange={(event) => setForm({ ...form, headline: event.target.value })} />
        </label>
        <label className="mt-4 block">
          <span className="app-field-label">Location</span>
          <input className="app-input mt-2" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} />
        </label>
        <label className="mt-4 block">
          <span className="app-field-label">Skills</span>
          <input
            className="app-input mt-2"
            value={skillDraft}
            onChange={(event) => setSkillDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                addSkill();
              }
            }}
            placeholder="Type a skill and press Enter"
          />
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          {form.skills.map((skill) => (
            <button key={skill} type="button" onClick={() => setForm({ ...form, skills: form.skills.filter((item) => item !== skill) })} className="app-chip">{skill} x</button>
          ))}
        </div>
        <label className="mt-5 flex items-center justify-between gap-4 rounded-lg border border-[var(--border)] bg-[var(--panel-soft)] p-4">
          <span className="text-sm font-semibold text-[var(--text)]">Make my profile publicly visible</span>
          <input type="checkbox" checked={form.is_public} onChange={(event) => setForm({ ...form, is_public: event.target.checked })} />
        </label>

        <div className="mt-6 flex flex-wrap gap-3">
          <button type="submit" disabled={!availability.available} className="app-button disabled:cursor-not-allowed disabled:opacity-50">Save Profile</button>
          <button type="button" onClick={onClose} className="app-button-secondary">Skip for now</button>
        </div>
      </form>
    </div>
  );
}
