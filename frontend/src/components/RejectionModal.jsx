import { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useQueryClient } from '@tanstack/react-query';
import { createRejectionLog } from '../api/rejectionApi.js';
import { updateAuthUser } from '../store/authSlice.js';

const stageOptions = [
  { value: 'resume', label: 'Resume screen', xp: 50 },
  { value: 'first_round', label: 'First round', xp: 100 },
  { value: 'hiring_manager', label: 'Hiring manager', xp: 175 },
  { value: 'final', label: 'Final round', xp: 250 }
];

function ConfettiBurst({ active }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 14 }, (_, index) => ({
        id: index,
        left: 8 + index * 6.2,
        delay: `${index * 40}ms`,
        duration: `${900 + (index % 5) * 120}ms`,
        rotation: `${-30 + index * 9}deg`
      })),
    []
  );

  if (!active) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((piece) => (
        <span
          key={piece.id}
          className="absolute top-16 h-3 w-2 rounded-full bg-[var(--accent)] opacity-0 rejection-confetti"
          style={{
            left: `${piece.left}%`,
            animationDelay: piece.delay,
            animationDuration: piece.duration,
            transform: `rotate(${piece.rotation})`
          }}
        />
      ))}
    </div>
  );
}

export default function RejectionModal({ isOpen, onClose, onSuccess }) {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    companyName: '',
    roleTitle: '',
    stageRejected: 'resume'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successState, setSuccessState] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setError('');
      setSuccessState(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const selectedStage = stageOptions.find((option) => option.value === form.stageRejected) || stageOptions[0];

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const response = await createRejectionLog(form);

      dispatch(
        updateAuthUser({
          resilienceXp: response.resilienceXp
        })
      );

      await queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });

      const nextSuccessState = {
        xpEarned: response.xpEarned,
        resilienceXp: response.resilienceXp,
        level: response.level
      };

      setSuccessState(nextSuccessState);
      onSuccess?.(nextSuccessState);

      setForm({
        companyName: '',
        roleTitle: '',
        stageRejected: 'resume'
      });

      window.setTimeout(() => {
        onClose();
      }, 1600);
    } catch (submitError) {
      setError(submitError.response?.data?.error || 'Could not log this rejection right now.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center px-4 py-6">
      <div className="absolute inset-0 bg-black/55" onClick={onClose} aria-hidden="true" />

      <div className="relative w-full max-w-xl overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--panel)] shadow-[0_24px_80px_rgba(0,0,0,0.3)]">
        <ConfettiBurst active={Boolean(successState)} />
        <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top,rgba(78,222,163,0.28),transparent_70%)]" />

        <div className="relative p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="app-kicker">Resilience log</p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.05em] text-[var(--text)]">Turn rejection into momentum</h2>
              <p className="mt-3 max-w-lg text-sm leading-7 text-[var(--muted-strong)]">
                Got rejected from a job? Log it here and earn Resilience XP based on how far you got &mdash; Resume screen (50 XP), First round (100 XP), Hiring manager (175 XP), Final round (250 XP). Every setback fuels your level.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--panel-soft)] text-[var(--text)] transition hover:border-[var(--accent)]/40"
              aria-label="Close rejection modal"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <label className="block">
              <span className="app-field-label">Company</span>
              <input
                className="app-input mt-2"
                value={form.companyName}
                onChange={(event) => setForm((current) => ({ ...current, companyName: event.target.value }))}
                placeholder="Acme Labs"
                maxLength={160}
                required
              />
            </label>

            <label className="block">
              <span className="app-field-label">Role</span>
              <input
                className="app-input mt-2"
                value={form.roleTitle}
                onChange={(event) => setForm((current) => ({ ...current, roleTitle: event.target.value }))}
                placeholder="Frontend Engineer"
                maxLength={160}
                required
              />
            </label>

            <label className="block">
              <span className="app-field-label">Stage</span>
              <select
                className="app-input mt-2"
                value={form.stageRejected}
                onChange={(event) => setForm((current) => ({ ...current, stageRejected: event.target.value }))}
              >
                {stageOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} (+{option.xp} XP)
                  </option>
                ))}
              </select>
            </label>

            <div className="rounded-[1.4rem] border border-[var(--accent)]/20 bg-[var(--accent-soft)] px-4 py-4">
              <p className="app-field-label">Reward preview</p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="text-sm text-[var(--text)]">This entry awards resilience for showing up again.</p>
                <span className="rounded-full bg-[var(--panel)] px-3 py-2 text-sm font-black text-[var(--accent-strong)]">
                  +{selectedStage.xp} XP
                </span>
              </div>
            </div>

            {error ? (
              <div className="rounded-2xl border border-[var(--warning-border)] bg-[var(--warning-soft)] px-4 py-3 text-sm text-[var(--warning-text)]">
                {error}
              </div>
            ) : null}

            {successState ? (
              <div className="rounded-[1.4rem] border border-[var(--accent)]/40 bg-[linear-gradient(135deg,rgba(78,222,163,0.25),rgba(255,255,255,0.02))] px-4 py-4">
                <p className="app-field-label">XP Up</p>
                <p className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--text)]">+{successState.xpEarned} resilience XP</p>
                <p className="mt-2 text-sm text-[var(--muted-strong)]">
                  Level {successState.level} is now in motion with {successState.resilienceXp} total XP.
                </p>
              </div>
            ) : null}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={onClose} className="app-button-secondary">
                Cancel
              </button>
              <button type="submit" disabled={isSubmitting} className="app-button shadow-[0_0_30px_rgba(78,222,163,0.35)]">
                {isSubmitting ? 'Logging...' : 'Log rejection'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
