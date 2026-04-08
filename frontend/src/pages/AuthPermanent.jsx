import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector, useStore } from 'react-redux';
import {
  forgotPasswordRequest,
  loginRequest,
  loginWithGoogleRequest,
  registerRequest,
  requestEmailVerification,
  resetPasswordRequest,
  verifyEmailRequest
} from '../api/authApi.js';
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

function PasswordField({ id, label, value, onChange, visible, onToggle, required = true }) {
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
          placeholder="........"
          required={required}
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

const TITLES = {
  login: 'Log in to Aptico',
  signup: 'Create your account',
  forgot: 'Reset your password',
  reset: 'Choose a new password',
  verify: 'Verify your email'
};

export default function AuthPermanent() {
  const auth = useSelector(selectAuth);
  const dispatch = useDispatch();
  const store = useStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('signup');
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const queryMode = searchParams.get('mode');
  const actionToken = searchParams.get('token');
  const screenMode = useMemo(() => {
    if (queryMode === 'verify-email' && actionToken) {
      return 'verify';
    }

    if (queryMode === 'reset-password' && actionToken) {
      return 'reset';
    }

    return activeTab;
  }, [actionToken, activeTab, queryMode]);

  useEffect(() => {
    if (auth.isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }

    if (auth.guestMode) {
      navigate('/guest', { replace: true });
    }
  }, [auth.guestMode, auth.isAuthenticated, navigate]);

  useEffect(() => {
    if (screenMode !== 'verify' || !actionToken) {
      return;
    }

    let isActive = true;

    async function verifyToken() {
      setIsSubmitting(true);
      setErrorMessage('');
      setStatusMessage('Verifying your email...');

      try {
        await verifyEmailRequest(actionToken, store);
        if (!isActive) {
          return;
        }

        setSearchParams({}, { replace: true });
        navigate('/dashboard', { replace: true });
      } catch (error) {
        if (isActive) {
          setErrorMessage(error.response?.data?.message || 'Email verification failed.');
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
  }, [actionToken, navigate, screenMode, setSearchParams, store]);

  function updateField(field, value) {
    setFormState((current) => ({ ...current, [field]: value }));
  }

  function resetMessages() {
    setErrorMessage('');
    setStatusMessage('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    resetMessages();
    dispatch(exitGuestMode());

    if ((screenMode === 'signup' || screenMode === 'login' || screenMode === 'forgot') && !formState.email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (screenMode === 'signup') {
        if (formState.password.length < 8) {
          throw new Error('Please use a password with at least 8 characters.');
        }

        if (formState.password !== formState.confirmPassword) {
          throw new Error('Confirm password must match the password field.');
        }

        const registration = await registerRequest({
          name: formState.name.trim() || undefined,
          email: formState.email.trim(),
          password: formState.password
        });

        setPendingVerificationEmail(registration.requiresEmailVerification ? formState.email.trim() : '');
        setStatusMessage(
          registration.requiresEmailVerification
            ? `Account created. We sent a verification email to ${formState.email.trim()}.`
            : 'Password added successfully. You can log in now.'
        );
        setActiveTab('login');
      } else if (screenMode === 'login') {
        await loginRequest(
          {
            email: formState.email.trim(),
            password: formState.password
          },
          store
        );
        navigate('/dashboard', { replace: true });
      } else if (screenMode === 'forgot') {
        await forgotPasswordRequest(formState.email.trim());
        setStatusMessage('If the account exists, a password reset link has been sent.');
      } else if (screenMode === 'reset') {
        if (formState.password.length < 8) {
          throw new Error('Please use a password with at least 8 characters.');
        }

        if (formState.password !== formState.confirmPassword) {
          throw new Error('Confirm password must match the password field.');
        }

        await resetPasswordRequest({
          token: actionToken,
          password: formState.password
        });

        setSearchParams({}, { replace: true });
        setActiveTab('login');
        setStatusMessage('Password updated. You can sign in now.');
      }
    } catch (error) {
      const apiMessage = error.response?.data?.message;
      const apiCode = error.response?.data?.code;

      if (apiCode === 'EMAIL_VERIFICATION_REQUIRED') {
        setPendingVerificationEmail(formState.email.trim());
      }

      setErrorMessage(apiMessage || error.message || 'Authentication request failed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleLogin(credential) {
    setIsSubmitting(true);
    resetMessages();
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

  async function handleResendVerification() {
    const email = pendingVerificationEmail || formState.email.trim();

    if (!email) {
      setErrorMessage('Enter your email first so we know where to send verification.');
      return;
    }

    setIsSubmitting(true);
    resetMessages();

    try {
      await requestEmailVerification(email);
      setStatusMessage(`Verification email sent to ${email}.`);
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Could not send verification email.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleGuestMode() {
    dispatch(enterGuestMode());
    navigate('/guest', { replace: true });
  }

  const isResetMode = screenMode === 'reset';
  const isForgotMode = screenMode === 'forgot';
  const isSignupMode = screenMode === 'signup';
  const isLoginMode = screenMode === 'login';
  const showPasswordFields = isSignupMode || isLoginMode || isResetMode;

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
                Build a career operating system with a real account behind it.
              </h1>

              <div className="space-y-6">
                {[
                  ['Verified access', 'Email verification and Google identity keep account ownership tied to a real inbox.'],
                  ['Revocable sessions', 'Short-lived access tokens and rotating refresh cookies reduce long-term exposure.'],
                  ['Recoverable accounts', 'Forgot-password and verification recovery are built into the permanent flow.']
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
            <span>System v5.0.0</span>
            <span>(c) 2026 Aptico</span>
          </div>
        </section>

        <section className="flex items-center justify-center bg-[var(--bg)] p-6 sm:p-12">
          <div className="w-full max-w-[420px] space-y-8">
            <div className="flex items-center justify-between lg:hidden">
              <Link to="/" className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded bg-[var(--accent)] text-[10px] font-black text-[#003824]">A</div>
                <span className="text-lg font-black uppercase tracking-[-0.05em] text-[var(--text)]">Aptico</span>
              </Link>
              <ThemeToggle compact />
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl font-extrabold tracking-[-0.04em] text-[var(--text)]">{TITLES[screenMode]}</h2>
              <p className="text-sm text-[var(--muted-strong)]">Use your email and password, or continue with Google.</p>
            </div>

            {screenMode === 'login' || screenMode === 'signup' ? (
              <div className="flex items-center gap-2 rounded-lg bg-[var(--panel-soft)] p-1">
                {[
                  ['signup', 'Create account'],
                  ['login', 'Log in']
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setActiveTab(value);
                      resetMessages();
                    }}
                    className={`flex-1 rounded-lg px-4 py-3 text-sm font-semibold transition ${
                      activeTab === value ? 'bg-[var(--accent)] text-slate-950' : 'text-[var(--muted-strong)]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : null}

            <form className="space-y-5" onSubmit={handleSubmit}>
              {isSignupMode ? (
                <label className="space-y-2">
                  <span className="app-field-label">Full name</span>
                  <input
                    type="text"
                    value={formState.name}
                    onChange={(event) => updateField('name', event.target.value)}
                    className="app-input"
                    placeholder="Your name"
                  />
                </label>
              ) : null}

              {screenMode !== 'verify' && !isResetMode ? (
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
              ) : null}

              {showPasswordFields ? (
                <PasswordField
                  id="password"
                  label={isResetMode ? 'New password' : 'Password'}
                  value={formState.password}
                  onChange={(event) => updateField('password', event.target.value)}
                  visible={showPassword}
                  onToggle={() => setShowPassword((current) => !current)}
                />
              ) : null}

              {isSignupMode || isResetMode ? (
                <PasswordField
                  id="confirm-password"
                  label="Confirm password"
                  value={formState.confirmPassword}
                  onChange={(event) => updateField('confirmPassword', event.target.value)}
                  visible={showConfirmPassword}
                  onToggle={() => setShowConfirmPassword((current) => !current)}
                />
              ) : null}

              {screenMode === 'verify' ? (
                <div className="rounded-lg border border-[var(--border)] bg-[var(--panel-soft)] px-4 py-4 text-sm text-[var(--muted-strong)]">
                  We are validating your email verification link now.
                </div>
              ) : (
                <button type="submit" disabled={isSubmitting} className="app-button w-full justify-center rounded-lg">
                  {isSubmitting
                    ? 'Please wait...'
                    : isSignupMode
                      ? 'Create account'
                      : isLoginMode
                        ? 'Log in'
                        : isForgotMode
                          ? 'Send reset link'
                          : 'Update password'}
                </button>
              )}

              {isLoginMode ? (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('forgot');
                    resetMessages();
                  }}
                  className="text-sm font-semibold text-[var(--accent-strong)]"
                >
                  Forgot your password?
                </button>
              ) : null}
            </form>

            {screenMode === 'login' || screenMode === 'signup' ? (
              <>
                <div className="relative flex items-center py-2">
                  <div className="h-px flex-1 bg-[var(--border)]" />
                  <span className="mono-text mx-4 text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">Or continue with</span>
                  <div className="h-px flex-1 bg-[var(--border)]" />
                </div>

                <GoogleButton onError={setErrorMessage} onSuccess={(credential) => void handleGoogleLogin(credential)} />
              </>
            ) : null}

            {pendingVerificationEmail ? (
              <button type="button" onClick={() => void handleResendVerification()} className="app-button-secondary w-full justify-center rounded-lg">
                Resend verification email
              </button>
            ) : null}

            <button type="button" onClick={handleGuestMode} className="app-button-secondary w-full justify-center rounded-lg">
              Continue in guest mode
            </button>

            <div className="text-center text-xs text-[var(--muted-strong)]">
              {screenMode === 'forgot' || screenMode === 'reset' ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchParams({}, { replace: true });
                    setActiveTab('login');
                    resetMessages();
                  }}
                  className="font-bold text-[var(--accent-strong)]"
                >
                  Back to login
                </button>
              ) : (
                <>
                  {activeTab === 'signup' ? 'Already have an account?' : 'Need a fresh account?'}{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab(activeTab === 'signup' ? 'login' : 'signup');
                      resetMessages();
                    }}
                    className="font-bold text-[var(--accent-strong)]"
                  >
                    {activeTab === 'signup' ? 'Log in' : 'Create one'}
                  </button>
                </>
              )}
            </div>

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
