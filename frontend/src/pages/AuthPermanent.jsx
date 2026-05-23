import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import ApticoLogo from '../components/ApticoLogo.jsx';
import { APP_NAME, NAVBAR_HEIGHT } from '../constants/index.js';

// ── Reveal Hook ──────────────────────────────────────────────
function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
        }
      },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return ref;
}

// ── Section Reveal ───────────────────────────────────────────
function Reveal({ children, className = '', type = 'fade' }) {
  const ref = useReveal();
  const baseClass = type === 'scale' ? 'reveal-scale-up' : 'reveal-on-scroll';
  return (
    <div ref={ref} className={`${baseClass} ${className}`}>
      {children}
    </div>
  );
}

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
    return <div className="app-panel-soft text-sm text-[var(--muted-strong)] w-full text-center">Add `VITE_GOOGLE_CLIENT_ID` to enable Google sign-in.</div>;
  }

  return <div ref={buttonRef} className="min-h-[44px] flex justify-center w-full" />;
}

function PasswordField({ id, label, value, onChange, visible, onToggle, required = true }) {
  return (
    <label className="space-y-2 block w-full">
      <span className="app-field-label">{label}</span>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          className="app-input pr-12 w-full"
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

  const handleGoogleLogin = useCallback(async (credential) => {
    setIsSubmitting(true);
    setErrorMessage('');
    setStatusMessage('');
    dispatch(exitGuestMode());

    try {
      await loginWithGoogleRequest(credential, store);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      setErrorMessage(error.response?.data?.message || error.message || 'Google login failed.');
    } finally {
      setIsSubmitting(false);
    }
  }, [dispatch, navigate, store]);

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
    <div className="app-page min-h-screen relative overflow-hidden flex flex-col bg-[var(--bg)]">
      {/* Background Ambience */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[var(--accent)] opacity-[0.06] blur-[120px]" />
      <div className="pointer-events-none absolute -right-32 top-20 h-80 w-80 rounded-full bg-[#71a1ff] opacity-[0.05] blur-[100px]" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 h-96 w-full max-w-3xl rounded-full bg-[var(--accent)] opacity-[0.03] blur-[140px]" />

      {/* Header */}
      <header className="glass fixed left-0 right-0 top-0 z-50 border-b border-[var(--border)]">
        <div className="app-container flex items-center justify-between" style={{ height: `${NAVBAR_HEIGHT}px` }}>
          <Link to="/" className="flex items-center gap-3 select-none group">
            <ApticoLogo className="h-9 w-9 text-[var(--accent)] drop-shadow-[0_0_12px_var(--accent-soft)] transition-transform group-hover:scale-110" />
            <span className="text-lg font-black tracking-[-0.04em] text-[var(--text)]">{APP_NAME}</span>
          </Link>
          <ThemeToggle compact />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 p-6 sm:p-12 overflow-y-auto" style={{ paddingTop: `calc(${NAVBAR_HEIGHT}px + 2rem)` }}>
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 my-auto mx-auto items-center">
          
          {/* Left Side: Marketing / Premium Copy */}
          <Reveal type="scale" className="hidden flex-col justify-center space-y-10 lg:flex">
             <div>
               <span className="mono-text mb-4 inline-block rounded-full border border-[var(--accent-soft)] bg-[var(--accent-soft)] px-4 py-1.5 text-[11px] uppercase tracking-[0.2em] text-[var(--accent-strong)]">
                 Secure Access
               </span>
               <h1 className="text-5xl font-extrabold leading-[1.1] tracking-[-0.06em] text-[var(--text)]">
                 Your career OS, <br/>
                 <span className="bg-gradient-to-r from-[var(--accent)] to-[#71a1ff] bg-clip-text text-transparent">fully synchronized.</span>
               </h1>
               <p className="mt-6 max-w-md text-base leading-8 text-[var(--muted-strong)]">
                 Build a career operating system with a real account behind it. Our intelligence routing engine needs a secure foundation.
               </p>
             </div>
             
             <div className="space-y-8 relative">
               <div className="absolute left-3 top-2 bottom-2 w-px bg-gradient-to-b from-[var(--accent)] via-[var(--border)] to-transparent" />
               {[
                  ['Verified Identity', 'verified_user', 'Email verification and Google identity tie your progress to a real, secure account.'],
                  ['Revocable Sessions', 'security', 'Short-lived access tokens and rotating cookies keep your career data highly protected.'],
                  ['Intelligent Recovery', 'lock_reset', 'Account recovery flows are seamlessly integrated into the core engine.']
                ].map(([title, icon, copy]) => (
                  <div key={title} className="flex items-start gap-5 relative z-10 pl-10">
                    <div className="absolute left-0 top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[var(--bg)] bg-[var(--accent)]">
                      <span className="h-2 w-2 rounded-full bg-[var(--bg)]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                         <span className="material-symbols-outlined text-[18px] text-[var(--accent-strong)]">{icon}</span>
                         <p className="text-base font-bold tracking-tight text-[var(--text)]">{title}</p>
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-[var(--muted-strong)]">{copy}</p>
                    </div>
                  </div>
                ))}
             </div>
          </Reveal>

          {/* Right Side: Auth Form */}
          <Reveal className="w-full max-w-[420px] mx-auto">
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-6 sm:p-8 shadow-2xl shadow-[var(--shadow-color)] backdrop-blur-xl relative overflow-hidden">
               <div className="space-y-2 mb-6 text-center">
                 <h2 className="text-3xl font-extrabold tracking-[-0.04em] text-[var(--text)]">{TITLES[screenMode]}</h2>
                 <p className="text-sm text-[var(--muted-strong)] mx-auto max-w-sm">Use your email and password, or continue with Google.</p>
               </div>

               {screenMode === 'login' || screenMode === 'signup' ? (
                 <div className="flex items-center gap-2 rounded-xl bg-[var(--panel-soft)] p-1 mb-6">
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
                       className={`flex-1 basis-1/2 text-center rounded-lg px-4 py-3 text-sm font-semibold transition ${
                         activeTab === value ? 'bg-[var(--accent)] text-[#003824] shadow-sm' : 'text-[var(--muted-strong)] hover:text-[var(--text)]'
                       }`}
                     >
                       {label}
                     </button>
                   ))}
                 </div>
               ) : null}

               <form className="space-y-4" onSubmit={handleSubmit}>
                 {isSignupMode ? (
                   <label className="space-y-2 block">
                     <span className="app-field-label">Full name</span>
                     <input
                       type="text"
                       value={formState.name}
                       onChange={(event) => updateField('name', event.target.value)}
                       className="app-input w-full"
                       placeholder="Your name"
                     />
                   </label>
                 ) : null}

                 {screenMode !== 'verify' && !isResetMode ? (
                   <label className="space-y-2 block">
                     <span className="app-field-label">Email address</span>
                     <input
                       type="email"
                       value={formState.email}
                       onChange={(event) => updateField('email', event.target.value)}
                       className="app-input w-full"
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
                   <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] px-4 py-4 text-sm text-[var(--muted-strong)]">
                     We are validating your email verification link now.
                   </div>
                 ) : (
                   <button type="submit" disabled={isSubmitting} className="app-button w-full justify-center rounded-xl py-3 mt-2 shadow-lg shadow-[var(--accent-soft)]">
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
                   <div className="pt-1 text-center">
                     <button
                       type="button"
                       onClick={() => {
                         setActiveTab('forgot');
                         resetMessages();
                       }}
                       className="text-sm font-semibold text-[var(--muted-strong)] hover:text-[var(--accent-strong)] transition"
                     >
                       Forgot your password?
                     </button>
                   </div>
                 ) : null}
               </form>

               {screenMode === 'login' || screenMode === 'signup' ? (
                 <>
                   <div className="relative flex items-center py-5">
                     <div className="h-px flex-1 bg-[var(--border)]" />
                     <span className="mono-text mx-4 text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">Or continue with</span>
                     <div className="h-px flex-1 bg-[var(--border)]" />
                   </div>

                   <GoogleButton onError={setErrorMessage} onSuccess={handleGoogleLogin} />
                 </>
               ) : null}

               {pendingVerificationEmail ? (
                 <button type="button" onClick={() => void handleResendVerification()} className="app-button-secondary w-full justify-center rounded-xl py-3 mt-4">
                   Resend verification email
                 </button>
               ) : null}

               {screenMode === 'login' || screenMode === 'signup' ? (
                 <button type="button" onClick={handleGuestMode} className="app-button-secondary w-full justify-center rounded-xl py-3 mt-3">
                   Continue in guest mode
                 </button>
               ) : null}

               <div className="text-center text-xs text-[var(--muted-strong)] mt-6">
                 {screenMode === 'forgot' || screenMode === 'reset' ? (
                   <button
                     type="button"
                     onClick={() => {
                       setSearchParams({}, { replace: true });
                       setActiveTab('login');
                       resetMessages();
                     }}
                     className="font-bold text-[var(--accent-strong)] hover:underline"
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
                       className="font-bold text-[var(--accent-strong)] hover:underline"
                     >
                       {activeTab === 'signup' ? 'Log in' : 'Create one'}
                     </button>
                   </>
                 )}
               </div>

               <div className="pt-6 text-center">
                 <p className="mono-text text-[9px] uppercase leading-relaxed tracking-[0.22em] text-[var(--muted)]">
                   By continuing, you agree to Aptico's terms of service and privacy policy.
                 </p>
               </div>

               {statusMessage ? (
                 <div className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                   {statusMessage}
                 </div>
               ) : null}

               {errorMessage ? (
                 <div className="mt-6 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-600 dark:text-rose-400">
                   {errorMessage}
                 </div>
               ) : null}
            </div>
          </Reveal>

        </div>
      </main>
    </div>
  );
}
