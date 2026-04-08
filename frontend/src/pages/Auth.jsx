import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { loginWithGoogleRequest, sendMagicLinkRequest, verifyMagicLinkRequest } from '../api/authApi.js';
import ThemeToggle from '../components/ThemeToggle.jsx';
import { enterGuestMode, exitGuestMode, selectAuth } from '../store/authSlice.js';

function GoogleButton({ onError, onSuccess }) {
  const buttonRef = useRef(null);

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const googleIdentityScriptUrl =
      import.meta.env.VITE_GOOGLE_IDENTITY_SCRIPT_URL || 'https://accounts.google.com/gsi/client';

    if (!clientId) {
      return undefined;
    }

    let isCancelled = false;

    function initialize() {
      if (isCancelled || !window.google || !buttonRef.current) {
        return;
      }

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: ({ credential }) => {
          if (!credential) {
            onError('Google did not return a credential.');
            return;
          }

          onSuccess(credential);
        }
      });

      buttonRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'pill',
        width: 340
      });
    }

    const existingScript = document.querySelector('script[data-google-identity-script="true"]');
    if (existingScript) {
      initialize();
      return () => {
        isCancelled = true;
      };
    }

    const script = document.createElement('script');
    script.src = googleIdentityScriptUrl;
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentityScript = 'true';
    script.onload = initialize;
    script.onerror = () => onError('Google Identity script could not be loaded.');
    document.body.appendChild(script);

    return () => {
      isCancelled = true;
    };
  }, [onError, onSuccess]);

  if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
    return <div className="app-panel-soft text-sm text-[var(--muted-strong)]">Add `VITE_GOOGLE_CLIENT_ID` to enable Google sign-in.</div>;
  }

  return <div ref={buttonRef} className="min-h-[44px]" />;
}

function PasswordField({ id, label, value, onChange, visible, onToggle }) {
  return (
    <label className="space-y-2">
      <span className="app-field-label">{label}</span>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          className="app-input pr-12"
          placeholder="••••••••"
          required
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full px-2 py-1 text-xs font-semibold text-[var(--muted-strong)]"
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
    </label>
  );
}

export default function Auth() {
  const auth = useSelector(selectAuth);
  const dispatch = useDispatch();
  const store = useStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [mode, setMode] = useState('signup');
  const [formState, setFormState] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (auth.isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }

    if (auth.guestMode) {
      navigate('/guest', { replace: true });
    }
  }, [auth.guestMode, auth.isAuthenticated, navigate]);

  useEffect(() => {
    const magicToken = searchParams.get('magicToken');
    if (!magicToken) {
      return;
    }

    let isActive = true;

    async function verifyToken() {
      setIsSubmitting(true);
      setErrorMessage('');
      setStatusMessage('Verifying your secure sign-in link...');

      try {
        await verifyMagicLinkRequest(magicToken, store);
        if (!isActive) {
          return;
        }

        setSearchParams({}, { replace: true });
        navigate('/dashboard', { replace: true });
      } catch (error) {
        if (isActive) {
          setErrorMessage(error.response?.data?.message || 'Magic link verification failed.');
        }
      } finally {
        if (isActive) {
          setIsSubmitting(false);
        }
      }
    }

    verifyToken();

    return () => {
      isActive = false;
    };
  }, [navigate, searchParams, setSearchParams, store]);

  function updateField(field, value) {
    setFormState((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage('');
    setStatusMessage('');
    dispatch(exitGuestMode());

    if (!formState.email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    if (formState.password.trim().length < 8) {
      setErrorMessage('Please use a password with at least 8 characters.');
      return;
    }

    if (mode === 'signup' && formState.password !== formState.confirmPassword) {
      setErrorMessage('Confirm password must match the password field.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await sendMagicLinkRequest(formState.email.trim());
      setStatusMessage(`Secure sign-in link sent to ${result.email}.`);
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Magic link request failed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleLogin(credential) {
    setIsSubmitting(true);
    setErrorMessage('');
    setStatusMessage('');
    dispatch(exitGuestMode());

    try {
      await loginWithGoogleRequest(credential, store);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Google login failed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleGuestMode() {
    dispatch(enterGuestMode());
    navigate('/guest', { replace: true });
  }

  return (
    <div className="app-page">
      <main className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
        <section className="hidden flex-col justify-between border-r border-[var(--border)] bg-[#0e0e10] p-12 text-zinc-50 lg:flex">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)] text-sm font-black text-[#003824]">A</div>
              <span className="text-xl font-bold uppercase tracking-[-0.04em]">Aptico</span>
            </div>

            <div className="max-w-md space-y-10 pt-8">
              <h1 className="text-5xl font-extrabold leading-[1.1] tracking-[-0.06em]">
                "Aptico changed how I think about my career architecture."
              </h1>

              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 text-xs font-bold">SL</div>
                <div>
                  <p className="mono-text text-xs uppercase tracking-[0.22em] text-[var(--accent)]">Product Engineer</p>
                  <p className="text-sm text-zinc-400">Aptico workspace</p>
                </div>
              </div>

              <div className="space-y-6">
                {[
                  ['Real-time analysis', 'Continuous market positioning telemetry for every role you target.'],
                  ['Skill gap mapping', 'Actionable learning paths based on the exact missing signals.'],
                  ['Interview simulation', 'Predictive question sets and recruiter risk analysis.']
                ].map(([title, copy]) => (
                  <div key={title} className="flex items-start gap-3">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                    <div>
                      <p className="text-sm font-bold uppercase tracking-tight">{title}</p>
                      <p className="mono-text mt-1 text-xs text-zinc-500">{copy}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mono-text flex justify-between text-[10px] uppercase tracking-[0.24em] text-zinc-600">
            <span>System v4.2.0</span>
            <span>© 2026 Aptico</span>
          </div>
        </section>

        <section className="flex items-center justify-center bg-[var(--bg)] p-6 sm:p-12">
          <div className="w-full max-w-[380px] space-y-8">
            <div className="flex items-center justify-between lg:hidden">
              <Link to="/" className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded bg-[var(--accent)] text-[10px] font-black text-[#003824]">A</div>
                <span className="text-lg font-black uppercase tracking-[-0.05em] text-[var(--text)]">Aptico</span>
              </Link>
              <ThemeToggle compact />
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl font-extrabold tracking-[-0.04em] text-[var(--text)]">{mode === 'signup' ? 'Create your account' : 'Log in to Aptico'}</h2>
              <p className="text-sm text-[var(--muted-strong)]">Start building your career intelligence profile.</p>
            </div>

            <div className="flex items-center gap-2 rounded-lg bg-[var(--panel-soft)] p-1">
            {[
              ['signup', 'Create account'],
              ['login', 'Log in']
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                className={`flex-1 rounded-lg px-4 py-3 text-sm font-semibold transition ${
                  mode === value ? 'bg-[var(--accent)] text-slate-950' : 'text-[var(--muted-strong)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
            <label className="space-y-2">
              <span className="app-field-label">Email address</span>
              <input
                type="email"
                value={formState.email}
                onChange={(event) => updateField('email', event.target.value)}
                className="app-input"
                placeholder="name@example.com"
                required
              />
            </label>

            <PasswordField
              id="password"
              label="Password"
              value={formState.password}
              onChange={(event) => updateField('password', event.target.value)}
              visible={showPassword}
              onToggle={() => setShowPassword((current) => !current)}
            />

            {mode === 'signup' ? (
              <PasswordField
                id="confirm-password"
                label="Confirm password"
                value={formState.confirmPassword}
                onChange={(event) => updateField('confirmPassword', event.target.value)}
                visible={showConfirmPassword}
                onToggle={() => setShowConfirmPassword((current) => !current)}
              />
            ) : null}

              <button type="submit" disabled={isSubmitting} className="app-button w-full justify-center rounded-lg">
              {isSubmitting ? 'Please wait...' : mode === 'signup' ? 'Create account' : 'Log in'}
              </button>

              <p className="text-sm leading-7 text-[var(--muted-strong)]">
              Aptico currently completes email access using a secure magic link after validation, while Google sign-in
              remains available below.
              </p>
            </form>

            <div className="relative flex items-center py-2">
              <div className="h-px flex-1 bg-[var(--border)]" />
              <span className="mono-text mx-4 text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">Or continue with</span>
              <div className="h-px flex-1 bg-[var(--border)]" />
            </div>

            <div className="grid grid-cols-1 gap-3">
              <GoogleButton onError={setErrorMessage} onSuccess={(credential) => void handleGoogleLogin(credential)} />
            </div>

            <button type="button" onClick={handleGuestMode} className="app-button-secondary w-full justify-center rounded-lg">
              Continue in guest mode
            </button>

            <p className="text-center text-xs text-[var(--muted-strong)]">
              {mode === 'signup' ? 'Already have an account?' : 'Need a fresh account?'}
              <button type="button" onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')} className="ml-1 font-bold text-[var(--accent-strong)]">
                {mode === 'signup' ? 'Log in' : 'Create one'}
              </button>
            </p>

            <div className="pt-4 text-center">
              <p className="mono-text text-[10px] uppercase leading-relaxed tracking-[0.22em] text-[var(--muted)]">
                By continuing, you agree to Aptico&apos;s terms of service and privacy policy.
              </p>
            </div>

            {statusMessage ? (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                {statusMessage}
              </div>
            ) : null}

            {errorMessage ? (
              <div className="rounded-lg border border-[var(--danger-border)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-rose-300">
                {errorMessage}
              </div>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}
